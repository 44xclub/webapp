'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { compressBlockMedia, isValidImageFile, createPreviewUrl, revokePreviewUrl } from '@/lib/utils/imageCompression'

interface PendingMedia {
  id: string
  file: File
  blob: Blob
  previewUrl: string
}

interface InlineMediaUploadProps {
  maxFiles?: number
  onChange: (media: PendingMedia[]) => void
  label?: string
  className?: string
}

export function InlineMediaUpload({
  maxFiles = 3,
  onChange,
  label = 'Progress Photos',
  className = '',
}: InlineMediaUploadProps) {
  const [pending, setPending] = useState<PendingMedia[]>([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      pending.forEach((p) => revokePreviewUrl(p.previewUrl))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent of changes
  useEffect(() => {
    onChange(pending)
  }, [pending, onChange])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    // Check max files limit
    const remaining = maxFiles - pending.length
    if (remaining <= 0) {
      setError(`Maximum ${maxFiles} photos allowed`)
      return
    }

    const filesToProcess = files.slice(0, remaining)
    setError(null)
    setProcessing(true)

    try {
      const newMedia: PendingMedia[] = []

      for (const file of filesToProcess) {
        // Validate file type
        if (!isValidImageFile(file)) {
          console.warn('Invalid file type:', file.type)
          continue
        }

        // Compress the image
        const compressed = await compressBlockMedia(file)
        const previewUrl = createPreviewUrl(compressed.blob)

        newMedia.push({
          id: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          blob: compressed.blob,
          previewUrl,
        })
      }

      setPending((prev) => [...prev, ...newMedia])
    } catch (err) {
      console.error('Failed to process images:', err)
      setError('Failed to process images. Please try again.')
    } finally {
      setProcessing(false)
    }
  }, [pending.length, maxFiles])

  const handleRemove = useCallback((id: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id)
      if (item) {
        revokePreviewUrl(item.previewUrl)
      }
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  const canAddMore = pending.length < maxFiles

  return (
    <div className={className}>
      <label className="block text-[13px] font-medium text-[rgba(238,242,255,0.72)] mb-2">
        {label} <span className="text-[rgba(238,242,255,0.40)]">({pending.length}/{maxFiles})</span>
      </label>

      {/* Preview grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {pending.map((item) => (
          <div key={item.id} className="relative aspect-square">
            <img
              src={item.previewUrl}
              alt=""
              className="w-full h-full object-cover rounded-[10px] border border-[rgba(255,255,255,0.08)]"
            />
            <button
              type="button"
              onClick={() => handleRemove(item.id)}
              className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        ))}

        {/* Add button (inline if has photos) */}
        {canAddMore && pending.length > 0 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={processing}
            className="aspect-square rounded-[10px] border border-dashed border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.02)] flex items-center justify-center hover:border-[rgba(255,255,255,0.20)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            {processing ? (
              <Loader2 className="h-5 w-5 text-[rgba(238,242,255,0.40)] animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5 text-[rgba(238,242,255,0.40)]" />
            )}
          </button>
        )}
      </div>

      {/* Add button (full width if no photos yet) */}
      {canAddMore && pending.length === 0 && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={processing}
          className="w-full py-6 rounded-[10px] border border-dashed border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.02)] flex flex-col items-center justify-center gap-2 hover:border-[rgba(255,255,255,0.20)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
        >
          {processing ? (
            <>
              <Loader2 className="h-6 w-6 text-[rgba(238,242,255,0.40)] animate-spin" />
              <span className="text-[12px] text-[rgba(238,242,255,0.45)]">Processing...</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-[rgba(238,242,255,0.40)]" />
              <span className="text-[12px] text-[rgba(238,242,255,0.45)]">Add progress photos (optional)</span>
            </>
          )}
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={processing}
      />

      {error && (
        <p className="mt-2 text-[11px] text-red-400">{error}</p>
      )}

      <p className="mt-2 text-[11px] text-[rgba(238,242,255,0.40)]">
        Front, back, side photos recommended. Max 3 images.
      </p>
    </div>
  )
}

// Export the type for use in other components
export type { PendingMedia }
