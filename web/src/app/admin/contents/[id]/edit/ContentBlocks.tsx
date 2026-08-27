import type {
  ContentBlock,
} from '@/modules/content/domain/contentBlockRepository'

import type {
  ContentTranslation,
} from '@/modules/content/domain/contentTranslationSchema'

import CreateContentBlockForm
  from './CreateContentBlockForm'

import ContentBlockEditor
  from './ContentBlockEditor'

type Props = {
  contentId: string
  blocks: ContentBlock[]
  translations:
    ContentTranslation[]
}

export default function ContentBlocks({
  contentId,
  blocks,
  translations,
}: Props) {

  const availableLocales =
    translations.map(
      (translation) =>
        translation.locale
    )

  const nextSortOrder =
    blocks.length === 0
      ? 0
      : Math.max(
          ...blocks.map(
            (block) =>
              block.sortOrder
          )
        ) + 10

  return (
    <div>

      {blocks.length === 0 ? (
        <p>
          Todavía no hay bloques.
        </p>
      ) : (
        blocks.map(
          (block) => (
            <ContentBlockEditor
              key={block.id}
              block={block}
              availableLocales={
                availableLocales
              }
            />
          )
        )
      )}

      <CreateContentBlockForm
        contentId={contentId}
        nextSortOrder={
          nextSortOrder
        }
      />

    </div>
  )
}