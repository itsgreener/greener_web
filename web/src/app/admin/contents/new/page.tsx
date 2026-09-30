import Link from 'next/link'

import NewContentForm from './NewContentForm'

export default function NewContentPage() {
  return (
    <main className="admin-contents-page">
      <div className="admin-new-content-shell">
        <Link
          href="/admin/contents"
          className="admin-back-link"
        >
          ← Volver a contenidos
        </Link>

        <header className="admin-page-header admin-new-content-header">
          <div>
            <p className="admin-page-eyebrow">
              Content management
            </p>

            <h1>Nuevo contenido</h1>

            <p className="admin-page-description">
              Crea la ficha inicial del contenido.
              Después podrás completar traducciones,
              medios, pines y opciones específicas
              desde el editor.
            </p>
          </div>
        </header>

        <section className="admin-card admin-new-content-card">
          <div className="admin-card-heading">
            <div>
              <p className="admin-card-kicker">
                Nuevo borrador
              </p>

              <h2>Información básica</h2>

              <p>
                Selecciona el tipo de contenido y
                configura los datos necesarios para
                crear el borrador.
              </p>
            </div>
          </div>

          <NewContentForm />
        </section>
      </div>
    </main>
  )
}