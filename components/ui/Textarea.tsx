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
            className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-2"
          >
            {label}
          </label>
        )}
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-[12px] border border-[rgba(255,255,255,0.10)] bg-[#0d1014] px-4 py-3 text-[15px] text-[#eef2ff] placeholder:text-[rgba(238,242,255,0.40)] focus:outline-none focus:border-[rgba(59,130,246,0.5)] focus:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all duration-[140ms]',
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
