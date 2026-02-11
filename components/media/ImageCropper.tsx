'use client'

import { useState, useRef, useCallback } from 'react'
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, RotateCcw, Check, Crop as CropIcon } from 'lucide-react'

// Preset aspect ratios
const ASPECT_RATIOS = [
  { label: 'Portrait (4:5)', value: 4 / 5, id: '4:5' },
  { label: 'Square (1:1)', value: 1, id: '1:1' },
  { label: 'Landscape (16:9)', value: 16 / 9, id: '16:9' },
] as const

interface ImageCropperProps {
  imageFile: File
  onCropComplete: (croppedFile: File, metadata: CropMetadata) => void
  onSkip: () => void
  onCancel: () => void
}

export interface CropMetadata {
  width: number
  height: number
  aspect_ratio: string
  is_cropped: boolean
  crop_ratio: string | null
  original_width: number
  original_height: number
}

// Helper to create centered crop
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  )
}

// Max output dimensions
const MAX_OUTPUT_EDGE = 2048
const JPEG_QUALITY = 0.88

export function ImageCropper({
  imageFile,
  onCropComplete,
  onSkip,
  onCancel,
}: ImageCropperProps) {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop>()
  const [selectedRatio, setSelectedRatio] = useState<typeof ASPECT_RATIOS[number]>(ASPECT_RATIOS[0])
  const [isProcessing, setIsProcessing] = useState(false)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
  const imgRef = useRef<HTMLImageElement>(null)

  // Load image on mount
  useState(() => {
    const url = URL.createObjectURL(imageFile)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  })

  // Handle image load
  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget
      setNaturalSize({ width: naturalWidth, height: naturalHeight })

      // Initialize crop with default aspect ratio
      const newCrop = centerAspectCrop(naturalWidth, naturalHeight, selectedRatio.value)
      setCrop(newCrop)
      setCompletedCrop(newCrop)
    },
    [selectedRatio.value]
  )

  // Change aspect ratio
  const handleRatioChange = (ratio: typeof ASPECT_RATIOS[number]) => {
    setSelectedRatio(ratio)
    if (naturalSize.width && naturalSize.height) {
      const newCrop = centerAspectCrop(naturalSize.width, naturalSize.height, ratio.value)
      setCrop(newCrop)
      setCompletedCrop(newCrop)
    }
  }

  // Reset crop to center
  const handleReset = () => {
    if (naturalSize.width && naturalSize.height) {
      const newCrop = centerAspectCrop(naturalSize.width, naturalSize.height, selectedRatio.value)
      setCrop(newCrop)
      setCompletedCrop(newCrop)
    }
  }

  // Generate cropped image
  const generateCroppedImage = useCallback(async (): Promise<{ file: File; metadata: CropMetadata } | null> => {
    const image = imgRef.current
    if (!image || !completedCrop) return null

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Calculate pixel values from percentage crop
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    const cropX = (completedCrop.x / 100) * image.naturalWidth
    const cropY = (completedCrop.y / 100) * image.naturalHeight
    const cropWidth = (completedCrop.width / 100) * image.naturalWidth
    const cropHeight = (completedCrop.height / 100) * image.naturalHeight

    // Calculate output dimensions (max 2048px on longest edge)
    let outputWidth = cropWidth
    let outputHeight = cropHeight

    if (outputWidth > MAX_OUTPUT_EDGE || outputHeight > MAX_OUTPUT_EDGE) {
      if (outputWidth > outputHeight) {
        outputHeight = (outputHeight / outputWidth) * MAX_OUTPUT_EDGE
        outputWidth = MAX_OUTPUT_EDGE
      } else {
        outputWidth = (outputWidth / outputHeight) * MAX_OUTPUT_EDGE
        outputHeight = MAX_OUTPUT_EDGE
      }
    }

    canvas.width = Math.round(outputWidth)
    canvas.height = Math.round(outputHeight)

    // Draw cropped image
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      canvas.width,
      canvas.height
    )

    // Convert to blob
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null)
            return
          }

          // Create file from blob
          const fileName = imageFile.name.replace(/\.[^.]+$/, '') + '_cropped.jpg'
          const file = new File([blob], fileName, { type: 'image/jpeg' })

          const metadata: CropMetadata = {
            width: canvas.width,
            height: canvas.height,
            aspect_ratio: selectedRatio.id,
            is_cropped: true,
            crop_ratio: selectedRatio.id,
            original_width: image.naturalWidth,
            original_height: image.naturalHeight,
          }

          resolve({ file, metadata })
        },
        'image/jpeg',
        JPEG_QUALITY
      )
    })
  }, [completedCrop, imageFile.name, selectedRatio.id])

  // Handle save crop
  const handleSaveCrop = async () => {
    setIsProcessing(true)
    try {
      const result = await generateCroppedImage()
      if (result) {
        onCropComplete(result.file, result.metadata)
      }
    } catch (error) {
      console.error('Failed to crop image:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle skip crop (use original)
  const handleSkipCrop = () => {
    const metadata: CropMetadata = {
      width: naturalSize.width,
      height: naturalSize.height,
      aspect_ratio: `${naturalSize.width}:${naturalSize.height}`,
      is_cropped: false,
      crop_ratio: null,
      original_width: naturalSize.width,
      original_height: naturalSize.height,
    }
    onSkip()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="w-full max-w-lg mx-4 bg-[#0d1017] rounded-[20px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2">
            <CropIcon className="h-4 w-4 text-[rgba(238,242,255,0.52)]" />
            <h2 className="text-[16px] font-semibold text-[#eef2ff]">Crop Image</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-[rgba(238,242,255,0.45)] hover:text-[#eef2ff] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex gap-2">
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio.id}
                onClick={() => handleRatioChange(ratio)}
                className={`flex-1 py-2 px-3 rounded-lg text-[12px] font-medium transition-colors ${
                  selectedRatio.id === ratio.id
                    ? 'bg-[#3b82f6] text-white'
                    : 'bg-[rgba(255,255,255,0.05)] text-[rgba(238,242,255,0.52)] hover:bg-[rgba(255,255,255,0.08)]'
                }`}
              >
                {ratio.label}
              </button>
            ))}
          </div>
        </div>

        {/* Crop Area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[rgba(0,0,0,0.3)]">
          {imageUrl && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(_, percentCrop) => setCompletedCrop(percentCrop)}
              aspect={selectedRatio.value}
              className="max-h-[50vh]"
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-h-[50vh] max-w-full"
                crossOrigin="anonymous"
              />
            </ReactCrop>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-4 border-t border-[rgba(255,255,255,0.06)] space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 py-2.5 rounded-[10px] bg-[rgba(255,255,255,0.05)] text-[rgba(238,242,255,0.72)] font-medium text-[13px] hover:bg-[rgba(255,255,255,0.08)] transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              onClick={handleSaveCrop}
              disabled={isProcessing}
              className="flex-1 py-2.5 rounded-[10px] bg-[#3b82f6] text-white font-medium text-[13px] hover:bg-[#2563eb] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isProcessing ? 'Processing...' : 'Save Crop'}
            </button>
          </div>
          <button
            onClick={handleSkipCrop}
            className="w-full py-2.5 rounded-[10px] text-[rgba(238,242,255,0.52)] font-medium text-[13px] hover:text-[#eef2ff] transition-colors"
          >
            Skip Crop (Use Original)
          </button>
        </div>
      </div>
    </div>
  )
}
