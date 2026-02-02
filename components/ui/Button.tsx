'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

/*
  44CLUB Button System
  - Primary: Solid accent, high contrast
  - Secondary: Muted background
  - Outline: Border only
  - Destructive: Red, for dangerous actions
  - Ghost: Minimal, for tertiary actions
*/

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-accent text-white hover:bg-accent/90',
        secondary: 'bg-surface text-text-primary hover:bg-surface-elevated',
        outline: 'bg-transparent text-text-primary border border-border hover:bg-surface/50',
        destructive: 'bg-danger text-white hover:bg-danger/90',
        ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface/50',
      },
      size: {
        default: 'h-10 px-4 text-sm rounded-[10px]',
        sm: 'h-8 px-3 text-xs rounded-lg',
        lg: 'h-12 px-6 text-base rounded-[10px]',
        icon: 'h-10 w-10 rounded-[10px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
