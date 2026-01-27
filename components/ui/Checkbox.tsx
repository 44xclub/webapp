'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, checked, onChange, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className="flex items-center gap-2 cursor-pointer select-none"
      >
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            ref={ref}
            id={id}
            checked={checked}
            onChange={onChange}
            {...props}
          />
          <div
            className={cn(
              'h-5 w-5 rounded border-2 transition-all duration-150 flex items-center justify-center',
              checked
                ? 'bg-primary border-primary'
                : 'border-muted-foreground/50 hover:border-muted-foreground',
              className
            )}
          >
            {checked && <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />}
          </div>
        </div>
        {label && (
          <span className="text-sm text-foreground">{label}</span>
        )}
      </label>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
