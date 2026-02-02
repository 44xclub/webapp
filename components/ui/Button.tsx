'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary/90 shadow-[0_4px_12px_rgba(99,102,241,0.25)] hover:shadow-[0_6px_16px_rgba(99,102,241,0.35)]',
        secondary: 'bg-steel-800 text-foreground border border-steel-700 hover:bg-steel-700 hover:border-steel-600',
        outline: 'bg-transparent text-foreground border border-border hover:bg-surface hover:border-steel-600',
        destructive: 'bg-danger text-white hover:bg-danger/90 shadow-[0_4px_12px_rgba(248,81,73,0.25)]',
        ghost: 'bg-transparent text-text-secondary hover:text-foreground hover:bg-surface',
        glow: 'bg-primary text-white shadow-glow hover:shadow-glow-lg energy-pulse',
      },
      size: {
        default: 'h-10 px-5 text-sm rounded-button',
        sm: 'h-8 px-3 text-xs rounded-button',
        lg: 'h-12 px-6 text-base rounded-button',
        icon: 'h-10 w-10 rounded-button',
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
