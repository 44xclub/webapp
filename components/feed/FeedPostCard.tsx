'use client'

import { useState } from 'react'
import { Heart, Trash2, Loader2, MoreHorizontal, Shield, Target, Flame, Swords, Award, Anvil, Rocket, Crown, ChevronDown, ChevronUp, Trophy } from 'lucide-react'
import { calculateDisciplineLevel } from '@/lib/types'
import type { DisciplineBadge } from '@/lib/types'

// Helper to get storage URL from path - constructs URL directly to avoid Supabase client issues
function getStorageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  // If already a full URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) return path

  // Construct URL directly from environment variable
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    console.error('[getStorageUrl] NEXT_PUBLIC_SUPABASE_URL not set')
    return null
  }
  return `${supabaseUrl}/storage/v1/object/public/block-media/${path}`
}

// Structured feed post payload contract
export interface FeedPostPayload {
  type: 'workout' | 'nutrition' | 'checkin' | 'habit' | 'challenge'
  title: string
  notes?: string
  workout?: {
    is_programme: boolean
    session_title?: string
    rpe?: number
    duration_min?: number
    kind?: 'weight_lifting' | 'hyrox' | 'hybrid' | 'running' | 'sport' | 'other'
    exercises: Array<{
      name: string
      sets: Array<{ reps?: number; weight?: number }>
    }>
    // For running/sport/other workouts
    details?: {
      description?: string
      distance_km?: number
      pace?: string
    }
  }
  nutrition?: {
    meals: Array<{
      meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
      calories?: number
      protein?: number
      carbs?: number
      fat?: number
      description?: string
    }>
    has_macros?: boolean
  }
  checkin?: {
    weight_kg: number
    body_fat_pct?: number
    height_cm?: number
  }
  habit?: {
    description?: string
  }
  challenge?: {
    challenge_title: string
    proof_required: boolean
  }
  media?: Array<{
    type: 'image' | 'video'
    path: string
  }>
}

export interface FeedPost {
  id: string
  user_id: string
  block_id: string | null
  title: string
  body: string | null
  media_path: string | null
  payload: FeedPostPayload | Record<string, any>
  created_at: string
  deleted_at: string | null
  user_profile?: {
    display_name: string | null
    avatar_path: string | null
    discipline_score: number
  }
  respect_count?: number
  has_respected?: boolean
}

interface FeedPostCardProps {
  post: FeedPost
  userId?: string
  onRespect: (postId: string, hasRespected: boolean) => Promise<void>
  onDelete: (postId: string) => Promise<void>
  deleting?: boolean
}

// Badge icons for each tier
const badgeIcons: Record<DisciplineBadge, typeof Shield> = {
  'Initiated': Shield,
  'Aligned': Target,
  'Committed': Flame,
  'Disciplined': Swords,
  'Elite': Award,
  'Forged': Anvil,
  'Vanguard': Rocket,
  '44 Pro': Crown,
}

// Badge colors for each tier
const badgeColors: Record<DisciplineBadge, string> = {
  'Initiated': 'text-slate-400',
  'Aligned': 'text-emerald-400',
  'Committed': 'text-blue-400',
  'Disciplined': 'text-indigo-400',
  'Elite': 'text-cyan-400',
  'Forged': 'text-amber-400',
  'Vanguard': 'text-rose-400',
  '44 Pro': 'text-purple-400',
}

// Roman numerals for badge levels
const romanNumerals = ['I', 'II', 'III', 'IV', 'V']

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function FeedPostCard({ post, userId, onRespect, onDelete, deleting }: FeedPostCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const displayName = post.user_profile?.display_name || 'Member'
  const initials = displayName.slice(0, 2).toUpperCase()
  const level = calculateDisciplineLevel(post.user_profile?.discipline_score || 0)
  const BadgeIcon = badgeIcons[level.badge]
  const badgeColor = badgeColors[level.badge]
  const badgeDisplay = `${level.badge} ${romanNumerals[level.badgeLevel - 1] || 'I'}`
  const isOwnPost = post.user_id === userId

  const payload = post.payload as FeedPostPayload
  const postType = payload?.type || detectPostType(payload)

  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
            <span className="text-[12px] font-medium text-[rgba(238,242,255,0.52)]">
              {initials}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-medium text-[#eef2ff]">{displayName}</p>
              <div className="flex items-center gap-1">
                <BadgeIcon className={`h-3 w-3 ${badgeColor}`} />
                <span className={`text-[10px] ${badgeColor}`}>{badgeDisplay}</span>
              </div>
            </div>
            <p className="text-[11px] text-[rgba(238,242,255,0.40)]">
              {formatRelativeTime(post.created_at)}
            </p>
          </div>
        </div>

        {isOwnPost && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-[rgba(238,242,255,0.40)] hover:text-[rgba(238,242,255,0.60)] transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-[#1a1d24] rounded-lg border border-[rgba(255,255,255,0.08)] shadow-lg overflow-hidden min-w-[120px]">
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      onDelete(post.id)
                    }}
                    disabled={deleting}
                    className="w-full px-4 py-2.5 text-left text-[13px] text-rose-400 hover:bg-[rgba(255,255,255,0.05)] flex items-center gap-2"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pb-3">
        {/* Title */}
        <h3 className="text-[14px] font-semibold text-[#eef2ff] mb-1">{post.title}</h3>

        {/* Notes/Description */}
        {(post.body || payload?.notes) && (
          <div className="mb-3">
            <p className={`text-[13px] text-[rgba(238,242,255,0.52)] ${!expanded ? 'line-clamp-3' : ''}`}>
              {post.body || payload?.notes}
            </p>
            {(post.body?.length || 0) > 150 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[12px] text-[#3b82f6] mt-1 flex items-center gap-1"
              >
                {expanded ? (
                  <>Show less <ChevronUp className="h-3 w-3" /></>
                ) : (
                  <>Show more <ChevronDown className="h-3 w-3" /></>
                )}
              </button>
            )}
          </div>
        )}

        {/* Type-specific Data Panel */}
        {postType === 'workout' && <WorkoutDataPanel payload={payload} />}
        {postType === 'nutrition' && <NutritionDataPanel payload={payload} />}
        {postType === 'checkin' && <CheckinDataPanel payload={payload} />}
        {postType === 'challenge' && <ChallengeDataPanel payload={payload} />}
        {/* Habit posts just show title/notes, no special panel */}

        {/* Media */}
        <MediaDisplay payload={payload} mediaPath={post.media_path} />
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)] flex items-center">
        <button
          onClick={() => onRespect(post.id, post.has_respected || false)}
          className={`flex items-center gap-2 text-[13px] transition-colors ${
            post.has_respected
              ? 'text-red-500'
              : 'text-[rgba(238,242,255,0.45)] hover:text-red-500'
          }`}
        >
          <Heart className={`h-4 w-4 ${post.has_respected ? 'fill-current' : ''}`} />
          <span>{post.respect_count || 0} Respect</span>
        </button>
      </div>
    </div>
  )
}

// Detect post type from payload if not explicitly set
function detectPostType(payload: any): string {
  if (payload?.workout || payload?.workout_matrix || payload?.exercises) return 'workout'
  if (payload?.nutrition || payload?.meals) return 'nutrition'
  if (payload?.checkin || payload?.weight_kg) return 'checkin'
  if (payload?.challenge) return 'challenge'
  return 'habit'
}

// Workout Data Panel
function WorkoutDataPanel({ payload }: { payload: FeedPostPayload }) {
  const workout = payload?.workout
  const legacyMatrix = (payload as any)?.workout_matrix || (payload as any)?.exercises

  const exercises = workout?.exercises || legacyMatrix || []
  const kind = workout?.kind || (payload as any)?.category || 'weight_lifting'
  const isDetailsType = ['running', 'sport', 'other'].includes(kind)
  const details = workout?.details || {}

  // For running/sport/other, show session details instead of exercise matrix
  if (isDetailsType || (exercises.length === 0 && details?.description)) {
    return (
      <div className="bg-[rgba(255,255,255,0.03)] rounded-[10px] p-3 mb-3">
        {workout?.session_title && (
          <p className="text-[12px] font-medium text-[#3b82f6] mb-2">{workout.session_title}</p>
        )}
        <p className="text-[11px] font-medium text-[rgba(238,242,255,0.45)] mb-2 uppercase tracking-wide">
          {kind === 'running' ? 'Run' : kind === 'sport' ? 'Sport' : 'Workout'} Details
        </p>

        {/* Description */}
        {details?.description && (
          <p className="text-[13px] text-[rgba(238,242,255,0.72)] mb-3">{details.description}</p>
        )}

        {/* Tags row */}
        <div className="flex items-center gap-2 flex-wrap">
          {details?.distance_km && (
            <span className="px-2 py-0.5 bg-[rgba(255,255,255,0.05)] rounded text-[11px] text-[rgba(238,242,255,0.52)]">
              {details.distance_km} km
            </span>
          )}
          {details?.pace && (
            <span className="px-2 py-0.5 bg-[rgba(255,255,255,0.05)] rounded text-[11px] text-[rgba(238,242,255,0.52)]">
              {details.pace}
            </span>
          )}
          {(workout?.duration_min || (payload as any)?.duration) && (
            <span className="px-2 py-0.5 bg-[rgba(255,255,255,0.05)] rounded text-[11px] text-[rgba(238,242,255,0.52)]">
              {workout?.duration_min || (payload as any)?.duration} min
            </span>
          )}
          {(workout?.rpe || (payload as any)?.rpe) && (
            <span className="px-2 py-0.5 bg-[rgba(255,255,255,0.05)] rounded text-[11px] text-[rgba(238,242,255,0.52)]">
              RPE {workout?.rpe || (payload as any)?.rpe}
            </span>
          )}
          <span className="px-2 py-0.5 bg-[rgba(255,255,255,0.05)] rounded text-[11px] text-[rgba(238,242,255,0.52)] capitalize">
            {kind.replace('_', ' ')}
          </span>
        </div>
      </div>
    )
  }

  // Matrix-based workout (weight_lifting, hyrox, hybrid)
  if (exercises.length === 0) return null

  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-[10px] p-3 mb-3">
      {workout?.session_title && (
        <p className="text-[12px] font-medium text-[#3b82f6] mb-2">{workout.session_title}</p>
      )}
      <p className="text-[11px] font-medium text-[rgba(238,242,255,0.45)] mb-2 uppercase tracking-wide">
        Session Breakdown
      </p>
      <div className="space-y-1.5">
        {exercises.map((exercise: any, idx: number) => {
          const name = exercise.name || exercise.exercise || 'Exercise'
          const sets = exercise.sets || []
          const setsString = formatSetsCompact(sets, exercise)

          return (
            <div key={idx} className="flex items-start justify-between text-[13px] gap-3">
              <span className="text-[#eef2ff] font-medium flex-shrink-0">{name}</span>
              <span className="text-[rgba(238,242,255,0.52)] text-right">{setsString}</span>
            </div>
          )
        })}
      </div>

      {/* Tags row */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {(workout?.duration_min || (payload as any)?.duration) && (
          <span className="px-2 py-0.5 bg-[rgba(255,255,255,0.05)] rounded text-[11px] text-[rgba(238,242,255,0.52)]">
            {workout?.duration_min || (payload as any)?.duration} min
          </span>
        )}
        {(workout?.rpe || (payload as any)?.rpe) && (
          <span className="px-2 py-0.5 bg-[rgba(255,255,255,0.05)] rounded text-[11px] text-[rgba(238,242,255,0.52)]">
            RPE {workout?.rpe || (payload as any)?.rpe}
          </span>
        )}
        {workout?.is_programme && (
          <span className="px-2 py-0.5 bg-[rgba(59,130,246,0.15)] rounded text-[11px] text-[#3b82f6]">
            Programme
          </span>
        )}
        {workout?.kind && (
          <span className="px-2 py-0.5 bg-[rgba(255,255,255,0.05)] rounded text-[11px] text-[rgba(238,242,255,0.52)] capitalize">
            {workout.kind.replace('_', ' ')}
          </span>
        )}
      </div>
    </div>
  )
}

// Format sets to compact string: "10×80 · 8×60 · 6×60"
function formatSetsCompact(sets: any[], exercise: any): string {
  if (Array.isArray(sets) && sets.length > 0) {
    return sets
      .filter((s: any) => s.reps || s.weight)
      .map((s: any) => {
        if (s.reps && s.weight) return `${s.reps}×${s.weight}`
        if (s.reps) return `${s.reps} reps`
        if (s.weight) return `${s.weight}kg`
        return ''
      })
      .filter(Boolean)
      .join(' · ')
  }

  // Legacy format fallback
  const parts = []
  if (exercise.sets) parts.push(`${exercise.sets} sets`)
  if (exercise.reps) parts.push(`× ${exercise.reps}`)
  if (exercise.weight) parts.push(`@ ${exercise.weight}kg`)
  return parts.join(' ')
}

// Nutrition Data Panel
function NutritionDataPanel({ payload }: { payload: FeedPostPayload }) {
  const nutrition = payload?.nutrition
  const meals = nutrition?.meals || (payload as any)?.meals || []

  // Check if any macros are present
  const hasMacros = meals.some((meal: any) =>
    meal.calories || meal.protein || meal.carbs || meal.fat
  )

  if (meals.length === 0) {
    return null
  }

  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-[10px] p-3 mb-3">
      <p className="text-[11px] font-medium text-[rgba(238,242,255,0.45)] mb-2 uppercase tracking-wide">
        Nutrition Breakdown
      </p>
      <div className="space-y-2">
        {meals.map((meal: any, idx: number) => {
          const mealHasMacros = meal.calories || meal.protein || meal.carbs || meal.fat
          return (
            <div key={idx}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#eef2ff] font-medium capitalize">{meal.meal_type}</span>
                {mealHasMacros ? (
                  <div className="flex items-center gap-3 text-[rgba(238,242,255,0.52)]">
                    {meal.calories && <span>{meal.calories} cal</span>}
                    {meal.protein && <span>{meal.protein}P</span>}
                    {meal.carbs && <span>{meal.carbs}C</span>}
                    {meal.fat && <span>{meal.fat}F</span>}
                  </div>
                ) : (
                  <span className="text-[11px] text-[rgba(238,242,255,0.35)]">Macros not logged</span>
                )}
              </div>
              {meal.description && (
                <p className="text-[12px] text-[rgba(238,242,255,0.52)] mt-1">{meal.description}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Check-in Data Panel
function CheckinDataPanel({ payload }: { payload: FeedPostPayload }) {
  const checkin = payload?.checkin
  const weightKg = checkin?.weight_kg || (payload as any)?.weight_kg

  if (!weightKg) return null

  return (
    <div className="bg-[rgba(255,255,255,0.03)] rounded-[10px] p-3 mb-3">
      <p className="text-[11px] font-medium text-[rgba(238,242,255,0.45)] mb-2 uppercase tracking-wide">
        Check-in Stats
      </p>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-[16px] font-bold text-[#eef2ff]">{weightKg}</p>
          <p className="text-[11px] text-[rgba(238,242,255,0.40)]">Weight (kg)</p>
        </div>
        {(checkin?.body_fat_pct || (payload as any)?.body_fat_pct) ? (
          <div className="text-center">
            <p className="text-[16px] font-bold text-[#eef2ff]">
              {checkin?.body_fat_pct || (payload as any)?.body_fat_pct}%
            </p>
            <p className="text-[11px] text-[rgba(238,242,255,0.40)]">Body Fat</p>
          </div>
        ) : null}
        {(checkin?.height_cm || (payload as any)?.height_cm) ? (
          <div className="text-center">
            <p className="text-[16px] font-bold text-[#eef2ff]">
              {checkin?.height_cm || (payload as any)?.height_cm}
            </p>
            <p className="text-[11px] text-[rgba(238,242,255,0.40)]">Height (cm)</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// Challenge Data Panel
function ChallengeDataPanel({ payload }: { payload: FeedPostPayload }) {
  const challenge = payload?.challenge
  if (!challenge) return null

  return (
    <div className="bg-[rgba(59,130,246,0.08)] rounded-[10px] p-3 mb-3 border border-[rgba(59,130,246,0.2)]">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="h-4 w-4 text-[#3b82f6]" />
        <p className="text-[12px] font-medium text-[#3b82f6]">Challenge Complete</p>
      </div>
      <p className="text-[13px] text-[#eef2ff]">{challenge.challenge_title}</p>
    </div>
  )
}

// Normalize media item to handle both field naming conventions
// DB may have: { path, type } OR { storage_path, media_type }
function normalizeMediaItem(item: any): { path: string; type: 'image' | 'video' } | null {
  const path = item?.path || item?.storage_path
  const type = item?.type || item?.media_type || 'image'
  if (!path) return null
  return { path, type }
}

// Media Display Component
function MediaDisplay({ payload, mediaPath }: { payload: FeedPostPayload; mediaPath: string | null }) {
  const rawMedia = payload?.media || []

  // Normalize all media items and filter out invalid ones
  const normalizedMedia = rawMedia.map(normalizeMediaItem).filter(Boolean) as { path: string; type: 'image' | 'video' }[]

  // Add mediaPath as first item if present
  const allMedia = mediaPath
    ? [{ type: 'image' as const, path: mediaPath }, ...normalizedMedia]
    : normalizedMedia

  if (allMedia.length === 0) return null

  // Single image - constrained height for clean feed look
  if (allMedia.length === 1) {
    const imageUrl = getStorageUrl(allMedia[0].path)
    if (!imageUrl) return null
    return (
      <div className="rounded-[10px] overflow-hidden mb-3 max-w-full">
        <img
          src={imageUrl}
          alt="Post media"
          className="w-full h-auto max-h-[180px] sm:max-h-[220px] object-cover"
        />
      </div>
    )
  }

  // Grid for multiple images (2x2 max) - compact sizing
  const displayMedia = allMedia.slice(0, 4)
  return (
    <div className="grid grid-cols-2 gap-1 rounded-[10px] overflow-hidden mb-3">
      {displayMedia.map((item, idx) => {
        const imageUrl = getStorageUrl(item.path)
        if (!imageUrl) return null
        return (
          <div key={idx} className="relative h-[100px] sm:h-[120px]">
            <img
              src={imageUrl}
              alt={`Post media ${idx + 1}`}
              className="w-full h-full object-cover"
            />
            {idx === 3 && allMedia.length > 4 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-[16px] font-medium">+{allMedia.length - 4}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
