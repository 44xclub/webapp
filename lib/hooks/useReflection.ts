'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ReflectionCycle, ReflectionEntry, ReflectionCycleWithEntry, ReflectionAnswers, ReflectionStatus } from '@/lib/types'

// Generate bi-weekly cycle dates for the past 6 months + next 2 weeks
function generateCycleDates(): { start_date: string; end_date: string; label: string }[] {
  const cycles: { start_date: string; end_date: string; label: string }[] = []
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
      start_date: startStr,
      end_date: endStr,
      label,
    })

    cycleStart = new Date(cycleEnd)
    cycleStart.setDate(cycleStart.getDate() + 1) // Next day
  }

  return cycles
}

export function useReflection(userId: string | undefined) {
  const [cycles, setCycles] = useState<ReflectionCycleWithEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  // Fetch or create cycles from DB, then fetch entries
  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Generate expected cycle date ranges
      const expectedCycles = generateCycleDates()

      // Fetch existing cycles for this user
      const { data: dbCycles, error: cyclesError } = await supabase
        .from('reflection_cycles')
        .select('*')
        .eq('user_id', userId)
        .order('period_start', { ascending: false })

      if (cyclesError) {
        console.warn('[Reflection] Failed to fetch cycles:', cyclesError)
      }

      // Map DB cycles by date range for lookup
      const cyclesByDateRange = new Map<string, ReflectionCycle>()
      if (dbCycles) {
        dbCycles.forEach((c) => {
          const key = `${c.period_start}-${c.period_end}`
          cyclesByDateRange.set(key, {
            id: c.id,
            start_date: c.period_start,
            end_date: c.period_end,
            label: c.label,
            created_at: c.created_at,
          } as ReflectionCycle)
        })
      }

      // Build final cycles list (use DB cycles where they exist)
      const finalCycles: ReflectionCycle[] = expectedCycles.map((expected) => {
        const key = `${expected.start_date}-${expected.end_date}`
        const existing = cyclesByDateRange.get(key)
        if (existing) {
          return existing
        }
        // Return a "virtual" cycle without DB ID (will be created when saving)
        return {
          id: `pending-${expected.start_date}`, // Temporary ID
          start_date: expected.start_date,
          end_date: expected.end_date,
          label: expected.label,
          created_at: new Date().toISOString(),
        } as ReflectionCycle
      })

      // Fetch entries for existing cycles
      const realCycleIds = finalCycles
        .filter((c) => !c.id.startsWith('pending-'))
        .map((c) => c.id)

      let entriesByCycle = new Map<string, ReflectionEntry>()

      if (realCycleIds.length > 0) {
        const { data: entries, error: entriesError } = await supabase
          .from('reflection_entries')
          .select('*')
          .eq('user_id', userId)
          .in('cycle_id', realCycleIds)

        if (entriesError) {
          console.warn('[Reflection] Failed to fetch entries:', entriesError)
        }

        if (entries) {
          entries.forEach((entry) => {
            entriesByCycle.set(entry.cycle_id, entry as ReflectionEntry)
          })
        }
      }

      // Combine cycles with entries
      const cyclesWithEntries: ReflectionCycleWithEntry[] = finalCycles.map((cycle) => {
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

  // Ensure a cycle exists in DB and return its UUID
  const ensureCycle = useCallback(async (
    cycleData: ReflectionCycle
  ): Promise<string | null> => {
    if (!userId) return null

    // If cycle already has a real ID, return it
    if (!cycleData.id.startsWith('pending-')) {
      return cycleData.id
    }

    // Create the cycle in DB
    const { data, error } = await supabase
      .from('reflection_cycles')
      .insert({
        user_id: userId,
        period_start: cycleData.start_date,
        period_end: cycleData.end_date,
        label: cycleData.label,
      })
      .select()
      .single()

    if (error) {
      console.error('[Reflection] Failed to create cycle:', error)
      return null
    }

    return data.id
  }, [userId, supabase])

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

      // Find the cycle
      const existingCycle = cycles.find((c) => c.id === cycleId)
      if (!existingCycle) {
        console.error('[Reflection] Cycle not found:', cycleId)
        return null
      }

      // Ensure cycle exists in DB (creates if pending)
      const realCycleId = await ensureCycle(existingCycle)
      if (!realCycleId) {
        console.error('[Reflection] Failed to ensure cycle exists')
        return null
      }

      const existingEntry = existingCycle.entry

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
            c.id === cycleId || c.id === realCycleId
              ? {
                  ...c,
                  id: realCycleId, // Update to real ID
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
            cycle_id: realCycleId,
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
            c.id === cycleId || c.id === realCycleId
              ? {
                  ...c,
                  id: realCycleId, // Update to real ID
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
  }, [userId, cycles, supabase, ensureCycle])

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
