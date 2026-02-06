'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ReflectionCycle, ReflectionEntry, ReflectionCycleWithEntry, ReflectionAnswers, ReflectionStatus } from '@/lib/types'

// Generate bi-weekly cycles for the past 6 months + next 2 weeks
function generateCycles(): ReflectionCycle[] {
  const cycles: ReflectionCycle[] = []
  const now = new Date()

  // Start from 6 months ago
  const startDate = new Date(now)
  startDate.setMonth(startDate.getMonth() - 6)

  // Find the nearest Monday (start of a bi-weekly period)
  const day = startDate.getDay()
  const diff = day === 0 ? 1 : (day === 1 ? 0 : 8 - day)
  startDate.setDate(startDate.getDate() + diff)

  // Generate cycles until 2 weeks from now
  const endLimit = new Date(now)
  endLimit.setDate(endLimit.getDate() + 14)

  let cycleStart = new Date(startDate)
  let cycleIndex = 0

  while (cycleStart < endLimit) {
    const cycleEnd = new Date(cycleStart)
    cycleEnd.setDate(cycleEnd.getDate() + 13) // 2 weeks - 1 day

    const startStr = cycleStart.toISOString().split('T')[0]
    const endStr = cycleEnd.toISOString().split('T')[0]

    // Format label: "Reflection — Jan 1–Jan 14"
    const startMonth = cycleStart.toLocaleDateString('en-US', { month: 'short' })
    const startDay = cycleStart.getDate()
    const endMonth = cycleEnd.toLocaleDateString('en-US', { month: 'short' })
    const endDay = cycleEnd.getDate()

    const label = startMonth === endMonth
      ? `Reflection — ${startMonth} ${startDay}–${endDay}`
      : `Reflection — ${startMonth} ${startDay}–${endMonth} ${endDay}`

    cycles.push({
      id: `cycle-${startStr}`,
      start_date: startStr,
      end_date: endStr,
      label,
      created_at: new Date().toISOString(),
    })

    cycleStart = new Date(cycleEnd)
    cycleStart.setDate(cycleStart.getDate() + 1) // Next day
    cycleIndex++
  }

  return cycles
}

export function useReflection(userId: string | undefined) {
  const [cycles, setCycles] = useState<ReflectionCycleWithEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  // Generate cycles and fetch entries
  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Generate cycles locally (no DB table needed for cycles)
      const generatedCycles = generateCycles()

      // Fetch all entries for this user
      const { data: entries, error } = await supabase
        .from('reflection_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('[Reflection] Failed to fetch entries:', error)
      }

      const entriesByCycle = new Map<string, ReflectionEntry>()
      if (entries) {
        entries.forEach((entry) => {
          entriesByCycle.set(entry.cycle_id, entry as ReflectionEntry)
        })
      }

      // Combine cycles with entries
      const cyclesWithEntries: ReflectionCycleWithEntry[] = generatedCycles.map((cycle) => {
        const entry = entriesByCycle.get(cycle.id) || null
        let displayStatus: ReflectionStatus = 'not_started'

        if (entry) {
          displayStatus = entry.status === 'submitted' ? 'submitted' : 'draft'
        }

        return {
          ...cycle,
          entry,
          displayStatus,
        }
      })

      // Sort most recent first (by start_date descending)
      cyclesWithEntries.sort((a, b) => b.start_date.localeCompare(a.start_date))

      setCycles(cyclesWithEntries)
    } catch (err) {
      console.error('[Reflection] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Save answers for a cycle
  const saveEntry = useCallback(async (
    cycleId: string,
    answers: ReflectionAnswers,
    submit: boolean = false
  ): Promise<ReflectionEntry | null> => {
    if (!userId) return null

    setSaving(true)
    try {
      const now = new Date().toISOString()

      // Check if entry exists
      const existingCycle = cycles.find((c) => c.id === cycleId)
      const existingEntry = existingCycle?.entry

      if (existingEntry) {
        // Update existing entry
        const { data, error } = await supabase
          .from('reflection_entries')
          .update({
            answers,
            status: submit ? 'submitted' : 'draft',
            submitted_at: submit ? now : existingEntry.submitted_at,
            updated_at: now,
          })
          .eq('id', existingEntry.id)
          .select()
          .single()

        if (error) throw error

        // Update local state
        setCycles((prev) =>
          prev.map((c) =>
            c.id === cycleId
              ? {
                  ...c,
                  entry: data as ReflectionEntry,
                  displayStatus: submit ? 'submitted' : 'draft',
                }
              : c
          )
        )

        return data as ReflectionEntry
      } else {
        // Create new entry
        const { data, error } = await supabase
          .from('reflection_entries')
          .insert({
            user_id: userId,
            cycle_id: cycleId,
            answers,
            status: submit ? 'submitted' : 'draft',
            submitted_at: submit ? now : null,
          })
          .select()
          .single()

        if (error) throw error

        // Update local state
        setCycles((prev) =>
          prev.map((c) =>
            c.id === cycleId
              ? {
                  ...c,
                  entry: data as ReflectionEntry,
                  displayStatus: submit ? 'submitted' : 'draft',
                }
              : c
          )
        )

        return data as ReflectionEntry
      }
    } catch (err) {
      console.error('[Reflection] Save failed:', err)
      return null
    } finally {
      setSaving(false)
    }
  }, [userId, cycles, supabase])

  // Get the current active cycle (one that contains today's date)
  const currentCycle = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return cycles.find((c) => c.start_date <= today && c.end_date >= today) || null
  }, [cycles])

  return {
    cycles,
    currentCycle,
    loading,
    saving,
    saveEntry,
    refetch: fetchData,
  }
}
