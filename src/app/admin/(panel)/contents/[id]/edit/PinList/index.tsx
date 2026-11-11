'use client'

import { useState } from 'react'

import type { PinListItem } from '@/modules/pin/domain/pinRepository'
import type { Locale } from '@/modules/shared/domain/locale'
import { MAX_PINS_PER_CONTENT } from '@/modules/pin/domain/pinLimits'
import { hasDerivedPinLabel } from '@/modules/pin/domain/derivedPinLabel'

import { AdminTable } from '@/components/admin/AdminTable'

import PinMediaManager from '@/app/admin/(panel)/contents/[id]/edit/PinMediaManager'

import { DeleteAllPinsButton } from './DeletePinButtons'
import { EditPinForm } from './EditPinForm'
import styles from './PinList.module.css'
import { PinRow } from './PinRow'
import { PinsCarouselToggle } from './PinsCarouselToggle'

type Props = {
  contentId: string
  contentType: string
  pins: PinListItem[]
  // Idioma que toman los pines cuando el contenido es de un solo idioma; null
  // si cada pin elige el suyo (caso, tool).
  fixedLanguage: Locale | null
  // Solo en episodios (§2.150): estado del carrusel de pines.
  carousel?: { enabled: boolean; ratiosMixed: boolean } | null
}

export default function PinList({
  contentId,
  contentType,
  pins,
  fixedLanguage,
  carousel = null,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const derivedLabel = hasDerivedPinLabel(contentType)

  return (
    <div>
      <p className={styles.summary}>
        {pins.length} / {MAX_PINS_PER_CONTENT} pines
        {pins.length >= MAX_PINS_PER_CONTENT
          ? ' — máximo alcanzado, no se pueden crear más.'
          : '.'}
      </p>

      {carousel && (
        <PinsCarouselToggle
          contentId={contentId}
          enabled={carousel.enabled}
          ratiosMixed={carousel.ratiosMixed}
        />
      )}

      <AdminTable>
        <thead>
          <tr>
            <th>Rótulo</th>
            <th>Ratio</th>
            <th>Medio</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {pins.map((pin) => (
            <PinRow
              key={pin.id}
              pin={pin}
              contentId={contentId}
              derivedLabel={derivedLabel}
              expanded={expandedId === pin.id}
              onToggle={() =>
                setExpandedId(expandedId === pin.id ? null : pin.id)
              }
            />
          ))}

          {pins.length === 0 && (
            <tr>
              <td colSpan={4}>Todavía no hay pines para este contenido.</td>
            </tr>
          )}
        </tbody>
      </AdminTable>

      {pins.length > 0 && (
        <div className={styles.deleteAll}>
          <DeleteAllPinsButton contentId={contentId} count={pins.length} />
        </div>
      )}

      {pins
        .filter((pin) => pin.id === expandedId)
        .map((pin) => (
          <div key={pin.id} className={styles.editor}>
            <EditPinForm
              pin={pin}
              contentId={contentId}
              derivedLabel={derivedLabel}
              fixedLanguage={fixedLanguage}
              ratioLocked={carousel?.enabled ?? false}
            />

            <PinMediaManager
              pinId={pin.id}
              contentType={contentType}
              pinRatio={pin.ratio}
              media={pin.media}
            />
          </div>
        ))}
    </div>
  )
}
