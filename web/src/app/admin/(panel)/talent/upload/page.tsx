import Link from 'next/link'

import UploadCvs from './UploadCvs'

export default function AdminTalentUploadPage() {
  return (
    <main className="admin-contents-page">
      <div className="admin-dashboard-shell">
        <Link href="/admin/talent" className="admin-back-link">
          ← Candidatos
        </Link>

        <header className="admin-page-header">
          <div>
            <p className="admin-page-eyebrow">Talent</p>

            <h1>Subir CVs</h1>

            <p className="admin-page-description">
              Hasta 10 por vez, de 10 MB como máximo: PDF, Word o imagen (png,
              jpg, webp). Cada CV pasa por el antivirus; después n8n lo lee,
              extrae el email y los datos, lo guarda en Drive y envía al
              candidato el enlace para completar su perfil. Si el email ya
              estaba en la base, n8n descarta el CV nuevo y te avisa por email.
            </p>
          </div>
        </header>

        <section className="admin-contents-card">
          <UploadCvs />
        </section>
      </div>
    </main>
  )
}
