'use client'

import { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { FrameworkTemplate, FrameworkCriteria, FrameworkCriteriaItem } from '@/lib/types'

interface FrameworkPreviewCardProps {
  framework: FrameworkTemplate
  imageUrl: string | null
  isActive?: boolean
  onClick: () => void
  className?: string
}

/**
 * Framework card with image + title + criteria preview bullets.
 * Used in horizontal scroll on Discipline page and "All Frameworks" grid.
 */
export function FrameworkPreviewCard({ framework, imageUrl, isActive, onClick, className }: FrameworkPreviewCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  const handleImgLoad = useCallback(() => setImgLoaded(true), [])
  const handleImgError = useCallback(() => { setImgFailed(true); setImgLoaded(true) }, [])

  const showImage = imageUrl && !imgFailed

  // Extract criteria labels for preview
  const { previewLabels, extraCount } = useMemo(() => {
    const criteria = framework.criteria as FrameworkCriteria | FrameworkCriteriaItem[] | null
    const items = criteria
      ? (Array.isArray(criteria) ? criteria : (criteria.items || []))
      : []
    const labels = items.map((item: FrameworkCriteriaItem) => item.label).slice(0, 3)
    return { previewLabels: labels, extraCount: items.length - labels.length }
  }, [framework.criteria])

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex-shrink-0 w-[160px] overflow-hidden rounded-[14px] text-left transition-all duration-200 group',
        isActive && 'ring-[1.5px] ring-[#3b82f6]',
        !isActive && 'hover:brightness-110',
        className
      )}
    >
      {/* Image section — compact */}
      <div className="relative h-[72px]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] to-[#0c0f16]" />
        {showImage && (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(255,255,255,0.04)] to-transparent animate-pulse" />
            )}
            <img
              src={imageUrl}
              alt={framework.title}
              className={cn(
                'absolute inset-0 w-full h-full object-cover transition-opacity duration-200',
                imgLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={handleImgLoad}
              onError={handleImgError}
              loading="lazy"
            />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        {isActive && (
          <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-white bg-[#3b82f6] px-[6px] py-[2px] rounded-full">Active</span>
        )}
        <div className="absolute bottom-0 left-0 right-0 px-2 pb-1.5">
          <p className="text-[11px] font-semibold text-white leading-tight line-clamp-1">{framework.title}</p>
        </div>
      </div>

      {/* Criteria preview */}
      <div className="px-2 py-1.5 bg-[rgba(255,255,255,0.02)]">
        {previewLabels.length > 0 ? (
          <div className="space-y-0.5">
            {previewLabels.map((label, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[rgba(59,130,246,0.60)] mt-[4px] flex-shrink-0" />
                <span className="text-[9px] text-[rgba(238,242,255,0.55)] leading-tight line-clamp-1">{label}</span>
              </div>
            ))}
            {extraCount > 0 && (
              <span className="text-[8px] text-[rgba(238,242,255,0.30)] pl-2.5">+{extraCount} more</span>
            )}
          </div>
        ) : (
          <span className="text-[9px] text-[rgba(238,242,255,0.25)] italic">No criteria</span>
        )}
      </div>
    </button>
  )
}
