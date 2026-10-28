import { requireAdminPage } from '@/lib/auth/adminSession'

import { AdminCard } from '@/components/admin/AdminCard'
import {
  AdminBackLink,
  AdminPage,
  AdminPageHeader,
} from '@/components/admin/AdminPage'

import UploadCvs from './UploadCvs'

export default async function AdminTalentUploadPage() {
  await requireAdminPage()

  return (
    <AdminPage width="narrow">
      <AdminBackLink href="/admin/talent">← Candidatos</AdminBackLink>

      <AdminPageHeader
        eyebrow="Talent"
        title="Subir CVs"
        description="Hasta 10 por vez, de 10 MB como máximo: PDF, Word o imagen (png, jpg, webp). Cada CV pasa por el antivirus; después n8n lo lee, extrae el email y los datos, lo guarda en Drive y envía al candidato el enlace para completar su perfil. Si el email ya estaba en la base, n8n descarta el CV nuevo y te avisa por email."
      />

      <AdminCard>
        <UploadCvs />
      </AdminCard>
    </AdminPage>
  )
}
