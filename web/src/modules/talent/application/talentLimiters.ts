import type { AttemptLimiter } from '@/modules/talent/domain/talentPorts'

/**
 * Un límite por cada cosa que se puede abusar. Se miden por visitante (cookie
 * anónima) y por IP (hash): rotar de uno no esquiva el otro, y para el envío
 * del enlace hay además un tope por email, que evita llenar de correos la
 * bandeja de un tercero.
 */
export type TalentLimiters = {
  signupByIp: AttemptLimiter
  signupByVisitor: AttemptLimiter
  signupByEmail: AttemptLimiter
  formReadByIp: AttemptLimiter
  formSaveByIp: AttemptLimiter
  formSaveByToken: AttemptLimiter
  uploadByIp: AttemptLimiter
  uploadByToken: AttemptLimiter
}

const HOUR = 60 * 60 * 1000

/** Valores de partida. Holgados para personas reales, cortos para scripts. */
export const TALENT_LIMITS = {
  signupByIp: { max: 20, windowMs: HOUR },
  signupByVisitor: { max: 10, windowMs: HOUR },
  signupByEmail: { max: 3, windowMs: HOUR },
  formReadByIp: { max: 120, windowMs: 10 * 60 * 1000 },
  formSaveByIp: { max: 40, windowMs: HOUR },
  formSaveByToken: { max: 20, windowMs: HOUR },
  uploadByIp: { max: 60, windowMs: HOUR },
  uploadByToken: { max: 30, windowMs: HOUR },
} as const
