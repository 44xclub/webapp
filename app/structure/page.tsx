'use client'

import { Suspense, useState, useMemo, useCallback } from 'react'
import {
  Loader2,
  CalendarDays,
  MapPin,
  Video,
  Filter,
  ArrowUpDown,
  Clock,
  Users,
  Check,
  X,
  ChevronRight,
  Globe,
  Building2,
} from 'lucide-react'
import { useAuth, useProfile, useRank, useEvents } from '@/lib/hooks'
import { HeaderStrip } from '@/components/shared/HeaderStrip'
import { AppShell } from '@/components/shared/AppShell'
import { FadeImage } from '@/components/ui/FadeImage'
import type { Event, EventRsvp, SortOption, RsvpFilter, EventFilters } from '@/lib/hooks/useEvents'

// ── Helpers ──────────────────────────────────────────────

function getStorageUrl(path: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`
}

function formatEventDate(dateStr: string, tz?: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: tz || 'Europe/London',
  })
}

function formatEventTime(dateStr: string, tz?: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz || 'Europe/London',
  })
}

function spotsLeft(event: Event): number | null {
  if (event.capacity == null) return null
  return Math.max(0, event.capacity - event.rsvp_going_count)
}

function getStatusBadge(event: Event): { label: string; color: string } | null {
  const spots = spotsLeft(event)
  if (spots === null) return null
  if (spots <= 0) {
    return event.waitlist_enabled
      ? { label: 'Waitlist', color: 'text-amber-400 bg-amber-500/10' }
      : { label: 'Full', color: 'text-rose-400 bg-rose-500/10' }
  }
  if (spots <= 5) {
    return { label: `${spots} spot${spots === 1 ? '' : 's'} left`, color: 'text-amber-400 bg-amber-500/10' }
  }
  return { label: `${spots} spots left`, color: 'text-emerald-400 bg-emerald-500/10' }
}

// ── Main Page ────────────────────────────────────────────

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
          </div>
        </AppShell>
      }
    >
      <EventsPageContent />
    </Suspense>
  )
}

function EventsPageContent() {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading, avatarUrl } = useProfile(user?.id)
  const { rank } = useRank(user?.id)
  const {
    events,
    rsvps,
    loading: eventsLoading,
    pastMode,
    setPastMode,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    eventTypes,
    cities,
    rsvpAction,
  } = useEvents(user?.id)

  const [detailEvent, setDetailEvent] = useState<Event | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showSort, setShowSort] = useState(false)

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.eventType) count++
    if (filters.locationType) count++
    if (filters.city) count++
    if (filters.rsvpFilter !== 'all') count++
    return count
  }, [filters])

  if (authLoading || !user) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="content-container animate-fadeIn min-h-full">
        <HeaderStrip
          profile={profile}
          rank={rank}
          loading={profileLoading}
          avatarUrl={avatarUrl}
        />

        {/* Top Controls */}
        <div className="sticky top-0 z-40 bg-[rgba(7,9,13,0.92)] backdrop-blur-[12px] px-4 pt-2 pb-2">
          <div className="flex items-center gap-2">
            {/* Past / Upcoming toggle */}
            <button
              onClick={() => setPastMode(!pastMode)}
              className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors ${
                pastMode
                  ? 'bg-[rgba(239,68,68,0.15)] text-rose-400 border border-rose-500/20'
                  : 'bg-[rgba(255,255,255,0.06)] text-[var(--text-secondary)] border border-transparent'
              }`}
            >
              {pastMode ? 'Past Events' : 'Upcoming'}
            </button>

            <div className="flex-1" />

            {/* Filter */}
            <button
              onClick={() => { setShowFilters(true); setShowSort(false) }}
              className={`relative p-2 rounded-[8px] transition-colors ${
                activeFilterCount > 0
                  ? 'bg-[rgba(59,130,246,0.15)] text-[#3b82f6]'
                  : 'bg-[rgba(255,255,255,0.06)] text-[var(--text-secondary)]'
              }`}
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#3b82f6] text-white text-[9px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort */}
            <button
              onClick={() => { setShowSort(true); setShowFilters(false) }}
              className="p-2 rounded-[8px] bg-[rgba(255,255,255,0.06)] text-[var(--text-secondary)] transition-colors"
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Event List */}
        <main className="px-4 pt-2 pb-6 space-y-2.5">
          {eventsLoading ? (
            <>
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="h-12 w-12 text-[rgba(238,242,255,0.2)] mx-auto mb-3" />
              <p className="text-[14px] text-[var(--text-secondary)]">
                {pastMode ? 'No past events found' : 'No upcoming events'}
              </p>
              <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
                {activeFilterCount > 0 ? 'Try adjusting your filters' : 'Check back soon for new events'}
              </p>
            </div>
          ) : (
            events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                rsvp={rsvps.get(event.id) || null}
                onTap={() => setDetailEvent(event)}
                onRsvp={rsvpAction}
              />
            ))
          )}
        </main>
      </div>

      {/* Detail Modal */}
      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          rsvp={rsvps.get(detailEvent.id) || null}
          onClose={() => setDetailEvent(null)}
          onRsvp={rsvpAction}
        />
      )}

      {/* Filter Sheet */}
      {showFilters && (
        <FilterSheet
          filters={filters}
          eventTypes={eventTypes}
          cities={cities}
          onApply={(f) => { setFilters(f); setShowFilters(false) }}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Sort Sheet */}
      {showSort && (
        <SortSheet
          sortBy={sortBy}
          pastMode={pastMode}
          onSelect={(s) => { setSortBy(s); setShowSort(false) }}
          onClose={() => setShowSort(false)}
        />
      )}
    </AppShell>
  )
}

// ── Event Card ───────────────────────────────────────────

function EventCard({
  event,
  rsvp,
  onTap,
  onRsvp,
}: {
  event: Event
  rsvp: EventRsvp | null
  onTap: () => void
  onRsvp: (eventId: string, response: 'going' | 'not_going' | 'waitlist' | 'cancelled') => Promise<boolean>
}) {
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const bannerUrl = getStorageUrl(event.banner_image_path)
  const statusBadge = getStatusBadge(event)
  const spots = spotsLeft(event)
  const isFull = spots !== null && spots <= 0

  const handleRsvp = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setRsvpLoading(true)

    if (rsvp?.response === 'going' || rsvp?.response === 'waitlist') {
      await onRsvp(event.id, 'cancelled')
    } else if (isFull && event.waitlist_enabled) {
      await onRsvp(event.id, 'waitlist')
    } else {
      await onRsvp(event.id, 'going')
    }

    setRsvpLoading(false)
  }

  const ctaInfo = getRsvpCta(rsvp, event)

  return (
    <div
      onClick={onTap}
      className="section-card p-0 overflow-hidden cursor-pointer hover:border-[rgba(255,255,255,0.12)] transition-colors"
    >
      {/* Banner — compact */}
      <div className="relative h-[84px] bg-[var(--surface-1)]">
        <FadeImage
          src={bannerUrl || ''}
          alt={event.title}
          className="w-full h-full object-cover"
          wrapperClassName="w-full h-full"
        />
        {/* Type pill */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-0.5 rounded-[6px] bg-[rgba(0,0,0,0.65)] backdrop-blur-[8px] text-[10px] font-medium text-white">
            {event.event_type}
          </span>
        </div>
        {/* Status badge — dark backing like type pill */}
        {statusBadge && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 rounded-[6px] bg-[rgba(0,0,0,0.65)] backdrop-blur-[8px] text-[10px] font-medium text-emerald-400">
              {statusBadge.label}
            </span>
          </div>
        )}
      </div>

      {/* Content — compact */}
      <div className="px-3 py-2">
        <h3 className="text-[14px] font-semibold text-[var(--text-primary)] leading-tight">
          {event.title}
        </h3>
        {event.subdescription && (
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 line-clamp-1">
            {event.subdescription}
          </p>
        )}

        {/* Meta row — single line */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1.5 text-[11px] text-[var(--text-secondary)]">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3 text-[var(--text-muted)]" />
            {formatEventDate(event.starts_at, event.timezone)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-[var(--text-muted)]" />
            {formatEventTime(event.starts_at, event.timezone)}
            {event.ends_at && ` – ${formatEventTime(event.ends_at, event.timezone)}`}
          </span>
        </div>

        <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-[var(--text-secondary)]">
          <span className="flex items-center gap-1">
            {event.location_type === 'online' ? (
              <Video className="h-3 w-3 text-[var(--text-muted)]" />
            ) : (
              <MapPin className="h-3 w-3 text-[var(--text-muted)]" />
            )}
            {event.location_text || event.city || (event.location_type === 'online' ? 'Online' : 'In Person')}
          </span>
          {event.rsvp_going_count > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3 text-[var(--text-muted)]" />
              {event.rsvp_going_count} going
            </span>
          )}
        </div>

        {/* RSVP CTA — compact */}
        <div className="mt-2">
          <button
            onClick={handleRsvp}
            disabled={rsvpLoading || ctaInfo.disabled}
            className={`w-full py-1.5 rounded-[8px] text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 ${ctaInfo.className}`}
          >
            {rsvpLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                {ctaInfo.icon}
                {ctaInfo.label}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function getRsvpCta(
  rsvp: EventRsvp | null,
  event: Event
): { label: string; className: string; icon: React.ReactNode; disabled: boolean } {
  const spots = spotsLeft(event)
  const isFull = spots !== null && spots <= 0

  if (rsvp?.response === 'going') {
    return {
      label: 'Going',
      className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
      icon: <Check className="h-4 w-4" />,
      disabled: false,
    }
  }
  if (rsvp?.response === 'waitlist') {
    return {
      label: 'Waitlisted',
      className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
      icon: <Clock className="h-4 w-4" />,
      disabled: false,
    }
  }

  if (isFull && !event.waitlist_enabled) {
    return {
      label: 'Full',
      className: 'bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)] border border-transparent cursor-not-allowed',
      icon: null,
      disabled: true,
    }
  }
  if (isFull && event.waitlist_enabled) {
    return {
      label: 'Join Waitlist',
      className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:bg-amber-500/25',
      icon: <Clock className="h-4 w-4" />,
      disabled: false,
    }
  }

  return {
    label: 'RSVP',
    className: 'bg-[#3b82f6] text-white hover:bg-[#2563eb]',
    icon: <CalendarDays className="h-4 w-4" />,
    disabled: false,
  }
}

// ── Event Detail Modal ───────────────────────────────────

function EventDetailModal({
  event,
  rsvp,
  onClose,
  onRsvp,
}: {
  event: Event
  rsvp: EventRsvp | null
  onClose: () => void
  onRsvp: (eventId: string, response: 'going' | 'not_going' | 'waitlist' | 'cancelled') => Promise<boolean>
}) {
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const bannerUrl = getStorageUrl(event.banner_image_path)
  const statusBadge = getStatusBadge(event)
  const spots = spotsLeft(event)
  const isFull = spots !== null && spots <= 0
  const ctaInfo = getRsvpCta(rsvp, event)

  const handleRsvp = async () => {
    setRsvpLoading(true)
    if (rsvp?.response === 'going' || rsvp?.response === 'waitlist') {
      await onRsvp(event.id, 'cancelled')
    } else if (isFull && event.waitlist_enabled) {
      await onRsvp(event.id, 'waitlist')
    } else {
      await onRsvp(event.id, 'going')
    }
    setRsvpLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0f1115] rounded-t-[20px] border-t border-[rgba(255,255,255,0.08)] flex flex-col" style={{ maxHeight: 'calc(100vh - var(--bottom-nav-height) - env(safe-area-inset-bottom, 0px) - env(safe-area-inset-top, 0px))', marginBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))' }}>
        {/* Fixed header with close */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] truncate pr-4">Event Details</h2>
          <button
            onClick={onClose}
            className="p-2.5 -m-1 rounded-[10px] hover:bg-[rgba(255,255,255,0.06)] transition-colors touch-manipulation"
          >
            <X className="h-5 w-5 text-[rgba(238,242,255,0.65)]" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Banner — compact */}
          <div className="relative h-[130px] bg-[var(--surface-1)]">
            <FadeImage
              src={bannerUrl || ''}
              alt={event.title}
              className="w-full h-full object-cover"
              wrapperClassName="w-full h-full"
            />
            <div className="absolute top-2.5 left-2.5">
              <span className="px-2 py-0.5 rounded-[6px] bg-[rgba(0,0,0,0.65)] backdrop-blur-[8px] text-[11px] font-medium text-white">
                {event.event_type}
              </span>
            </div>
          </div>

          {/* Content — compact */}
          <div className="px-4 py-3 space-y-2.5">
            <div>
              <h3 className="text-[17px] font-semibold text-[var(--text-primary)] leading-tight">
                {event.title}
              </h3>
              {event.subdescription && (
                <p className="text-[12px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                  {event.subdescription}
                </p>
              )}
            </div>

            {/* Details — compact inline rows */}
            <div className="space-y-1">
              <DetailRow
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                label="Date"
                value={formatEventDate(event.starts_at, event.timezone)}
              />
              <DetailRow
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Time"
                value={`${formatEventTime(event.starts_at, event.timezone)}${
                  event.ends_at ? ` – ${formatEventTime(event.ends_at, event.timezone)}` : ''
                } (${event.timezone})`}
              />
              <DetailRow
                icon={event.location_type === 'online' ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                label="Location"
                value={event.location_text || event.city || (event.location_type === 'online' ? 'Online Webinar' : 'In Person')}
              />
              {event.city && event.location_type === 'in_person' && (
                <DetailRow
                  icon={<Building2 className="h-3.5 w-3.5" />}
                  label="City"
                  value={event.city}
                />
              )}

              {/* Meeting URL for online events */}
              {event.location_type === 'online' && event.meeting_url && (
                <div className="flex items-center gap-2.5 py-0.5">
                  <Globe className="h-3.5 w-3.5 text-[var(--text-muted)] flex-shrink-0" />
                  <a
                    href={event.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-[#3b82f6] hover:underline break-all truncate"
                  >
                    {event.meeting_url}
                  </a>
                </div>
              )}
            </div>

            {/* Capacity — single line with status pill */}
            {event.capacity != null && (
              <div className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                  <span>Capacity <span className="text-[var(--text-primary)] font-medium">{event.capacity}</span></span>
                  <span>Going <span className="text-[var(--text-primary)] font-medium">{event.rsvp_going_count}</span></span>
                </div>
                {statusBadge && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[rgba(0,0,0,0.45)] text-emerald-400">
                    {statusBadge.label}
                  </span>
                )}
              </div>
            )}
            {isFull && event.waitlist_enabled && event.rsvp_waitlist_count > 0 && (
              <div className="text-[12px] text-[var(--text-secondary)]">
                Waitlisted <span className="text-amber-400 font-medium">{event.rsvp_waitlist_count}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sticky RSVP footer */}
        <div className="flex-shrink-0 px-4 py-2.5 border-t border-[rgba(255,255,255,0.06)]">
          <button
            onClick={handleRsvp}
            disabled={rsvpLoading || ctaInfo.disabled}
            className={`w-full py-2.5 rounded-[10px] text-[13px] font-medium transition-all flex items-center justify-center gap-2 ${ctaInfo.className}`}
          >
            {rsvpLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {ctaInfo.icon}
                {ctaInfo.label}
              </>
            )}
          </button>
          {(rsvp?.response === 'going' || rsvp?.response === 'waitlist') && (
            <p className="text-center text-[10px] text-[var(--text-tertiary)] mt-1">
              Tap to cancel your RSVP
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <div className="text-[var(--text-muted)] flex-shrink-0">{icon}</div>
      <span className="text-[11px] text-[var(--text-tertiary)] w-14 flex-shrink-0">{label}</span>
      <span className="text-[12px] text-[var(--text-primary)]">{value}</span>
    </div>
  )
}

// ── Filter Sheet ─────────────────────────────────────────

function FilterSheet({
  filters,
  eventTypes,
  cities,
  onApply,
  onClose,
}: {
  filters: EventFilters
  eventTypes: string[]
  cities: string[]
  onApply: (f: EventFilters) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState<EventFilters>({ ...filters })

  const handleReset = () => {
    setLocal({ eventType: null, locationType: null, city: null, rsvpFilter: 'all' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0f1115] rounded-t-[20px] border-t border-[rgba(255,255,255,0.08)] flex flex-col" style={{ maxHeight: 'calc(100vh - var(--bottom-nav-height) - env(safe-area-inset-bottom, 0px) - env(safe-area-inset-top, 0px))', marginBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))' }}>
        {/* Fixed header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Filters</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleReset} className="text-[12px] text-[var(--accent-blue)]">
              Reset
            </button>
            <button onClick={onClose} className="p-2.5 -m-1 rounded-[10px] hover:bg-[rgba(255,255,255,0.06)] touch-manipulation">
              <X className="h-5 w-5 text-[rgba(238,242,255,0.65)]" />
            </button>
          </div>
        </div>

        {/* Scrollable filter body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
          <div className="space-y-3">
            {/* Event Type */}
            {eventTypes.length > 0 && (
              <div>
                <p className="text-[11px] text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider font-medium">Event Type</p>
                <div className="flex flex-wrap gap-1.5">
                  <FilterChip
                    label="All"
                    active={!local.eventType}
                    onClick={() => setLocal({ ...local, eventType: null })}
                  />
                  {eventTypes.map((t) => (
                    <FilterChip
                      key={t}
                      label={t}
                      active={local.eventType === t}
                      onClick={() => setLocal({ ...local, eventType: local.eventType === t ? null : t })}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Location Type */}
            <div>
              <p className="text-[11px] text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider font-medium">Location</p>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  label="All"
                  active={!local.locationType}
                  onClick={() => setLocal({ ...local, locationType: null })}
                />
                <FilterChip
                  label="Online"
                  active={local.locationType === 'online'}
                  onClick={() => setLocal({ ...local, locationType: local.locationType === 'online' ? null : 'online' })}
                />
                <FilterChip
                  label="In Person"
                  active={local.locationType === 'in_person'}
                  onClick={() =>
                    setLocal({ ...local, locationType: local.locationType === 'in_person' ? null : 'in_person' })
                  }
                />
              </div>
            </div>

            {/* City */}
            {cities.length > 0 && (
              <div>
                <p className="text-[11px] text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider font-medium">City</p>
                <div className="flex flex-wrap gap-1.5">
                  <FilterChip
                    label="All"
                    active={!local.city}
                    onClick={() => setLocal({ ...local, city: null })}
                  />
                  {cities.map((c) => (
                    <FilterChip
                      key={c}
                      label={c}
                      active={local.city === c}
                      onClick={() => setLocal({ ...local, city: local.city === c ? null : c })}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* RSVP State */}
            <div>
              <p className="text-[11px] text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider font-medium">RSVP Status</p>
              <div className="flex flex-wrap gap-1.5">
                {([
                  ['all', 'All'],
                  ['going', 'Going'],
                  ['waitlist', 'Waitlisted'],
                  ['not_responded', 'Not Responded'],
                ] as [RsvpFilter, string][]).map(([val, label]) => (
                  <FilterChip
                    key={val}
                    label={label}
                    active={local.rsvpFilter === val}
                    onClick={() => setLocal({ ...local, rsvpFilter: val })}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="flex-shrink-0 px-4 py-2.5 border-t border-[rgba(255,255,255,0.06)]">
          <button
            onClick={() => onApply(local)}
            className="w-full py-2.5 rounded-[10px] bg-[#3b82f6] text-white text-[13px] font-medium"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-[7px] text-[12px] font-medium transition-colors ${
        active
          ? 'bg-[#3b82f6] text-white'
          : 'bg-[rgba(255,255,255,0.06)] text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.10)]'
      }`}
    >
      {label}
    </button>
  )
}

// ── Sort Sheet ───────────────────────────────────────────

function SortSheet({
  sortBy,
  pastMode,
  onSelect,
  onClose,
}: {
  sortBy: SortOption
  pastMode: boolean
  onSelect: (s: SortOption) => void
  onClose: () => void
}) {
  const options: { value: SortOption; label: string }[] = [
    { value: 'closest', label: pastMode ? 'Most recent first' : 'Closest upcoming first' },
    { value: 'furthest', label: pastMode ? 'Oldest first' : 'Furthest upcoming first' },
    { value: 'az', label: 'A – Z' },
    { value: 'spots', label: 'Most spots left' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0f1115] rounded-t-[20px] border-t border-[rgba(255,255,255,0.08)]" style={{ marginBottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Sort</h2>
          <button onClick={onClose} className="p-2.5 -m-1 rounded-[10px] hover:bg-[rgba(255,255,255,0.06)] touch-manipulation">
            <X className="h-5 w-5 text-[rgba(238,242,255,0.65)]" />
          </button>
        </div>
        <div className="px-3 py-2 space-y-0.5">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={`w-full text-left px-3 py-2 rounded-[8px] text-[13px] transition-colors flex items-center justify-between ${
                sortBy === opt.value
                  ? 'bg-[rgba(59,130,246,0.12)] text-[#3b82f6] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)]'
              }`}
            >
              {opt.label}
              {sortBy === opt.value && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────

function EventCardSkeleton() {
  return (
    <div className="section-card p-0 overflow-hidden">
      <div className="h-[84px] bg-gradient-to-br from-[rgba(255,255,255,0.04)] to-[rgba(255,255,255,0.02)] animate-pulse" />
      <div className="px-3 py-2 space-y-1.5">
        <div className="h-4 w-3/4 bg-[rgba(255,255,255,0.06)] rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-[rgba(255,255,255,0.04)] rounded animate-pulse" />
        <div className="h-7 w-full bg-[rgba(255,255,255,0.04)] rounded-[8px] animate-pulse mt-1.5" />
      </div>
    </div>
  )
}
