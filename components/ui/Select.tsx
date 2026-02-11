'use client'

import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
  label?: string
  options: { value: string; label: string }[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, id, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-[13px] font-medium text-[#eef2ff] mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            className={cn(
              'flex h-10 w-full appearance-none rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[var(--surface-2)] px-3 py-2 pr-10 text-[13px] text-[#eef2ff] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-[140ms]',
              'shadow-[inset_0_1px_2px_rgba(0,0,0,0.2),0_1px_0_rgba(255,255,255,0.03)]',
              'hover:border-[rgba(255,255,255,0.16)]',
              'focus:outline-none focus:border-[rgba(59,130,246,0.5)] focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2),0_0_0_3px_rgba(59,130,246,0.15)]',
              error && 'border-rose-500 focus:border-rose-500',
              className
            )}
            ref={ref}
            id={id}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(238,242,255,0.45)] pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1 text-xs text-rose-400">{error}</p>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }
