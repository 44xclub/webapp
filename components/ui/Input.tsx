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
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-xs font-bold text-foreground/60 tracking-wide mb-2"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'flex h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground/90 placeholder:text-foreground/35 transition-all duration-fast ease-smooth focus:outline-none focus:border-blue-400/55 focus:shadow-[0_0_0_4px_rgba(59,130,246,.18)] focus:bg-black/25 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus:border-destructive focus:shadow-[0_0_0_4px_rgba(239,68,68,.18)]',
            className
          )}
          ref={ref}
          id={id}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-destructive">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
