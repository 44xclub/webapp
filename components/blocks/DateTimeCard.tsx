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
 * Rules:
 *   - Date row is always full width, never truncated
 *   - Time row: two equal-width cells with clean inner divider
 *   - Consistent outer border, radius, padding
 *   - Missing end_time shows "—"
 *   - Works on iPhone SE through desktop
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

  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-[12px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
      {/* Date row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
        <Calendar className="h-4 w-4 text-[#60a5fa] flex-shrink-0" />
        {mode === 'display' ? (
          <span className="text-[13px] text-[#eef2ff] font-medium truncate min-w-0">
            {dateDisplay}
          </span>
        ) : (
          <div className="flex-1 min-w-0">
            <Input
              type="date"
              {...register('date')}
              className="w-full text-[13px] !h-[36px] !px-2"
            />
          </div>
        )}
      </div>

      {/* Time row */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Clock className="h-4 w-4 text-[#60a5fa] flex-shrink-0" />

        <div className="flex-1 min-w-0 flex items-end gap-3">
          {/* Start time — always editable */}
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-medium text-[rgba(238,242,255,0.4)] mb-0.5 leading-none">
              {resolvedStartLabel}
            </label>
            <Input
              type="time"
              {...register('start_time')}
              className="w-full text-[13px] !h-[36px] !px-2"
            />
          </div>

          {/* End time / display */}
          {!pointInTime && (
            <>
              {/* Thin vertical divider */}
              <div className="w-px h-8 bg-[rgba(255,255,255,0.06)] flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <label className="block text-[10px] font-medium text-[rgba(238,242,255,0.4)] mb-0.5 leading-none">
                  End
                </label>
                {mode === 'edit' ? (
                  <Input
                    type="time"
                    {...register('end_time')}
                    className="w-full text-[13px] !h-[36px] !px-2"
                  />
                ) : (
                  <p className="text-[13px] text-[#eef2ff] font-semibold h-[36px] flex items-center">
                    {endTimeDisplay || '—'}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Duration badge */}
        {durationLabel && (
          <span className="text-[10px] text-[rgba(238,242,255,0.35)] font-medium whitespace-nowrap flex-shrink-0">
            {durationLabel}
          </span>
        )}
      </div>
    </div>
  )
}
