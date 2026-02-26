/**
 * Daily Reconciliation Engine
 *
 * Single entry point for the daily reconciliation job.
 * For each user, processes all un-resolved dates from last_resolved_date+1 to yesterday.
 *
 * Per date it:
 *  1. Computes planned/completed/framework counts
 *  2. Computes execution rate
 *  3. Computes delta using scoring rules
 *  4. Upserts into daily_user_metrics
 *  5. Inserts into daily_scores (skip if exists — idempotent)
 *  6. Updates profiles.discipline_score += delta
 *  7. Recomputes badge_tier from lifetime score
 *  8. Evaluates badge wear eligibility (last 7/5 days)
 *  9. Updates streak from daily_user_activity
 * 10. Updates profiles.last_resolved_date
 *
 * After all users: generates team_daily_overviews.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  SCORING,
  getExecutionMultiplier,
  getBadgeFromScore,
  type DisciplineBadge,
  type BlockType,
} from '@/lib/types/database'

// ============================================================================
// Types
// ============================================================================

interface UserProfile {
  id: string
  timezone: string
  discipline_score: number
  current_streak: number
  best_streak: number
  last_resolved_date: string | null
  is_paused: boolean
}

interface BlockRow {
  id: string
  block_type: BlockType
  is_planned: boolean
  completed_at: string | null
  performed_at: string | null
  deleted_at: string | null
}

interface DayMetrics {
  planned_blocks: number
  completed_blocks: number
  execution_rate: number
  framework_checked: number
  base_points: number
  penalties: number
  multiplier: number
  gated: boolean
  delta: number
  breakdown: Record<string, number>
}

export interface ReconciliationResult {
  users_processed: number
  dates_resolved: number
  teams_updated: number
  errors: string[]
}

// ============================================================================
// Helpers
// ============================================================================

/** Get the user's "today" in their timezone as YYYY-MM-DD */
function getUserLocalDate(timezone: string): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(now) // returns YYYY-MM-DD in en-CA locale
  } catch {
    // Fallback to UTC
    return new Date().toISOString().slice(0, 10)
  }
}

/** Check if local time is past noon (12:00) in user's timezone */
function isPastNoonLocal(timezone: string): boolean {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    const hour = parseInt(formatter.format(now), 10)
    return hour >= 12
  } catch {
    return true // default to allowing resolution
  }
}

/** Add days to a date string (YYYY-MM-DD) */
function addDaysToDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Compare date strings: returns negative if a<b, 0 if equal, positive if a>b */
function compareDates(a: string, b: string): number {
  return a.localeCompare(b)
}

/** Get all dates from start to end (inclusive) */
function getDateRange(start: string, end: string): string[] {
  const dates: string[] = []
  let current = start
  while (compareDates(current, end) <= 0) {
    dates.push(current)
    current = addDaysToDate(current, 1)
  }
  return dates
}

/** Points per block type (completed only) */
function getBlockPoints(blockType: BlockType): number {
  switch (blockType) {
    case 'workout': return SCORING.WORKOUT
    case 'habit': return SCORING.HABIT
    case 'nutrition': return SCORING.NUTRITION
    case 'challenge': return SCORING.CHALLENGE
    default: return 0 // checkin, personal don't score
  }
}

/** Block types that count for scoring */
function isScoringBlockType(blockType: BlockType): boolean {
  return ['workout', 'habit', 'nutrition', 'challenge'].includes(blockType)
}

// ============================================================================
// Core: Compute day metrics for a single user + date
// ============================================================================

function computeDayMetrics(
  blocks: BlockRow[],
  frameworkChecked: number,
  hasActiveFramework: boolean
): DayMetrics {
  // Filter to scoring block types only
  const scoringBlocks = blocks.filter(b => isScoringBlockType(b.block_type))

  const planned = scoringBlocks.filter(b => b.is_planned)
  const completed = scoringBlocks.filter(b => b.completed_at !== null)
  const plannedCount = planned.length
  const completedCount = completed.length

  // No planned blocks = day voided
  if (plannedCount === 0) {
    return {
      planned_blocks: 0,
      completed_blocks: completedCount,
      execution_rate: 0,
      framework_checked: frameworkChecked,
      base_points: 0,
      penalties: 0,
      multiplier: 0,
      gated: true,
      delta: 0,
      breakdown: { no_plan_voided: 1 },
    }
  }

  const executionRate = completedCount / plannedCount

  // Gating: must have planned >= 1 and execution >= 60%
  if (executionRate < 0.6) {
    return {
      planned_blocks: plannedCount,
      completed_blocks: completedCount,
      execution_rate: executionRate,
      framework_checked: frameworkChecked,
      base_points: 0,
      penalties: 0,
      multiplier: 0,
      gated: true,
      delta: 0,
      breakdown: { gated_low_execution: 1, execution_rate: executionRate },
    }
  }

  // --- Base points from completed blocks ---
  let basePoints = 0
  const breakdownCounts: Record<string, number> = {}

  for (const block of completed) {
    const pts = getBlockPoints(block.block_type)
    basePoints += pts
    const key = `${block.block_type}_completed`
    breakdownCounts[key] = (breakdownCounts[key] || 0) + 1
  }

  // Framework points
  const frameworkPoints = frameworkChecked * SCORING.FRAMEWORK_ITEM
  basePoints += frameworkPoints
  breakdownCounts.framework_points = frameworkPoints

  // --- Penalties ---
  let penalties = 0

  // Missed planned blocks (planned but not completed)
  const missedCount = planned.filter(b => b.completed_at === null).length
  const missedPenalty = Math.max(
    missedCount * SCORING.MISSED_BLOCK,
    SCORING.MISSED_BLOCK_CAP
  )
  penalties += missedPenalty
  breakdownCounts.missed_penalty = missedPenalty

  // Planned but zero completed
  if (completedCount === 0 && plannedCount > 0) {
    penalties += SCORING.PLANNED_ZERO_COMPLETED
    breakdownCounts.planned_zero_completed = SCORING.PLANNED_ZERO_COMPLETED
  }

  // Framework active but zero progress
  if (hasActiveFramework && frameworkChecked === 0) {
    penalties += SCORING.FRAMEWORK_ZERO_PROGRESS
    breakdownCounts.framework_zero_progress = SCORING.FRAMEWORK_ZERO_PROGRESS
  }

  // --- Multiplier ---
  const multiplier = getExecutionMultiplier(executionRate)
  breakdownCounts.multiplier = multiplier
  breakdownCounts.execution_rate = executionRate

  // --- Final delta ---
  const rawDelta = (basePoints + penalties) * multiplier
  const delta = Math.max(0, Math.floor(rawDelta)) // Clamp: never negative, floor

  breakdownCounts.base_points = basePoints
  breakdownCounts.penalties_total = penalties
  breakdownCounts.raw_delta = rawDelta
  breakdownCounts.final_delta = delta

  return {
    planned_blocks: plannedCount,
    completed_blocks: completedCount,
    execution_rate: executionRate,
    framework_checked: frameworkChecked,
    base_points: basePoints,
    penalties,
    multiplier,
    gated: false,
    delta,
    breakdown: breakdownCounts,
  }
}

// ============================================================================
// Core: Reconcile a single user
// ============================================================================

async function reconcileUser(
  supabase: SupabaseClient,
  profile: UserProfile
): Promise<{ datesResolved: number; error?: string }> {
  const { id: userId, timezone } = profile
  let { discipline_score, current_streak, best_streak, last_resolved_date } = profile

  // Determine the range of dates to process
  const userToday = getUserLocalDate(timezone)
  const userYesterday = addDaysToDate(userToday, -1)

  // The latest date we can resolve: yesterday, or today if past noon
  const latestResolvable = isPastNoonLocal(timezone) ? userToday : userYesterday

  // Start date: day after last resolved, or 7 days ago if never resolved
  const startDate = last_resolved_date
    ? addDaysToDate(last_resolved_date, 1)
    : addDaysToDate(userToday, -7)

  // Nothing to resolve
  if (compareDates(startDate, latestResolvable) > 0) {
    return { datesResolved: 0 }
  }

  const datesToProcess = getDateRange(startDate, latestResolvable)
  // Safety cap: don't process more than 30 days at once
  const cappedDates = datesToProcess.slice(0, 30)

  // Check if user has active framework
  const { data: userFramework } = await supabase
    .from('user_frameworks')
    .select('framework_template_id')
    .eq('user_id', userId)
    .maybeSingle()

  const hasActiveFramework = !!userFramework

  let datesResolved = 0

  for (const targetDate of cappedDates) {
    // Check if daily_scores already exists for this date (idempotency)
    const { data: existingScore } = await supabase
      .from('daily_scores')
      .select('id')
      .eq('user_id', userId)
      .eq('date', targetDate)
      .maybeSingle()

    if (existingScore) {
      // Already scored — update last_resolved_date but don't re-score
      last_resolved_date = targetDate
      datesResolved++
      continue
    }

    // Fetch blocks for this date
    const { data: blocks, error: blocksErr } = await supabase
      .from('blocks')
      .select('id, block_type, is_planned, completed_at, performed_at, deleted_at')
      .eq('user_id', userId)
      .eq('date', targetDate)
      .is('deleted_at', null)

    if (blocksErr) {
      return { datesResolved, error: `blocks query failed for ${userId}/${targetDate}: ${blocksErr.message}` }
    }

    // Fetch framework items checked for this date
    let frameworkChecked = 0
    if (hasActiveFramework && userFramework) {
      const { data: fwItems } = await supabase
        .from('daily_framework_items')
        .select('checked')
        .eq('user_id', userId)
        .eq('date', targetDate)
        .eq('framework_template_id', userFramework.framework_template_id)
        .eq('checked', true)

      frameworkChecked = fwItems?.length || 0
    }

    // Compute metrics
    const metrics = computeDayMetrics(
      (blocks || []) as BlockRow[],
      frameworkChecked,
      hasActiveFramework
    )

    // Cutoff timestamp in user's timezone at noon
    const cutoffAt = new Date().toISOString() // actual resolution time

    // Upsert daily_user_metrics
    await supabase
      .from('daily_user_metrics')
      .upsert({
        user_id: userId,
        date: targetDate,
        timezone,
        planned_blocks: metrics.planned_blocks,
        completed_blocks: metrics.completed_blocks,
        execution_rate: metrics.execution_rate,
        framework_checked: metrics.framework_checked,
        base_points: metrics.base_points,
        penalties: metrics.penalties,
        multiplier: metrics.multiplier,
        gated: metrics.gated,
        delta: metrics.delta,
      }, { onConflict: 'user_id,date' })

    // Insert daily_scores (idempotent — unique index will reject duplicates)
    const { error: scoreErr } = await supabase
      .from('daily_scores')
      .insert({
        user_id: userId,
        date: targetDate,
        delta: metrics.delta,
        breakdown: metrics.breakdown,
        cutoff_at: cutoffAt,
        resolved_at: cutoffAt,
      })

    if (scoreErr && !scoreErr.message.includes('duplicate')) {
      return { datesResolved, error: `daily_scores insert failed for ${userId}/${targetDate}: ${scoreErr.message}` }
    }

    // Update lifetime score (only increases)
    discipline_score += metrics.delta

    // Update streak from daily_user_activity
    const { data: activityRow } = await supabase
      .from('daily_user_activity')
      .select('block_count')
      .eq('user_id', userId)
      .eq('date', targetDate)
      .maybeSingle()

    if (activityRow && activityRow.block_count > 0) {
      // User was active on this date — streak continues
      current_streak += 1
      if (current_streak > best_streak) {
        best_streak = current_streak
      }
    } else {
      // No activity — streak resets
      current_streak = 0
    }

    last_resolved_date = targetDate
    datesResolved++
  }

  // Recompute badge tier from lifetime score
  const badgeTier = getBadgeFromScore(discipline_score)

  // Evaluate badge wear eligibility (last 7 days from daily_user_metrics)
  const { data: recentMetrics } = await supabase
    .from('daily_user_metrics')
    .select('date, planned_blocks, completed_blocks, execution_rate')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(7)

  const eligibility = evaluateBadgeEligibility(recentMetrics || [])

  // Update profile in a single write
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({
      discipline_score,
      current_streak,
      best_streak,
      last_resolved_date,
      badge_tier: badgeTier,
      badge_locked: !eligibility.canWear,
      badge_locked_reasons: eligibility.reasons,
      badge_last_evaluated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (profileErr) {
    return { datesResolved, error: `profile update failed for ${userId}: ${profileErr.message}` }
  }

  return { datesResolved }
}

// ============================================================================
// Badge eligibility evaluation
// ============================================================================

function evaluateBadgeEligibility(
  recentMetrics: Array<{
    date: string
    planned_blocks: number
    completed_blocks: number
    execution_rate: number
  }>
): { canWear: boolean; reasons: string[] } {
  if (recentMetrics.length === 0) {
    return { canWear: false, reasons: ['No recent activity data'] }
  }

  const reasons: string[] = []

  // Sort descending by date
  const sorted = [...recentMetrics].sort((a, b) => b.date.localeCompare(a.date))
  const last7 = sorted.slice(0, 7)
  const last5 = sorted.slice(0, 5)

  // >= 4 executed days in last 7 (execution >= 60%)
  const executedDays = last7.filter(d => d.planned_blocks > 0 && d.execution_rate >= 0.6).length
  if (executedDays < 4) {
    reasons.push(`Only ${executedDays}/4 executed days in last 7`)
  }

  // avg execution >= 70% over last 7 days (only days with planned blocks)
  const daysWithPlanned = last7.filter(d => d.planned_blocks > 0)
  const avgExecution = daysWithPlanned.length > 0
    ? daysWithPlanned.reduce((sum, d) => sum + d.execution_rate, 0) / daysWithPlanned.length
    : 0
  if (avgExecution < 0.7) {
    reasons.push(`Avg execution ${(avgExecution * 100).toFixed(0)}% (need 70%)`)
  }

  // No days with 0 planned blocks in last 5
  const zeroPlanDays = last5.filter(d => d.planned_blocks === 0).length
  if (zeroPlanDays > 0) {
    reasons.push(`${zeroPlanDays} day(s) with no plans in last 5`)
  }

  return { canWear: reasons.length === 0, reasons }
}

// ============================================================================
// Team Daily Overview generation
// ============================================================================

async function generateTeamOverviews(
  supabase: SupabaseClient,
  targetDate: string
): Promise<{ teamsUpdated: number; errors: string[] }> {
  const errors: string[] = []

  // Fetch all teams
  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id, team_number')

  if (teamsErr || !teams) {
    return { teamsUpdated: 0, errors: [`Failed to fetch teams: ${teamsErr?.message}`] }
  }

  let teamsUpdated = 0

  for (const team of teams) {
    // Fetch active members
    const { data: members } = await supabase
      .from('team_members')
      .select('user_id, role')
      .eq('team_id', team.id)
      .is('left_at', null)

    if (!members || members.length === 0) continue

    const memberIds = members.map(m => m.user_id)

    // Fetch metrics for all members on this date
    const { data: metricsRows } = await supabase
      .from('daily_user_metrics')
      .select('user_id, planned_blocks, completed_blocks, execution_rate, delta')
      .eq('date', targetDate)
      .in('user_id', memberIds)

    // Fetch profiles for display names
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_path, discipline_score')
      .in('id', memberIds)

    const profileMap = new Map(
      (profiles || []).map(p => [p.id, p])
    )
    const metricsMap = new Map(
      (metricsRows || []).map(m => [m.user_id, m])
    )

    // Fetch framework submissions for the date
    const { data: fwSubmissions } = await supabase
      .from('daily_framework_submissions')
      .select('user_id, status')
      .eq('date', targetDate)
      .in('user_id', memberIds)

    const fwMap = new Map(
      (fwSubmissions || []).map(s => [s.user_id, s.status])
    )

    // Build member snapshots
    const memberSnapshots = memberIds.map(uid => {
      const profile = profileMap.get(uid)
      const metrics = metricsMap.get(uid)

      return {
        user_id: uid,
        display_name: profile?.display_name || null,
        avatar_path: profile?.avatar_path || null,
        discipline_score: profile?.discipline_score || 0,
        daily_delta: metrics?.delta || 0,
        execution_rate: metrics?.execution_rate || 0,
        planned_blocks: metrics?.planned_blocks || 0,
        completed_blocks: metrics?.completed_blocks || 0,
        framework_status: fwMap.get(uid) || null,
      }
    })

    // Compute summary
    const membersWithMetrics = memberSnapshots.filter(m => m.planned_blocks > 0)
    const executedMembers = memberSnapshots.filter(m => m.execution_rate >= 0.6)
    const teamDelta = memberSnapshots.reduce((sum, m) => sum + m.daily_delta, 0)
    const avgExecution = membersWithMetrics.length > 0
      ? membersWithMetrics.reduce((sum, m) => sum + m.execution_rate, 0) / membersWithMetrics.length
      : 0

    // Top performers (highest delta, top 2)
    const sortedByDelta = [...memberSnapshots]
      .filter(m => m.daily_delta > 0)
      .sort((a, b) => b.daily_delta - a.daily_delta)
    const highlights = sortedByDelta.slice(0, 2).map(m => ({
      user_id: m.user_id,
      name: m.display_name || 'Member',
      delta: m.daily_delta,
      execution: m.execution_rate,
    }))

    // Flagged members
    const flags = memberSnapshots
      .filter(m => {
        if (m.planned_blocks === 0) return true
        if (m.planned_blocks > 0 && m.execution_rate < 0.6) return true
        return false
      })
      .slice(0, 3)
      .map(m => ({
        user_id: m.user_id,
        name: m.display_name || 'Member',
        reason: m.planned_blocks === 0
          ? 'No planned blocks'
          : `${Math.round(m.execution_rate * 100)}% execution`,
      }))

    const payload = {
      date: targetDate,
      team_number: team.team_number,
      summary: {
        executed: `${executedMembers.length}/${memberIds.length}`,
        avg_execution: Math.round(avgExecution * 100) / 100,
        team_delta: teamDelta,
      },
      highlights,
      flags,
      // Legacy compat
      members: memberSnapshots,
      total_score: teamDelta,
      avg_score: memberIds.length > 0 ? Math.round(teamDelta / memberIds.length) : 0,
    }

    // Upsert team_daily_overviews (unique index on team_id, date)
    const { error: upsertErr } = await supabase
      .from('team_daily_overviews')
      .upsert({
        team_id: team.id,
        date: targetDate,
        generated_at: new Date().toISOString(),
        snapshot: payload,
      }, { onConflict: 'team_id,date' })

    if (upsertErr) {
      errors.push(`team_daily_overviews upsert failed for team ${team.team_number}: ${upsertErr.message}`)
    } else {
      teamsUpdated++
    }
  }

  return { teamsUpdated, errors }
}

// ============================================================================
// Main entry point
// ============================================================================

export async function runReconciliation(
  supabase: SupabaseClient
): Promise<ReconciliationResult> {
  const result: ReconciliationResult = {
    users_processed: 0,
    dates_resolved: 0,
    teams_updated: 0,
    errors: [],
  }

  // Fetch all non-paused users
  const { data: users, error: usersErr } = await supabase
    .from('profiles')
    .select('id, timezone, discipline_score, current_streak, best_streak, last_resolved_date, is_paused')
    .eq('is_paused', false)

  if (usersErr || !users) {
    result.errors.push(`Failed to fetch users: ${usersErr?.message}`)
    return result
  }

  // Track which dates were resolved (for team overview generation)
  const resolvedDates = new Set<string>()

  for (const user of users) {
    const profile: UserProfile = {
      id: user.id,
      timezone: user.timezone || 'Europe/London',
      discipline_score: user.discipline_score || 0,
      current_streak: user.current_streak || 0,
      best_streak: user.best_streak || 0,
      last_resolved_date: user.last_resolved_date,
      is_paused: user.is_paused,
    }

    const { datesResolved, error } = await reconcileUser(supabase, profile)

    if (error) {
      result.errors.push(error)
    }

    if (datesResolved > 0) {
      result.users_processed++
      result.dates_resolved += datesResolved

      // Track the dates we resolved for team overview generation
      const startDate = profile.last_resolved_date
        ? addDaysToDate(profile.last_resolved_date, 1)
        : addDaysToDate(getUserLocalDate(profile.timezone), -7)
      const endDate = getUserLocalDate(profile.timezone)
      const dates = getDateRange(startDate, endDate).slice(0, 30)
      dates.forEach(d => resolvedDates.add(d))
    }
  }

  // Generate team daily overviews for all resolved dates
  for (const date of resolvedDates) {
    const { teamsUpdated, errors } = await generateTeamOverviews(supabase, date)
    result.teams_updated += teamsUpdated
    result.errors.push(...errors)
  }

  return result
}
