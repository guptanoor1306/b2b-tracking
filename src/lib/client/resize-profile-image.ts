import {
  AVATAR_ALLOWED_MIME,
  AVATAR_MAX_BYTES,
  AVATAR_MAX_DIMENSION_PX,
  type AvatarMime,
} from '@/lib/profile-avatar'

export type PreparedAvatar = {
  blob: Blob
  mime: AvatarMime
  width: number
  height: number
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image.'))
    }
    img.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: AvatarMime, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('Could not compress image.'))),
      mime,
      quality,
    )
  })
}

/** Resize to square cover crop, prefer WebP output for photos. */
export async function prepareProfileAvatarFile(file: File): Promise<PreparedAvatar> {
  if (!(AVATAR_ALLOWED_MIME as readonly string[]).includes(file.type)) {
    throw new Error('Use a JPEG, PNG, or WebP image.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image is too large. Choose a file under 5 MB before upload.')
  }

  const img = await loadImage(file)
  const side = AVATAR_MAX_DIMENSION_PX
  const canvas = document.createElement('canvas')
  canvas.width = side
  canvas.height = side
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process image.')

  const scale = Math.max(side / img.width, side / img.height)
  const w = img.width * scale
  const h = img.height * scale
  ctx.drawImage(img, (side - w) / 2, (side - h) / 2, w, h)

  const preferWebp = file.type !== 'image/png'
  const mime: AvatarMime = preferWebp ? 'image/webp' : 'image/png'
  let quality = 0.88
  let blob = await canvasToBlob(canvas, mime, quality)

  while (blob.size > AVATAR_MAX_BYTES && quality > 0.5) {
    quality -= 0.08
    blob = await canvasToBlob(canvas, mime, quality)
  }
  if (blob.size > AVATAR_MAX_BYTES) {
    throw new Error(`Image must be under ${Math.round(AVATAR_MAX_BYTES / 1024)} KB after compression.`)
  }

  return { blob, mime, width: side, height: side }
}
