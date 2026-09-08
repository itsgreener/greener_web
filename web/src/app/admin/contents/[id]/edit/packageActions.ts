'use server'

import { revalidatePath } from 'next/cache'

import { uploadHtmlPackage } from '@/modules/packages/application/uploadHtmlPackage'
import {
  publishHtmlPackageVersion,
  publishHtmlPackageVersionSchema,
} from '@/modules/packages/application/publishHtmlPackageVersion'
import { PackageValidationError } from '@/modules/packages/infrastructure/zipValidation'
import { VirusScanError } from '@/modules/packages/infrastructure/cloudmersiveVirusScan'

export type UploadPackageActionState = {
  error?: string
  issues?: string[]
  success?: boolean
}

export type PublishPackageActionState = {
  error?: string
  success?: boolean
}

function revalidateContent(id: string) {
  revalidatePath(`/admin/contents/${id}/edit`)
}

export async function uploadHtmlPackageAction(
  _previousState: UploadPackageActionState,
  formData: FormData,
): Promise<UploadPackageActionState> {
  const contentId = formData.get('contentId')
  const file = formData.get('file')

  if (typeof contentId !== 'string' || !contentId) {
    return { error: 'El identificador del contenido no es válido.' }
  }

  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Selecciona un archivo ZIP.' }
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    await uploadHtmlPackage(contentId, buffer)
  } catch (error) {
    console.error(error)

    if (error instanceof PackageValidationError) {
      return {
        error: 'El ZIP no cumple el contrato de paquete.',
        issues: error.issues,
      }
    }

    if (error instanceof VirusScanError) {
      return {
        error: error.message,
      }
    }

    return { error: 'No se ha podido subir el paquete.' }
  }

  revalidateContent(contentId)

  return { success: true }
}

export async function publishHtmlPackageVersionAction(
  _previousState: PublishPackageActionState,
  formData: FormData,
): Promise<PublishPackageActionState> {
  const result = publishHtmlPackageVersionSchema.safeParse({
    contentId: formData.get('contentId'),
    versionId: formData.get('versionId'),
  })

  if (!result.success) {
    return { error: 'Los datos de la versión no son válidos.' }
  }

  try {
    await publishHtmlPackageVersion(result.data)
  } catch (error) {
    console.error(error)

    return { error: 'No se ha podido publicar esta versión.' }
  }

  revalidateContent(result.data.contentId)

  return { success: true }
}
