import { describe, expect, it } from 'vitest'

import { codeOf, sourceFiles } from '@tests/helpers/sourceFiles'

/**
 * Las confirmaciones nativas (`window.confirm`) de un formulario del admin
 * salen de `AdminActionForm` (auditoría TSX, ADM-A1). Quedan dos que no son un
 * envío de formulario sino un clic con una acción asíncrona: no encajan en
 * `AdminActionForm` y se dejan nombradas aquí. Una tercera debe justificarse.
 */
const ALLOWED = [
  'src/components/admin/AdminActionForm/index.tsx',
  'src/app/admin/(panel)/contents/[id]/edit/PinList/DeletePinButtons.tsx',
  'src/app/admin/(panel)/contents/[id]/edit/CaseCarouselManager/useCaseCarouselManager.ts',
]

const CONFIRM = /\b(window\.)?confirm\(/

describe('window.confirm', () => {
  const files = sourceFiles('src')
  const withConfirm = files.filter((file) => CONFIRM.test(codeOf(file)))

  it('el detector reconoce confirm y window.confirm', () => {
    expect('if (!window.confirm(text)) return').toMatch(CONFIRM)
    expect('if (!confirm(text)) return').toMatch(CONFIRM)
    expect('const isConfirmed = true').not.toMatch(CONFIRM)
  })

  it('solo lo usan los sitios conocidos', () => {
    expect(withConfirm.filter((file) => !ALLOWED.includes(file))).toEqual([])
  })

  it('cada sitio conocido sigue usándolo (si no, sobra de la lista)', () => {
    expect(ALLOWED.filter((file) => !withConfirm.includes(file))).toEqual([])
  })
})
