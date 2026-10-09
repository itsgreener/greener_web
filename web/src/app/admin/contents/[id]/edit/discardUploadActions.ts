'use server'

import { z } from 'zod'

import { isAdminRequest } from '@/lib/auth/adminSession'

import { discardUnregisteredUpload } from '@/modules/media/application/cleanupMedia'

/**
 * Descarta un archivo que el navegador acaba de subir a Cloudinary pero que
 * NO llegó a registrarse (validación fallida, error del servidor, el admin
 * canceló la sustitución…). Es la mitad «cliente» de la limpieza de
 * Cloudinary del 5 oct 2026: sin esto, cada subida fallida dejaba un
 * archivo huérfano en el plan Free.
 *
 * Es una Server Action, o sea un endpoint público: exige sesión de admin
 * (is_admin) igual que las rutas de firma, y además cleanupMedia solo borra
 * dentro de `greener/content/**` y solo si ningún media_asset lo usa.
 */

const discardUploadedMediaSchema = z.object({
  cloudinaryPublicId: z.string().trim().min(1),
  kind: z.enum(['image', 'video']),
})

export type DiscardUploadedMediaResult =
  { ok: true; discarded: boolean } | { ok: false }

export async function discardUploadedMediaAction(
  input: unknown,
): Promise<DiscardUploadedMediaResult> {
  const parsed = discardUploadedMediaSchema.safeParse(input)

  if (!parsed.success) return { ok: false }

  if (!(await isAdminRequest())) return { ok: false }

  const discarded = await discardUnregisteredUpload(
    parsed.data.cloudinaryPublicId,
    parsed.data.kind,
  )

  return { ok: true, discarded }
}
