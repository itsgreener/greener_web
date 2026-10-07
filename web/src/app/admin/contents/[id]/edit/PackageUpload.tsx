'use client'

import { useActionState, useState } from 'react'

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

type Props = {
  contentId: string
  versions: HtmlPackageVersionSummary[]
}

const uploadInitialState: UploadPackageActionState = {}
const publishInitialState: PublishPackageActionState = {}
const deleteInitialState: DeletePackageActionState = {}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

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

      <button type="submit" disabled={pending}>
        {pending ? 'Publicando...' : label}
      </button>

      {state.error && <p>{state.error}</p>}
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

      <button type="submit" disabled={pending}>
        {pending ? 'Borrando...' : 'Borrar versión'}
      </button>

      {state.error && <p>{state.error}</p>}
      {state.warning && <p>{state.warning}</p>}
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

      <button type="submit" disabled={pending}>
        {pending ? 'Borrando...' : `Borrar versiones anteriores (${count})`}
      </button>

      {state.error && <p>{state.error}</p>}
      {state.warning && <p>{state.warning}</p>}
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
    <div>
      <form action={uploadAction}>
        <input type="hidden" name="contentId" value={contentId} />

        <label htmlFor="package-zip">Paquete (.zip)</label>

        <input
          id="package-zip"
          name="file"
          type="file"
          accept=".zip"
          required
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />

        <button type="submit" disabled={uploading || !file}>
          {uploading ? 'Subiendo...' : 'Subir nueva versión'}
        </button>

        {uploadState.error && (
          <div>
            <p>{uploadState.error}</p>

            {uploadState.issues && uploadState.issues.length > 0 && (
              <ul>
                {uploadState.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {uploadState.success && <p>Versión subida como borrador.</p>}
      </form>

      {oldVersionsCount > 0 && (
        <DeleteOldVersionsButton
          contentId={contentId}
          count={oldVersionsCount}
        />
      )}

      <table>
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

              <td>{version.status}</td>

              <td>{formatDateTime(version.createdAt)}</td>

              <td>
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
              </td>
            </tr>
          ))}

          {versions.length === 0 && (
            <tr>
              <td colSpan={4}>Todavía no se ha subido ningún paquete.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
