'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-fast ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-y-px',
  {
    variants: {
      variant: {
        default: 'border border-blue-500/25 bg-gradient-to-b from-blue-500/20 to-blue-500/10 text-foreground shadow-[0_10px_28px_rgba(59,130,246,.12)] hover:border-blue-400/35 hover:from-blue-400/18 hover:to-blue-500/12 hover:shadow-[0_12px_34px_rgba(59,130,246,.14)]',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        outline: 'border border-white/12 bg-white/5 text-foreground/90 hover:bg-white/8 hover:border-white/16 hover:shadow-sm',
        secondary: 'border border-white/10 bg-white/5 text-foreground/90 hover:bg-white/8 hover:border-white/14',
        ghost: 'border border-transparent hover:bg-white/5 hover:border-white/10',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-8 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
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
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
