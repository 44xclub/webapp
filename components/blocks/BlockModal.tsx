'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
import { Calendar, Clock, ChevronLeft, ChevronRight, Dumbbell, Sparkles, Utensils, Scale, FileText } from 'lucide-react'

interface BlockModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: BlockFormData, entryMode?: 'schedule' | 'log') => Promise<Block | void>
  onShowSharePreview?: (block: Block) => void
  initialDate: Date
  editingBlock?: Block | null
  blockMedia?: BlockMedia[]
  userId?: string
  onMediaUpload?: (blockId: string, file: File, meta?: Record<string, unknown>) => Promise<BlockMedia | void>
  onMediaDelete?: (mediaId: string) => Promise<void>
  userHasHeight?: boolean
  activeProgramme?: UserProgramme | null
  programmeSessions?: ProgrammeSession[]
  userTimezone?: string
  /** Callback for autosaving task toggle on personal blocks without full form save */
  onTaskToggle?: (blockId: string, tasks: import('@/lib/types').TaskItem[]) => void
}

// Challenge is handled by ChallengeLogModal (requires media + preview)
const blockTypeOptions = [
  { value: 'workout', label: 'Workout', schedulable: true, icon: Dumbbell },
  { value: 'habit', label: 'Habit', schedulable: true, icon: Sparkles },
  { value: 'nutrition', label: 'Nutrition', schedulable: true, icon: Utensils },
  { value: 'checkin', label: 'Check-in', schedulable: false, icon: Scale },
  { value: 'personal', label: 'Personal', schedulable: true, icon: FileText },
]

const durationOptions = [
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 60, label: '1h' },
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

function formatDurationHuman(minutes: number): string {
  if (minutes <= 0) return '0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
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
  onTaskToggle,
}: BlockModalProps) {
  const [step, setStep] = useState<1 | 2>(editingBlock ? 2 : 1)
  const [blockType, setBlockType] = useState<BlockType>(editingBlock?.block_type || 'workout')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
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
  const schemaRef = useRef(schema)
  schemaRef.current = schema

  // Dynamic resolver that always validates against the current blockType's schema.
  // useForm captures the resolver at mount, so we use a stable wrapper that
  // delegates to the latest schema via ref.
  const dynamicResolver = useCallback(
    async (values: any, context: any, options: any) => {
      const resolver = zodResolver(schemaRef.current)
      return resolver(values, context, options)
    },
    []
  )

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
    resolver: dynamicResolver,
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

  // Reset form when modal opens (NOT when blockType changes - that's handled separately)
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
        setBlockType('workout') // Reset to default type
        setSelectedDuration(30)
        setCustomDurationValue('')
        setCustomDurationUnit('min')
        setEntryMode('schedule') // Reset to schedule mode for new blocks
        setPendingMedia([]) // Clear pending media
        form.reset({
          date: formatDateForApi(initialDate),
          start_time: roundToNearest5Minutes(),
          end_time: null,
          block_type: 'workout',
          title: '',
          notes: '',
          payload: getDefaultPayload('workout'),
          repeat_rule: { pattern: 'none' as const },
        } as BlockFormData)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingBlock, initialDate])

  const handleBlockTypeChange = (newType: BlockType) => {
    if (editingBlock) return
    setBlockType(newType)
    setSubmitError(null)
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
    // For nutrition blocks, carry the step-1 title into payload.meal_name
    if (blockType === 'nutrition') {
      const currentTitle = form.getValues('title') || ''
      const currentMealName = form.getValues('payload.meal_name' as any)
      if (currentTitle && !currentMealName) {
        form.setValue('payload.meal_name' as any, currentTitle)
      }
    }
    setStep(2)
  }

  const handleBack = () => {
    setStep(1)
  }

  const handleClose = () => {
    setStep(1)
    setSubmitError(null)
    onClose()
  }

  const handleSubmit = async (data: BlockFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      // Check-in blocks are point-in-time - no duration
      const isCheckin = blockType === 'checkin'

      // Add duration_minutes to payload and compute end_time
      const enrichedData = {
        ...data,
        end_time: isCheckin ? null : addMinutesToTime(data.start_time, actualDuration),
        payload: {
          ...data.payload,
          ...(isCheckin ? {} : { duration_minutes: actualDuration }),
        },
      } as BlockFormData

      // Pass entry mode for new blocks (not editing)
      const createdBlock = await onSave(enrichedData, editingBlock ? undefined : entryMode)

      // Upload pending media for check-in blocks
      if (createdBlock && blockType === 'checkin' && pendingMedia.length > 0 && onMediaUpload) {
        // Upload all pending media in parallel
        await Promise.all(
          pendingMedia.map(async (item, index) => {
            // Create a File from the compressed blob
            const file = new File([item.blob], `checkin-${Date.now()}-${index}.webp`, {
              type: 'image/webp',
            })
            await onMediaUpload(createdBlock.id, file, {
              sort_order: index,
              is_cropped: false,
            })
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
    } catch (error: any) {
      console.error('Failed to save block:', error)
      setSubmitError(error?.message || 'Failed to save block. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Called when form validation fails (Zod rejects the data)
  const handleValidationError = (errors: any) => {
    console.error('Form validation failed:', errors)
    // Build a user-visible message from the first error
    const firstError = Object.values(errors).find((e: any) => e?.message) as any
    if (firstError?.message) {
      setSubmitError(firstError.message)
    } else {
      setSubmitError('Please fill in all required fields.')
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
            isEditing={!!editingBlock}
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
        return (
          <PersonalForm
            form={form as ReturnType<typeof useForm<typeof personalSchema._type>>}
            isEditing={!!editingBlock}
            onTaskToggle={editingBlock && onTaskToggle ? (tasks) => onTaskToggle(editingBlock.id, tasks) : undefined}
          />
        )
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

  // Step 1 footer - Premium Continue button
  const step1Footer = (
    <Button
      type="button"
      onClick={handleContinue}
      className="w-full h-12 text-[14px] font-semibold bg-gradient-to-b from-[#4f8ef7] to-[#3b7ce6] hover:from-[#5a96f8] hover:to-[#4585ed] shadow-[0_4px_12px_rgba(59,130,246,0.35),inset_0_1px_0_rgba(255,255,255,0.15)] border-0"
      size="lg"
    >
      Continue
      <ChevronRight className="h-5 w-5 ml-1" />
    </Button>
  )

  // Step 2 footer - Cancel/Save buttons
  const step2Footer = (
    <div className="flex gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleClose}
        className="flex-1 h-12 text-[14px] font-semibold bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form="block-form"
        loading={isSubmitting}
        className="flex-1 h-12 text-[14px] font-semibold bg-gradient-to-b from-[#4f8ef7] to-[#3b7ce6] hover:from-[#5a96f8] hover:to-[#4585ed] shadow-[0_4px_12px_rgba(59,130,246,0.35),inset_0_1px_0_rgba(255,255,255,0.15)] border-0"
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
      fullScreen={true}
      footer={step === 1 && !editingBlock ? step1Footer : step2Footer}
    >
      {/* Step 1: Quick Entry - Premium UI */}
      {step === 1 && !editingBlock && (
        <div className="p-4 space-y-5">
          {/* Schedule vs Log Toggle */}
          {blockType !== 'challenge' ? (
            <div className="bg-[rgba(0,0,0,0.25)] rounded-[14px] p-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setEntryMode('schedule')}
                  className={cn(
                    'py-2.5 rounded-[10px] text-[13px] font-semibold transition-all duration-200',
                    entryMode === 'schedule'
                      ? 'bg-gradient-to-b from-[#4f8ef7] to-[#3b7ce6] text-white shadow-[0_2px_8px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]'
                      : 'text-[rgba(238,242,255,0.55)] hover:text-[rgba(238,242,255,0.75)] hover:bg-[rgba(255,255,255,0.04)]'
                  )}
                >
                  Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('log')}
                  className={cn(
                    'py-2.5 rounded-[10px] text-[13px] font-semibold transition-all duration-200',
                    entryMode === 'log'
                      ? 'bg-gradient-to-b from-[#4f8ef7] to-[#3b7ce6] text-white shadow-[0_2px_8px_rgba(59,130,246,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]'
                      : 'text-[rgba(238,242,255,0.55)] hover:text-[rgba(238,242,255,0.75)] hover:bg-[rgba(255,255,255,0.04)]'
                  )}
                >
                  Log
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-gradient-to-r from-[rgba(245,158,11,0.12)] to-[rgba(245,158,11,0.06)] rounded-[12px] border border-[rgba(245,158,11,0.25)]">
              <p className="text-[12px] text-amber-400 font-medium">
                🏆 Challenge blocks can only be logged, not scheduled.
              </p>
            </div>
          )}

          {/* Block Type Selector with Icons */}
          <div>
            <label className="block text-[11px] font-semibold text-[rgba(238,242,255,0.45)] uppercase tracking-wider mb-3">
              Block Type
            </label>
            <div className="flex gap-2">
              {filteredBlockTypes.map((option) => {
                const isSelected = blockType === option.value
                const IconComponent = option.icon
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleBlockTypeChange(option.value as BlockType)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 w-[60px] h-[60px] justify-center rounded-[12px] text-[11px] font-medium transition-all duration-200 border flex-shrink-0',
                      isSelected
                        ? 'bg-gradient-to-b from-[rgba(59,130,246,0.2)] to-[rgba(59,130,246,0.1)] text-[#60a5fa] border-[rgba(59,130,246,0.4)]'
                        : 'bg-[rgba(255,255,255,0.03)] text-[rgba(238,242,255,0.5)] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(238,242,255,0.7)]'
                    )}
                  >
                    <IconComponent className={cn('h-5 w-5', isSelected ? 'text-[#60a5fa]' : 'text-[rgba(238,242,255,0.4)]')} />
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <Input
              label={blockType === 'workout' ? 'Workout Title' : blockType === 'habit' ? 'Habit Name' : blockType === 'nutrition' ? 'Meal Name' : 'Title'}
              placeholder={
                blockType === 'workout' ? 'Push Day, Leg Day' :
                blockType === 'habit' ? 'Morning meditation' :
                blockType === 'nutrition' ? 'Chicken salad' :
                'Doctor appointment'
              }
              {...form.register('title')}
            />
          </div>

          {/* Date & Time — compact card */}
          <div className="bg-[rgba(255,255,255,0.03)] rounded-[12px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            {/* Date row */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
              <Calendar className="h-4 w-4 text-[#60a5fa] flex-shrink-0" />
              <span className="text-[13px] text-[#eef2ff] font-medium">{formatDisplayDate(dateValue)}</span>
            </div>
            {/* Time row */}
            <div className="flex items-center gap-2 px-3 py-2.5">
              <Clock className="h-4 w-4 text-[#60a5fa] flex-shrink-0" />
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[rgba(238,242,255,0.4)] font-medium mb-0.5">{(blockType === 'checkin' || blockType === 'nutrition') ? 'Time' : 'Start'}</p>
                  <Input
                    type="time"
                    {...form.register('start_time')}
                    className="w-full text-[13px]"
                  />
                </div>
                {blockType !== 'checkin' && blockType !== 'nutrition' && (
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[rgba(238,242,255,0.4)] font-medium mb-0.5">End</p>
                    <p className="text-[13px] text-[#eef2ff] font-semibold py-[6px]">{endTime ? formatDisplayTime(endTime) : '--:--'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Duration Quick Select - not for checkin or nutrition */}
          {blockType !== 'checkin' && blockType !== 'nutrition' && (
            <div>
              <label className="block text-[11px] font-semibold text-[rgba(238,242,255,0.45)] uppercase tracking-wider mb-3">
                Duration
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {durationOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSelectedDuration(option.value as number | 'custom')
                      if (option.value === 'custom' && typeof selectedDuration === 'number') {
                        setCustomDurationValue(String(selectedDuration))
                        setCustomDurationUnit('min')
                      }
                    }}
                    className={cn(
                      'h-[36px] rounded-[var(--radius-button)] text-[13px] font-semibold transition-all duration-200',
                      selectedDuration === option.value
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-[rgba(255,255,255,0.04)] text-[rgba(238,242,255,0.6)] border border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.06)]'
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
                      placeholder="75"
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
                    className="px-4 py-2.5 rounded-[10px] text-[13px] font-semibold bg-[rgba(255,255,255,0.04)] text-[rgba(238,242,255,0.7)] border border-[rgba(255,255,255,0.08)] focus:border-[#60a5fa] focus:outline-none transition-colors"
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

      {/* Step 2: Details - Premium UI */}
      {(step === 2 || editingBlock) && (
        <form id="block-form" onSubmit={form.handleSubmit(handleSubmit, handleValidationError)} className="p-4 space-y-3">
          {/* Summary Header for new blocks — compact */}
          {!editingBlock && (
            <div className="bg-gradient-to-r from-[rgba(59,130,246,0.1)] to-[rgba(59,130,246,0.05)] rounded-[12px] border border-[rgba(59,130,246,0.15)] px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-[10px] flex items-center justify-center bg-gradient-to-b from-[rgba(59,130,246,0.25)] to-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.2)] flex-shrink-0">
                  <Clock className="h-4 w-4 text-[#60a5fa]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[rgba(238,242,255,0.5)] font-medium truncate">
                    {(blockType === 'checkin' || blockType === 'nutrition')
                      ? formatDisplayTime(startTime)
                      : `${formatDisplayTime(startTime)} – ${endTime ? formatDisplayTime(endTime) : '--:--'} · ${actualDuration} min`
                    }
                  </p>
                  <p className="text-[14px] font-semibold text-[#eef2ff] truncate">
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
              className="inline-flex items-center gap-1 text-[12px] text-[rgba(238,242,255,0.45)] hover:text-[#60a5fa] transition-colors font-medium"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to basics
            </button>
          )}

          {/* Locked State Banner */}
          {editingBlock?.locked_at && (
            <div className="p-3.5 bg-gradient-to-r from-[rgba(245,158,11,0.12)] to-[rgba(245,158,11,0.06)] rounded-[12px] border border-[rgba(245,158,11,0.25)] flex items-center gap-2.5">
              <span className="text-[14px]">🔒</span>
              <p className="text-[12px] text-amber-400 font-medium">
                Locked — edits won&apos;t affect score.
              </p>
            </div>
          )}

          {/* Date/Time edit section for existing blocks — compact, stable layout */}
          {editingBlock && (
            <div className="bg-[rgba(255,255,255,0.03)] rounded-[12px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
              {/* Date Row */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
                <Calendar className="h-4 w-4 text-[#60a5fa] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Input
                    type="date"
                    {...form.register('date')}
                    className="w-full text-[13px]"
                  />
                </div>
              </div>

              {/* Start / End Row */}
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <Clock className="h-4 w-4 text-[#60a5fa] flex-shrink-0" />
                <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                  <div className="min-w-0">
                    <label className="block text-[10px] font-medium text-[rgba(238,242,255,0.4)] mb-0.5">Start</label>
                    <Input
                      type="time"
                      {...form.register('start_time')}
                      className="w-full text-[13px]"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-[10px] font-medium text-[rgba(238,242,255,0.4)] mb-0.5">End</label>
                    <Input
                      type="time"
                      {...form.register('end_time')}
                      className="w-full text-[13px]"
                    />
                  </div>
                </div>
                {/* Inline duration badge */}
                {startTime && endTime && (() => {
                  const mins = calculateMinutesBetween(startTime, endTime)
                  if (mins === null || mins <= 0) return null
                  return (
                    <span className="text-[10px] text-[rgba(238,242,255,0.35)] font-medium whitespace-nowrap flex-shrink-0">
                      {formatDurationHuman(mins)}
                    </span>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Type-specific Form */}
          <div className="space-y-4">
            {renderForm()}
          </div>

          {/* Media & Share Section */}
          {showShareMediaControls && (
            <div className="space-y-4">
              {/* Media Upload */}
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
              <div className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)]">
                <div>
                  <p className="text-[13px] font-semibold text-[#eef2ff]">Share to Feed</p>
                  <p className="text-[11px] text-[rgba(238,242,255,0.4)] mt-0.5">
                    {blockType === 'challenge' ? 'Required for challenges' : 'Post to community feed on completion'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (blockType === 'challenge') return
                    const current = form.getValues('shared_to_feed' as any)
                    form.setValue('shared_to_feed' as any, !current)
                  }}
                  className={cn(
                    'relative w-12 h-7 rounded-full transition-all duration-200',
                    (blockType === 'challenge' || form.watch('shared_to_feed' as any))
                      ? 'bg-gradient-to-r from-[#4f8ef7] to-[#3b7ce6] shadow-[0_2px_8px_rgba(59,130,246,0.35)]'
                      : 'bg-[rgba(255,255,255,0.1)]'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                      (blockType === 'challenge' || form.watch('shared_to_feed' as any))
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Future-scheduled info notice */}
          {!showShareMediaControls && blockType !== 'personal' && !editingBlock && isScheduledFuture && (
            <div className="p-4 bg-gradient-to-r from-[rgba(59,130,246,0.1)] to-[rgba(59,130,246,0.05)] rounded-[14px] border border-[rgba(59,130,246,0.15)]">
              <p className="text-[12px] text-[rgba(238,242,255,0.7)] font-medium">
                📸 You can add photos and share to the feed when you complete this block.
              </p>
            </div>
          )}

          {/* Submit error message */}
          {submitError && (
            <div className="p-3 bg-[rgba(239,68,68,0.1)] rounded-[10px] border border-[rgba(239,68,68,0.2)]">
              <p className="text-[12px] text-red-400 font-medium">{submitError}</p>
            </div>
          )}
        </form>
      )}
    </Modal>
  )
}
