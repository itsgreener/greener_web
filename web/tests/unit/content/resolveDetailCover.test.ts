import { describe, it, expect, vi } from 'vitest'

import { resolveDetailCover } from '@/modules/content/application/resolveDetailCover'
import type { PublicPinCover } from '@/modules/content/domain/publicContent'

const FROM_PIN: PublicPinCover = {
  ratio: '1:1',
  alt: 'Pin pedido',
  media: { kind: 'image', cloudinaryPublicId: 'pins/pedido' },
}

const FIRST: PublicPinCover = {
  ratio: '4:5',
  alt: 'Primer pin',
  media: { kind: 'image', cloudinaryPublicId: 'pins/primero' },
}

function reader(over: {
  pinCover?: PublicPinCover | null
  firstPinCover?: PublicPinCover | null
}) {
  return {
    pinCover: vi.fn(async () => over.pinCover ?? null),
    firstPinCover: vi.fn(async () => over.firstPinCover ?? null),
  }
}

describe('resolveDetailCover (G1: ficha de tool sin ?pin=)', () => {
  it('con ?pin= válido usa el medio de ese pin y no lee el primero', async () => {
    const r = reader({ pinCover: FROM_PIN, firstPinCover: FIRST })

    expect(await resolveDetailCover(r, 'c1', 'pin-9')).toEqual(FROM_PIN)
    expect(r.pinCover).toHaveBeenCalledWith('c1', 'pin-9')
    expect(r.firstPinCover).not.toHaveBeenCalled()
  })

  it('sin ?pin= usa el primer pin del contenido (con su ratio y su alt)', async () => {
    const r = reader({ firstPinCover: FIRST })

    expect(await resolveDetailCover(r, 'c1')).toEqual(FIRST)
    expect(r.pinCover).not.toHaveBeenCalled()
    expect(r.firstPinCover).toHaveBeenCalledWith('c1')
  })

  it('con ?pin= que no es de este contenido (o sin medios) cae al primer pin', async () => {
    const r = reader({ pinCover: null, firstPinCover: FIRST })

    expect(await resolveDetailCover(r, 'c1', 'pin-de-otro')).toEqual(FIRST)
  })

  it('si el contenido no tiene ningún pin con medio devuelve null', async () => {
    const r = reader({})

    expect(await resolveDetailCover(r, 'c1', 'pin-9')).toBeNull()
    expect(await resolveDetailCover(r, 'c1')).toBeNull()
  })
})
