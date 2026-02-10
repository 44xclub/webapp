'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, Check, Trash2, X, Dumbbell, Target, Flame, Award, Trophy, FileText, Users } from 'lucide-react'
import { useNotifications } from '@/lib/hooks/useNotifications'
import type { Notification, NotificationType } from '@/lib/types'

interface NotificationBellProps {
  userId?: string
}

const notificationIcons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  programme_approved: Dumbbell,
  programme_rejected: Dumbbell,
  framework_approved: Target,
  framework_rejected: Target,
  streak_milestone: Flame,
  badge_earned: Award,
  challenge_complete: Trophy,
  reflection_reminder: FileText,
  team_update: Users,
}

const notificationColors: Record<NotificationType, string> = {
  programme_approved: 'text-emerald-400 bg-emerald-500/20',
  programme_rejected: 'text-rose-400 bg-rose-500/20',
  framework_approved: 'text-emerald-400 bg-emerald-500/20',
  framework_rejected: 'text-rose-400 bg-rose-500/20',
  streak_milestone: 'text-orange-400 bg-orange-500/20',
  badge_earned: 'text-amber-400 bg-amber-500/20',
  challenge_complete: 'text-purple-400 bg-purple-500/20',
  reflection_reminder: 'text-blue-400 bg-blue-500/20',
  team_update: 'text-cyan-400 bg-cyan-500/20',
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications({ userId })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead(notification.id)
    }
    // Optionally navigate based on notification type
    // For now, just mark as read
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-[10px] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-[rgba(238,242,255,0.72)]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-[#3b82f6] text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] bg-[#0f1115] rounded-[14px] border border-[rgba(255,255,255,0.08)] shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[#eef2ff]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-[12px] text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
            {loading ? (
              <div className="py-8 text-center">
                <div className="w-5 h-5 border-2 border-[rgba(238,242,255,0.25)] border-t-[#3b82f6] rounded-full animate-spin mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="h-8 w-8 text-[rgba(238,242,255,0.25)] mx-auto mb-2" />
                <p className="text-[13px] text-[rgba(238,242,255,0.45)]">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[rgba(255,255,255,0.06)]">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification)}
                    onDelete={() => deleteNotification(notification.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationItem({
  notification,
  onClick,
  onDelete,
}: {
  notification: Notification
  onClick: () => void
  onDelete: () => void
}) {
  const Icon = notificationIcons[notification.type] || Bell
  const colorClass = notificationColors[notification.type] || 'text-gray-400 bg-gray-500/20'
  const isUnread = !notification.read_at

  const timeAgo = getTimeAgo(new Date(notification.created_at))

  return (
    <div
      className={`px-4 py-3 hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer group ${
        isUnread ? 'bg-[rgba(59,130,246,0.05)]' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex gap-3">
        <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-[13px] leading-tight ${isUnread ? 'text-[#eef2ff] font-medium' : 'text-[rgba(238,242,255,0.72)]'}`}>
              {notification.title}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-[4px] text-[rgba(238,242,255,0.35)] hover:text-rose-400 hover:bg-rose-500/10 transition-all"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {notification.body && (
            <p className="text-[12px] text-[rgba(238,242,255,0.45)] mt-0.5 line-clamp-2">
              {notification.body}
            </p>
          )}
          <p className="text-[11px] text-[rgba(238,242,255,0.35)] mt-1">{timeAgo}</p>
        </div>
        {isUnread && (
          <div className="w-2 h-2 rounded-full bg-[#3b82f6] flex-shrink-0 mt-1.5" />
        )}
      </div>
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}
