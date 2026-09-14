import Link from 'next/link'

import { notFound } from 'next/navigation'

import { getContent } from '@/modules/content/application/getContent'

import { getCaseDetail } from '@/modules/content/application/getCaseDetail'

import { getCaseCarousel } from '@/modules/content/application/getCaseCarousel'

import { getContentTranslations } from '@/modules/content/application/getContentTranslations'

import { listHtmlPackageVersions } from '@/modules/packages/application/listHtmlPackageVersions'

import { listPins } from '@/modules/pin/application/listPins'

import EditContentForm from './EditContentForm'

import ContentTranslations from './ContentTranslations'

import CaseDetailForm from './CaseDetailForm'

import CaseCarouselManager from './CaseCarouselManager'

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

  const [translations, caseDetail, caseCarousel, packageVersions, pins] =
    await Promise.all([
      getContentTranslations(content.id),

      content.type === 'case'
        ? getCaseDetail(content.id)
        : Promise.resolve(null),

      content.type === 'case'
        ? getCaseCarousel(content.id)
        : Promise.resolve([]),

      supportsPackage
        ? listHtmlPackageVersions(content.id)
        : Promise.resolve([]),

      listPins(content.id),
    ])

  return (
    <main>
      <Link href="/admin/contents">← Volver a contenidos</Link>

      <h1>Editar contenido</h1>

      <p>ID: {content.id}</p>

      <PublishControls
        contentId={content.id}
        status={content.status}
        publishAt={content.publishAt}
      />

      <hr />

      <h2>Datos generales</h2>

      <EditContentForm content={content} />

      <hr />

      <h2>Traducciones</h2>

      <ContentTranslations
        contentId={content.id}
        contentType={content.type}
        defaultLocale={content.defaultLocale}
        translations={translations}
      />

      {content.type === 'case' && (
        <>
          <hr />

          <h2>Datos del Case</h2>

          <CaseDetailForm contentId={content.id} caseDetail={caseDetail} />

          <h2>Carrusel de detalle</h2>

          <CaseCarouselManager contentId={content.id} items={caseCarousel} />
        </>
      )}

      {supportsCoverMedia && (
        <>
          <hr />

          <h2>Portada</h2>

          <CoverMediaUpload
            contentId={content.id}
            allowVideo={content.type === 'other'}
            coverMedia={content.coverMedia}
          />
        </>
      )}

      {supportsPackage && (
        <>
          <hr />

          <h2>Paquete HTML</h2>

          <PackageUpload contentId={content.id} versions={packageVersions} />
        </>
      )}

      <hr />

      <h2>Pines</h2>

      <PinList contentId={content.id} pins={pins} />

      <NewPinForm contentId={content.id} />

      <BulkPinUpload contentId={content.id} />

      <hr />

      <h2>Zona peligrosa</h2>

      <DeleteContentButton id={content.id} status={content.status} />
    </main>
  )
}
