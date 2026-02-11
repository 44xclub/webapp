'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

/**
 * Button variants using the unified accent system from globals.css
 * - default/primary: Blue gradient (CTAs: Continue, Save, Log Today, Create)
 * - success: Green gradient (positive actions, completions)
 * - destructive: Red gradient (Deactivate, Delete, Remove)
 * - secondary/ghost/outline: Neutral variants
 */
const buttonVariants = cva(
  'btn',
  {
    variants: {
      variant: {
        default: 'btn--primary',
        primary: 'btn--primary',
        success: 'btn--success',
        destructive: 'btn--danger',
        secondary: 'btn--ghost',
        outline: 'btn--outline',
        ghost: 'bg-transparent text-[rgba(238,242,255,0.70)] hover:text-[rgba(238,242,255,0.92)] hover:bg-[rgba(255,255,255,0.04)] border-transparent',
        glow: 'btn--primary energy-pulse',
      },
      size: {
        default: '',
        sm: 'btn--sm',
        lg: 'btn--lg',
        icon: 'h-[42px] w-[42px] px-0 rounded-[12px]',
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
