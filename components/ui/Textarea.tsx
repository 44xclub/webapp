'use client'

import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  label?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-[11px] font-medium text-[rgba(238,242,255,0.72)] mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          className={cn(
            'flex min-h-[64px] w-full rounded-[10px] border border-[rgba(255,255,255,0.10)] bg-[var(--surface-2)] px-3 py-2 text-[13px] text-[#eef2ff] placeholder:text-[rgba(238,242,255,0.40)] disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all duration-[140ms]',
            'shadow-[inset_0_1px_2px_rgba(0,0,0,0.2),0_1px_0_rgba(255,255,255,0.03)]',
            'hover:border-[rgba(255,255,255,0.16)]',
            'focus:outline-none focus:border-[rgba(59,130,246,0.5)] focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2),0_0_0_3px_rgba(59,130,246,0.15)]',
            error && 'border-[#ef4444] focus:border-[#ef4444]',
            className
          )}
          ref={ref}
          id={id}
          {...props}
        />
        {error && (
          <p className="mt-2 text-[12px] font-medium text-[#ef4444]">{error}</p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
