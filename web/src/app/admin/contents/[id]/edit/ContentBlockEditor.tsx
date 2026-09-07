'use client'

import { useActionState } from 'react'

import type { Locale } from '@/modules/content/domain/contentSchema'

import type { ContentBlock } from '@/modules/content/domain/contentBlockRepository'

import { updateBlockAction, type UpdateBlockActionState } from './blockActions'

import BlockTranslationForm from './BlockTranslationForm'

import DeleteContentBlockButton from './DeleteContentBlockButton'

import ImageBlockMediaUpload from './ImageBlockMediaUpload'

import VideoBlockMediaUpload from './VideoBlockMediaUpload'

type Props = {
  block: ContentBlock
  availableLocales: Locale[]
}

const initialState: UpdateBlockActionState = {}

function getBlockTypeLabel(type: ContentBlock['type']) {
  switch (type) {
    case 'rich_text':
      return 'Rich text'

    case 'image':
      return 'Image'

    case 'carousel':
      return 'Carousel'

    case 'video':
      return 'Video'

    case 'quote':
      return 'Quote'

    case 'links_credits':
      return 'Links / Credits'
  }
}

export default function ContentBlockEditor({ block, availableLocales }: Props) {
  const [state, formAction, pending] = useActionState(
    updateBlockAction,
    initialState,
  )

  return (
    <section>
      <h3>{getBlockTypeLabel(block.type)}</h3>

      <p>ID: {block.id}</p>

      <form action={formAction}>
        <input type="hidden" name="id" value={block.id} />

        <input type="hidden" name="contentId" value={block.contentId} />

        <div>
          <label htmlFor={`sort-${block.id}`}>Orden</label>

          <input
            id={`sort-${block.id}`}
            name="sortOrder"
            type="number"
            min="0"
            step="1"
            defaultValue={block.sortOrder}
            required
          />
        </div>

        <div>
          <label htmlFor={`config-${block.id}`}>Config (JSON)</label>

          <textarea
            id={`config-${block.id}`}
            name="config"
            rows={6}
            defaultValue={JSON.stringify(block.config, null, 2)}
          />
        </div>

        {state.fieldErrors?.config?.[0] && <p>{state.fieldErrors.config[0]}</p>}

        {state.formError && <p>{state.formError}</p>}

        {state.success && <p>Bloque actualizado.</p>}

        <button type="submit" disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar bloque'}
        </button>
      </form>

      {block.type === 'image' && (
        <ImageBlockMediaUpload
          blockId={block.id}
          contentId={block.contentId}
          media={block.media}
        />
      )}

      {block.type === 'video' && (
        <VideoBlockMediaUpload
          blockId={block.id}
          contentId={block.contentId}
          media={block.media}
        />
      )}

      {block.type === 'carousel' && (
        <p>El carrusel se implementará en el siguiente bloque.</p>
      )}

      {block.type === 'links_credits' ? (
        <p>
          La estructura de Links / Credits queda pendiente del diseño final.
        </p>
      ) : (
        <>
          <h4>Traducciones del bloque</h4>

          {availableLocales.map((locale) => {
            const translation =
              block.translations.find((item) => item.locale === locale) ?? null

            return (
              <BlockTranslationForm
                key={locale}
                contentId={block.contentId}
                blockId={block.id}
                blockType={block.type}
                locale={locale}
                translation={translation}
              />
            )
          })}
        </>
      )}

      <DeleteContentBlockButton id={block.id} contentId={block.contentId} />

      <hr />
    </section>
  )
}
