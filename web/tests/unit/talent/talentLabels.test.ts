import { describe, expect, it } from 'vitest'

import {
  PROFILE_LABELS,
  REJECTION_MESSAGES,
  STATUS_LABELS,
  processingMessage,
  profileLabel,
  statusLabel,
} from '@/app/admin/(panel)/talent/talentLabels'
import {
  CANDIDATE_STATUS_FILTER_VALUES,
  PROFILE_VALUES,
} from '@/modules/talent/domain/talentConstants'

describe('etiquetas del ABM de Talent', () => {
  it('cada estado del filtro y cada perfil del formulario tiene nombre', () => {
    for (const status of CANDIDATE_STATUS_FILTER_VALUES) {
      expect(STATUS_LABELS[status]).toBeTruthy()
    }

    for (const profile of PROFILE_VALUES) {
      expect(PROFILE_LABELS[profile]).toBeTruthy()
    }
  })

  it('un valor desconocido se enseña tal cual (perfil escrito en «Otro»)', () => {
    expect(statusLabel('raro')).toBe('raro')
    expect(profileLabel('Ilustración 3D')).toBe('Ilustración 3D')
  })

  it('cada motivo de rechazo de fichero tiene frase', () => {
    for (const message of Object.values(REJECTION_MESSAGES)) {
      expect(message.length).toBeGreaterThan(5)
    }
  })
})

describe('processingMessage', () => {
  it('singular y plural', () => {
    expect(processingMessage({ status: 'triggered', pending: 1 })).toContain(
      '1 CV.',
    )
    expect(processingMessage({ status: 'triggered', pending: 4 })).toContain(
      '4 CVs',
    )
  })

  it('explica por qué no se ha lanzado y cuántos quedan', () => {
    expect(
      processingMessage({ status: 'busy', reason: 'in_progress', pending: 2 }),
    ).toContain('Procesando')
    expect(
      processingMessage({ status: 'busy', reason: 'cooldown', pending: 1 }),
    ).toContain('menos de 2 minutos')
  })

  it('nombra la variable que falta', () => {
    expect(processingMessage({ status: 'not_configured' })).toContain(
      'TALENT_N8N_PROCESS_CV_WEBHOOK_URL',
    )
  })

  it('cubre todos los estados posibles', () => {
    for (const result of [
      { status: 'nothing_pending' },
      { status: 'unavailable' },
    ] as const) {
      expect(processingMessage(result)).toBeTruthy()
    }
  })
})
