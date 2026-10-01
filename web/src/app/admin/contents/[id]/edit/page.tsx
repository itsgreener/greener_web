import Link from 'next/link'

import { notFound } from 'next/navigation'

import { getContent } from '@/modules/content/application/getContent'

import { getCaseDetail } from '@/modules/content/application/getCaseDetail'

import { getEpisode } from '@/modules/content/application/getEpisode'

import { getCaseCarousel } from '@/modules/content/application/getCaseCarousel'

import { getContentTranslations } from '@/modules/content/application/getContentTranslations'

import { listHtmlPackageVersions } from '@/modules/packages/application/listHtmlPackageVersions'

import { listPins } from '@/modules/pin/application/listPins'

import EditContentForm from './EditContentForm'

import ContentTranslations from './ContentTranslations'

import CaseDetailForm from './CaseDetailForm'

import CaseCarouselManager from './CaseCarouselManager'

import EpisodeDetailForm from './EpisodeDetailForm'

import CoverMediaUpload from './CoverMediaUpload'

import PackageUpload from './PackageUpload'

import PinList from './PinList'

import NewPinForm from './NewPinForm'

import BulkPinUpload from './BulkPinUpload'

import DeleteContentButton from './DeleteContentButton'

import PublishControls from './PublishControls'

type Props = {
  params: Promise<{
    id: string
  }>
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'case':
      return 'Case'
    case 'insight':
      return 'Insight'
    case 'tool':
      return 'Tool'
    case 'episode':
      return 'Episode'
    case 'other':
      return 'Other'
    default:
      return type
  }
}

export default async function EditContentPage({ params }: Props) {
  const { id } = await params

  const content = await getContent(id)

  if (!content) {
    notFound()
  }

  // especificacion-final-formato-detalle.md §1: tres formatos de
  // detalle — tipo A (tool/insight, con paquete HTML + portada imagen),
  // tipo B (case/episode), y contenido libre (other, portada imagen o
  // vídeo). El editor de bloques genérico desaparece por completo (§6).
  const supportsPackage = content.type === 'tool' || content.type === 'insight'

  const supportsCoverMedia =
    content.type === 'tool' ||
    content.type === 'insight' ||
    content.type === 'other'

  const [
    translations,
    caseDetail,
    caseCarousel,
    episode,
    packageVersions,
    pins,
  ] = await Promise.all([
    getContentTranslations(content.id),

    content.type === 'case' ? getCaseDetail(content.id) : Promise.resolve(null),

    content.type === 'case' ? getCaseCarousel(content.id) : Promise.resolve([]),

    content.type === 'episode' ? getEpisode(content.id) : Promise.resolve(null),

    supportsPackage ? listHtmlPackageVersions(content.id) : Promise.resolve([]),

    listPins(content.id),
  ])

  return (
    <main className="admin-editor-page">
      <div className="admin-editor-shell">
        <header className="admin-editor-header">
          <Link href="/admin/contents" className="admin-back-link">
            ← Volver a contenidos
          </Link>

          <div className="admin-editor-title-row">
            <div>
              <p className="admin-editor-eyebrow">
                {getTypeLabel(content.type)}
              </p>

              <h1>Editar contenido</h1>

              <div className="admin-editor-meta">
                <span className="admin-type-badge">
                  {getTypeLabel(content.type)}
                </span>

                <code>{content.id}</code>
              </div>
            </div>

            <PublishControls
              contentId={content.id}
              status={content.status}
              publishAt={content.publishAt}
            />
          </div>
        </header>

        <div className="admin-editor-stack">
          <section className="admin-card">
            <div className="admin-card-heading">
              <div>
                <p className="admin-card-kicker">Configuración</p>

                <h2>Datos generales</h2>

                <p>
                  Configura la URL, el idioma principal y los datos básicos del
                  contenido.
                </p>
              </div>
            </div>

            <EditContentForm content={content} />
          </section>

          <section className="admin-card">
            <div className="admin-card-heading">
              <div>
                <p className="admin-card-kicker">Contenido</p>

                <h2>Traducciones</h2>

                <p>
                  Edita el título, resumen y metadatos de cada idioma
                  disponible.
                </p>
              </div>
            </div>

            <ContentTranslations
              contentId={content.id}
              contentType={content.type}
              defaultLocale={content.defaultLocale}
              translations={translations}
            />
          </section>

          {content.type === 'case' && (
            <>
              <section className="admin-card">
                <div className="admin-card-heading">
                  <div>
                    <p className="admin-card-kicker">Case</p>

                    <h2>Datos del Case</h2>

                    <p>
                      Información específica del proyecto y configuración de su
                      ficha.
                    </p>
                  </div>
                </div>

                <CaseDetailForm
                  contentId={content.id}
                  caseDetail={caseDetail}
                />
              </section>

              <section className="admin-card">
                <div className="admin-card-heading">
                  <div>
                    <p className="admin-card-kicker">Media</p>

                    <h2>Carrusel de detalle</h2>

                    <p>Gestiona las imágenes y vídeos del carrusel del Case.</p>
                  </div>
                </div>

                <CaseCarouselManager
                  contentId={content.id}
                  items={caseCarousel}
                />
              </section>
            </>
          )}

          {content.type === 'episode' && (
            <section className="admin-card">
              <div className="admin-card-heading">
                <div>
                  <p className="admin-card-kicker">Channel</p>

                  <h2>Datos del episodio</h2>

                  <p>
                    Configura programa, proveedor y datos específicos del
                    episodio.
                  </p>
                </div>
              </div>

              <EpisodeDetailForm contentId={content.id} episode={episode} />
            </section>
          )}

          {supportsCoverMedia && (
            <section className="admin-card">
              <div className="admin-card-heading">
                <div>
                  <p className="admin-card-kicker">Media</p>

                  <h2>Portada</h2>

                  <p>
                    Imagen principal utilizada en la página de detalle del
                    contenido.
                  </p>
                </div>
              </div>

              <CoverMediaUpload
                contentId={content.id}
                allowVideo={content.type === 'other'}
                coverMedia={content.coverMedia}
              />
            </section>
          )}

          {supportsPackage && (
            <section className="admin-card">
              <div className="admin-card-heading">
                <div>
                  <p className="admin-card-kicker">Runtime</p>

                  <h2>Paquete HTML</h2>

                  <p>Gestiona las versiones publicadas de la Tool o Insight.</p>
                </div>
              </div>

              <PackageUpload
                contentId={content.id}
                versions={packageVersions}
              />
            </section>
          )}

          <section className="admin-card">
            <div className="admin-card-heading">
              <div>
                <p className="admin-card-kicker">Feed</p>

                <h2>Pines</h2>

                <p>
                  Gestiona los pines que representan este contenido dentro del
                  feed.
                </p>
              </div>
            </div>

            <div className="admin-editor-subsection">
              <PinList
                contentId={content.id}
                contentType={content.type}
                pins={pins}
              />
            </div>

            <div className="admin-editor-subsection">
              <h3>Crear un pin</h3>

              <NewPinForm contentId={content.id} contentType={content.type} />
            </div>

            <div className="admin-editor-subsection">
              <h3>Carga masiva</h3>

              <BulkPinUpload contentId={content.id} contentType={content.type} />
            </div>
          </section>

          <section className="admin-card admin-danger-card">
            <div className="admin-card-heading">
              <div>
                <p className="admin-card-kicker">Danger zone</p>

                <h2>Zona peligrosa</h2>

                <p>
                  Estas acciones pueden eliminar definitivamente el contenido.
                </p>
              </div>
            </div>

            <DeleteContentButton id={content.id} status={content.status} />
          </section>
        </div>
      </div>
    </main>
  )
}
