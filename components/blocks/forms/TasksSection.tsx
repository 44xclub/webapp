'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { TaskItem } from '@/lib/types'

interface TasksSectionProps {
  tasks: TaskItem[]
  onChange: (tasks: TaskItem[]) => void
  /** Called when a task's done state is toggled - for immediate autosave */
  onToggleTask?: (taskId: string, done: boolean) => void
  /** Whether we're in edit mode for an existing block (enables autosave on toggle) */
  isEditing?: boolean
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 8)
}

export function TasksSection({
  tasks,
  onChange,
  onToggleTask,
  isEditing = false,
}: TasksSectionProps) {
  const [newTaskText, setNewTaskText] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  const sortedTasks = [...tasks].sort((a, b) => {
    // Incomplete first, then by sort_order
    if (a.done !== b.done) return a.done ? 1 : -1
    return a.sort_order - b.sort_order
  })

  const handleAddTask = () => {
    const trimmed = newTaskText.trim()
    if (!trimmed) return
    if (trimmed.length > 120) return
    if (tasks.length >= 30) return

    const maxOrder = tasks.length > 0
      ? Math.max(...tasks.map(t => t.sort_order))
      : -1

    const newTask: TaskItem = {
      id: generateId(),
      text: trimmed,
      done: false,
      sort_order: maxOrder + 1,
      created_at: new Date().toISOString(),
      completed_at: null,
    }

    onChange([...tasks, newTask])
    setNewTaskText('')
    // Keep input open for rapid entry
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTask()
    }
  }

  const handleToggle = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id !== taskId) return t
      const newDone = !t.done
      return {
        ...t,
        done: newDone,
        completed_at: newDone ? new Date().toISOString() : null,
      }
    })
    onChange(updated)

    // If editing an existing block, trigger autosave
    const task = tasks.find(t => t.id === taskId)
    if (isEditing && onToggleTask && task) {
      onToggleTask(taskId, !task.done)
    }
  }

  const handleDelete = (taskId: string) => {
    onChange(tasks.filter(t => t.id !== taskId))
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-[13px] font-medium text-[rgba(238,242,255,0.72)]">
          Tasks
        </label>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 text-[12px] text-[var(--accent-primary)] font-medium hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </div>

      {/* Task list */}
      {sortedTasks.length > 0 && (
        <div className="space-y-0.5 mb-2">
          {sortedTasks.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-2 group py-1.5 px-1 -mx-1 rounded-[8px] hover:bg-[rgba(255,255,255,0.02)]"
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => handleToggle(task.id)}
                className="flex-shrink-0 flex items-center justify-center w-[44px] h-[44px] -m-2"
                aria-label={task.done ? 'Mark as incomplete' : 'Mark as complete'}
              >
                <div
                  className={`h-[18px] w-[18px] rounded-[4px] border-2 transition-all duration-150 flex items-center justify-center ${
                    task.done
                      ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                      : 'border-[rgba(238,242,255,0.25)] hover:border-[rgba(238,242,255,0.4)]'
                  }`}
                >
                  {task.done && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-white">
                      <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>

              {/* Task text */}
              <span
                className={`flex-1 text-[13px] leading-tight truncate transition-all duration-150 ${
                  task.done
                    ? 'text-[rgba(238,242,255,0.35)] line-through decoration-[rgba(238,242,255,0.2)]'
                    : 'text-[var(--text-primary)]'
                }`}
              >
                {task.text}
              </span>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDelete(task.id)}
                className="flex-shrink-0 p-1.5 text-[rgba(238,242,255,0.15)] hover:text-[var(--accent-danger)] active:text-[var(--accent-danger)] transition-colors"
                aria-label="Delete task"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add task input */}
      {isAdding && (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="New task..."
            maxLength={120}
            className="flex-1 h-[36px] px-3 text-[13px] bg-[var(--surface-2)] text-[var(--text-primary)] border border-[rgba(255,255,255,0.10)] rounded-[8px] placeholder:text-[rgba(238,242,255,0.30)] focus:outline-none focus:border-[rgba(59,130,246,0.5)]"
          />
          <button
            type="button"
            onClick={handleAddTask}
            disabled={!newTaskText.trim()}
            className="h-[36px] px-3 text-[12px] font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-primary-light)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setIsAdding(false); setNewTaskText('') }}
            className="h-[36px] px-2 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {/* Empty state - only when not adding and no tasks */}
      {tasks.length === 0 && !isAdding && (
        <p className="text-[12px] text-[rgba(238,242,255,0.3)]">No tasks yet</p>
      )}
    </div>
  )
}
