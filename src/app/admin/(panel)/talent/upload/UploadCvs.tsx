'use client'

import { useRef, useState } from 'react'

import {
  prepareStaffCvUploadAction,
  processPendingCvsAction,
  registerStaffCvAction,
} from '@/app/admin/(panel)/talent/actions'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput } from '@/components/admin/AdminControls'
import { AdminField } from '@/components/admin/AdminField'
import { AdminFormActions, AdminFormBody } from '@/components/admin/AdminForm'
import { AdminList } from '@/components/admin/AdminList'
import { AdminMessage } from '@/components/admin/AdminMessage'
import { AdminSubtext } from '@/components/admin/AdminTable'
import { AdminTextLink } from '@/components/admin/AdminTextLink'

import { useUploadQueue, type QueueRow } from '@/app/admin/_lib/useUploadQueue'

import {
  ALLOWED_FILE_EXTENSIONS,
  TALENT_STAFF_UPLOAD,
} from '@/modules/talent/domain/talentConstants'

import styles from './UploadCvs.module.css'

type Row = QueueRow & {
  id: number
  file: File
}

function rowKey(row: Row) {
  return row.id
}

type Outcome = { uploaded: number; failed: number; message: string } | null

function hasAllowedExtension(name: string) {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''

  return (ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(extension)
}

const MAX_MB = String(TALENT_STAFF_UPLOAD.maxFileBytes / 1_000_000).replace(
  '.',
  ',',
)

// Misma petición que hace `uploadToSignedUrl` de supabase-js (multipart con el
// fichero en el campo sin nombre), pero sin cliente de Supabase en el navegador:
// la URL firmada ya lleva el token y no hace falta ninguna clave pública.
// El tipo sale de la extensión, no del navegador (que a veces lo deja vacío y
// el bucket solo admite los de la lista).
async function uploadToSignedUrl(
  signedUrl: string,
  file: File,
  contentType: string,
) {
  const body = new FormData()

  body.append('cacheControl', '3600')
  body.append('', new Blob([file], { type: contentType }))

  let response: Response

  try {
    response = await fetch(signedUrl, {
      method: 'PUT',
      body,
      headers: { 'x-upsert': 'false' },
    })
  } catch {
    throw new Error('se ha cortado la conexión. Inténtalo de nuevo.')
  }

  if (!response.ok) {
    console.error('Admin · subida directa del CV:', response.status)

    throw new Error(
      `no se ha podido subir el fichero (error ${response.status}). Inténtalo de nuevo.`,
    )
  }
}

export default function UploadCvs() {
  const { rows, setRows, running, run } = useUploadQueue<Row>(rowKey)
  const [notice, setNotice] = useState('')
  const [outcome, setOutcome] = useState<Outcome>(null)
  const nextId = useRef(0)
  const input = useRef<HTMLInputElement>(null)

  function addFiles(list: FileList | null) {
    if (!list || running) return

    const accepted: Row[] = []
    const problems: string[] = []

    for (const file of Array.from(list)) {
      if (!hasAllowedExtension(file.name)) {
        problems.push(`${file.name}: formato no admitido.`)
      } else if (file.size > TALENT_STAFF_UPLOAD.maxFileBytes) {
        problems.push(`${file.name}: supera los ${MAX_MB} MB.`)
      } else if (file.size === 0) {
        problems.push(`${file.name}: está vacío.`)
      } else {
        accepted.push({ id: nextId.current++, file, status: 'pending' })
      }
    }

    const room = TALENT_STAFF_UPLOAD.maxFilesPerBatch - rows.length

    if (accepted.length > room) {
      problems.push(
        `Solo caben ${TALENT_STAFF_UPLOAD.maxFilesPerBatch} CVs por vez: se han dejado fuera ${accepted.length - Math.max(room, 0)}.`,
      )
    }

    setRows((previous) => [
      ...previous,
      ...accepted.slice(0, Math.max(room, 0)),
    ])
    setNotice(problems.join(' '))
    setOutcome(null)

    if (input.current) input.current.value = ''
  }

  async function start() {
    if (running) return

    setOutcome(null)

    // Un fichero cada vez. El fichero NO viaja por una Server Action (Vercel
    // corta las peticiones a una función a ~4,5 MB y aquí caben 10 MB): el
    // servidor da una URL firmada, el navegador sube directo al bucket y el
    // servidor registra y comprueba lo subido.
    await run(
      async (row) => {
        const target = await prepareStaffCvUploadAction({
          name: row.file.name,
          size: row.file.size,
        }).catch(() => {
          throw new Error('se ha cortado la conexión. Inténtalo de nuevo.')
        })

        if (!target.ok) throw new Error(target.error)

        await uploadToSignedUrl(target.signedUrl, row.file, target.contentType)

        const registered = await registerStaffCvAction(target.path).catch(
          () => {
            throw new Error('se ha cortado la conexión. Inténtalo de nuevo.')
          },
        )

        if (!registered.ok) throw new Error(registered.error)
      },
      // El procesado se lanza UNA vez, al final: el workflow procesa todas las
      // filas pendientes y dos llamadas seguidas las procesarían dos veces.
      async ({ ok, failed }) => {
        try {
          let message = 'No se ha subido ningún CV.'

          if (ok > 0) {
            const processing = await processPendingCvsAction({}, new FormData())

            message = processing.error ?? processing.message ?? ''
          }

          setOutcome({ uploaded: ok, failed, message })
        } finally {
          // Los CVs ya subidos salen de la lista (el resumen de abajo ya los
          // cuenta). Si se quedaran, seguirían ocupando sitio en el tope de
          // CVs por lote y habría que recargar la página para subir más. Se
          // hace al final, tras el procesado, y en `finally` para que ocurra
          // aunque este falle. Las filas con error se quedan para reintentar.
          setRows((previous) => previous.filter((row) => row.status !== 'ok'))
        }
      },
    )
  }

  const pendingRows = rows.filter((row) => row.status !== 'ok')

  return (
    <AdminFormBody>
      <div
        className={styles.drop}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          addFiles(event.dataTransfer.files)
        }}
      >
        <AdminField
          label="Elige los CVs o arrástralos aquí"
          htmlFor="talent-cv-files"
        >
          <AdminInput
            ref={input}
            id="talent-cv-files"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
            disabled={running}
            onChange={(event) => addFiles(event.target.files)}
          />
        </AdminField>
      </div>

      {notice && <AdminMessage kind="warning">{notice}</AdminMessage>}

      {rows.length > 0 && (
        <AdminList>
          {rows.map((row) => (
            <li key={row.id}>
              <span>{row.file.name}</span>

              <AdminSubtext>
                {(row.file.size / 1_000_000).toFixed(1)} MB ·{' '}
                {row.status === 'pending' && 'listo'}
                {row.status === 'uploading' && 'subiendo y comprobando…'}
                {row.status === 'ok' && 'subido'}
                {row.status === 'error' && `no se ha subido: ${row.error}`}
              </AdminSubtext>

              {row.status !== 'uploading' && row.status !== 'ok' && (
                <AdminButton
                  type="button"
                  compact
                  disabled={running}
                  onClick={() =>
                    setRows((previous) =>
                      previous.filter((item) => item.id !== row.id),
                    )
                  }
                >
                  Quitar
                </AdminButton>
              )}
            </li>
          ))}
        </AdminList>
      )}

      <AdminFormActions>
        <AdminButton
          type="button"
          variant="primary"
          disabled={running || pendingRows.length === 0}
          onClick={start}
        >
          {running
            ? 'Subiendo…'
            : `Subir y procesar ${pendingRows.length || ''}`.trim()}
        </AdminButton>
      </AdminFormActions>

      {outcome && (
        <div role="status" className={styles.outcome}>
          <AdminMessage kind="success">
            {outcome.uploaded} subidos
            {outcome.failed > 0 ? `, ${outcome.failed} con error` : ''}.
          </AdminMessage>

          {outcome.message && <AdminMessage>{outcome.message}</AdminMessage>}

          <p>
            <AdminTextLink href="/admin/talent?status=pending">
              Ver los pendientes →
            </AdminTextLink>
          </p>
        </div>
      )}
    </AdminFormBody>
  )
}
