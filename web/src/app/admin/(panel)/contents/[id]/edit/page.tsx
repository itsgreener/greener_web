import { notFound } from 'next/navigation'

import {
  AdminCard,
  AdminCardHeader,
  AdminCardSection,
  AdminCardText,
} from '@/components/admin/AdminCard'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { AdminMessage } from '@/components/admin/AdminMessage'
import {
  AdminBackLink,
  AdminPage,
  AdminPageHeader,
} from '@/components/admin/AdminPage'
import { contentTypeLabel } from '@/components/admin/contentLabels'

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
import styles from './page.module.css'
import { contentWarming } from '@/modules/media/container'
import { otherKindLabel } from '@/modules/content/domain/otherSchema'

type Props = {
  params: Promise<{
    id: string
  }>
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

  const typeLabel = `${contentTypeLabel(content.type)}${
    otherKind ? ` · ${otherKindLabel(otherKind)}` : ''
  }`

  return (
    <AdminPage>
      <AdminBackLink href="/admin/contents">
        ← Volver a contenidos
      </AdminBackLink>

      <AdminPageHeader
        eyebrow={typeLabel}
        title="Editar contenido"
        meta={
          <>
            <AdminBadge>{typeLabel}</AdminBadge>

            <code className={styles.id}>{content.id}</code>
          </>
        }
        actions={
          <div className={styles.controls}>
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
        }
      />

      <div className={styles.stack}>
        <AdminCard>
          <AdminCardHeader
            kicker="Configuración"
            title="Datos generales"
            description="Configura la URL, el idioma principal y los datos básicos del contenido."
          />

          <AdminCardSection>
            <EditContentForm content={content} otherKind={otherKind} />
          </AdminCardSection>

          {content.type === 'other' && (
            <AdminCardSection>
              {otherDetail ? (
                <OtherDetailForm
                  other={otherDetail}
                  otherFrequencies={otherFrequencies}
                />
              ) : (
                <AdminMessage kind="error">
                  Este Other no tiene subtipo (newsletter o página satélite) y
                  no se puede publicar. Se crea siempre con él: revisa cómo se
                  dio de alta.
                </AdminMessage>
              )}
            </AdminCardSection>
          )}
        </AdminCard>

        <AdminCard>
          <AdminCardHeader
            kicker="Contenido"
            title="Traducciones"
            description="Edita el título, resumen y metadatos de cada idioma disponible."
          />

          <ContentTranslations
            contentId={content.id}
            contentType={content.type}
            defaultLocale={content.defaultLocale}
            translations={translations}
            otherKind={otherKind}
          />
        </AdminCard>

        {content.type === 'case' && (
          <>
            <AdminCard>
              <AdminCardHeader
                kicker="Case"
                title="Datos del Case"
                description="Información específica del proyecto y configuración de su ficha."
              />

              <CaseDetailForm contentId={content.id} caseDetail={caseDetail} />
            </AdminCard>

            <AdminCard>
              <AdminCardHeader
                kicker="Media"
                title="Carrusel de detalle"
                description="Gestiona las imágenes y vídeos del carrusel del Case."
              />

              <CaseCarouselManager
                contentId={content.id}
                items={caseCarousel}
              />
            </AdminCard>
          </>
        )}

        {content.type === 'episode' && (
          <AdminCard>
            <AdminCardHeader
              kicker="Channel"
              title="Datos del episodio"
              description="Configura programa, proveedor y datos específicos del episodio."
            />

            <EpisodeDetailForm contentId={content.id} episode={episode} />
          </AdminCard>
        )}

        {supportsPackage && (
          <AdminCard>
            <AdminCardHeader
              kicker="Runtime"
              title="Paquete HTML"
              description="Gestiona las versiones publicadas del paquete HTML de este contenido."
            />

            <PackageUpload contentId={content.id} versions={packageVersions} />
          </AdminCard>
        )}

        {!isNewsletter && (
          <AdminCard>
            <AdminCardHeader
              kicker="Feed"
              title="Pines"
              description="Gestiona los pines que representan este contenido dentro del feed."
            />

            <AdminCardSection>
              <PinList
                contentId={content.id}
                contentType={content.type}
                pins={pins}
              />
            </AdminCardSection>

            <AdminCardSection title="Crear pines">
              <AdminCardText>
                Cada pin es un único medio (imagen o vídeo). Selecciona uno o
                varios archivos, ajusta los datos de cada fila y quita los que
                no quieras antes de subir.
              </AdminCardText>

              {pins.length >= MAX_PINS_PER_CONTENT ? (
                <AdminMessage kind="warning">
                  Este contenido ya tiene {MAX_PINS_PER_CONTENT} pines, el
                  máximo permitido. Elimina uno para crear otro.
                </AdminMessage>
              ) : (
                <BulkPinUpload
                  contentId={content.id}
                  contentType={content.type}
                  availableSlots={remainingPinSlots(pins.length)}
                />
              )}
            </AdminCardSection>
          </AdminCard>
        )}

        <AdminCard tone="danger">
          <AdminCardHeader
            kicker="Danger zone"
            title="Zona peligrosa"
            description="Estas acciones pueden eliminar definitivamente el contenido."
          />

          <DeleteContentButton id={content.id} status={content.status} />
        </AdminCard>
      </div>
    </AdminPage>
  )
}
