'use client'

import { useState, useCallback, type ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface FadeImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onLoad' | 'onError'> {
  /** Fallback element shown when image fails to load */
  fallback?: React.ReactNode
  /** Additional class for the wrapper div */
  wrapperClassName?: string
}

/**
 * Image component with fade-in transition on load.
 * Prevents layout shift by reserving space.
 * Shows fallback on error (never shows broken image icon).
 */
export function FadeImage({
  src,
  alt,
  className,
  wrapperClassName,
  fallback,
  ...props
}: FadeImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  const handleLoad = useCallback(() => setLoaded(true), [])
  const handleError = useCallback(() => {
    setFailed(true)
    setLoaded(true) // Mark as "loaded" so we don't show forever spinner
  }, [])

  if (failed || !src) {
    if (fallback) return <>{fallback}</>
    return <div className={cn('bg-gradient-to-br from-[#1a1f2e] to-[#0c0f16]', wrapperClassName)} />
  }

  return (
    <div className={cn('relative overflow-hidden', wrapperClassName)}>
      {/* Placeholder gradient shown while loading */}
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(255,255,255,0.04)] to-[rgba(255,255,255,0.02)] animate-pulse" />
      )}
      <img
        src={src}
        alt={alt || ''}
        className={cn(
          'transition-opacity duration-200',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  )
}
