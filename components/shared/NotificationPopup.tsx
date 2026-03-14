'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Bell, Dumbbell, Target, Flame, Award, Trophy, FileText, Users, Heart, CalendarDays, Clock, BarChart3, Check } from 'lucide-react'
import type { Notification } from '@/lib/types'

const popupIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  programme_approved: Dumbbell,
  programme_rejected: Dumbbell,
  framework_approved: Target,
  framework_rejected: Target,
  streak_milestone: Flame,
  badge_earned: Award,
  challenge_complete: Trophy,
  reflection_reminder: FileText,
  team_update: Users,
  respect_received: Heart,
  framework_completed: Check,
  event_rsvp_confirmed: CalendarDays,
  event_waitlist_confirmed: Clock,
  event_waitlist_promoted: CalendarDays,
  event_new_published: CalendarDays,
  daily_summary_available: BarChart3,
}

const popupColors: Record<string, { icon: string; accent: string }> = {
  programme_approved: { icon: 'text-emerald-400', accent: 'border-l-emerald-400' },
  programme_rejected: { icon: 'text-rose-400', accent: 'border-l-rose-400' },
  framework_approved: { icon: 'text-emerald-400', accent: 'border-l-emerald-400' },
  framework_rejected: { icon: 'text-rose-400', accent: 'border-l-rose-400' },
  streak_milestone: { icon: 'text-orange-400', accent: 'border-l-orange-400' },
  badge_earned: { icon: 'text-amber-400', accent: 'border-l-amber-400' },
  challenge_complete: { icon: 'text-purple-400', accent: 'border-l-purple-400' },
  reflection_reminder: { icon: 'text-blue-400', accent: 'border-l-blue-400' },
  team_update: { icon: 'text-cyan-400', accent: 'border-l-cyan-400' },
  respect_received: { icon: 'text-pink-400', accent: 'border-l-pink-400' },
  framework_completed: { icon: 'text-emerald-400', accent: 'border-l-emerald-400' },
  event_rsvp_confirmed: { icon: 'text-emerald-400', accent: 'border-l-emerald-400' },
  event_waitlist_confirmed: { icon: 'text-amber-400', accent: 'border-l-amber-400' },
  event_waitlist_promoted: { icon: 'text-emerald-400', accent: 'border-l-emerald-400' },
  event_new_published: { icon: 'text-blue-400', accent: 'border-l-blue-400' },
  daily_summary_available: { icon: 'text-cyan-400', accent: 'border-l-cyan-400' },
}

const POPUP_DURATION = 5000

interface PopupEntry {
  id: string
  notification: Notification
  exiting: boolean
}

export function useNotificationPopup() {
  const [popups, setPopups] = useState<PopupEntry[]>([])

  const showPopup = useCallback((notification: Notification) => {
    const id = `${notification.id}-${Date.now()}`
    setPopups(prev => [...prev, { id, notification, exiting: false }])

    // Start exit animation after duration
    setTimeout(() => {
      setPopups(prev => prev.map(p => p.id === id ? { ...p, exiting: true } : p))
    }, POPUP_DURATION)

    // Remove after exit animation
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id))
    }, POPUP_DURATION + 300)
  }, [])

  const dismissPopup = useCallback((id: string) => {
    setPopups(prev => prev.map(p => p.id === id ? { ...p, exiting: true } : p))
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id))
    }, 300)
  }, [])

  return { popups, showPopup, dismissPopup }
}

interface NotificationPopupProps {
  popups: PopupEntry[]
  onDismiss: (id: string) => void
}

export function NotificationPopup({ popups, onDismiss }: NotificationPopupProps) {
  if (popups.length === 0) return null

  return (
    <div className="fixed left-0 right-0 z-[200] pointer-events-none safe-top" style={{ top: '0.5rem' }}>
      <div className="flex flex-col items-center gap-2 px-3 pt-[3.25rem]">
        {popups.map((popup) => (
          <PopupItem
            key={popup.id}
            popup={popup}
            onDismiss={() => onDismiss(popup.id)}
          />
        ))}
      </div>
    </div>
  )
}

function PopupItem({ popup, onDismiss }: { popup: PopupEntry; onDismiss: () => void }) {
  const { notification, exiting } = popup
  const Icon = popupIcons[notification.type] || Bell
  const colors = popupColors[notification.type] || { icon: 'text-gray-400', accent: 'border-l-gray-400' }

  return (
    <div
      className={`pointer-events-auto w-full max-w-md border-l-[3px] ${colors.accent} bg-[rgba(15,17,21,0.97)] backdrop-blur-xl rounded-r-[12px] rounded-l-[4px] border border-[rgba(255,255,255,0.10)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300 ${
        exiting
          ? 'opacity-0 -translate-y-2'
          : 'opacity-100 translate-y-0 animate-in slide-in-from-top-4 fade-in duration-300'
      }`}
      onClick={onDismiss}
    >
      <div className="flex items-start gap-3 px-3.5 py-3">
        <div className={`flex-shrink-0 mt-0.5 ${colors.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          {notification.title && (
            <p className="text-[13px] font-semibold text-[#eef2ff] leading-tight truncate">
              {notification.title}
            </p>
          )}
          <p className="text-[12px] text-[rgba(238,242,255,0.60)] leading-snug mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="flex-shrink-0 p-0.5 rounded-[4px] text-[rgba(238,242,255,0.35)] hover:text-[rgba(238,242,255,0.72)] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
