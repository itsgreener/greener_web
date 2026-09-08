'use client'

import { useActionState, useState } from 'react'

import type { HtmlPackageVersionSummary } from '@/modules/packages/domain/htmlPackageRepository'

import {
  publishHtmlPackageVersionAction,
  uploadHtmlPackageAction,
  type PublishPackageActionState,
  type UploadPackageActionState,
} from './packageActions'

type Props = {
  contentId: string
  versions: HtmlPackageVersionSummary[]
}

const uploadInitialState: UploadPackageActionState = {}
const publishInitialState: PublishPackageActionState = {}

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

export default function PackageUpload({ contentId, versions }: Props) {
  const [uploadState, uploadAction, uploading] = useActionState(
    uploadHtmlPackageAction,
    uploadInitialState,
  )

  const [file, setFile] = useState<File | null>(null)

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
