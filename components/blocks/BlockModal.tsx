'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal, Button, Input } from '@/components/ui'
import { MediaUploader } from './MediaUploader'
import { type PendingMedia } from './InlineMediaUpload'
import {
  WorkoutForm,
  HabitForm,
  NutritionForm,
  CheckinForm,
  PersonalForm,
} from './forms'
import {
  workoutSchema,
  habitSchema,
  nutritionSchema,
  checkinSchema,
  personalSchema,
  challengeSchema,
  type BlockFormData,
} from '@/lib/schemas'
import { blockTypeLabels, cn } from '@/lib/utils'
import { formatDateForApi, roundToNearest5Minutes } from '@/lib/date'
import type { Block, BlockType, BlockMedia, ProgrammeSession, UserProgramme } from '@/lib/types'
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react'

interface BlockModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: BlockFormData, entryMode?: 'schedule' | 'log') => Promise<Block | void>
  onShowSharePreview?: (block: Block) => void
  initialDate: Date
  editingBlock?: Block | null
  blockMedia?: BlockMedia[]
  userId?: string
  onMediaUpload?: (blockId: string, file: File, position?: number) => Promise<BlockMedia | void>
  onMediaDelete?: (mediaId: string) => Promise<void>
  userHasHeight?: boolean
  activeProgramme?: UserProgramme | null
  programmeSessions?: ProgrammeSession[]
  userTimezone?: string
}

// Challenge is handled by ChallengeLogModal (requires media + preview)
const blockTypeOptions = [
  { value: 'workout', label: 'Workout', schedulable: true },
  { value: 'habit', label: 'Habit', schedulable: true },
  { value: 'nutrition', label: 'Nutrition', schedulable: true },
  { value: 'checkin', label: 'Check-in', schedulable: false },
  { value: 'personal', label: 'Personal', schedulable: true },
]

const durationOptions = [
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 45, label: '45m' },
  { value: 60, label: '1h' },
  { value: 90, label: '1.5h' },
  { value: 120, label: '2h' },
  { value: 'custom', label: 'Custom' },
]

function getSchemaForType(type: BlockType) {
  switch (type) {
    case 'workout':
      return workoutSchema
    case 'habit':
      return habitSchema
    case 'nutrition':
      return nutritionSchema
    case 'checkin':
      return checkinSchema
    case 'personal':
      return personalSchema
    case 'challenge':
      return challengeSchema
  }
}

function getDefaultPayload(type: BlockType) {
  switch (type) {
    case 'workout':
      // Default to weight_lifting with exercise matrix initialized
      // For running/sport/other, exercise_matrix will be cleared by WorkoutForm
      return {
        subtype: 'custom',
        category: 'weight_lifting',
        exercise_matrix: [{ exercise: '', sets: [{ set: 1, reps: '', weight: '' }], notes: '' }],
      }
    case 'nutrition':
      return { meal_type: 'breakfast', meal_name: '' }
    case 'checkin':
      return {}
    case 'challenge':
      return {}
    default:
      return {}
  }
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number)
  const totalMins = hours * 60 + mins + minutes
  const newHours = Math.floor(totalMins / 60) % 24
  const newMins = totalMins % 60
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`
}

function calculateMinutesBetween(startTime: string, endTime: string | null): number | null {
  if (!startTime || !endTime) return null
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const startMins = startH * 60 + startM
  const endMins = endH * 60 + endM
  if (endMins >= startMins) return endMins - startMins
  return (24 * 60 - startMins) + endMins // Handle overnight
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDisplayTime(time: string): string {
  const [hours, mins] = time.split(':').map(Number)
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h = hours % 12 || 12
  return `${h}:${String(mins).padStart(2, '0')} ${ampm}`
}

function isToday(dateStr: string): boolean {
  return dateStr === formatDateForApi(new Date())
}

// Check if a block is scheduled for the future (vs log-now/past)
function isFutureScheduled(dateStr: string, startTime: string, timezone: string = 'Europe/London'): boolean {
  try {
    // Create scheduled datetime in user's timezone
    const scheduledDate = new Date(`${dateStr}T${startTime}:00`)
    const now = new Date()

    // Add 2 minute tolerance
    const toleranceMs = 2 * 60 * 1000
    return scheduledDate.getTime() > (now.getTime() + toleranceMs)
  } catch {
    return false
  }
}

// Block types eligible for sharing
const SHARE_ELIGIBLE_TYPES: BlockType[] = ['workout', 'habit', 'nutrition', 'checkin', 'challenge']

export function BlockModal({
  isOpen,
  onClose,
  onSave,
  onShowSharePreview,
  initialDate,
  editingBlock,
  blockMedia = [],
  userId,
  onMediaUpload,
  onMediaDelete,
  userHasHeight = false,
  activeProgramme,
  programmeSessions = [],
  userTimezone = 'Europe/London',
}: BlockModalProps) {
  const [step, setStep] = useState<1 | 2>(editingBlock ? 2 : 1)
  const [blockType, setBlockType] = useState<BlockType>(editingBlock?.block_type || 'workout')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState<number | 'custom'>(30)
  const [customDurationValue, setCustomDurationValue] = useState<string>('')
  const [customDurationUnit, setCustomDurationUnit] = useState<'min' | 'hr'>('min')
  const [entryMode, setEntryMode] = useState<'schedule' | 'log'>('schedule') // Schedule (future) vs Log (now/past)
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]) // For check-in inline uploads

  // Handle media change from CheckinForm
  const handleCheckinMediaChange = useCallback((media: PendingMedia[]) => {
    setPendingMedia(media)
  }, [])

  // Compute actual duration in minutes
  const actualDuration = useMemo(() => {
    if (selectedDuration === 'custom') {
      const val = parseFloat(customDurationValue) || 0
      return customDurationUnit === 'hr' ? Math.round(val * 60) : Math.round(val)
    }
    return selectedDuration
  }, [selectedDuration, customDurationValue, customDurationUnit])

  // Filter block types based on entry mode (Schedule hides Check-in/Challenge)
  const filteredBlockTypes = useMemo(() => {
    return blockTypeOptions.filter(opt => {
      if (entryMode === 'schedule') return opt.schedulable
      return true
    })
  }, [entryMode])

  const schema = useMemo(() => getSchemaForType(blockType), [blockType])

  const defaultValues = useMemo(() => {
    if (editingBlock) {
      return {
        date: editingBlock.date,
        start_time: editingBlock.start_time.slice(0, 5),
        end_time: editingBlock.end_time?.slice(0, 5) || null,
        block_type: editingBlock.block_type,
        title: editingBlock.title || '',
        notes: editingBlock.notes || '',
        payload: editingBlock.payload || getDefaultPayload(editingBlock.block_type),
        repeat_rule: editingBlock.repeat_rule || { pattern: 'none' },
      }
    }

    return {
      date: formatDateForApi(initialDate),
      start_time: roundToNearest5Minutes(),
      end_time: null,
      block_type: blockType,
      title: '',
      notes: '',
      payload: getDefaultPayload(blockType),
      repeat_rule: { pattern: 'none' as const },
    }
  }, [editingBlock, initialDate, blockType])

  const form = useForm<BlockFormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as BlockFormData,
  })

  const startTime = form.watch('start_time')
  const endTimeWatched = form.watch('end_time')
  const dateValue = form.watch('date')
  const titleValue = form.watch('title')

  // Update end time when duration changes - only for new blocks in step 1
  useEffect(() => {
    // Don't auto-update for existing blocks being edited
    if (editingBlock) return

    if (startTime && actualDuration > 0 && step === 1) {
      const newEndTime = addMinutesToTime(startTime, actualDuration)
      form.setValue('end_time', newEndTime)

      // Auto-fill duration for workout blocks
      if (blockType === 'workout') {
        form.setValue('payload.duration', actualDuration)
      }
    }
  }, [startTime, actualDuration, blockType, form, editingBlock, step])

  // For edit mode: sync payload.duration when times change (for workout blocks)
  useEffect(() => {
    if (!editingBlock || blockType !== 'workout') return
    
    const computedDuration = calculateMinutesBetween(startTime, endTimeWatched ?? null)
    if (computedDuration !== null && computedDuration > 0) {
      form.setValue('payload.duration', computedDuration)
    }
  }, [startTime, endTimeWatched, editingBlock, blockType, form])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editingBlock) {
        setStep(2) // Go directly to step 2 when editing
        setBlockType(editingBlock.block_type)
        
        // Calculate duration from existing times or payload
        const existingDuration = (editingBlock.payload as any)?.duration_minutes || calculateMinutesBetween(
          editingBlock.start_time.slice(0, 5),
          editingBlock.end_time?.slice(0, 5) || null
        )
        if (existingDuration) {
          // Check if it matches a preset
          const presetValues = [15, 30, 45, 60, 90, 120]
          if (presetValues.includes(existingDuration)) {
            setSelectedDuration(existingDuration)
          } else {
            // Custom duration
            setSelectedDuration('custom')
            if (existingDuration >= 60 && existingDuration % 60 === 0) {
              setCustomDurationValue(String(existingDuration / 60))
              setCustomDurationUnit('hr')
            } else {
              setCustomDurationValue(String(existingDuration))
              setCustomDurationUnit('min')
            }
          }
        }
        
        form.reset({
          date: editingBlock.date,
          start_time: editingBlock.start_time.slice(0, 5),
          end_time: editingBlock.end_time?.slice(0, 5) || null,
          block_type: editingBlock.block_type,
          title: editingBlock.title || '',
          notes: editingBlock.notes || '',
          payload: editingBlock.payload || getDefaultPayload(editingBlock.block_type),
          repeat_rule: editingBlock.repeat_rule || { pattern: 'none' },
        } as BlockFormData)
      } else {
        setStep(1)
        setSelectedDuration(30)
        setCustomDurationValue('')
        setCustomDurationUnit('min')
        setEntryMode('schedule') // Reset to schedule mode for new blocks
        setPendingMedia([]) // Clear pending media
        form.reset({
          date: formatDateForApi(initialDate),
          start_time: roundToNearest5Minutes(),
          end_time: null,
          block_type: blockType,
          title: '',
          notes: '',
          payload: getDefaultPayload(blockType),
          repeat_rule: { pattern: 'none' as const },
        } as BlockFormData)
      }
    }
  }, [isOpen, editingBlock, initialDate, blockType, form])

  const handleBlockTypeChange = (newType: BlockType) => {
    if (editingBlock) return
    setBlockType(newType)
    // Check-in and Challenge blocks can only be logged, not scheduled
    if (newType === 'challenge' || newType === 'checkin') {
      setEntryMode('log')
    }
    form.reset({
      ...form.getValues(),
      block_type: newType,
      title: '',
      payload: getDefaultPayload(newType),
    } as BlockFormData)
  }

  const handleContinue = () => {
    setStep(2)
  }

  const handleBack = () => {
    setStep(1)
  }

  const handleClose = () => {
    setStep(1)
    onClose()
  }

  const handleSubmit = async (data: BlockFormData) => {
    setIsSubmitting(true)
    try {
      // Check-in blocks are point-in-time - no duration
      const isCheckin = blockType === 'checkin'

      // Add duration_minutes to payload and compute end_time
      const enrichedData = {
        ...data,
        end_time: isCheckin ? data.start_time : addMinutesToTime(data.start_time, actualDuration),
        payload: {
          ...data.payload,
          ...(isCheckin ? {} : { duration_minutes: actualDuration }),
        },
      } as BlockFormData

      // Pass entry mode for new blocks (not editing)
      const createdBlock = await onSave(enrichedData, editingBlock ? undefined : entryMode)

      // Upload pending media for check-in blocks (with position for ordering)
      if (createdBlock && blockType === 'checkin' && pendingMedia.length > 0 && onMediaUpload) {
        // Upload all pending media in parallel, passing position index
        await Promise.all(
          pendingMedia.map(async (item, index) => {
            // Create a File from the compressed blob
            const file = new File([item.blob], `checkin-${Date.now()}-${index}.webp`, {
              type: 'image/webp',
            })
            await onMediaUpload(createdBlock.id, file, index)
          })
        )
        setPendingMedia([]) // Clear pending media after upload
      }

      setStep(1)
      onClose()

      // For Log mode with share toggle ON, show preview modal immediately after save
      // (Block is already completed, we just need to let user preview and confirm the feed post)
      const shareEnabled = (data as any).shared_to_feed === true || blockType === 'challenge'
      const isNewLoggedBlock = !editingBlock && entryMode === 'log' && createdBlock

      if (isNewLoggedBlock && shareEnabled && SHARE_ELIGIBLE_TYPES.includes(blockType) && onShowSharePreview) {
        // Small delay to let modal close animation complete
        setTimeout(() => onShowSharePreview(createdBlock), 150)
      }
    } catch (error) {
      console.error('Failed to save block:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderForm = () => {
    switch (blockType) {
      case 'workout':
        return (
          <WorkoutForm
            form={form as ReturnType<typeof useForm<typeof workoutSchema._type>>}
            activeProgramme={activeProgramme}
            programmeSessions={programmeSessions}
          />
        )
      case 'habit':
        return <HabitForm form={form as ReturnType<typeof useForm<typeof habitSchema._type>>} />
      case 'nutrition':
        return <NutritionForm form={form as ReturnType<typeof useForm<typeof nutritionSchema._type>>} />
      case 'checkin':
        return (
          <CheckinForm
            form={form as ReturnType<typeof useForm<typeof checkinSchema._type>>}
            userHasHeight={userHasHeight}
            onMediaChange={!editingBlock ? handleCheckinMediaChange : undefined}
          />
        )
      case 'personal':
        return <PersonalForm form={form as ReturnType<typeof useForm<typeof personalSchema._type>>} />
      case 'challenge':
        return <PersonalForm form={form as ReturnType<typeof useForm<typeof personalSchema._type>>} />
    }
  }

  // Compute end time from start time + actual duration
  const endTime = useMemo(() => {
    if (endTimeWatched) return endTimeWatched
    if (startTime && actualDuration > 0) {
      return addMinutesToTime(startTime, actualDuration)
    }
    return null
  }, [endTimeWatched, startTime, actualDuration])

  // Determine if this block is future-scheduled (for share/media gating)
  // For new blocks, use the entryMode toggle; for editing, compute from date/time
  const isScheduledFuture = useMemo(() => {
    if (editingBlock) {
      // For existing blocks, compute based on actual date/time
      if (!dateValue || !startTime) return false
      return isFutureScheduled(dateValue, startTime, userTimezone)
    }
    // For new blocks, use the explicit user selection
    return entryMode === 'schedule'
  }, [editingBlock, dateValue, startTime, userTimezone, entryMode])

  // Should we show share/media controls?
  // - Not for personal blocks
  // - Not for future-scheduled NEW blocks (only show on completion)
  // - For existing blocks being edited, only if it's log-now/past or already has media/share set
  const showShareMediaControls = useMemo(() => {
    // Personal blocks never show share/media
    if (blockType === 'personal') return false

    // Check if block type is share-eligible
    if (!SHARE_ELIGIBLE_TYPES.includes(blockType)) return false

    // For editing existing blocks - always show (they can update)
    if (editingBlock) return true

    // For new blocks - only show if it's log-now/past (not future-scheduled)
    return !isScheduledFuture
  }, [blockType, editingBlock, isScheduledFuture])

  // Step 1 footer
  const step1Footer = (
    <Button
      type="button"
      onClick={handleContinue}
      className="w-full"
      size="lg"
    >
      Continue
      <ChevronRight className="h-5 w-5 ml-1" />
    </Button>
  )

  // Step 2 footer
  const step2Footer = (
    <div className="flex gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleClose}
        className="flex-1"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form="block-form"
        loading={isSubmitting}
        className="flex-1"
      >
        {editingBlock ? 'Save Changes' : 'Create Block'}
      </Button>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingBlock ? `Edit ${blockTypeLabels[blockType]}` : step === 1 ? 'New Block' : 'Details'}
      showClose={true}
      footer={step === 1 && !editingBlock ? step1Footer : step2Footer}
    >
      {/* Step 1: Quick Entry */}
      {step === 1 && !editingBlock && (
        <div className="p-4 space-y-5">
          {/* Schedule vs Log Toggle - hidden for challenge blocks (always Log) */}
          {blockType !== 'challenge' ? (
            <div className="flex bg-[rgba(255,255,255,0.04)] rounded-[10px] p-1">
              <button
                type="button"
                onClick={() => setEntryMode('schedule')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-[8px] text-[13px] font-medium transition-all duration-200',
                  entryMode === 'schedule'
                    ? 'bg-[#3b82f6] text-white'
                    : 'text-[rgba(238,242,255,0.60)] hover:text-[rgba(238,242,255,0.80)]'
                )}
              >
                Schedule
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('log')}
                className={cn(
                  'flex-1 px-4 py-2 rounded-[8px] text-[13px] font-medium transition-all duration-200',
                  entryMode === 'log'
                    ? 'bg-[#3b82f6] text-white'
                    : 'text-[rgba(238,242,255,0.60)] hover:text-[rgba(238,242,255,0.80)]'
                )}
              >
                Log
              </button>
            </div>
          ) : (
            <div className="p-3 bg-[rgba(245,158,11,0.08)] rounded-[10px] border border-[rgba(245,158,11,0.2)]">
              <p className="text-[12px] text-amber-400 font-medium">
                🏆 Challenge blocks can only be logged, not scheduled.
              </p>
            </div>
          )}

          {/* Block Type Selector - filtered by entry mode */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {filteredBlockTypes.map((option) => {
              const isSelected = blockType === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleBlockTypeChange(option.value as BlockType)}
                  className={cn(
                    'px-4 py-2 rounded-[10px] text-[13px] font-medium whitespace-nowrap transition-all duration-200 border',
                    isSelected
                      ? 'bg-[#3b82f6] text-white border-[#3b82f6] shadow-[0_2px_8px_rgba(59,130,246,0.25)]'
                      : 'bg-[var(--surface-2)] text-[rgba(238,242,255,0.65)] border-[rgba(255,255,255,0.08)] hover:border-[rgba(59,130,246,0.4)] hover:text-[rgba(238,242,255,0.85)] shadow-[0_2px_4px_rgba(0,0,0,0.2)]'
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          {/* Title Input */}
          <div>
            <Input
              label={blockType === 'workout' ? 'Workout Title' : blockType === 'habit' ? 'Habit Name' : blockType === 'nutrition' ? 'Meal Name' : 'Title'}
              placeholder={
                blockType === 'workout' ? 'e.g., Push Day, Leg Day' :
                blockType === 'habit' ? 'e.g., Morning meditation' :
                blockType === 'nutrition' ? 'e.g., Chicken salad' :
                'e.g., Doctor appointment'
              }
              {...form.register('title')}
            />
          </div>

          {/* Date Row */}
          <div className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-[12px] border border-[rgba(255,255,255,0.08)] shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-[#3b82f6]" />
              <span className="text-[15px] text-[#eef2ff]">{formatDisplayDate(dateValue)}</span>
            </div>
            {isToday(dateValue) && (
              <span className="text-[12px] text-[#3b82f6] font-medium">Today</span>
            )}
          </div>

          {/* Time Section */}
          <div>
            <label className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-2">
              {blockType === 'checkin' ? 'Time' : 'Start Time'}
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Input
                  type="time"
                  {...form.register('start_time')}
                  className="w-full"
                />
              </div>
              {/* Only show end time for blocks with duration */}
              {blockType !== 'checkin' && (
                <div className="flex items-center gap-2 text-[14px] text-[rgba(238,242,255,0.52)]">
                  <span>to</span>
                  <span className="text-[#eef2ff] font-medium">{endTime ? formatDisplayTime(endTime) : '--:--'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Duration Quick Select - hidden for check-in (point-in-time) */}
          {blockType !== 'checkin' && (
            <div>
              <label className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-2">Duration</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {durationOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedDuration(option.value as number | 'custom')
                      // Pre-fill custom input when switching from preset
                      if (option.value === 'custom' && typeof selectedDuration === 'number') {
                        setCustomDurationValue(String(selectedDuration))
                        setCustomDurationUnit('min')
                      }
                    }}
                    className={cn(
                      'px-4 py-2.5 rounded-[10px] text-[13px] font-medium whitespace-nowrap transition-all duration-200 border min-w-[56px]',
                      selectedDuration === option.value
                        ? 'bg-[#3b82f6] text-white border-transparent shadow-[0_2px_8px_rgba(59,130,246,0.25)]'
                        : 'bg-[var(--surface-2)] text-[rgba(238,242,255,0.72)] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] shadow-[0_2px_4px_rgba(0,0,0,0.2)]'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Custom Duration Input */}
              {selectedDuration === 'custom' && (
                <div className="mt-3 flex gap-2 items-center">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="e.g., 75"
                      min={1}
                      max={600}
                      value={customDurationValue}
                      onChange={(e) => setCustomDurationValue(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <select
                    value={customDurationUnit}
                    onChange={(e) => setCustomDurationUnit(e.target.value as 'min' | 'hr')}
                    className="px-3 py-2.5 rounded-[10px] text-[13px] font-medium bg-[var(--surface-2)] text-[rgba(238,242,255,0.72)] border border-[rgba(255,255,255,0.08)] focus:border-[#3b82f6] focus:outline-none shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                  >
                    <option value="min">min</option>
                    <option value="hr">hr</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Details */}
      {(step === 2 || editingBlock) && (
        <form id="block-form" onSubmit={form.handleSubmit(handleSubmit)} className="p-4 space-y-4">
          {/* Summary Header */}
          {!editingBlock && (
            <div className="p-4 rounded-[12px] bg-[var(--surface-2)] border border-[rgba(255,255,255,0.08)] shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-[10px] flex items-center justify-center bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.2)]">
                  <Clock className="h-5 w-5 text-[#3b82f6]" />
                </div>
                <div>
                  <p className="text-[12px] text-[rgba(238,242,255,0.45)]">
                    {blockType === 'checkin'
                      ? formatDisplayTime(startTime)
                      : `${formatDisplayTime(startTime)} – ${endTime ? formatDisplayTime(endTime) : '--:--'} (${actualDuration} min)`
                    }
                  </p>
                  <p className="text-[14px] font-semibold text-[#eef2ff]">
                    {titleValue || blockTypeLabels[blockType]}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Back button for new blocks */}
          {!editingBlock && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1 text-[12px] text-[rgba(238,242,255,0.45)] hover:text-[rgba(238,242,255,0.65)] transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to basics
            </button>
          )}

          {/* Locked State Banner - shows when editing blocks after cutoff */}
          {editingBlock?.locked_at && (
            <div className="p-3 bg-[rgba(245,158,11,0.08)] rounded-[10px] border border-[rgba(245,158,11,0.2)] flex items-center gap-2">
              <span className="text-[12px]">🔒</span>
              <p className="text-[12px] text-amber-400 font-medium">
                Locked — edits won&apos;t affect score.
              </p>
            </div>
          )}

          {/* Clean date/time edit section */}
          {editingBlock && (
            <div className="p-4 bg-[var(--surface-2)] rounded-[12px] border border-[rgba(255,255,255,0.08)] shadow-[0_2px_8px_rgba(0,0,0,0.15)] space-y-4">
              {/* Date Row */}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-[rgba(238,242,255,0.50)] flex-shrink-0" />
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-[rgba(238,242,255,0.45)] mb-1">Date</label>
                  <Input
                    type="date"
                    {...form.register('date')}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Time Row */}
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-[rgba(238,242,255,0.50)] flex-shrink-0 mt-6" />
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[rgba(238,242,255,0.45)] mb-1">Start</label>
                    <Input
                      type="time"
                      {...form.register('start_time')}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[rgba(238,242,255,0.45)] mb-1">End</label>
                    <Input
                      type="time"
                      {...form.register('end_time')}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Duration display */}
              {endTime && (
                <p className="text-[11px] text-[rgba(238,242,255,0.40)] text-right">
                  Duration: {calculateMinutesBetween(startTime, endTime) || 0} min
                </p>
              )}
            </div>
          )}

          {/* Type-specific Form */}
          <div className="space-y-4">
            {renderForm()}
          </div>

          {/* Media & Share Section - conditionally shown based on scheduling */}
          {showShareMediaControls && (
            <>
              {/* Media Upload - only for existing blocks */}
              {editingBlock && userId && onMediaUpload && onMediaDelete && (
                <MediaUploader
                  blockId={editingBlock.id}
                  userId={userId}
                  media={blockMedia}
                  onUpload={onMediaUpload}
                  onDelete={onMediaDelete}
                />
              )}

              {/* Share to Feed Toggle */}
              <div className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-[12px] border border-[rgba(255,255,255,0.08)] shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
                <div>
                  <p className="text-[13px] font-medium text-[#eef2ff]">Share to Feed</p>
                  <p className="text-[11px] text-[rgba(238,242,255,0.40)]">
                    {blockType === 'challenge' ? 'Required for challenges' : 'Post to community feed on completion'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (blockType === 'challenge') return // forced
                    const current = form.getValues('shared_to_feed' as any)
                    form.setValue('shared_to_feed' as any, !current)
                  }}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors duration-200',
                    (blockType === 'challenge' || form.watch('shared_to_feed' as any))
                      ? 'bg-[#3b82f6]'
                      : 'bg-[rgba(255,255,255,0.12)]'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200',
                      (blockType === 'challenge' || form.watch('shared_to_feed' as any))
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </>
          )}

          {/* Future-scheduled info notice (when share/media is hidden) */}
          {!showShareMediaControls && blockType !== 'personal' && !editingBlock && isScheduledFuture && (
            <div className="p-3 bg-[rgba(59,130,246,0.08)] rounded-[12px] border border-[rgba(59,130,246,0.2)] shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
              <p className="text-[12px] text-[rgba(238,242,255,0.72)]">
                📸 You can add photos and share to the feed when you complete this block.
              </p>
            </div>
          )}
        </form>
      )}
    </Modal>
  )
}
