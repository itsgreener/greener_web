import {
  AdminBackLink,
  AdminPage,
  AdminPageHeader,
} from '@/components/admin/AdminPage'
import { AdminCard, AdminCardHeader } from '@/components/admin/AdminCard'

import NewContentForm from './NewContentForm'

export default function NewContentPage() {
  return (
    <AdminPage width="narrow">
      <AdminBackLink href="/admin/contents">
        ← Volver a contenidos
      </AdminBackLink>

      <AdminPageHeader
        eyebrow="Gestión de contenidos"
        title="Nuevo contenido"
        description="Crea la ficha inicial del contenido. Después podrás completar traducciones, medios, pines y opciones específicas desde el editor."
      />

      <AdminCard>
        <AdminCardHeader
          kicker="Nuevo borrador"
          title="Información básica"
          description="Selecciona el tipo de contenido y configura los datos necesarios para crear el borrador."
        />

        <NewContentForm />
      </AdminCard>
    </AdminPage>
  )
}
