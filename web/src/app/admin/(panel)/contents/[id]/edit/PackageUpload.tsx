'use client'

import { useActionState, useState, useTransition } from 'react'
import { formatAdminDateTime } from '@/app/admin/_lib/formatAdminDateTime'
import { createClient } from '@/lib/supabase/client'

import { AdminActionForm } from '@/components/admin/AdminActionForm'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput } from '@/components/admin/AdminControls'
import { AdminField } from '@/components/admin/AdminField'
import { AdminForm, AdminFormActions } from '@/components/admin/AdminForm'
import { AdminMessage } from '@/components/admin/AdminMessage'
import { AdminCellActions, AdminTable } from '@/components/admin/AdminTable'
import type { HtmlPackageVersionSummary } from '@/modules/packages/domain/htmlPackageRepository'
import {
  PACKAGE_LIMITS,
  formatMegabytes,
} from '@/modules/packages/domain/packageLimits'

import {
  deleteHtmlPackageVersionAction,
  deleteOldHtmlPackageVersionsAction,
  prepareHtmlPackageUploadAction,
  publishHtmlPackageVersionAction,
  uploadHtmlPackageAction,
  type UploadPackageActionState,
} from './packageActions'
import styles from './PackageUpload.module.css'

type Props = {
  contentId: string
  versions: HtmlPackageVersionSummary[]
}

const uploadInitialState: UploadPackageActionState = {}

export default function PackageUpload({ contentId, versions }: Props) {
  const [uploadState, uploadAction, uploading] = useActionState(
    uploadHtmlPackageAction,
    uploadInitialState,
  )

  const [file, setFile] = useState<File | null>(null)
  const [staging, setStaging] = useState(false)
  const [stagingError, setStagingError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // El ZIP no viaja en el formulario (la plataforma limita el cuerpo de una
  // petición a unos 4,5 MB): se sube directamente a Storage con una URL
  // firmada y la acción recibe solo la ruta donde quedó.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!file || staging || uploading) return

    setStagingError(null)

    if (file.size > PACKAGE_LIMITS.maxZipSizeBytes) {
      setStagingError(
        `El ZIP supera el límite de ${formatMegabytes(PACKAGE_LIMITS.maxZipSizeBytes)}.`,
      )
      return
    }

    setStaging(true)

    try {
      const target = await prepareHtmlPackageUploadAction(contentId)

      if (!target.ok) {
        setStagingError(target.error)
        return
      }

      const { error } = await createClient()
        .storage.from(target.bucket)
        .uploadToSignedUrl(target.path, target.token, file, {
          contentType: 'application/zip',
        })

      if (error) {
        console.error('Admin · subida directa del paquete:', error)
        setStagingError(
          'No se ha podido subir el archivo. Inténtalo de nuevo en unos minutos.',
        )
        return
      }

      const data = new FormData()
      data.set('contentId', contentId)
      data.set('stagedPath', target.path)

      startTransition(() => uploadAction(data))
    } catch (error) {
      console.error('Admin · subida directa del paquete:', error)
      setStagingError('No se ha podido subir el archivo.')
    } finally {
      setStaging(false)
    }
  }

  const oldVersionsCount = versions.filter(
    (version) => version.status === 'rolled_back',
  ).length

  return (
    <div className={styles.stack}>
      <AdminForm onSubmit={handleSubmit}>
        <AdminField label="Paquete (.zip)" htmlFor="package-zip">
          <AdminInput
            id="package-zip"
            name="file"
            type="file"
            accept=".zip"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </AdminField>

        {stagingError && (
          <AdminMessage kind="error">{stagingError}</AdminMessage>
        )}

        {uploadState.error && (
          <div className={styles.issues}>
            <AdminMessage kind="error">{uploadState.error}</AdminMessage>

            {uploadState.issues && uploadState.issues.length > 0 && (
              <ul className={styles.issueList}>
                {uploadState.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {uploadState.success && (
          <AdminMessage kind="success">
            Versión subida como borrador.
          </AdminMessage>
        )}

        <AdminFormActions>
          <AdminButton
            type="submit"
            variant="primary"
            disabled={staging || uploading || !file}
          >
            {staging || uploading ? 'Subiendo…' : 'Subir nueva versión'}
          </AdminButton>
        </AdminFormActions>
      </AdminForm>

      {oldVersionsCount > 0 && (
        <AdminActionForm
          action={deleteOldHtmlPackageVersionsAction}
          hidden={{ contentId }}
          variant="danger"
          label={`Borrar versiones anteriores (${oldVersionsCount})`}
          pendingLabel="Borrando…"
          confirmText={`¿Borrar las ${oldVersionsCount} versiones anteriores? La versión activa y los borradores no se tocan; se borrarán también los ficheros de las anteriores. Esta acción no se puede deshacer.`}
        />
      )}

      <AdminTable>
        <thead>
          <tr>
            <th>Versión</th>
            <th>Estado</th>
            <th>Subida</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {versions.map((version) => (
            <tr key={version.id}>
              <td>v{version.version}</td>

              <td>
                <AdminBadge
                  tone={version.status === 'published' ? 'brand' : 'neutral'}
                >
                  {version.status}
                </AdminBadge>
              </td>

              <td>{formatAdminDateTime(version.createdAt)}</td>

              <td>
                <AdminCellActions>
                  {version.status === 'draft' && (
                    <AdminActionForm
                      action={publishHtmlPackageVersionAction}
                      hidden={{ contentId, versionId: version.id }}
                      compact
                      label="Publicar esta versión"
                      pendingLabel="Publicando…"
                    />
                  )}

                  {version.status === 'rolled_back' && (
                    <AdminActionForm
                      action={publishHtmlPackageVersionAction}
                      hidden={{ contentId, versionId: version.id }}
                      compact
                      label="Volver a esta versión"
                      pendingLabel="Publicando…"
                    />
                  )}

                  {version.status !== 'published' && (
                    <AdminActionForm
                      action={deleteHtmlPackageVersionAction}
                      hidden={{ contentId, versionId: version.id }}
                      variant="danger"
                      compact
                      label="Borrar versión"
                      pendingLabel="Borrando…"
                      confirmText={`¿Borrar la versión v${version.version}? Se borrarán también sus ficheros. Esta acción no se puede deshacer.`}
                    />
                  )}

                  {version.status === 'published' && <span>Activa</span>}
                </AdminCellActions>
              </td>
            </tr>
          ))}

          {versions.length === 0 && (
            <tr>
              <td colSpan={4}>Todavía no se ha subido ningún paquete.</td>
            </tr>
          )}
        </tbody>
      </AdminTable>
    </div>
  )
}
