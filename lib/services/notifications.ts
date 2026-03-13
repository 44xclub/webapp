/**
 * Central Notification & Dispatch Service
 *
 * All in-app notifications write to `notifications`.
 * All email sends go through `notification_dispatch_queue`.
 * Dedupe keys are generated centrally here to prevent spam.
 *
 * This module is server-side only — never import in client components.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Dedupe key generators
// ============================================================================

export const dedupeKeys = {
  eventRsvpConfirmed: (eventId: string, userId: string) =>
    `event_rsvp_confirmed:${eventId}:${userId}`,
  eventWaitlistConfirmed: (eventId: string, userId: string) =>
    `event_waitlist_confirmed:${eventId}:${userId}`,
  eventWaitlistPromoted: (eventId: string, userId: string) =>
    `event_waitlist_promoted:${eventId}:${userId}`,
  eventNewPublished: (eventId: string, userId: string) =>
    `event_new_published:${eventId}:${userId}`,
  frameworkCompleted: (userId: string, date: string) =>
    `framework_completed:${userId}:${date}`,
  dailySummaryAvailable: (userId: string, summaryDate: string) =>
    `daily_summary_available:${userId}:${summaryDate}`,
}

// ============================================================================
// Core: Create in-app notification
// ============================================================================

export async function createInAppNotification(
  supabase: SupabaseClient,
  params: {
    userId: string
    type: string
    title: string
    body: string
    meta?: Record<string, unknown>
    dedupeKey?: string
  }
): Promise<string | null> {
  // If dedupe key is provided, check for existing notification
  if (params.dedupeKey) {
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', params.userId)
      .eq('type', params.type)
      .contains('meta', { dedupe_key: params.dedupeKey })
      .maybeSingle()

    if (existing) return existing.id
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      severity: 'info',
      title: params.title,
      body: params.body,
      meta: {
        ...(params.meta || {}),
        ...(params.dedupeKey ? { dedupe_key: params.dedupeKey } : {}),
      },
    })
    .select('id')
    .single()

  if (error) {
    console.error('[notifications] Insert failed:', error.message)
    return null
  }

  return data.id
}

// ============================================================================
// Core: Queue email notification
// ============================================================================

export async function queueEmailNotification(
  supabase: SupabaseClient,
  params: {
    userId: string
    eventKey: string
    subject: string
    body: string
    payload?: Record<string, unknown>
    dedupeKey: string
  }
): Promise<string | null> {
  const { data, error } = await supabase
    .from('notification_dispatch_queue')
    .upsert(
      {
        user_id: params.userId,
        channel: 'email',
        event_key: params.eventKey,
        subject: params.subject,
        body: params.body,
        payload: params.payload || {},
        dedupe_key: params.dedupeKey,
        status: 'pending',
      },
      { onConflict: 'dedupe_key', ignoreDuplicates: true }
    )
    .select('id')
    .single()

  if (error) {
    // Ignore duplicate key conflicts — that's dedupe working
    if (error.code === '23505' || error.message?.includes('duplicate')) {
      return null
    }
    console.error('[dispatch-queue] Insert failed:', error.message)
    return null
  }

  return data?.id || null
}

// ============================================================================
// Combined: enqueue both in-app + email
// ============================================================================

export async function enqueueNotification(
  supabase: SupabaseClient,
  params: {
    userId: string
    type: string
    title: string
    body: string
    emailSubject: string
    emailBody: string
    eventKey: string
    dedupeKey: string
    meta?: Record<string, unknown>
    emailPayload?: Record<string, unknown>
  }
): Promise<void> {
  await Promise.all([
    createInAppNotification(supabase, {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      meta: params.meta,
      dedupeKey: params.dedupeKey,
    }),
    queueEmailNotification(supabase, {
      userId: params.userId,
      eventKey: params.eventKey,
      subject: params.emailSubject,
      body: params.emailBody,
      payload: params.emailPayload,
      dedupeKey: params.dedupeKey,
    }),
  ])
}

// ============================================================================
// Domain-specific notification helpers
// ============================================================================

export async function notifyEventRsvpConfirmed(
  supabase: SupabaseClient,
  userId: string,
  event: { id: string; title: string; starts_at: string; timezone: string }
): Promise<void> {
  const dk = dedupeKeys.eventRsvpConfirmed(event.id, userId)
  await enqueueNotification(supabase, {
    userId,
    type: 'event_rsvp_confirmed',
    title: "You're in",
    body: `You're confirmed for ${event.title}.`,
    emailSubject: `You're in — ${event.title}`,
    emailBody: `You're confirmed for ${event.title} on ${event.starts_at}.`,
    eventKey: 'event_rsvp_confirmed',
    dedupeKey: dk,
    meta: { event_id: event.id, event_title: event.title },
    emailPayload: {
      event_id: event.id,
      event_title: event.title,
      starts_at: event.starts_at,
      timezone: event.timezone,
    },
  })
}

export async function notifyEventWaitlisted(
  supabase: SupabaseClient,
  userId: string,
  event: { id: string; title: string }
): Promise<void> {
  const dk = dedupeKeys.eventWaitlistConfirmed(event.id, userId)
  await enqueueNotification(supabase, {
    userId,
    type: 'event_waitlist_confirmed',
    title: "You're on the waiting list",
    body: `You've joined the waiting list for ${event.title}.`,
    emailSubject: `Waitlist confirmed — ${event.title}`,
    emailBody: `You've joined the waiting list for ${event.title}. We'll notify you if a spot opens.`,
    eventKey: 'event_waitlist_confirmed',
    dedupeKey: dk,
    meta: { event_id: event.id, event_title: event.title },
    emailPayload: { event_id: event.id, event_title: event.title },
  })
}

export async function notifyEventWaitlistPromoted(
  supabase: SupabaseClient,
  userId: string,
  event: { id: string; title: string; starts_at: string; timezone: string }
): Promise<void> {
  const dk = dedupeKeys.eventWaitlistPromoted(event.id, userId)
  await enqueueNotification(supabase, {
    userId,
    type: 'event_waitlist_promoted',
    title: "You're in",
    body: `A spot opened up for ${event.title}. You're now confirmed.`,
    emailSubject: `You're in — ${event.title}`,
    emailBody: `A spot opened up for ${event.title}. You're now confirmed.`,
    eventKey: 'event_waitlist_promoted',
    dedupeKey: dk,
    meta: { event_id: event.id, event_title: event.title },
    emailPayload: {
      event_id: event.id,
      event_title: event.title,
      starts_at: event.starts_at,
      timezone: event.timezone,
    },
  })
}

export async function broadcastNewEventAdded(
  supabase: SupabaseClient,
  event: { id: string; title: string; starts_at: string; timezone: string }
): Promise<{ userCount: number }> {
  // Check if already broadcast
  const { data: existing } = await supabase
    .from('event_broadcasts')
    .select('id')
    .eq('event_id', event.id)
    .eq('broadcast_type', 'new_event_added')
    .maybeSingle()

  if (existing) return { userCount: 0 }

  // Fetch all active users
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .eq('membership_status', 'active')

  if (!users || users.length === 0) return { userCount: 0 }

  // Create broadcast tracking row first (prevents re-broadcast)
  const { error: broadcastErr } = await supabase
    .from('event_broadcasts')
    .insert({
      event_id: event.id,
      broadcast_type: 'new_event_added',
      user_count: users.length,
    })

  if (broadcastErr) {
    // Duplicate — already broadcast
    if (broadcastErr.code === '23505') return { userCount: 0 }
    console.error('[broadcast] Insert failed:', broadcastErr.message)
    return { userCount: 0 }
  }

  // Queue notifications for all users
  const notificationPromises = users.map((user) => {
    const dk = dedupeKeys.eventNewPublished(event.id, user.id)
    return enqueueNotification(supabase, {
      userId: user.id,
      type: 'event_new_published',
      title: 'New event added',
      body: `${event.title} is now live.`,
      emailSubject: `New event added — ${event.title}`,
      emailBody: `${event.title} is now live. Check it out in the app.`,
      eventKey: 'event_new_published',
      dedupeKey: dk,
      meta: { event_id: event.id, event_title: event.title },
      emailPayload: {
        event_id: event.id,
        event_title: event.title,
        starts_at: event.starts_at,
        timezone: event.timezone,
      },
    })
  })

  // Process in batches of 20 to avoid overwhelming the DB
  const batchSize = 20
  for (let i = 0; i < notificationPromises.length; i += batchSize) {
    await Promise.all(notificationPromises.slice(i, i + batchSize))
  }

  return { userCount: users.length }
}

export async function notifyFrameworkCompleted(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<void> {
  const dk = dedupeKeys.frameworkCompleted(userId, date)
  await createInAppNotification(supabase, {
    userId,
    type: 'framework_completed',
    title: 'Framework completed',
    body: "You completed today's framework.",
    meta: { date },
    dedupeKey: dk,
  })
}

export async function notifyDailySummaryAvailable(
  supabase: SupabaseClient,
  userId: string,
  summaryDate: string
): Promise<void> {
  const dk = dedupeKeys.dailySummaryAvailable(userId, summaryDate)
  await enqueueNotification(supabase, {
    userId,
    type: 'daily_summary_available',
    title: 'New summary available',
    body: 'Your latest summary is ready.',
    emailSubject: 'New summary available',
    emailBody: 'Your latest daily summary is ready. Open the app to view it.',
    eventKey: 'daily_summary_available',
    dedupeKey: dk,
    meta: { summary_date: summaryDate },
    emailPayload: { summary_date: summaryDate },
  })
}
