import Link from 'next/link'

import { notFound } from 'next/navigation'

import {
  caseCarousels,
  caseDetails,
  contents,
  contentTranslations,
  episodes,
  others,
} from '@/modules/content/container'

import { htmlPackages } from '@/modules/packages/container'

import { pins as pinRepository } from '@/modules/pin/container'

import EditContentForm from './EditContentForm'

import ContentTranslations from './ContentTranslations'

import CaseDetailForm from './CaseDetailForm'

import CaseCarouselManager from './CaseCarouselManager'

import EpisodeDetailForm from './EpisodeDetailForm'

import OtherDetailForm from './OtherDetailForm'

import PackageUpload from './PackageUpload'

import PinList from './PinList'

import {
  MAX_PINS_PER_CONTENT,
  remainingPinSlots,
} from '@/modules/pin/domain/pinLimits'

import BulkPinUpload from './BulkPinUpload'

import DeleteContentButton from './DeleteContentButton'

import PublishControls from './PublishControls'
import WarmVideosControl from './WarmVideosControl'
import { contentWarming } from '@/modules/media/container'
import { otherKindLabel } from '@/modules/content/domain/otherSchema'

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

  const content = await contents.getById(id)

  if (!content) {
    notFound()
  }

  // Un `other` lleva su subtipo (plan de other, §7): una newsletter no tiene
  // pines, paquete ni página; una página satélite tiene paquete HTML y pines.
  const otherDetail =
    content.type === 'other' ? await others.getByContentId(content.id) : null

  const otherKind = otherDetail?.kind ?? null

  // Frecuencias de los demás Other publicados, para el aviso de ocupación.
  const otherFrequencies = otherDetail
    ? await others
        .listPublishedFrequencies(content.id)
        .catch((error: unknown) => {
          console.error(error)

          return []
        })
    : []

  const isNewsletter = otherKind === 'newsletter'

  // Tipo A (tool/insight) y página satélite: paquete HTML, sin portada.
  const supportsPackage =
    content.type === 'tool' ||
    content.type === 'insight' ||
    otherKind === 'page'

  const [
    translations,
    caseDetail,
    caseCarousel,
    episode,
    packageVersions,
    pins,
  ] = await Promise.all([
    contentTranslations.listByContentId(content.id),

    content.type === 'case'
      ? caseDetails.getByContentId(content.id)
      : Promise.resolve(null),

    content.type === 'case'
      ? caseCarousels.listByContentId(content.id)
      : Promise.resolve([]),

    content.type === 'episode'
      ? episodes.getByContentId(content.id)
      : Promise.resolve(null),

    supportsPackage
      ? htmlPackages.listVersions(content.id)
      : Promise.resolve([]),

    isNewsletter
      ? Promise.resolve([])
      : pinRepository.listByContentId(content.id),
  ])

  let pendingWarming: number | null = null

  try {
    pendingWarming = await contentWarming.countPendingWarming(content.id)
  } catch (error) {
    console.error(error)
  }

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
                {otherKind ? ` · ${otherKindLabel(otherKind)}` : ''}
              </p>

              <h1>Editar contenido</h1>

              <div className="admin-editor-meta">
                <span className="admin-type-badge">
                  {getTypeLabel(content.type)}
                  {otherKind ? ` · ${otherKindLabel(otherKind)}` : ''}
                </span>

                <code>{content.id}</code>
              </div>
            </div>

            <div>
              <PublishControls
                contentId={content.id}
                status={content.status}
                publishAt={content.publishAt}
                previewAvailable={
                  content.type === 'case' || content.type === 'episode'
                }
              />

              {!isNewsletter && (
                <WarmVideosControl
                  contentId={content.id}
                  pending={pendingWarming}
                />
              )}
            </div>
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

            <EditContentForm content={content} otherKind={otherKind} />

            {content.type === 'other' &&
              (otherDetail ? (
                <OtherDetailForm
                  other={otherDetail}
                  otherFrequencies={otherFrequencies}
                />
              ) : (
                <p className="admin-form-error">
                  Este Other no tiene subtipo (newsletter o página satélite) y
                  no se puede publicar. Se crea siempre con él: revisa cómo se
                  dio de alta.
                </p>
              ))}
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
              otherKind={otherKind}
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

          {supportsPackage && (
            <section className="admin-card">
              <div className="admin-card-heading">
                <div>
                  <p className="admin-card-kicker">Runtime</p>

                  <h2>Paquete HTML</h2>

                  <p>
                    Gestiona las versiones publicadas del paquete HTML de este
                    contenido.
                  </p>
                </div>
              </div>

              <PackageUpload
                contentId={content.id}
                versions={packageVersions}
              />
            </section>
          )}

          {!isNewsletter && (
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
                <h3>Crear pines</h3>

                <p>
                  Cada pin es un único medio (imagen o vídeo). Selecciona uno o
                  varios archivos, ajusta los datos de cada fila y quita los que
                  no quieras antes de subir.
                </p>

                {pins.length >= MAX_PINS_PER_CONTENT ? (
                  <p>
                    Este contenido ya tiene {MAX_PINS_PER_CONTENT} pines, el
                    máximo permitido. Elimina uno para crear otro.
                  </p>
                ) : (
                  <BulkPinUpload
                    contentId={content.id}
                    contentType={content.type}
                    availableSlots={remainingPinSlots(pins.length)}
                  />
                )}
              </div>
            </section>
          )}

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
