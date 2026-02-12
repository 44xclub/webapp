'use client'

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Loader2,
  ChevronLeft,
  Scale,
  TrendingDown,
  TrendingUp,
  Minus,
  Image as ImageIcon,
} from 'lucide-react'
import { BottomNav } from '@/components/shared/BottomNav'
import { CheckinDetailsModal } from '@/components/profile/CheckinDetailsModal'
import type { Block, BlockMedia } from '@/lib/types'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface BlockWithMedia extends Block {
  block_media: BlockMedia[]
}

export default function CheckInsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#07090d]">
        <Loader2 className="h-6 w-6 animate-spin text-[rgba(238,242,255,0.35)]" />
      </div>
    }>
      <CheckInsPageContent />
    </Suspense>
  )
}

function CheckInsPageContent() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [checkins, setCheckins] = useState<BlockWithMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCheckin, setSelectedCheckin] = useState<BlockWithMedia | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  // Auth check
  useEffect(() => {
    let isMounted = true
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (!isMounted) return
        if (error || !user) { router.push('/'); return }
        setUser(user)
        setAuthLoading(false)
      } catch { if (isMounted) router.push('/') }
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      if (event === 'SIGNED_OUT') router.push('/')
      else if (session?.user) { setUser(session.user); setAuthLoading(false) }
    })

    return () => { isMounted = false; subscription.unsubscribe() }
  }, [router, supabase])

  // Fetch all check-ins
  useEffect(() => {
    async function fetchCheckins() {
      if (!user?.id) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('blocks')
          .select('*, block_media(*)')
          .eq('user_id', user.id)
          .eq('block_type', 'checkin')
          .is('deleted_at', null)
          .order('performed_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })

        if (error) throw error
        setCheckins(data as BlockWithMedia[] || [])
      } catch (err) {
        console.error('Failed to fetch check-ins:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCheckins()
  }, [user?.id, supabase])

  // Handle open query param
  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId && checkins.length > 0) {
      const checkin = checkins.find(c => c.id === openId)
      if (checkin) {
        setSelectedCheckin(checkin)
      }
    }
  }, [searchParams, checkins])

  // Close modal and clear query param
  const handleCloseModal = useCallback(() => {
    setSelectedCheckin(null)
    // Remove query param
    router.replace('/profile/check-ins', { scroll: false })
  }, [router])

  // Open modal with query param
  const handleOpenCheckin = useCallback((checkin: BlockWithMedia) => {
    setSelectedCheckin(checkin)
    router.replace(`/profile/check-ins?open=${checkin.id}`, { scroll: false })
  }, [router])

  // Calculate trend data
  const trendData = useMemo(() => {
    // Get check-ins with valid weights
    const withWeights = checkins.filter(c => {
      const payload = c.payload as { weight?: number }
      return payload?.weight && payload.weight > 0
    })

    if (withWeights.length < 2) {
      return null
    }

    // Most recent (current)
    const currentPayload = withWeights[0].payload as { weight: number }
    const currentWeight = currentPayload.weight

    // Oldest (start) - last item in the array
    const startPayload = withWeights[withWeights.length - 1].payload as { weight: number }
    const startWeight = startPayload.weight

    // Delta
    const delta = currentWeight - startWeight

    return {
      startWeight,
      currentWeight,
      delta,
      checkinsCount: withWeights.length,
    }
  }, [checkins])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07090d]">
        <Loader2 className="h-6 w-6 animate-spin text-[rgba(238,242,255,0.35)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#07090d] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgba(7,9,13,0.92)] backdrop-blur-[16px] border-b border-[rgba(255,255,255,0.07)]">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => router.push('/profile')}
            className="p-2 -ml-2 text-[rgba(238,242,255,0.45)] hover:text-[rgba(238,242,255,0.72)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[20px] font-semibold text-[#eef2ff] ml-1">Check-ins</h1>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[rgba(238,242,255,0.35)]" />
          </div>
        ) : (
          <>
            {/* Trend Summary */}
            {trendData ? (
              <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)] p-4">
                <div className="flex items-center justify-between">
                  {/* Start Weight */}
                  <div className="text-center flex-1">
                    <p className="text-[11px] font-medium text-[rgba(238,242,255,0.45)] uppercase tracking-wide mb-1">
                      Start
                    </p>
                    <p className="text-[20px] font-bold text-[rgba(238,242,255,0.72)]">
                      {trendData.startWeight.toFixed(1)}
                      <span className="text-[12px] font-normal ml-0.5">kg</span>
                    </p>
                  </div>

                  {/* Delta Indicator */}
                  <div className="flex-1 flex justify-center">
                    <div className={`
                      px-3 py-1.5 rounded-full flex items-center gap-1.5
                      ${trendData.delta < 0 ? 'bg-emerald-500/10 text-emerald-400' :
                        trendData.delta > 0 ? 'bg-rose-500/10 text-rose-400' :
                        'bg-[rgba(255,255,255,0.06)] text-[rgba(238,242,255,0.50)]'}
                    `}>
                      {trendData.delta < 0 ? (
                        <TrendingDown className="h-4 w-4" />
                      ) : trendData.delta > 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <Minus className="h-4 w-4" />
                      )}
                      <span className="text-[14px] font-semibold">
                        {trendData.delta === 0 ? '0' : `${trendData.delta > 0 ? '+' : ''}${trendData.delta.toFixed(1)}`}
                        <span className="text-[11px] font-normal ml-0.5">kg</span>
                      </span>
                    </div>
                  </div>

                  {/* Current Weight */}
                  <div className="text-center flex-1">
                    <p className="text-[11px] font-medium text-[rgba(238,242,255,0.45)] uppercase tracking-wide mb-1">
                      Current
                    </p>
                    <p className="text-[20px] font-bold text-[#eef2ff]">
                      {trendData.currentWeight.toFixed(1)}
                      <span className="text-[12px] font-normal ml-0.5">kg</span>
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-[rgba(238,242,255,0.40)] text-center mt-3">
                  Based on {trendData.checkinsCount} check-ins
                </p>
              </div>
            ) : (
              <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)] p-6 text-center">
                <Scale className="h-8 w-8 text-[rgba(238,242,255,0.25)] mx-auto mb-3" />
                <p className="text-[13px] text-[rgba(238,242,255,0.50)]">
                  Log 2+ check-ins to see your trend
                </p>
              </div>
            )}

            {/* Check-ins List */}
            <div className="bg-[rgba(255,255,255,0.03)] rounded-[14px] border border-[rgba(255,255,255,0.06)]">
              <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
                <h3 className="text-[14px] font-semibold text-[#eef2ff]">
                  All Check-ins ({checkins.length})
                </h3>
              </div>

              <div className="divide-y divide-[rgba(255,255,255,0.06)]">
                {checkins.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-[13px] text-[rgba(238,242,255,0.40)]">
                      No check-ins yet. Log your first one!
                    </p>
                  </div>
                ) : (
                  checkins.map((checkin, index) => {
                    const payload = checkin.payload as { weight?: number; body_fat_percent?: number }
                    const media = checkin.block_media || []

                    // Calculate delta from previous
                    let delta: number | null = null
                    if (index < checkins.length - 1) {
                      const prevPayload = checkins[index + 1].payload as { weight?: number }
                      if (payload?.weight && prevPayload?.weight) {
                        delta = payload.weight - prevPayload.weight
                      }
                    }

                    return (
                      <button
                        key={checkin.id}
                        onClick={() => handleOpenCheckin(checkin)}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {/* Date */}
                          <div className="w-14">
                            <p className="text-[13px] font-medium text-[rgba(238,242,255,0.85)]">
                              {new Date(checkin.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-[10px] text-[rgba(238,242,255,0.40)]">
                              {new Date(checkin.date).getFullYear()}
                            </p>
                          </div>

                          {/* Weight */}
                          <div className="flex items-center gap-2">
                            <span className="text-[16px] font-semibold text-[#eef2ff]">
                              {payload?.weight ? `${payload.weight} kg` : '—'}
                            </span>

                            {delta !== null && delta !== 0 && (
                              <span className={`text-[11px] font-medium flex items-center gap-0.5 ${delta < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {delta < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                                {Math.abs(delta).toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Body Fat */}
                          {payload?.body_fat_percent && (
                            <span className="text-[12px] text-[rgba(238,242,255,0.45)]">
                              {payload.body_fat_percent}% BF
                            </span>
                          )}

                          {/* Media count */}
                          {media.length > 0 && (
                            <span className="text-[10px] text-[rgba(238,242,255,0.40)] flex items-center gap-1 bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-full">
                              <ImageIcon className="h-3 w-3" /> {media.length}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <BottomNav />

      {/* Check-in Details Modal */}
      <CheckinDetailsModal
        isOpen={!!selectedCheckin}
        onClose={handleCloseModal}
        checkin={selectedCheckin}
      />
    </div>
  )
}
