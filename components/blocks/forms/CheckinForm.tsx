'use client'

import { useCallback } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { Input, Textarea } from '@/components/ui'
import { InlineMediaUpload, type PendingMedia } from '../InlineMediaUpload'
import type { CheckinFormData } from '@/lib/schemas'

interface CheckinFormProps {
  form: UseFormReturn<CheckinFormData>
  userHasHeight?: boolean
  onMediaChange?: (media: PendingMedia[]) => void
}

export function CheckinForm({ form, userHasHeight = false, onMediaChange }: CheckinFormProps) {
  const {
    register,
    formState: { errors },
  } = form

  const handleMediaChange = useCallback((media: PendingMedia[]) => {
    onMediaChange?.(media)
  }, [onMediaChange])

  return (
    <div className="space-y-4">
      {/* Weight - Required */}
      <Input
        type="number"
        label="Weight (kg)"
        placeholder="e.g., 75.5"
        step="0.1"
        {...register('payload.weight', {
          valueAsNumber: true,
          setValueAs: (v) => (v === '' || v === 0 ? undefined : Number(v)),
        })}
        error={errors.payload?.weight?.message}
      />

      {/* Height - Required only if not in profile */}
      {!userHasHeight && (
        <Input
          type="number"
          label="Height (cm)"
          placeholder="e.g., 175"
          {...register('payload.height', {
            valueAsNumber: true,
            setValueAs: (v) => (v === '' ? undefined : Number(v)),
          })}
        />
      )}

      {/* Body Fat Percentage */}
      <Input
        type="number"
        label="Body Fat %"
        placeholder="Optional"
        step="0.1"
        min={0}
        max={100}
        {...register('payload.body_fat_percent', {
          valueAsNumber: true,
          setValueAs: (v) => (v === '' ? undefined : Number(v)),
        })}
      />

      {/* Notes */}
      <Textarea
        label="Notes"
        placeholder="Optional notes about your check-in..."
        {...register('notes')}
      />

      {/* Progress Photos */}
      <InlineMediaUpload
        maxFiles={3}
        onChange={handleMediaChange}
        label="Progress Photos"
      />
    </div>
  )
}
