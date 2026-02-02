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
          <label htmlFor={id} className="block text-meta font-medium text-text-secondary mb-2">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'w-full h-11 px-4 text-body bg-steel-900 text-foreground border border-steel-700 rounded-button transition-all duration-200',
            'placeholder:text-text-muted',
            'hover:border-steel-600',
            'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
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
