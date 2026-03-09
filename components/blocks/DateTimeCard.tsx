'use client'

import { Calendar, Clock } from 'lucide-react'
import { Input } from '@/components/ui'
import type { UseFormRegister } from 'react-hook-form'

/**
 * DateTimeCard — single reusable component for date/time display & editing.
 *
 * Used in:
 *   - Add block step 1 (read-only date, editable start time, computed end time)
 *   - Edit block step 2 (editable date, start, end)
 *
 * Display mode: single compact row with date · start time · end time
 * Edit mode: two rows (date row + time row) for comfortable tap targets
 */

interface DateTimeCardProps {
  /** 'display' shows formatted date string; 'edit' shows date input */
  mode: 'display' | 'edit'
  /** Formatted date string (used when mode='display') */
  dateDisplay?: string
  /** Formatted end time string (used when mode='display', step 1 computed end) */
  endTimeDisplay?: string | null
  /** Duration label like "1h 30m" shown as a subtle badge */
  durationLabel?: string | null
  /** Whether this is a point-in-time block (checkin/nutrition) - hides end time */
  pointInTime?: boolean
  /** Start time field label override (defaults to "Start" or "Time" if pointInTime) */
  startLabel?: string
  /** react-hook-form register function */
  register: UseFormRegister<any>
}

export function DateTimeCard({
  mode,
  dateDisplay,
  endTimeDisplay,
  durationLabel,
  pointInTime = false,
  startLabel,
  register,
}: DateTimeCardProps) {
  const resolvedStartLabel = startLabel || (pointInTime ? 'Time' : 'Start')

  // Display mode — single compact row: 📅 Date  ·  🕐 Start – End
  if (mode === 'display') {
    return (
      <div className="bg-[rgba(255,255,255,0.03)] rounded-[10px] border border-[rgba(255,255,255,0.06)] px-2.5 py-2 flex items-center gap-3">
        {/* Date */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Calendar className="h-3.5 w-3.5 text-[#60a5fa] flex-shrink-0" />
          <span className="text-[11px] text-[#eef2ff] font-medium truncate">{dateDisplay}</span>
        </div>

        <div className="w-px h-4 bg-[rgba(255,255,255,0.06)] flex-shrink-0" />

        {/* Time */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Clock className="h-3.5 w-3.5 text-[#60a5fa] flex-shrink-0" />
          <Input
            type="time"
            {...register('start_time')}
            className="w-[90px] text-[11px] !h-[28px] !px-1.5"
          />
          {!pointInTime && endTimeDisplay && (
            <>
              <span className="text-[10px] text-[rgba(238,242,255,0.3)]">–</span>
              <span className="text-[11px] text-[#eef2ff] font-medium">{endTimeDisplay}</span>
            </>
          )}
        </div>
      </div>
    )
  }

  // Edit mode — two rows for comfortable editing
  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-[10px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
      {/* Date row */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-[rgba(255,255,255,0.06)]">
        <Calendar className="h-3.5 w-3.5 text-[#60a5fa] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Input
            type="date"
            {...register('date')}
            className="w-full text-[11px] !h-[28px] !px-2"
          />
        </div>
      </div>

      {/* Time row */}
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <Clock className="h-3.5 w-3.5 text-[#60a5fa] flex-shrink-0" />

        <div className="flex-1 min-w-0 flex items-center gap-2">
          {/* Start time */}
          <div className="flex-1 min-w-0">
            <label className="block text-[9px] font-medium text-[rgba(238,242,255,0.4)] mb-0.5 leading-none">
              {resolvedStartLabel}
            </label>
            <Input
              type="time"
              {...register('start_time')}
              className="w-full text-[11px] !h-[28px] !px-2"
            />
          </div>

          {/* End time */}
          {!pointInTime && (
            <>
              <div className="w-px h-5 bg-[rgba(255,255,255,0.06)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="block text-[9px] font-medium text-[rgba(238,242,255,0.4)] mb-0.5 leading-none">
                  End
                </label>
                <Input
                  type="time"
                  {...register('end_time')}
                  className="w-full text-[11px] !h-[28px] !px-2"
                />
              </div>
            </>
          )}
        </div>

        {/* Duration badge */}
        {durationLabel && (
          <span className="text-[9px] text-[rgba(238,242,255,0.35)] font-medium whitespace-nowrap flex-shrink-0">
            {durationLabel}
          </span>
        )}
      </div>
    </div>
  )
}
