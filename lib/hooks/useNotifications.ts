'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/types'

interface UseNotificationsOptions {
  userId?: string
  limit?: number
  pollInterval?: number // in milliseconds, 0 to disable polling
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { userId, limit = 50, pollInterval = 30000 } = options

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError

      setNotifications(data || [])
      setUnreadCount((data || []).filter(n => !n.read_at).length)
      setError(null)
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [supabase, userId, limit])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Polling for new notifications
  useEffect(() => {
    if (!userId || pollInterval <= 0) return

    const interval = setInterval(fetchNotifications, pollInterval)
    return () => clearInterval(interval)
  }, [userId, pollInterval, fetchNotifications])

  // Real-time subscription for instant updates
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev.slice(0, limit - 1)])
          setUnreadCount(prev => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification
          setNotifications(prev =>
            prev.map(n => (n.id === updated.id ? updated : n))
          )
          // Recalculate unread count
          setNotifications(prev => {
            setUnreadCount(prev.filter(n => !n.read_at).length)
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId, limit])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase.rpc('fn_mark_notification_read', {
        p_notification_id: notificationId,
      })

      if (updateError) throw updateError

      // Optimistic update
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))

      return true
    } catch (err) {
      console.error('Error marking notification as read:', err)
      return false
    }
  }, [supabase])

  const markAllAsRead = useCallback(async () => {
    try {
      const { error: updateError } = await supabase.rpc('fn_mark_all_notifications_read')

      if (updateError) throw updateError

      // Optimistic update
      const now = new Date().toISOString()
      setNotifications(prev =>
        prev.map(n => (n.read_at ? n : { ...n, read_at: now }))
      )
      setUnreadCount(0)

      return true
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      return false
    }
  }, [supabase])

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (deleteError) throw deleteError

      // Optimistic update
      setNotifications(prev => {
        const notification = prev.find(n => n.id === notificationId)
        if (notification && !notification.read_at) {
          setUnreadCount(c => Math.max(0, c - 1))
        }
        return prev.filter(n => n.id !== notificationId)
      })

      return true
    } catch (err) {
      console.error('Error deleting notification:', err)
      return false
    }
  }, [supabase])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
}
