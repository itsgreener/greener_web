'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'

import {
  processPendingCvsAction,
  uploadStaffCvAction,
} from '@/app/admin/(panel)/talent/actions'

import {
  ALLOWED_FILE_EXTENSIONS,
  TALENT_FILE_LIMITS,
  TALENT_STAFF_UPLOAD,
} from '@/modules/talent/domain/talentConstants'

type Row = {
  id: number
  file: File
  state: 'ready' | 'uploading' | 'done' | 'error'
  error?: string
}

type Outcome = { uploaded: number; failed: number; message: string } | null

function hasAllowedExtension(name: string) {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''

  return (ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(extension)
}

const MAX_MB = TALENT_FILE_LIMITS.maxFileBytes / 1_000_000

export default function UploadCvs() {
  const [rows, setRows] = useState<Row[]>([])
  const [notice, setNotice] = useState('')
  const [running, setRunning] = useState(false)
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
      } else if (file.size > TALENT_FILE_LIMITS.maxFileBytes) {
        problems.push(`${file.name}: supera los ${MAX_MB} MB.`)
      } else if (file.size === 0) {
        problems.push(`${file.name}: está vacío.`)
      } else {
        accepted.push({ id: nextId.current++, file, state: 'ready' })
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

  function patch(id: number, change: Partial<Row>) {
    setRows((previous) =>
      previous.map((row) => (row.id === id ? { ...row, ...change } : row)),
    )
  }

  async function start() {
    if (running) return

    setRunning(true)
    setOutcome(null)

    let uploaded = 0
    let failed = 0

    // Un fichero por llamada: así no viajan 100 MB en una sola petición.
    for (const row of rows.filter((item) => item.state !== 'done')) {
      patch(row.id, { state: 'uploading', error: undefined })

      const formData = new FormData()
      formData.set('file', row.file)

      try {
        const result = await uploadStaffCvAction(formData)

        if (result.ok) {
          uploaded += 1
          patch(row.id, { state: 'done' })
        } else {
          failed += 1
          patch(row.id, { state: 'error', error: result.error })
        }
      } catch {
        failed += 1
        patch(row.id, {
          state: 'error',
          error: 'se ha cortado la conexión. Inténtalo de nuevo.',
        })
      }
    }

    // El procesado se lanza UNA vez, al final: el workflow procesa todas las
    // filas pendientes y dos llamadas seguidas las procesarían dos veces.
    let message = 'No se ha subido ningún CV.'

    if (uploaded > 0) {
      const processing = await processPendingCvsAction({}, new FormData())

      message = processing.error ?? processing.message ?? ''
    }

    setOutcome({ uploaded, failed, message })
    setRunning(false)
  }

  const pendingRows = rows.filter((row) => row.state !== 'done')

  return (
    <div className="admin-form">
      <div
        className="admin-talent-drop"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          addFiles(event.dataTransfer.files)
        }}
      >
        <label htmlFor="talent-cv-files" className="admin-field-label">
          Elige los CVs o arrástralos aquí
        </label>

        <input
          ref={input}
          id="talent-cv-files"
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
          disabled={running}
          onChange={(event) => addFiles(event.target.files)}
        />
      </div>

      {notice && <p className="admin-notice admin-notice-warning">{notice}</p>}

      {rows.length > 0 && (
        <ul className="admin-talent-list">
          {rows.map((row) => (
            <li key={row.id}>
              <span>{row.file.name}</span>

              <span className="admin-content-slug">
                {(row.file.size / 1_000_000).toFixed(1)} MB ·{' '}
                {row.state === 'ready' && 'listo'}
                {row.state === 'uploading' && 'subiendo y comprobando…'}
                {row.state === 'done' && 'subido'}
                {row.state === 'error' && `no se ha subido: ${row.error}`}
              </span>

              {row.state !== 'uploading' && row.state !== 'done' && (
                <button
                  type="button"
                  className="admin-link-button"
                  disabled={running}
                  onClick={() =>
                    setRows((previous) =>
                      previous.filter((item) => item.id !== row.id),
                    )
                  }
                >
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="admin-form-actions">
        <button
          type="button"
          className="admin-button admin-button-primary"
          disabled={running || pendingRows.length === 0}
          onClick={start}
        >
          {running
            ? 'Subiendo…'
            : `Subir y procesar ${pendingRows.length || ''}`.trim()}
        </button>
      </div>

      {outcome && (
        <div role="status">
          <p className="admin-form-success">
            {outcome.uploaded} subidos
            {outcome.failed > 0 ? `, ${outcome.failed} con error` : ''}.
          </p>

          {outcome.message && <p className="admin-notice">{outcome.message}</p>}

          <p>
            <Link
              href="/admin/talent?status=pending"
              className="admin-text-link"
            >
              Ver los pendientes →
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
