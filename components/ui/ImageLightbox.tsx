'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  alt?: string
  onClose: () => void
}

/**
 * Minimal full-screen image viewer.
 * - Dark backdrop, centered image
 * - Close via X button, backdrop tap, or Escape
 * - Respects safe areas
 */
export function ImageLightbox({ src, alt = 'Image', onClose }: ImageLightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center safe-top"
      onClick={onClose}
      style={{ touchAction: 'none' }}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.2)] transition-colors"
        style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  )
}

/**
 * Hook to manage lightbox state for a set of images.
 * Returns the open/close handlers and the lightbox element to render.
 */
export function useImageLightbox() {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const openLightbox = useCallback((src: string) => {
    setLightboxSrc(src)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxSrc(null)
  }, [])

  const lightboxElement = lightboxSrc ? (
    <ImageLightbox src={lightboxSrc} onClose={closeLightbox} />
  ) : null

  return { openLightbox, lightboxElement }
}
