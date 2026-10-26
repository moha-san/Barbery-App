import { createBrowserSupabase } from '@/lib/supabase/client'

// Reduce la foto en el móvil (máx. 1600 px, JPEG) y la sube a la carpeta pública "fotos" de Supabase.
// Así una foto de 8 MB del móvil queda en ~300 KB y la web carga rápido.
async function shrink(file: File, max = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo leer la foto'))), 'image/jpeg', 0.82))
}

export async function uploadPhoto(file: File, folder: 'barberos' | 'galeria' | 'local'): Promise<{ url: string; path: string }> {
  if (!file.type.startsWith('image/')) throw new Error('Eso no es una foto')
  const blob = await shrink(file, folder === 'barberos' ? 600 : 1600)
  const path = `${folder}/${crypto.randomUUID()}.jpg`
  const supabase = createBrowserSupabase()
  const { error } = await supabase.storage.from('fotos').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (error) throw new Error('No se pudo subir la foto. ¿Has pegado el SQL de ajustes en Supabase?')
  return { url: supabase.storage.from('fotos').getPublicUrl(path).data.publicUrl, path }
}
