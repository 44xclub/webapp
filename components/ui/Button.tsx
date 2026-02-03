'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2.5 font-extrabold text-[13px] transition-all duration-[140ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] focus:outline-none focus-visible:shadow-focus disabled:opacity-50 disabled:pointer-events-none active:translate-y-[1px]',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-b from-[rgba(59,130,246,0.18)] to-[rgba(59,130,246,0.08)] text-[rgba(238,242,255,0.92)] border border-[rgba(59,130,246,0.26)] shadow-glow hover:from-[rgba(96,165,250,0.16)] hover:to-[rgba(59,130,246,0.10)] hover:border-[rgba(96,165,250,0.34)] hover:shadow-glow-lg',
        secondary: 'bg-[rgba(255,255,255,0.05)] text-[rgba(238,242,255,0.92)] border border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] shadow-sm',
        outline: 'bg-transparent text-[rgba(238,242,255,0.92)] border border-[rgba(255,255,255,0.10)] hover:bg-[rgba(255,255,255,0.04)]',
        destructive: 'bg-danger text-white hover:bg-danger/90 shadow-[0_10px_26px_rgba(239,68,68,0.2)]',
        ghost: 'bg-transparent text-[rgba(238,242,255,0.70)] hover:text-[rgba(238,242,255,0.92)] hover:bg-[rgba(255,255,255,0.04)]',
        glow: 'bg-gradient-to-b from-[rgba(59,130,246,0.18)] to-[rgba(59,130,246,0.08)] text-white border border-[rgba(59,130,246,0.26)] shadow-glow energy-pulse hover:shadow-glow-lg',
      },
      size: {
        default: 'h-[42px] px-4 rounded-[12px]',
        sm: 'h-[34px] px-3 text-[12px] rounded-[10px]',
        lg: 'h-[48px] px-6 text-[14px] rounded-[14px]',
        icon: 'h-[42px] w-[42px] rounded-[12px]',
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
