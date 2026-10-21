'use client'

import { useActionState } from 'react'

import { AdminStatusBadge } from '@/components/admin/AdminBadge'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput, AdminSelect } from '@/components/admin/AdminControls'
import { AdminField, AdminReadonlyField } from '@/components/admin/AdminField'
import {
  AdminForm,
  AdminFormActions,
  AdminFormGrid,
} from '@/components/admin/AdminForm'
import { AdminMessage } from '@/components/admin/AdminMessage'
import { contentTypeLabel } from '@/components/admin/contentLabels'
import type { ContentDetail } from '@/modules/content/domain/contentRepository'
import {
  otherKindLabel,
  type OtherKind,
} from '@/modules/content/domain/otherSchema'

import { updateContentAction } from './actions'

const initialState = {
  fieldErrors: {},
  formError: undefined,
}

type Props = {
  content: ContentDetail
  otherKind?: OtherKind | null
}

export default function EditContentForm({ content, otherKind }: Props) {
  const [state, formAction, pending] = useActionState(
    updateContentAction,
    initialState,
  )

  return (
    <AdminForm action={formAction}>
      <input type="hidden" name="id" value={content.id} />

      <AdminFormGrid>
        <AdminReadonlyField label="Tipo">
          <strong>
            {contentTypeLabel(content.type)}
            {otherKind ? ` · ${otherKindLabel(otherKind)}` : ''}
          </strong>
        </AdminReadonlyField>

        <AdminReadonlyField label="Estado">
          <AdminStatusBadge status={content.status} />
        </AdminReadonlyField>
      </AdminFormGrid>

      <AdminFormGrid>
        <AdminField
          label="Slug"
          htmlFor="slug"
          help="Se utiliza para construir la URL pública."
          error={state.fieldErrors?.slug?.[0]}
        >
          <AdminInput
            id="slug"
            name="slug"
            type="text"
            defaultValue={content.slug}
            required
          />
        </AdminField>

        <AdminField
          label="Idioma principal"
          htmlFor="defaultLocale"
          help="Será el idioma utilizado en la URL canónica del contenido."
          error={state.fieldErrors?.defaultLocale?.[0]}
        >
          <AdminSelect
            id="defaultLocale"
            name="defaultLocale"
            defaultValue={content.defaultLocale}
          >
            <option value="es">Español</option>

            <option value="en">English</option>

            <option value="ca">Català</option>
          </AdminSelect>
        </AdminField>
      </AdminFormGrid>

      {state.formError && (
        <AdminMessage kind="error">{state.formError}</AdminMessage>
      )}

      <AdminFormActions>
        <AdminButton type="submit" variant="primary" disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar datos generales'}
        </AdminButton>
      </AdminFormActions>
    </AdminForm>
  )
}
