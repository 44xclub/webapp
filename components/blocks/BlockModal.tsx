'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal, Button, Input } from '@/components/ui'
import { MediaUploader } from './MediaUploader'
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
import { blockTypeLabels, blockTypeAccentColors, cn } from '@/lib/utils'
import { formatDateForApi, roundToNearest5Minutes } from '@/lib/date'
import type { Block, BlockType, BlockMedia } from '@/lib/types'
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react'

interface BlockModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: BlockFormData) => Promise<void>
  initialDate: Date
  editingBlock?: Block | null
  blockMedia?: BlockMedia[]
  userId?: string
  onMediaUpload?: (blockId: string, file: File) => Promise<BlockMedia | void>
  onMediaDelete?: (mediaId: string) => Promise<void>
  userHasHeight?: boolean
}

const blockTypeOptions = [
  { value: 'workout', label: 'Workout' },
  { value: 'habit', label: 'Habit' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'checkin', label: 'Check-in' },
  { value: 'challenge', label: 'Challenge' },
  { value: 'personal', label: 'Personal' },
]

const durationOptions = [
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 45, label: '45m' },
  { value: 60, label: '1h' },
  { value: 90, label: '1.5h' },
  { value: 120, label: '2h' },
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
      return {
        subtype: 'custom',
        category: 'weight_lifting',
        exercise_matrix: [{ exercise: '', sets: [{ set: 1, reps: '', weight: '' }], notes: '' }],
      }
    case 'nutrition':
      return { meal_type: 'breakfast', meal_name: '' }
    case 'checkin':
      return { weight: 0 }
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

export function BlockModal({
  isOpen,
  onClose,
  onSave,
  initialDate,
  editingBlock,
  blockMedia = [],
  userId,
  onMediaUpload,
  onMediaDelete,
  userHasHeight = false,
}: BlockModalProps) {
  const [step, setStep] = useState<1 | 2>(editingBlock ? 2 : 1)
  const [blockType, setBlockType] = useState<BlockType>(editingBlock?.block_type || 'workout')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState<number>(30)

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
    
    if (startTime && selectedDuration && step === 1) {
      const newEndTime = addMinutesToTime(startTime, selectedDuration)
      form.setValue('end_time', newEndTime)
      
      // Auto-fill duration for workout blocks
      if (blockType === 'workout') {
        form.setValue('payload.duration', selectedDuration)
      }
    }
  }, [startTime, selectedDuration, blockType, form, editingBlock, step])

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
        
        // Calculate duration from existing times
        const existingDuration = calculateMinutesBetween(
          editingBlock.start_time.slice(0, 5),
          editingBlock.end_time?.slice(0, 5) || null
        )
        if (existingDuration) setSelectedDuration(existingDuration)
        
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
      await onSave(data)
      setStep(1)
      onClose()
    } catch (error) {
      console.error('Failed to save block:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderForm = () => {
    switch (blockType) {
      case 'workout':
        return <WorkoutForm form={form as ReturnType<typeof useForm<typeof workoutSchema._type>>} />
      case 'habit':
        return <HabitForm form={form as ReturnType<typeof useForm<typeof habitSchema._type>>} />
      case 'nutrition':
        return <NutritionForm form={form as ReturnType<typeof useForm<typeof nutritionSchema._type>>} />
      case 'checkin':
        return (
          <CheckinForm
            form={form as ReturnType<typeof useForm<typeof checkinSchema._type>>}
            userHasHeight={userHasHeight}
          />
        )
      case 'personal':
        return <PersonalForm form={form as ReturnType<typeof useForm<typeof personalSchema._type>>} />
      case 'challenge':
        return <PersonalForm form={form as ReturnType<typeof useForm<typeof personalSchema._type>>} />
    }
  }

  const accent = blockTypeAccentColors[blockType]
  const endTime = endTimeWatched

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingBlock ? `Edit ${blockTypeLabels[blockType]}` : step === 1 ? 'New Block' : 'Details'}
      showClose={true}
    >
      {/* Step 1: Quick Entry */}
      {step === 1 && !editingBlock && (
        <div className="p-4 space-y-5">
          {/* Block Type Selector */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            {blockTypeOptions.map((option) => {
              const isSelected = blockType === option.value
              const colorMap: Record<string, string> = {
                workout: '#f97316',
                habit: '#10b981',
                nutrition: '#0ea5e9',
                checkin: '#8b5cf6',
                challenge: '#f59e0b',
                personal: '#f43f5e',
              }
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleBlockTypeChange(option.value as BlockType)}
                  className={cn(
                    'px-4 py-2 rounded-[10px] text-[13px] font-medium whitespace-nowrap transition-all duration-200 border',
                    isSelected
                      ? 'text-white border-transparent'
                      : 'bg-[#0d1014] text-[rgba(238,242,255,0.72)] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)]'
                  )}
                  style={isSelected ? { backgroundColor: colorMap[option.value] } : undefined}
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
          <div className="flex items-center justify-between p-3 bg-[#0d1014] rounded-[12px] border border-[rgba(255,255,255,0.08)]">
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
            <label className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-2">Start Time</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Input
                  type="time"
                  {...form.register('start_time')}
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2 text-[14px] text-[rgba(238,242,255,0.52)]">
                <span>to</span>
                <span className="text-[#eef2ff] font-medium">{endTime ? formatDisplayTime(endTime) : '--:--'}</span>
              </div>
            </div>
          </div>

          {/* Duration Quick Select */}
          <div>
            <label className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-2">Duration</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {durationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedDuration(option.value)}
                  className={cn(
                    'px-4 py-2.5 rounded-[10px] text-[13px] font-medium whitespace-nowrap transition-all duration-200 border min-w-[56px]',
                    selectedDuration === option.value
                      ? `${accent.bg} text-white border-transparent`
                      : 'bg-[#0d1014] text-[rgba(238,242,255,0.72)] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)]'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Continue Button */}
          <Button
            type="button"
            onClick={handleContinue}
            className="w-full"
            size="lg"
          >
            Continue
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        </div>
      )}

      {/* Step 2: Details */}
      {(step === 2 || editingBlock) && (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="p-4 space-y-4">
          {/* Summary Header */}
          {!editingBlock && (
            <div className="p-4 rounded-[12px] border bg-[#0d1014] border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-[10px] flex items-center justify-center bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)]">
                  <Clock className={cn('h-5 w-5', accent.text)} />
                </div>
                <div>
                  <p className="text-[12px] text-[rgba(238,242,255,0.45)]">
                    {formatDisplayTime(startTime)} – {endTime ? formatDisplayTime(endTime) : '--:--'} ({selectedDuration} min)
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

          {/* Quick info rows when editing */}
          {editingBlock && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-[#0d1014] rounded-[12px] border border-[rgba(255,255,255,0.08)]">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-[#3b82f6]" />
                  <span className="text-[14px] text-[#eef2ff]">{formatDisplayDate(dateValue)}</span>
                </div>
                <Input
                  type="date"
                  {...form.register('date')}
                  className="w-auto"
                />
              </div>
              <div className="p-3 bg-[#0d1014] rounded-[12px] border border-[rgba(255,255,255,0.08)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-[#3b82f6]" />
                    <span className="text-[14px] text-[#eef2ff]">
                      {formatDisplayTime(startTime)} – {endTime ? formatDisplayTime(endTime) : '--:--'}
                      {endTime && (
                        <span className="text-[12px] text-[rgba(238,242,255,0.45)] ml-2">
                          ({calculateMinutesBetween(startTime, endTime) || 0} min)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    label="Start"
                    {...form.register('start_time')}
                    className="flex-1"
                  />
                  <Input
                    type="time"
                    label="End"
                    {...form.register('end_time')}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Type-specific Form */}
          <div className="space-y-4">
            {renderForm()}
          </div>

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

          {/* Share to Feed Toggle - not for personal blocks */}
          {blockType !== 'personal' && (
            <div className="flex items-center justify-between p-3 bg-[rgba(255,255,255,0.03)] rounded-[12px] border border-[rgba(255,255,255,0.06)]">
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
          )}

          {/* Submit Button */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} className="flex-1">
              {editingBlock ? 'Save Changes' : 'Create Block'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
