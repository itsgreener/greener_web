import Link from 'next/link'

import { notFound } from 'next/navigation'

import { getContent } from '@/modules/content/application/getContent'

import { getCaseDetail } from '@/modules/content/application/getCaseDetail'

import { getContentTranslations } from '@/modules/content/application/getContentTranslations'

import { getContentBlocks } from '@/modules/content/application/getContentBlocks'

import EditContentForm from './EditContentForm'

import ContentTranslations from './ContentTranslations'

import CaseDetailForm from './CaseDetailForm'

import ContentBlocks from './ContentBlocks'

import DeleteContentButton from './DeleteContentButton'

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

  const supportsBlocks = content.type === 'case' || content.type === 'page'

  const [translations, caseDetail, blocks] = await Promise.all([
    getContentTranslations(content.id),

    content.type === 'case' ? getCaseDetail(content.id) : Promise.resolve(null),

    supportsBlocks ? getContentBlocks(content.id) : Promise.resolve([]),
  ])

  return (
    <main>
      <Link href="/admin/contents">← Volver a contenidos</Link>

      <h1>Editar contenido</h1>

      <p>ID: {content.id}</p>

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
        </>
      )}

      {supportsBlocks && (
        <>
          <hr />

          <h2>Contenido</h2>

          <ContentBlocks
            contentId={content.id}
            blocks={blocks}
            translations={translations}
          />
        </>
      )}

      <hr />

      <h2>Zona peligrosa</h2>

      <DeleteContentButton id={content.id} status={content.status} />
    </main>
  )
}
