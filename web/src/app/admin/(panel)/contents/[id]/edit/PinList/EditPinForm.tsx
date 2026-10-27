'use client'

import { useActionState } from 'react'

import type { PinListItem } from '@/modules/pin/domain/pinRepository'

import { AdminInput, AdminSelect } from '@/components/admin/AdminControls'
import { AdminField } from '@/components/admin/AdminField'
import {
  AdminForm,
  AdminFormFooter,
  AdminFormGrid,
} from '@/components/admin/AdminForm'
import { AdminMessage } from '@/components/admin/AdminMessage'
import { LocaleOptions, RatioOptions } from '@/components/admin/AdminOptions'

import {
  updatePinAction,
  type PinFormState,
} from '@/app/admin/(panel)/contents/[id]/edit/pinActions'

const initialState: PinFormState = {}

export function EditPinForm({
  pin,
  contentId,
  derivedLabel,
}: {
  pin: PinListItem
  contentId: string
  derivedLabel: boolean
}) {
  const [state, formAction, pending] = useActionState(
    updatePinAction.bind(null, pin.id, contentId),
    initialState,
  )

  return (
    <AdminForm action={formAction}>
      <AdminFormGrid>
        <AdminField label="Ratio" htmlFor={`ratio-${pin.id}`}>
          <AdminSelect
            id={`ratio-${pin.id}`}
            name="ratio"
            defaultValue={pin.ratio}
            required
          >
            <RatioOptions />
          </AdminSelect>
        </AdminField>

        <AdminField label="Idioma" htmlFor={`language-${pin.id}`}>
          <AdminSelect
            id={`language-${pin.id}`}
            name="language"
            defaultValue={pin.language}
            required
          >
            <LocaleOptions />
          </AdminSelect>
        </AdminField>

        {/* El autoplay solo existe para vídeos: en una imagen (o un pin aún
            sin medio) no se ofrece, y al guardar queda sin modo (null). */}
        {pin.media?.kind === 'video' && (
          <AdminField label="Autoplay" htmlFor={`autoplay-${pin.id}`}>
            <AdminSelect
              id={`autoplay-${pin.id}`}
              name="autoplayMode"
              defaultValue={pin.autoplayMode ?? ''}
            >
              <option value="">Sin autoplay</option>
              <option value="viewport">Al entrar en viewport</option>
              <option value="hover">Al hacer hover</option>
            </AdminSelect>
          </AdminField>
        )}

        <AdminField label="Alt" htmlFor={`alt-${pin.id}`}>
          <AdminInput
            id={`alt-${pin.id}`}
            name="alt"
            type="text"
            defaultValue={pin.alt}
            required
          />
        </AdminField>
      </AdminFormGrid>

      {derivedLabel ? (
        <>
          <input name="label" type="hidden" value="" />
          <AdminMessage>
            Texto del feed automático: título + cliente (Case), tipo de episodio
            (Episode) o «Insights by Greener» (Insight).
          </AdminMessage>
        </>
      ) : (
        <AdminField label="Frase gancho" htmlFor={`label-${pin.id}`}>
          <AdminInput
            id={`label-${pin.id}`}
            name="label"
            type="text"
            defaultValue={pin.label ?? ''}
          />
        </AdminField>
      )}

      <AdminFormFooter
        state={state}
        pending={pending}
        label="Guardar cambios"
        successMessage="Guardado."
      />
    </AdminForm>
  )
}
