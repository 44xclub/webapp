'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui'
import { Scale, Percent, Calendar, Clock, FileText, Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Block, BlockMedia } from '@/lib/types'

interface BlockWithMedia extends Block {
  block_media: BlockMedia[]
}

interface CheckinDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  checkin: BlockWithMedia | null
}

export function CheckinDetailsModal({ isOpen, onClose, checkin }: CheckinDetailsModalProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const supabase = useMemo(() => createClient(), [])

  if (!checkin) return null

  const payload = checkin.payload as { weight?: number; body_fat_percent?: number }
  const media = checkin.block_media || []

  // Format date
  const dateStr = new Date(checkin.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // Format time
  const timeStr = checkin.start_time?.slice(0, 5) || null

  const getMediaUrl = (storagePath: string) => {
    const { data } = supabase.storage.from('block-media').getPublicUrl(storagePath)
    return data.publicUrl
  }

  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)
  const nextImage = () => {
    if (lightboxIndex !== null && lightboxIndex < media.length - 1) {
      setLightboxIndex(lightboxIndex + 1)
    }
  }
  const prevImage = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1)
    }
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Check-in Details" showClose>
        <div className="p-4 space-y-4">
          {/* Date & Time */}
          <div className="flex items-center gap-3 pb-3 border-b border-[rgba(255,255,255,0.06)]">
            <Calendar className="h-4 w-4 text-[rgba(238,242,255,0.45)]" />
            <div>
              <p className="text-[14px] font-medium text-[#eef2ff]">{dateStr}</p>
              {timeStr && (
                <p className="text-[12px] text-[rgba(238,242,255,0.45)] flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" /> {timeStr}
                </p>
              )}
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            {/* Weight */}
            <div className="bg-[rgba(255,255,255,0.03)] rounded-[12px] border border-[rgba(255,255,255,0.06)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="h-4 w-4 text-[#3b82f6]" />
                <span className="text-[11px] font-medium text-[rgba(238,242,255,0.50)] uppercase tracking-wide">Weight</span>
              </div>
              <p className="text-[24px] font-bold text-[#eef2ff]">
                {payload?.weight ? `${payload.weight}` : '—'}
                <span className="text-[14px] font-normal text-[rgba(238,242,255,0.50)] ml-1">kg</span>
              </p>
            </div>

            {/* Body Fat */}
            <div className="bg-[rgba(255,255,255,0.03)] rounded-[12px] border border-[rgba(255,255,255,0.06)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="h-4 w-4 text-[#8b5cf6]" />
                <span className="text-[11px] font-medium text-[rgba(238,242,255,0.50)] uppercase tracking-wide">Body Fat</span>
              </div>
              <p className="text-[24px] font-bold text-[#eef2ff]">
                {payload?.body_fat_percent ? `${payload.body_fat_percent}` : '—'}
                <span className="text-[14px] font-normal text-[rgba(238,242,255,0.50)] ml-1">%</span>
              </p>
            </div>
          </div>

          {/* Notes */}
          {checkin.notes && (
            <div className="bg-[rgba(255,255,255,0.03)] rounded-[12px] border border-[rgba(255,255,255,0.06)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-[rgba(238,242,255,0.45)]" />
                <span className="text-[11px] font-medium text-[rgba(238,242,255,0.50)] uppercase tracking-wide">Notes</span>
              </div>
              <p className="text-[13px] text-[rgba(238,242,255,0.72)] leading-relaxed whitespace-pre-wrap">
                {checkin.notes}
              </p>
            </div>
          )}

          {/* Media Gallery */}
          {media.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="h-4 w-4 text-[rgba(238,242,255,0.45)]" />
                <span className="text-[11px] font-medium text-[rgba(238,242,255,0.50)] uppercase tracking-wide">
                  Progress Photos ({media.length})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {media.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => openLightbox(index)}
                    className="aspect-square rounded-[10px] overflow-hidden bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] transition-colors"
                  >
                    <img
                      src={getMediaUrl(item.storage_path)}
                      alt={`Progress photo ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Lightbox */}
      {lightboxIndex !== null && media[lightboxIndex] && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation */}
          {lightboxIndex > 0 && (
            <button
              onClick={prevImage}
              className="absolute left-4 p-2 text-white/70 hover:text-white transition-colors z-10"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}
          {lightboxIndex < media.length - 1 && (
            <button
              onClick={nextImage}
              className="absolute right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          {/* Image */}
          <img
            src={getMediaUrl(media[lightboxIndex].storage_path)}
            alt={`Progress photo ${lightboxIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[13px] text-white/70">
            {lightboxIndex + 1} / {media.length}
          </div>
        </div>
      )}
    </>
  )
}
