'use client'

import { formatAdminDateTime } from '@/app/admin/_lib/formatAdminDateTime'
import { useActionState, useState } from 'react'

import { AdminBadge } from '@/components/admin/AdminBadge'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput } from '@/components/admin/AdminControls'
import { AdminField } from '@/components/admin/AdminField'
import { AdminForm, AdminFormActions } from '@/components/admin/AdminForm'
import { AdminMessage } from '@/components/admin/AdminMessage'
import { AdminCellActions, AdminTable } from '@/components/admin/AdminTable'
import type { HtmlPackageVersionSummary } from '@/modules/packages/domain/htmlPackageRepository'

import {
  deleteHtmlPackageVersionAction,
  deleteOldHtmlPackageVersionsAction,
  publishHtmlPackageVersionAction,
  uploadHtmlPackageAction,
  type DeletePackageActionState,
  type PublishPackageActionState,
  type UploadPackageActionState,
} from './packageActions'
import styles from './PackageUpload.module.css'

type Props = {
  contentId: string
  versions: HtmlPackageVersionSummary[]
}

const uploadInitialState: UploadPackageActionState = {}
const publishInitialState: PublishPackageActionState = {}
const deleteInitialState: DeletePackageActionState = {}

function PublishVersionButton({
  contentId,
  versionId,
  label,
}: {
  contentId: string
  versionId: string
  label: string
}) {
  const [state, action, pending] = useActionState(
    publishHtmlPackageVersionAction,
    publishInitialState,
  )

  return (
    <form action={action}>
      <input type="hidden" name="contentId" value={contentId} />
      <input type="hidden" name="versionId" value={versionId} />

      <AdminButton type="submit" compact disabled={pending}>
        {pending ? 'Publicando...' : label}
      </AdminButton>

      {state.error && <AdminMessage kind="error">{state.error}</AdminMessage>}
    </form>
  )
}

function DeleteVersionButton({
  contentId,
  version,
}: {
  contentId: string
  version: HtmlPackageVersionSummary
}) {
  const [state, action, pending] = useActionState(
    deleteHtmlPackageVersionAction,
    deleteInitialState,
  )

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `¿Borrar la versión v${version.version}? Se borrarán también sus ficheros. Esta acción no se puede deshacer.`,
          )
        ) {
          event.preventDefault()
        }
      }}
    >
      <input type="hidden" name="contentId" value={contentId} />
      <input type="hidden" name="versionId" value={version.id} />

      <AdminButton type="submit" variant="danger" compact disabled={pending}>
        {pending ? 'Borrando...' : 'Borrar versión'}
      </AdminButton>

      {state.error && <AdminMessage kind="error">{state.error}</AdminMessage>}

      {state.warning && (
        <AdminMessage kind="warning">{state.warning}</AdminMessage>
      )}
    </form>
  )
}

function DeleteOldVersionsButton({
  contentId,
  count,
}: {
  contentId: string
  count: number
}) {
  const [state, action, pending] = useActionState(
    deleteOldHtmlPackageVersionsAction,
    deleteInitialState,
  )

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `¿Borrar las ${count} versiones anteriores? La versión activa y los borradores no se tocan; se borrarán también los ficheros de las anteriores. Esta acción no se puede deshacer.`,
          )
        ) {
          event.preventDefault()
        }
      }}
    >
      <input type="hidden" name="contentId" value={contentId} />

      <AdminButton type="submit" variant="danger" disabled={pending}>
        {pending ? 'Borrando...' : `Borrar versiones anteriores (${count})`}
      </AdminButton>

      {state.error && <AdminMessage kind="error">{state.error}</AdminMessage>}

      {state.warning && (
        <AdminMessage kind="warning">{state.warning}</AdminMessage>
      )}
    </form>
  )
}

export default function PackageUpload({ contentId, versions }: Props) {
  const [uploadState, uploadAction, uploading] = useActionState(
    uploadHtmlPackageAction,
    uploadInitialState,
  )

  const [file, setFile] = useState<File | null>(null)

  const oldVersionsCount = versions.filter(
    (version) => version.status === 'rolled_back',
  ).length

  return (
    <div className={styles.stack}>
      <AdminForm action={uploadAction}>
        <input type="hidden" name="contentId" value={contentId} />

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
            disabled={uploading || !file}
          >
            {uploading ? 'Subiendo...' : 'Subir nueva versión'}
          </AdminButton>
        </AdminFormActions>
      </AdminForm>

      {oldVersionsCount > 0 && (
        <DeleteOldVersionsButton
          contentId={contentId}
          count={oldVersionsCount}
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
                    <PublishVersionButton
                      contentId={contentId}
                      versionId={version.id}
                      label="Publicar esta versión"
                    />
                  )}

                  {version.status === 'rolled_back' && (
                    <PublishVersionButton
                      contentId={contentId}
                      versionId={version.id}
                      label="Volver a esta versión"
                    />
                  )}

                  {version.status !== 'published' && (
                    <DeleteVersionButton
                      contentId={contentId}
                      version={version}
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
