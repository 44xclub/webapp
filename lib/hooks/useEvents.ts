'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Event {
  id: string
  title: string
  subdescription: string | null
  event_type: string
  banner_image_path: string
  location_type: 'online' | 'in_person'
  location_text: string | null
  meeting_url: string | null
  city: string | null
  starts_at: string
  ends_at: string | null
  timezone: string
  capacity: number | null
  waitlist_enabled: boolean
  rsvp_going_count: number
  rsvp_waitlist_count: number
  status: 'draft' | 'published' | 'cancelled' | 'completed'
  sort_order: number
  created_at: string
  updated_at: string
}

export interface EventRsvp {
  id: string
  event_id: string
  user_id: string
  response: 'going' | 'not_going' | 'waitlist' | 'cancelled'
  waitlist_position: number | null
  created_at: string
  updated_at: string
}

export type SortOption = 'closest' | 'furthest' | 'az' | 'spots'
export type RsvpFilter = 'all' | 'going' | 'waitlist' | 'not_responded'

export interface EventFilters {
  eventType: string | null
  locationType: 'online' | 'in_person' | null
  city: string | null
  rsvpFilter: RsvpFilter
}

interface RsvpApiResult {
  ok: boolean
  response: 'going' | 'waitlist' | 'cancelled' | 'full'
  error?: string
  waitlistPosition?: number
  eventId?: string
  rsvpGoingCount?: number
  rsvpWaitlistCount?: number
  capacity?: number | null
}

interface UseEventsReturn {
  events: Event[]
  rsvps: Map<string, EventRsvp>
  loading: boolean
  error: string | null
  pastMode: boolean
  setPastMode: (v: boolean) => void
  filters: EventFilters
  setFilters: (f: EventFilters) => void
  sortBy: SortOption
  setSortBy: (s: SortOption) => void
  eventTypes: string[]
  cities: string[]
  rsvpAction: (eventId: string) => Promise<RsvpApiResult>
  cancelRsvp: (eventId: string) => Promise<RsvpApiResult>
  refetch: () => Promise<void>
}

export function useEvents(userId?: string): UseEventsReturn {
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [rsvpMap, setRsvpMap] = useState<Map<string, EventRsvp>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pastMode, setPastMode] = useState(false)
  const [filters, setFilters] = useState<EventFilters>({
    eventType: null,
    locationType: null,
    city: null,
    rsvpFilter: 'all',
  })
  const [sortBy, setSortBy] = useState<SortOption>('closest')

  const supabase = useMemo(() => createClient(), [])
  const hasLoadedOnce = useRef(false)

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    // Only show loading spinner on initial load — never blank the page on refetch
    if (!hasLoadedOnce.current) {
      setLoading(true)
    }
    setError(null)

    try {
      // Fetch all published/completed events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('status', ['published', 'completed'])
        .order('starts_at', { ascending: true })

      if (eventsError) throw eventsError

      setAllEvents(eventsData || [])

      // Fetch all RSVPs for this user in one query
      if (eventsData && eventsData.length > 0) {
        const eventIds = eventsData.map((e: Event) => e.id)
        const { data: rsvpData, error: rsvpError } = await supabase
          .from('event_rsvps')
          .select('*')
          .eq('user_id', userId)
          .in('event_id', eventIds)

        if (rsvpError) throw rsvpError

        const map = new Map<string, EventRsvp>()
        ;(rsvpData || []).forEach((r: EventRsvp) => {
          map.set(r.event_id, r)
        })
        setRsvpMap(map)
      }

      hasLoadedOnce.current = true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Derive unique event types and cities for filter options
  const eventTypes = useMemo(() => {
    const types = new Set<string>()
    allEvents.forEach((e) => types.add(e.event_type))
    return Array.from(types).sort()
  }, [allEvents])

  const cities = useMemo(() => {
    const c = new Set<string>()
    allEvents.forEach((e) => {
      if (e.city) c.add(e.city)
    })
    return Array.from(c).sort()
  }, [allEvents])

  // Filter and sort events
  const events = useMemo(() => {
    const now = new Date()

    // Split into upcoming / past
    let filtered = allEvents.filter((e) => {
      const eventDate = new Date(e.starts_at)
      if (pastMode) {
        return eventDate < now || e.status === 'completed'
      } else {
        return eventDate >= now && e.status === 'published'
      }
    })

    // Apply filters
    if (filters.eventType) {
      filtered = filtered.filter((e) => e.event_type === filters.eventType)
    }
    if (filters.locationType) {
      filtered = filtered.filter((e) => e.location_type === filters.locationType)
    }
    if (filters.city) {
      filtered = filtered.filter((e) => e.city === filters.city)
    }
    if (filters.rsvpFilter !== 'all') {
      filtered = filtered.filter((e) => {
        const rsvp = rsvpMap.get(e.id)
        switch (filters.rsvpFilter) {
          case 'going':
            return rsvp?.response === 'going'
          case 'waitlist':
            return rsvp?.response === 'waitlist'
          case 'not_responded':
            return !rsvp || rsvp.response === 'cancelled' || rsvp.response === 'not_going'
          default:
            return true
        }
      })
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'closest':
          return pastMode
            ? new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
            : new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        case 'furthest':
          return pastMode
            ? new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
            : new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
        case 'az':
          return a.title.localeCompare(b.title)
        case 'spots': {
          const spotsA = a.capacity != null ? a.capacity - a.rsvp_going_count : Infinity
          const spotsB = b.capacity != null ? b.capacity - b.rsvp_going_count : Infinity
          return spotsB - spotsA
        }
        default:
          return 0
      }
    })

    return filtered
  }, [allEvents, pastMode, filters, sortBy, rsvpMap])

  // Helper: patch a single event's counts from server response
  const patchEventCounts = useCallback((result: RsvpApiResult, eventId: string) => {
    if (result.rsvpGoingCount != null || result.rsvpWaitlistCount != null) {
      setAllEvents((prev) =>
        prev.map((event) => {
          if (event.id !== eventId) return event
          return {
            ...event,
            rsvp_going_count: result.rsvpGoingCount ?? event.rsvp_going_count,
            rsvp_waitlist_count: result.rsvpWaitlistCount ?? event.rsvp_waitlist_count,
          }
        })
      )
    }
  }, [])

  // RSVP action — calls server-side state machine
  // Server decides whether user gets 'going' or 'waitlist'
  const rsvpAction = useCallback(
    async (eventId: string): Promise<RsvpApiResult> => {
      if (!userId) return { ok: false, response: 'full', error: 'Not authenticated' }

      const previousRsvpMap = new Map(rsvpMap)
      const previousEvents = [...allEvents]

      // Optimistic: show going immediately (server may change to waitlist)
      const existing = rsvpMap.get(eventId)
      const optimisticRsvp: EventRsvp = existing
        ? { ...existing, response: 'going', updated_at: new Date().toISOString() }
        : {
            id: `optimistic_${Date.now()}`,
            event_id: eventId,
            user_id: userId,
            response: 'going',
            waitlist_position: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

      const newRsvpMap = new Map(rsvpMap)
      newRsvpMap.set(eventId, optimisticRsvp)
      setRsvpMap(newRsvpMap)

      // Optimistic count update
      setAllEvents((prev) =>
        prev.map((event) => {
          if (event.id !== eventId) return event
          return {
            ...event,
            rsvp_going_count: event.rsvp_going_count + 1,
          }
        })
      )

      try {
        const res = await fetch('/api/events/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, userId }),
        })

        const result: RsvpApiResult = await res.json()

        if (result.ok) {
          // Reconcile with server truth — patch only the affected card
          patchEventCounts(result, eventId)

          // If server says waitlist but we optimistically showed going, fix RSVP state
          if (result.response === 'waitlist') {
            setRsvpMap((prev) => {
              const map = new Map(prev)
              const rsvp = map.get(eventId)
              if (rsvp) {
                map.set(eventId, {
                  ...rsvp,
                  response: 'waitlist',
                  waitlist_position: result.waitlistPosition ?? null,
                })
              }
              return map
            })
          }
        } else {
          // Server rejected — rollback
          setRsvpMap(previousRsvpMap)
          setAllEvents(previousEvents)
        }

        return result
      } catch (err) {
        // Network error — rollback
        setRsvpMap(previousRsvpMap)
        setAllEvents(previousEvents)
        setError(err instanceof Error ? err.message : 'Failed to RSVP')
        return { ok: false, response: 'full', error: 'Network error' }
      }
    },
    [userId, rsvpMap, allEvents, patchEventCounts]
  )

  // Cancel RSVP — calls server-side cancel + auto-promote
  const cancelRsvp = useCallback(
    async (eventId: string): Promise<RsvpApiResult> => {
      if (!userId) return { ok: false, response: 'cancelled', error: 'Not authenticated' }

      const previousRsvpMap = new Map(rsvpMap)
      const previousEvents = [...allEvents]
      const existing = rsvpMap.get(eventId)

      // Optimistic: show cancelled immediately
      if (existing) {
        const newRsvpMap = new Map(rsvpMap)
        newRsvpMap.set(eventId, { ...existing, response: 'cancelled', updated_at: new Date().toISOString() })
        setRsvpMap(newRsvpMap)
      }

      // Optimistic count update
      setAllEvents((prev) =>
        prev.map((event) => {
          if (event.id !== eventId) return event
          if (existing?.response === 'going') {
            return { ...event, rsvp_going_count: Math.max(0, event.rsvp_going_count - 1) }
          }
          if (existing?.response === 'waitlist') {
            return { ...event, rsvp_waitlist_count: Math.max(0, event.rsvp_waitlist_count - 1) }
          }
          return event
        })
      )

      try {
        const res = await fetch('/api/events/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, userId }),
        })

        const result: RsvpApiResult = await res.json()

        if (result.ok) {
          // Reconcile with server truth — patch only the affected card
          patchEventCounts(result, eventId)
        } else {
          // Server rejected — rollback
          setRsvpMap(previousRsvpMap)
          setAllEvents(previousEvents)
        }

        return result
      } catch (err) {
        setRsvpMap(previousRsvpMap)
        setAllEvents(previousEvents)
        setError(err instanceof Error ? err.message : 'Failed to cancel RSVP')
        return { ok: false, response: 'cancelled', error: 'Network error' }
      }
    },
    [userId, rsvpMap, allEvents, patchEventCounts]
  )

  return {
    events,
    rsvps: rsvpMap,
    loading,
    error,
    pastMode,
    setPastMode,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    eventTypes,
    cities,
    rsvpAction,
    cancelRsvp,
    refetch: fetchData,
  }
}
