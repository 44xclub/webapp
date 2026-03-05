'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, id, ...props }, ref) => {
    return (
      <div className="w-full min-w-0 overflow-hidden">
        {label && (
          <label htmlFor={id} className="block text-[11px] font-medium text-[rgba(238,242,255,0.72)] mb-1.5">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'w-full min-w-0 max-w-full h-[36px] px-3 text-[13px] bg-[var(--surface-2)] text-[#eef2ff] border border-[rgba(255,255,255,0.10)] rounded-[10px] transition-all duration-[140ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]',
            'shadow-[inset_0_1px_2px_rgba(0,0,0,0.2),0_1px_0_rgba(255,255,255,0.03)]',
            'placeholder:text-[rgba(238,242,255,0.40)]',
            'hover:border-[rgba(255,255,255,0.16)]',
            'focus:outline-none focus:border-[rgba(59,130,246,0.5)] focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2),0_0_0_3px_rgba(59,130,246,0.15)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-danger focus:border-danger',
            className
          )}
          ref={ref}
          id={id}
          {...props}
        />
        {error && <p className="mt-1.5 text-[11px] font-medium text-danger">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
