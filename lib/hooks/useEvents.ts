'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  rsvpAction: (eventId: string, response: 'going' | 'not_going' | 'waitlist' | 'cancelled') => Promise<boolean>
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

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
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
    } catch (err) {
      // Fetch error
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

  // RSVP action with optimistic updates
  const rsvpAction = useCallback(
    async (eventId: string, response: 'going' | 'not_going' | 'waitlist' | 'cancelled'): Promise<boolean> => {
      if (!userId) return false

      const existing = rsvpMap.get(eventId)
      const previousRsvpMap = new Map(rsvpMap)
      const previousEvents = [...allEvents]

      // Optimistic update: update RSVP map immediately
      const optimisticRsvp: EventRsvp = existing
        ? { ...existing, response, updated_at: new Date().toISOString() }
        : {
            id: `optimistic_${Date.now()}`,
            event_id: eventId,
            user_id: userId,
            response,
            waitlist_position: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

      const newRsvpMap = new Map(rsvpMap)
      newRsvpMap.set(eventId, optimisticRsvp)
      setRsvpMap(newRsvpMap)

      // Optimistic update: adjust going/waitlist counts on the event
      setAllEvents((prev) =>
        prev.map((event) => {
          if (event.id !== eventId) return event
          let goingDelta = 0
          let waitlistDelta = 0

          // Remove previous response count
          if (existing?.response === 'going') goingDelta -= 1
          if (existing?.response === 'waitlist') waitlistDelta -= 1

          // Add new response count
          if (response === 'going') goingDelta += 1
          if (response === 'waitlist') waitlistDelta += 1

          return {
            ...event,
            rsvp_going_count: Math.max(0, event.rsvp_going_count + goingDelta),
            rsvp_waitlist_count: Math.max(0, event.rsvp_waitlist_count + waitlistDelta),
          }
        })
      )

      try {
        if (existing) {
          const { error } = await supabase
            .from('event_rsvps')
            .update({
              response,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)

          if (error) throw error
        } else {
          const { error } = await supabase
            .from('event_rsvps')
            .insert({
              event_id: eventId,
              user_id: userId,
              response,
            })

          if (error) throw error
        }

        // Fire RSVP webhook for confirmation email (fire-and-forget)
        if (response === 'going' || response === 'waitlist') {
          fetch('/api/events/rsvp-webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId, userId, response }),
          }).catch(() => {})
        }

        // Background reconcile with server data
        fetchData()
        return true
      } catch (err) {
        // Rollback on failure
        setRsvpMap(previousRsvpMap)
        setAllEvents(previousEvents)
        setError(err instanceof Error ? err.message : 'Failed to update RSVP')
        return false
      }
    },
    [userId, supabase, rsvpMap, allEvents, fetchData]
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
    refetch: fetchData,
  }
}
