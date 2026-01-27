'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal, Button, Input, Select } from '@/components/ui'
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
  type BlockFormData,
} from '@/lib/schemas'
import { blockTypeLabels } from '@/lib/utils'
import { formatDateForApi, roundToNearest5Minutes } from '@/lib/date'
import type { Block, BlockType, BlockMedia } from '@/lib/types'

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
  { value: 'personal', label: 'Personal' },
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
  }
}

function getDefaultPayload(type: BlockType) {
  switch (type) {
    case 'workout':
      return {
        exercise_matrix: [{ exercise: '', sets: 3, reps: '10', weight: '', notes: '' }],
      }
    case 'nutrition':
      return { meal_type: 'breakfast', meal_name: '' }
    case 'checkin':
      return { weight: 0 }
    default:
      return {}
  }
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
  const [blockType, setBlockType] = useState<BlockType>(
    editingBlock?.block_type || 'workout'
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const schema = useMemo(() => getSchemaForType(blockType), [blockType])

  const defaultValues = useMemo(() => {
    if (editingBlock) {
      return {
        date: editingBlock.date,
        start_time: editingBlock.start_time.slice(0, 5), // Remove seconds
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

  // Reset form when modal opens or block type changes
  useEffect(() => {
    if (isOpen) {
      if (editingBlock) {
        setBlockType(editingBlock.block_type)
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

  // Handle block type change (only for new blocks)
  const handleBlockTypeChange = (newType: BlockType) => {
    if (editingBlock) return // Don't allow changing type when editing
    setBlockType(newType)
    form.reset({
      ...form.getValues(),
      block_type: newType,
      title: '',
      payload: getDefaultPayload(newType),
    } as BlockFormData)
  }

  const handleSubmit = async (data: BlockFormData) => {
    setIsSubmitting(true)
    try {
      await onSave(data)
      onClose()
    } catch (error) {
      console.error('Failed to save block:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderForm = () => {
    // Cast form to the specific type needed by each form component
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
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingBlock ? `Edit ${blockTypeLabels[blockType]}` : 'New Block'}
    >
      <form onSubmit={form.handleSubmit(handleSubmit)} className="p-4 space-y-4">
        {/* Block Type Selector - only for new blocks */}
        {!editingBlock && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {blockTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleBlockTypeChange(option.value as BlockType)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  blockType === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* Universal Fields */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            label="Date"
            {...form.register('date')}
            error={form.formState.errors.date?.message}
          />
          <Input
            type="time"
            label="Start Time"
            {...form.register('start_time')}
            error={form.formState.errors.start_time?.message}
          />
        </div>

        <Input
          type="time"
          label="End Time (optional)"
          {...form.register('end_time')}
          error={form.formState.errors.end_time?.message}
        />

        {/* Type-specific Form */}
        {renderForm()}

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

        {/* Submit Button */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">
            {editingBlock ? 'Save Changes' : 'Create Block'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
