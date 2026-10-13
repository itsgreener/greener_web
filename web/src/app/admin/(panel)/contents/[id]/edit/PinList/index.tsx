'use client'

import { useState } from 'react'

import type { PinListItem } from '@/modules/pin/domain/pinRepository'
import { MAX_PINS_PER_CONTENT } from '@/modules/pin/domain/pinLimits'
import { hasDerivedPinLabel } from '@/modules/pin/domain/derivedPinLabel'

import PinMediaManager from '@/app/admin/(panel)/contents/[id]/edit/PinMediaManager'

import { DeleteAllPinsButton } from './DeletePinButtons'
import { EditPinForm } from './EditPinForm'
import { PinRow } from './PinRow'

type Props = {
  contentId: string
  contentType: string
  pins: PinListItem[]
}

export default function PinList({ contentId, contentType, pins }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const derivedLabel = hasDerivedPinLabel(contentType)

  return (
    <div>
      <p>
        {pins.length} / {MAX_PINS_PER_CONTENT} pines
        {pins.length >= MAX_PINS_PER_CONTENT
          ? ' — máximo alcanzado, no se pueden crear más.'
          : '.'}
      </p>

      <table>
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
      </table>

      {pins.length > 0 && (
        <DeleteAllPinsButton contentId={contentId} count={pins.length} />
      )}

      {pins
        .filter((pin) => pin.id === expandedId)
        .map((pin) => (
          <div key={pin.id}>
            <EditPinForm
              pin={pin}
              contentId={contentId}
              derivedLabel={derivedLabel}
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
