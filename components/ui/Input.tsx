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
          <label htmlFor={id} className="block text-xs font-medium text-zinc-400 mb-1.5">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'w-full h-10 px-3 text-sm bg-zinc-900 text-zinc-100 border border-zinc-700 rounded-md transition-colors placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/50',
            className
          )}
          ref={ref}
          id={id}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
