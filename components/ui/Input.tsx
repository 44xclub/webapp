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
          <label htmlFor={id} className="block text-meta text-text-secondary mb-2">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'w-full h-10 px-3 text-body bg-surface text-text-primary border border-border rounded-[10px] transition-colors duration-150',
            'placeholder:text-text-muted',
            'focus:outline-none focus:border-accent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-danger focus:border-danger',
            className
          )}
          ref={ref}
          id={id}
          {...props}
        />
        {error && <p className="mt-2 text-meta text-danger">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
