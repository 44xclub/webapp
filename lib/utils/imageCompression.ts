'use client'

export interface CompressionOptions {
  maxWidth: number
  maxHeight: number
  quality: number
  targetSizeKB: number
  hardLimitKB: number
  format: 'webp' | 'jpeg'
}

export interface CompressedImage {
  blob: Blob
  width: number
  height: number
  originalSize: number
  compressedSize: number
}

// Avatar options: 512px square, 0.80 quality, target ≤300KB, hard limit 1MB
export const AVATAR_OPTIONS: CompressionOptions = {
  maxWidth: 512,
  maxHeight: 512,
  quality: 0.80,
  targetSizeKB: 300,
  hardLimitKB: 1024, // 1MB
  format: 'webp',
}

// Block media options: 1440px max edge, 0.78 quality, target ≤1.2MB, hard limit 3MB
export const BLOCK_MEDIA_OPTIONS: CompressionOptions = {
  maxWidth: 1440,
  maxHeight: 1440,
  quality: 0.78,
  targetSizeKB: 1200,
  hardLimitKB: 3072, // 3MB
  format: 'webp',
}

// Video constraints
export const VIDEO_OPTIONS = {
  maxSizeMB: 10,
  allowedTypes: ['video/mp4', 'video/quicktime'],
}

/**
 * Load an image file into an HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Crop an image to a square (center crop)
 */
function cropToSquare(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  targetSize: number
): void {
  const size = Math.min(img.width, img.height)
  const sx = (img.width - size) / 2
  const sy = (img.height - size) / 2

  canvas.width = targetSize
  canvas.height = targetSize
  ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize)
}

/**
 * Resize an image maintaining aspect ratio
 */
function resizeImage(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  maxWidth: number,
  maxHeight: number
): void {
  let { width, height } = img

  // Calculate the scaling factor
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  canvas.width = width
  canvas.height = height
  ctx.drawImage(img, 0, 0, width, height)
}

/**
 * Convert canvas to blob with quality adjustment for size limits
 */
async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: 'webp' | 'jpeg',
  initialQuality: number,
  targetSizeKB: number
): Promise<Blob> {
  const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg'
  let quality = initialQuality
  let blob: Blob | null = null

  // Try progressively lower quality until target size is met
  while (quality >= 0.1) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), mimeType, quality)
    })

    if (blob && blob.size <= targetSizeKB * 1024) {
      return blob
    }

    quality -= 0.05 // Smaller steps for better quality retention
  }

  // Return whatever we got (will be checked against hard limit by caller)
  if (blob) return blob

  throw new Error('Failed to compress image')
}

/**
 * Compress an image file for avatar use (square crop, 512x512)
 */
export async function compressAvatar(file: File): Promise<CompressedImage> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Crop to square and resize to 512x512
  cropToSquare(img, canvas, ctx, AVATAR_OPTIONS.maxWidth)

  // Convert to webp with target size
  const blob = await canvasToBlob(
    canvas,
    AVATAR_OPTIONS.format,
    AVATAR_OPTIONS.quality,
    AVATAR_OPTIONS.targetSizeKB
  )

  // Check against hard limit
  if (blob.size > AVATAR_OPTIONS.hardLimitKB * 1024) {
    URL.revokeObjectURL(img.src)
    throw new Error(`Avatar image exceeds maximum size of ${AVATAR_OPTIONS.hardLimitKB / 1024}MB`)
  }

  // Clean up object URL
  URL.revokeObjectURL(img.src)

  return {
    blob,
    width: canvas.width,
    height: canvas.height,
    originalSize: file.size,
    compressedSize: blob.size,
  }
}

/**
 * Compress an image file for block media (max 1440px edge, maintain aspect ratio)
 */
export async function compressBlockMedia(file: File): Promise<CompressedImage> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Resize maintaining aspect ratio
  resizeImage(
    img,
    canvas,
    ctx,
    BLOCK_MEDIA_OPTIONS.maxWidth,
    BLOCK_MEDIA_OPTIONS.maxHeight
  )

  // Convert to webp with target size
  const blob = await canvasToBlob(
    canvas,
    BLOCK_MEDIA_OPTIONS.format,
    BLOCK_MEDIA_OPTIONS.quality,
    BLOCK_MEDIA_OPTIONS.targetSizeKB
  )

  // Check against hard limit
  if (blob.size > BLOCK_MEDIA_OPTIONS.hardLimitKB * 1024) {
    URL.revokeObjectURL(img.src)
    throw new Error(`Image exceeds maximum size of ${BLOCK_MEDIA_OPTIONS.hardLimitKB / 1024}MB`)
  }

  // Clean up object URL
  URL.revokeObjectURL(img.src)

  return {
    blob,
    width: canvas.width,
    height: canvas.height,
    originalSize: file.size,
    compressedSize: blob.size,
  }
}

/**
 * Create a preview URL for a compressed image blob
 */
export function createPreviewUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

/**
 * Revoke a preview URL to free memory
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url)
}

/**
 * Validate that a file is an acceptable image type
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
  return validTypes.includes(file.type.toLowerCase())
}

/**
 * Validate that a file is an acceptable video type
 */
export function isValidVideoFile(file: File): boolean {
  return VIDEO_OPTIONS.allowedTypes.includes(file.type.toLowerCase())
}

/**
 * Validate video file size
 */
export function validateVideoSize(file: File): { valid: boolean; error?: string } {
  const maxBytes = VIDEO_OPTIONS.maxSizeMB * 1024 * 1024
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `Video exceeds maximum size of ${VIDEO_OPTIONS.maxSizeMB}MB`,
    }
  }
  return { valid: true }
}

/**
 * Check if file is an image or video
 */
export function getMediaType(file: File): 'image' | 'video' | 'unknown' {
  if (isValidImageFile(file)) return 'image'
  if (isValidVideoFile(file)) return 'video'
  return 'unknown'
}

/**
 * Get file extension for storage
 */
export function getFileExtension(format: 'webp' | 'jpeg'): string {
  return format === 'webp' ? '.webp' : '.jpg'
}

/**
 * Get video file extension
 */
export function getVideoExtension(file: File): string {
  if (file.type === 'video/mp4') return '.mp4'
  if (file.type === 'video/quicktime') return '.mov'
  return '.mp4' // fallback
}
