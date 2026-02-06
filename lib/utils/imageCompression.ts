'use client'

export interface CompressionOptions {
  maxWidth: number
  maxHeight: number
  quality: number
  maxSizeKB: number
  format: 'webp' | 'jpeg'
}

export interface CompressedImage {
  blob: Blob
  width: number
  height: number
  originalSize: number
  compressedSize: number
}

// Default options for avatars (256x256 square, <200KB)
export const AVATAR_OPTIONS: CompressionOptions = {
  maxWidth: 256,
  maxHeight: 256,
  quality: 0.8,
  maxSizeKB: 200,
  format: 'webp',
}

// Default options for block media (1440px max dimension, <800KB)
export const BLOCK_MEDIA_OPTIONS: CompressionOptions = {
  maxWidth: 1440,
  maxHeight: 1440,
  quality: 0.8,
  maxSizeKB: 800,
  format: 'webp',
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
  maxSizeKB: number
): Promise<Blob> {
  const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg'
  let quality = initialQuality
  let blob: Blob | null = null

  // Try progressively lower quality until size constraint is met
  while (quality >= 0.1) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), mimeType, quality)
    })

    if (blob && blob.size <= maxSizeKB * 1024) {
      return blob
    }

    quality -= 0.1
  }

  // Return whatever we got, even if over size limit
  if (blob) return blob

  throw new Error('Failed to compress image')
}

/**
 * Compress an image file for avatar use (square crop, 256x256)
 */
export async function compressAvatar(file: File): Promise<CompressedImage> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Crop to square and resize to 256x256
  cropToSquare(img, canvas, ctx, AVATAR_OPTIONS.maxWidth)

  // Convert to webp with size constraint
  const blob = await canvasToBlob(
    canvas,
    AVATAR_OPTIONS.format,
    AVATAR_OPTIONS.quality,
    AVATAR_OPTIONS.maxSizeKB
  )

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
 * Compress an image file for block media (max 1440px, maintain aspect ratio)
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

  // Convert to webp with size constraint
  const blob = await canvasToBlob(
    canvas,
    BLOCK_MEDIA_OPTIONS.format,
    BLOCK_MEDIA_OPTIONS.quality,
    BLOCK_MEDIA_OPTIONS.maxSizeKB
  )

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
 * Get file extension for storage
 */
export function getFileExtension(format: 'webp' | 'jpeg'): string {
  return format === 'webp' ? '.webp' : '.jpg'
}
