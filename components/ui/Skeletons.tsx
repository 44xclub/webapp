'use client'

/** Skeleton pulse animation building blocks */

function SkeletonPulse({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[rgba(255,255,255,0.06)] rounded ${className || ''}`} />
}

/** Feed post skeleton */
export function FeedPostSkeleton() {
  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center gap-3">
        <SkeletonPulse className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <SkeletonPulse className="h-3 w-24 rounded-full" />
          <SkeletonPulse className="h-2.5 w-16 rounded-full" />
        </div>
      </div>
      {/* Body */}
      <div className="px-3 pb-3 space-y-2">
        <SkeletonPulse className="h-4 w-3/4 rounded" />
        <SkeletonPulse className="h-3 w-full rounded" />
        <SkeletonPulse className="h-3 w-2/3 rounded" />
        <SkeletonPulse className="h-20 w-full rounded-[10px] mt-1" />
      </div>
      {/* Footer */}
      <div className="px-3 py-2 border-t border-[rgba(255,255,255,0.06)]">
        <SkeletonPulse className="h-4 w-20 rounded" />
      </div>
    </div>
  )
}

/** Team card skeleton */
export function TeamCardSkeleton() {
  return (
    <div className="section-card">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <SkeletonPulse className="h-3 w-16 rounded" />
          <SkeletonPulse className="h-5 w-24 rounded" />
        </div>
        <div className="space-y-1.5 flex flex-col items-end">
          <SkeletonPulse className="h-3 w-16 rounded" />
          <SkeletonPulse className="h-5 w-12 rounded" />
        </div>
      </div>
      {/* Member rows */}
      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2.5">
            <SkeletonPulse className="w-7 h-7 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <SkeletonPulse className="h-3 w-20 rounded" />
              <SkeletonPulse className="h-2.5 w-14 rounded" />
            </div>
            <SkeletonPulse className="h-3 w-10 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Programme card skeleton */
export function ProgrammeCardSkeleton() {
  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
      <SkeletonPulse className="h-[72px] w-full rounded-none" />
      <div className="px-3 py-2.5 space-y-2">
        <SkeletonPulse className="h-4 w-2/3 rounded" />
        <SkeletonPulse className="h-3 w-full rounded" />
        <SkeletonPulse className="h-1.5 w-full rounded-full" />
      </div>
      <div className="border-t border-[rgba(255,255,255,0.06)] px-3 py-2">
        <div className="flex gap-2">
          <SkeletonPulse className="h-8 flex-1 rounded-lg" />
          <SkeletonPulse className="h-8 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/** Generic list of feed post skeletons */
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <FeedPostSkeleton key={i} />
      ))}
    </div>
  )
}

/** Block list skeleton (home page day view) */
export function BlockListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="px-3">
      <div className="rounded-[14px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
        <div className="divide-y divide-[rgba(255,255,255,0.06)]">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <SkeletonPulse className="w-6 h-6 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <SkeletonPulse className="h-4 w-32 rounded" />
                <div className="flex items-center gap-2">
                  <SkeletonPulse className="h-3 w-14 rounded-[6px]" />
                  <SkeletonPulse className="h-3 w-20 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Header strip skeleton */
export function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <SkeletonPulse className="w-10 h-10 rounded-full" />
        <div className="space-y-1.5">
          <SkeletonPulse className="h-4 w-24 rounded" />
          <SkeletonPulse className="h-3 w-16 rounded" />
        </div>
      </div>
      <SkeletonPulse className="w-8 h-8 rounded-full" />
    </div>
  )
}

/** Structure page section skeleton */
export function StructureSkeleton() {
  return (
    <div className="space-y-4 px-4 pt-2">
      <div className="grid grid-cols-2 gap-2">
        <SkeletonPulse className="h-[72px] rounded-[12px]" />
        <SkeletonPulse className="h-[72px] rounded-[12px]" />
      </div>
      <SkeletonPulse className="h-[64px] rounded-[12px]" />
      <div className="space-y-2">
        <SkeletonPulse className="h-4 w-40 rounded" />
        <SkeletonPulse className="h-[100px] rounded-[14px]" />
        <SkeletonPulse className="h-[100px] rounded-[14px]" />
      </div>
    </div>
  )
}
