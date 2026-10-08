'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

import { warmContentMedia } from '@/modules/media/application/warmContentMedia'

export type WarmActionState = {
  error?: string
  message?: string
}

const warmSchema = z.object({ id: z.string().uuid() })

/**
 * Botón «Calentar vídeos» del ABM: pide a Cloudinary, ahora, las versiones
 * de los vídeos del contenido que aún no están calentadas (también en
 * borrador). Nunca repite lo ya calentado: repetir cobra.
 *
 * Comprueba que quien llama es admin ANTES de tocar Cloudinary: los
 * contenidos publicados son legibles por cualquiera y esta acción gasta
 * créditos.
 */
export async function warmContentAction(
  _previousState: WarmActionState,
  formData: FormData,
): Promise<WarmActionState> {
  const parsed = warmSchema.safeParse({ id: formData.get('id') })

  if (!parsed.success) {
    return { error: 'El identificador del contenido no es válido.' }
  }

  try {
    const supabase = await createClient()

    const { data: isAdmin, error } = await supabase.rpc('is_admin')

    if (error || !isAdmin) {
      return { error: 'No tienes permiso para calentar vídeos.' }
    }

    const result = await warmContentMedia(parsed.data.id, {
      includeDraft: true,
    })

    revalidatePath(`/admin/contents/${parsed.data.id}/edit`)

    if (result.warmed === 0 && result.failed === 0) {
      return { message: 'No había vídeos pendientes de calentar.' }
    }

    if (result.failed > 0) {
      return {
        error: `Vídeos encargados: ${result.warmed}. Con fallo: ${result.failed} (se pueden reintentar).`,
      }
    }

    return {
      message: `Calentamiento encargado para ${result.warmed} vídeo(s). Cloudinary tarda unos minutos en terminarlo.`,
    }
  } catch (error) {
    console.error(error)

    return { error: 'No se han podido calentar los vídeos.' }
  }
}
