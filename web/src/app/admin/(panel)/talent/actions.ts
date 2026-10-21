'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { ADMIN_REQUIRED_MESSAGE, getAdminActor } from '@/lib/auth/adminSession'

import { recordAuditEvent } from '@/modules/audit/container'
import {
  deleteCandidate,
  processPendingCvs,
  reprocessCandidate,
  resendFormLink,
  uploadStaffCv,
} from '@/modules/talent/container'

import {
  processingMessage,
  REJECTION_MESSAGES,
} from '@/app/admin/(panel)/talent/talentLabels'

const TALENT_AUDIT_ENTITY = 'talent_candidate'

const candidateIdSchema = z.uuid()

export type UploadStaffCvActionResult =
  { ok: true } | { ok: false; error: string }

export type TalentActionState = {
  error?: string
  message?: string
  /** Hay un procesado «en marcha» que puede estar atascado: ofrecer forzar. */
  canForce?: boolean
}

/**
 * Sube UN CV (el navegador llama una vez por fichero para no mandar 100 MB en
 * una petición). No lanza el procesado: lo hace `processPendingCvsAction` al
 * final del lote, porque el workflow procesa todas las filas `pending`.
 */
export async function uploadStaffCvAction(
  formData: FormData,
): Promise<UploadStaffCvActionResult> {
  const actor = await getAdminActor()

  if (!actor) return { ok: false, error: ADMIN_REQUIRED_MESSAGE }

  const file = formData.get('file')

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'el fichero está vacío.' }
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const result = await uploadStaffCv({ name: file.name, bytes }, actor.email)

  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === 'file_rejected'
          ? REJECTION_MESSAGES[result.rejection]
          : 'no se ha podido guardar. Inténtalo de nuevo.',
    }
  }

  await recordAuditEvent({
    actorEmail: actor.email,
    action: 'talent.cv_upload',
    entity: TALENT_AUDIT_ENTITY,
    entityId: result.candidateId,
    payload: { bytes: bytes.byteLength },
  })

  revalidatePath('/admin/talent')

  return { ok: true }
}

/** Lanza `Procesar nuevo CV` (con las cautelas de `processPendingCvs`). */
export async function processPendingCvsAction(
  _previousState: TalentActionState,
  formData: FormData,
): Promise<TalentActionState> {
  const actor = await getAdminActor()

  if (!actor) return { error: ADMIN_REQUIRED_MESSAGE }

  const force = formData.get('force') === 'true'
  const result = await processPendingCvs({ force })

  if (result.status === 'triggered') {
    await recordAuditEvent({
      actorEmail: actor.email,
      action: 'talent.process_launch',
      entity: TALENT_AUDIT_ENTITY,
      entityId: null,
      payload: { pending: result.pending, forced: force },
    })
  }

  revalidatePath('/admin/talent')

  const message = processingMessage(result)

  if (result.status === 'not_configured' || result.status === 'unavailable') {
    return { error: message }
  }

  return {
    message,
    canForce: result.status === 'busy' && result.reason === 'in_progress',
  }
}

export async function reprocessCandidateAction(
  _previousState: TalentActionState,
  formData: FormData,
): Promise<TalentActionState> {
  const actor = await getAdminActor()

  if (!actor) return { error: ADMIN_REQUIRED_MESSAGE }

  const id = candidateIdSchema.safeParse(formData.get('candidateId'))

  if (!id.success) return { error: 'El identificador no es válido.' }

  const result = await reprocessCandidate(id.data)

  if (!result.ok) {
    return {
      error:
        result.reason === 'not_found'
          ? 'El candidato ya no existe.'
          : result.reason === 'not_reprocessable'
            ? 'Solo se pueden reprocesar filas en «Procesando» o «Error» cuyo CV siga pendiente de mover a Drive.'
            : 'No se ha podido reprocesar. Inténtalo de nuevo.',
    }
  }

  await recordAuditEvent({
    actorEmail: actor.email,
    action: 'talent.reprocess',
    entity: TALENT_AUDIT_ENTITY,
    entityId: id.data,
    payload: { launch: result.processing.status },
  })

  revalidatePath(`/admin/talent/${id.data}`)
  revalidatePath('/admin/talent')

  return { message: processingMessage(result.processing) }
}

/**
 * «Eliminar candidato» (derecho de supresión). Deja constancia en Actividad
 * **sin datos personales** (solo recuentos) y vuelve al listado con un aviso de
 * lo que queda por borrar a mano (Drive y Mailchimp).
 */
export async function deleteCandidateAction(
  _previousState: TalentActionState,
  formData: FormData,
): Promise<TalentActionState> {
  const actor = await getAdminActor()

  if (!actor) return { error: ADMIN_REQUIRED_MESSAGE }

  const id = candidateIdSchema.safeParse(formData.get('candidateId'))

  if (!id.success) return { error: 'El identificador no es válido.' }

  const result = await deleteCandidate(id.data)

  if (!result.ok) {
    return {
      error:
        result.reason === 'not_found'
          ? 'El candidato ya no existe.'
          : 'No se ha podido eliminar. Inténtalo de nuevo: repetirlo es seguro.',
    }
  }

  await recordAuditEvent({
    actorEmail: actor.email,
    action: 'talent.candidate_delete',
    entity: TALENT_AUDIT_ENTITY,
    entityId: id.data,
    payload: {
      bucketFiles: result.bucketFiles,
      externalFiles: result.externalFiles,
      newsletter: result.newsletterAccepted,
    },
  })

  revalidatePath('/admin/talent')

  const params = new URLSearchParams({ deleted: '1' })

  if (result.externalFiles > 0) params.set('drive', '1')

  if (result.newsletterAccepted) params.set('newsletter', '1')

  redirect(`/admin/talent?${params.toString()}`)
}

export async function resendFormLinkAction(
  _previousState: TalentActionState,
  formData: FormData,
): Promise<TalentActionState> {
  const actor = await getAdminActor()

  if (!actor) return { error: ADMIN_REQUIRED_MESSAGE }

  const id = candidateIdSchema.safeParse(formData.get('candidateId'))

  if (!id.success) return { error: 'El identificador no es válido.' }

  const result = await resendFormLink(id.data)

  if (!result.ok) {
    return {
      error:
        result.reason === 'not_found'
          ? 'El candidato ya no existe.'
          : result.reason === 'no_email'
            ? 'Este candidato no tiene email: n8n aún no ha procesado su CV.'
            : result.reason === 'in_process'
              ? 'n8n está procesando este CV; al terminar enviará el enlace por su cuenta.'
              : 'No se ha podido enviar el enlace. Inténtalo de nuevo.',
    }
  }

  await recordAuditEvent({
    actorEmail: actor.email,
    action: 'talent.link_resend',
    entity: TALENT_AUDIT_ENTITY,
    entityId: id.data,
  })

  revalidatePath(`/admin/talent/${id.data}`)

  return { message: 'Enlace enviado. Llega en unos segundos.' }
}
