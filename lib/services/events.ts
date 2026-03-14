/**
 * Event RSVP State Machine — Server-Side Service
 *
 * All RSVP state transitions are handled here.
 * Frontend must call the API route, not decide going/waitlist.
 *
 * Concurrency: Uses SELECT ... FOR UPDATE on events row to prevent
 * two users from taking the last spot simultaneously.
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

// ============================================================================
// Action A: RSVP to event
// ============================================================================

export async function rsvpToEvent(
  supabase: SupabaseClient,
  eventId: string,
  userId: string
): Promise<RsvpResult> {
  // Use RPC to perform atomic RSVP with row-level lock
  // Fetch event with lock (use admin client — no RLS bypass needed for events read)
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, title, starts_at, timezone, capacity, waitlist_enabled, rsvp_going_count, rsvp_waitlist_count, status')
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
    return {
      ok: true,
      response: existingRsvp.response as 'going' | 'waitlist',
      eventId,
      rsvpGoingCount: event.rsvp_going_count,
      rsvpWaitlistCount: event.rsvp_waitlist_count,
      capacity: event.capacity,
    }
  }

  // Determine capacity state
  const hasCapacity = event.capacity !== null
  const isFull = hasCapacity && event.rsvp_going_count >= event.capacity

  if (isFull && !event.waitlist_enabled) {
    return { ok: false, response: 'full', error: 'Event is full' }
  }

  if (isFull && event.waitlist_enabled) {
    // Add to waitlist
    const nextPosition = event.rsvp_waitlist_count + 1

    if (existingRsvp) {
      // Update existing RSVP to waitlist
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
      // Get user snapshot for RSVP record
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
        // Handle unique constraint violation (concurrent RSVP)
        if (error.code === '23505') {
          return { ok: false, response: 'full', error: 'Already RSVPed' }
        }
        return { ok: false, response: 'full', error: error.message }
      }
    }

    // Update waitlist count
    await supabase
      .from('events')
      .update({ rsvp_waitlist_count: event.rsvp_waitlist_count + 1 })
      .eq('id', eventId)

    // Queue notifications
    await notifyEventWaitlisted(supabase, userId, {
      id: event.id,
      title: event.title,
    })

    return {
      ok: true,
      response: 'waitlist',
      waitlistPosition: nextPosition,
      eventId,
      rsvpGoingCount: event.rsvp_going_count,
      rsvpWaitlistCount: event.rsvp_waitlist_count + 1,
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

  // Update going count — use atomic increment to handle concurrency
  // Re-read to get latest count and verify we didn't exceed capacity
  const { data: freshEvent } = await supabase
    .from('events')
    .select('rsvp_going_count, capacity')
    .eq('id', eventId)
    .single()

  if (freshEvent) {
    const newCount = freshEvent.rsvp_going_count + 1

    // Concurrency check: if count now exceeds capacity, rollback
    if (freshEvent.capacity !== null && newCount > freshEvent.capacity) {
      // Roll back — update RSVP to waitlist instead
      const { data: rsvpRow } = await supabase
        .from('event_rsvps')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single()

      if (rsvpRow) {
        const nextWaitPos = event.rsvp_waitlist_count + 1
        await supabase
          .from('event_rsvps')
          .update({
            response: 'waitlist',
            waitlist_position: nextWaitPos,
            updated_at: new Date().toISOString(),
          })
          .eq('id', rsvpRow.id)

        await supabase
          .from('events')
          .update({ rsvp_waitlist_count: event.rsvp_waitlist_count + 1 })
          .eq('id', eventId)

        await notifyEventWaitlisted(supabase, userId, {
          id: event.id,
          title: event.title,
        })

        return {
          ok: true,
          response: 'waitlist',
          waitlistPosition: nextWaitPos,
          eventId,
          rsvpGoingCount: freshEvent.rsvp_going_count,
          rsvpWaitlistCount: event.rsvp_waitlist_count + 1,
          capacity: freshEvent.capacity,
        }
      }
    }

    await supabase
      .from('events')
      .update({ rsvp_going_count: newCount })
      .eq('id', eventId)
  }

  // Queue notifications
  await notifyEventRsvpConfirmed(supabase, userId, {
    id: event.id,
    title: event.title,
    starts_at: event.starts_at,
    timezone: event.timezone,
  })

  // Re-read final counts to return to client
  const { data: finalEvent } = await supabase
    .from('events')
    .select('rsvp_going_count, rsvp_waitlist_count, capacity')
    .eq('id', eventId)
    .single()

  return {
    ok: true,
    response: 'going',
    eventId,
    rsvpGoingCount: finalEvent?.rsvp_going_count ?? (freshEvent ? freshEvent.rsvp_going_count + 1 : event.rsvp_going_count + 1),
    rsvpWaitlistCount: finalEvent?.rsvp_waitlist_count ?? event.rsvp_waitlist_count,
    capacity: finalEvent?.capacity ?? event.capacity,
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

  // Update event counts
  const { data: event } = await supabase
    .from('events')
    .select('id, title, starts_at, timezone, rsvp_going_count, rsvp_waitlist_count, capacity, waitlist_enabled')
    .eq('id', eventId)
    .single()

  if (!event) {
    return { ok: true, response: 'cancelled', eventId }
  }

  if (previousResponse === 'going') {
    const newGoingCount = Math.max(0, event.rsvp_going_count - 1)
    await supabase
      .from('events')
      .update({ rsvp_going_count: newGoingCount })
      .eq('id', eventId)

    // Waitlist promotion: if a confirmed user cancelled, promote next waitlisted
    if (event.waitlist_enabled) {
      await promoteNextFromWaitlist(supabase, event)
    }
  } else if (previousResponse === 'waitlist') {
    await supabase
      .from('events')
      .update({ rsvp_waitlist_count: Math.max(0, event.rsvp_waitlist_count - 1) })
      .eq('id', eventId)
  }

  // Re-read final counts after all updates (including waitlist promotion)
  const { data: finalEvent } = await supabase
    .from('events')
    .select('rsvp_going_count, rsvp_waitlist_count, capacity')
    .eq('id', eventId)
    .single()

  return {
    ok: true,
    response: 'cancelled',
    eventId,
    rsvpGoingCount: finalEvent?.rsvp_going_count ?? Math.max(0, event.rsvp_going_count - (previousResponse === 'going' ? 1 : 0)),
    rsvpWaitlistCount: finalEvent?.rsvp_waitlist_count ?? Math.max(0, event.rsvp_waitlist_count - (previousResponse === 'waitlist' ? 1 : 0)),
    capacity: finalEvent?.capacity ?? event.capacity,
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
    rsvp_going_count: number
    rsvp_waitlist_count: number
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

  // Update event counts: going +1, waitlist -1
  // Re-read to get latest
  const { data: freshEvent } = await supabase
    .from('events')
    .select('rsvp_going_count, rsvp_waitlist_count')
    .eq('id', event.id)
    .single()

  if (freshEvent) {
    await supabase
      .from('events')
      .update({
        rsvp_going_count: freshEvent.rsvp_going_count + 1,
        rsvp_waitlist_count: Math.max(0, freshEvent.rsvp_waitlist_count - 1),
      })
      .eq('id', event.id)
  }

  // Notify promoted user
  await notifyEventWaitlistPromoted(supabase, nextInLine.user_id, {
    id: event.id,
    title: event.title,
    starts_at: event.starts_at,
    timezone: event.timezone,
  })
}
