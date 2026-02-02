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
          <label htmlFor={id} className="block text-[13px] font-bold text-[rgba(238,242,255,0.72)] mb-2 tracking-wide">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'w-full h-[44px] px-4 text-[15px] bg-[rgba(255,255,255,0.045)] text-[#eef2ff] border border-[rgba(255,255,255,0.10)] rounded-[12px] transition-all duration-[140ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]',
            'placeholder:text-[rgba(238,242,255,0.52)]',
            'hover:border-[rgba(255,255,255,0.16)] hover:bg-[rgba(255,255,255,0.06)]',
            'focus:outline-none focus:border-[rgba(59,130,246,0.5)] focus:shadow-focus',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-danger focus:border-danger',
            className
          )}
          ref={ref}
          id={id}
          {...props}
        />
        {error && <p className="mt-2 text-[12px] font-medium text-danger">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
