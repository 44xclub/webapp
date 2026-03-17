/**
 * Event RSVP State Machine — Server-Side Service
 *
 * All RSVP state transitions are handled here.
 * Frontend must call the API route, not decide going/waitlist.
 *
 * Counts are always derived from actual row counts in event_rsvps,
 * never from incrementing/decrementing a cached counter. This prevents
 * double-counting from database triggers or race conditions.
 *
 * This module is server-side only — never import in client components.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  notifyEventRsvpConfirmed,
  notifyEventWaitlisted,
  notifyEventWaitlistPromoted,
} from './notifications'

export interface RsvpResult {
  ok: boolean
  response: 'going' | 'waitlist' | 'cancelled' | 'full'
  error?: string
  waitlistPosition?: number
  eventId?: string
  rsvpGoingCount?: number
  rsvpWaitlistCount?: number
  capacity?: number | null
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Count actual RSVP rows and sync the cached counters on the events table.
 * Returns the true counts. This is the single source of truth.
 */
async function syncEventCounts(
  supabase: SupabaseClient,
  eventId: string
): Promise<{ goingCount: number; waitlistCount: number }> {
  // Count going
  const { count: goingCount } = await supabase
    .from('event_rsvps')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('response', 'going')

  // Count waitlist
  const { count: waitlistCount } = await supabase
    .from('event_rsvps')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('response', 'waitlist')

  const going = goingCount ?? 0
  const waitlist = waitlistCount ?? 0

  // Sync the cached counters on events table
  await supabase
    .from('events')
    .update({ rsvp_going_count: going, rsvp_waitlist_count: waitlist })
    .eq('id', eventId)

  return { goingCount: going, waitlistCount: waitlist }
}

// ============================================================================
// Action A: RSVP to event
// ============================================================================

export async function rsvpToEvent(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<RsvpResult> {
  // Fetch event
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, title, starts_at, timezone, capacity, waitlist_enabled, status')
    .eq('id', eventId)
    .single()

  if (eventErr || !event) {
    return { ok: false, response: 'full', error: 'Event not found' }
  }

  if (event.status !== 'published') {
    return { ok: false, response: 'full', error: 'Event is not open for RSVP' }
  }

  // Check if user already has an active RSVP
  const { data: existingRsvp } = await supabase
    .from('event_rsvps')
    .select('id, response')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existingRsvp && (existingRsvp.response === 'going' || existingRsvp.response === 'waitlist')) {
    // Already active — return current counts
    const counts = await syncEventCounts(supabase, eventId)
    return {
      ok: true,
      response: existingRsvp.response as 'going' | 'waitlist',
      eventId,
      rsvpGoingCount: counts.goingCount,
      rsvpWaitlistCount: counts.waitlistCount,
      capacity: event.capacity,
    }
  }

  // Get current going count from actual rows to decide capacity
  const { count: currentGoingCount } = await supabase
    .from('event_rsvps')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('response', 'going')

  const goingNow = currentGoingCount ?? 0
  const hasCapacity = event.capacity !== null
  const isFull = hasCapacity && goingNow >= event.capacity!

  if (isFull && !event.waitlist_enabled) {
    return { ok: false, response: 'full', error: 'Event is full' }
  }

  if (isFull && event.waitlist_enabled) {
    // Add to waitlist
    const { count: currentWaitlistCount } = await supabase
      .from('event_rsvps')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('response', 'waitlist')

    const nextPosition = (currentWaitlistCount ?? 0) + 1

    if (existingRsvp) {
      const { error } = await supabase
        .from('event_rsvps')
        .update({
          response: 'waitlist',
          waitlist_position: nextPosition,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRsvp.id)

      if (error) return { ok: false, response: 'full', error: error.message }
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, whop_email')
        .eq('id', userId)
        .single()

      const { error } = await supabase
        .from('event_rsvps')
        .insert({
          event_id: eventId,
          user_id: userId,
          response: 'waitlist',
          waitlist_position: nextPosition,
          display_name_snapshot: profile?.display_name || null,
          email_snapshot: profile?.whop_email || null,
        })

      if (error) {
        if (error.code === '23505') {
          return { ok: false, response: 'full', error: 'Already RSVPed' }
        }
        return { ok: false, response: 'full', error: error.message }
      }
    }

    // Sync counts from actual rows
    const counts = await syncEventCounts(supabase, eventId)

    await notifyEventWaitlisted(supabase, userId, {
      id: event.id,
      title: event.title,
    })

    return {
      ok: true,
      response: 'waitlist',
      waitlistPosition: nextPosition,
      eventId,
      rsvpGoingCount: counts.goingCount,
      rsvpWaitlistCount: counts.waitlistCount,
      capacity: event.capacity,
    }
  }

  // Not full or no capacity limit — confirm as going
  if (existingRsvp) {
    const { error } = await supabase
      .from('event_rsvps')
      .update({
        response: 'going',
        waitlist_position: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRsvp.id)

    if (error) return { ok: false, response: 'full', error: error.message }
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, whop_email')
      .eq('id', userId)
      .single()

    const { error } = await supabase
      .from('event_rsvps')
      .insert({
        event_id: eventId,
        user_id: userId,
        response: 'going',
        waitlist_position: null,
        display_name_snapshot: profile?.display_name || null,
        email_snapshot: profile?.whop_email || null,
      })

    if (error) {
      if (error.code === '23505') {
        return { ok: false, response: 'full', error: 'Already RSVPed' }
      }
      return { ok: false, response: 'full', error: error.message }
    }
  }

  // Sync counts from actual rows — this is the single source of truth
  const counts = await syncEventCounts(supabase, eventId)

  // Concurrency check: if we actually exceeded capacity, rollback to waitlist
  if (event.capacity !== null && counts.goingCount > event.capacity!) {
    const { data: rsvpRow } = await supabase
      .from('event_rsvps')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single()

    if (rsvpRow) {
      const { count: wlCount } = await supabase
        .from('event_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('response', 'waitlist')

      const nextWaitPos = (wlCount ?? 0) + 1
      await supabase
        .from('event_rsvps')
        .update({
          response: 'waitlist',
          waitlist_position: nextWaitPos,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rsvpRow.id)

      const updatedCounts = await syncEventCounts(supabase, eventId)

      await notifyEventWaitlisted(supabase, userId, {
        id: event.id,
        title: event.title,
      })

      return {
        ok: true,
        response: 'waitlist',
        waitlistPosition: nextWaitPos,
        eventId,
        rsvpGoingCount: updatedCounts.goingCount,
        rsvpWaitlistCount: updatedCounts.waitlistCount,
        capacity: event.capacity,
      }
    }
  }

  // Queue notifications
  await notifyEventRsvpConfirmed(supabase, userId, {
    id: event.id,
    title: event.title,
    starts_at: event.starts_at,
    timezone: event.timezone,
  })

  return {
    ok: true,
    response: 'going',
    eventId,
    rsvpGoingCount: counts.goingCount,
    rsvpWaitlistCount: counts.waitlistCount,
    capacity: event.capacity,
  }
}

// ============================================================================
// Action B: Cancel RSVP + Waitlist Promotion
// ============================================================================

export async function cancelEventRsvp(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<RsvpResult> {
  // Find existing RSVP
  const { data: rsvp, error: rsvpErr } = await supabase
    .from('event_rsvps')
    .select('id, response, waitlist_position')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single()

  if (rsvpErr || !rsvp) {
    return { ok: false, response: 'cancelled', error: 'No RSVP found' }
  }

  const previousResponse = rsvp.response

  // Update to cancelled
  const { error: updateErr } = await supabase
    .from('event_rsvps')
    .update({
      response: 'cancelled',
      waitlist_position: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rsvp.id)

  if (updateErr) {
    return { ok: false, response: 'cancelled', error: updateErr.message }
  }

  // Fetch event for notification data and waitlist promotion
  const { data: event } = await supabase
    .from('events')
    .select('id, title, starts_at, timezone, capacity, waitlist_enabled')
    .eq('id', eventId)
    .single()

  // Waitlist promotion if a confirmed user cancelled
  if (previousResponse === 'going' && event?.waitlist_enabled) {
    await promoteNextFromWaitlist(supabase, event)
  }

  // Sync counts from actual rows — always correct after all mutations
  const counts = await syncEventCounts(supabase, eventId)

  return {
    ok: true,
    response: 'cancelled',
    eventId,
    rsvpGoingCount: counts.goingCount,
    rsvpWaitlistCount: counts.waitlistCount,
    capacity: event?.capacity ?? null,
  }
}

// ============================================================================
// Waitlist Promotion
// ============================================================================

async function promoteNextFromWaitlist(
  supabase: SupabaseClient,
  event: {
    id: string
    title: string
    starts_at: string
    timezone: string
  }
): Promise<void> {
  // Find the next waitlisted user (lowest waitlist_position)
  const { data: nextInLine } = await supabase
    .from('event_rsvps')
    .select('id, user_id, waitlist_position')
    .eq('event_id', event.id)
    .eq('response', 'waitlist')
    .order('waitlist_position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!nextInLine) return

  // Promote: update to going
  const { error: promoteErr } = await supabase
    .from('event_rsvps')
    .update({
      response: 'going',
      waitlist_position: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', nextInLine.id)

  if (promoteErr) {
    console.error('[waitlist-promotion] Failed:', promoteErr.message)
    return
  }

  // No manual count update needed — syncEventCounts in the caller handles it

  // Notify promoted user
  await notifyEventWaitlistPromoted(supabase, nextInLine.user_id, {
    id: event.id,
    title: event.title,
    starts_at: event.starts_at,
    timezone: event.timezone,
  })
}
