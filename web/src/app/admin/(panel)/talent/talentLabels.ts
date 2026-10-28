import type { CvLocationKind } from '@/modules/talent/domain/talentAdminModels'

import type { ProcessPendingResult } from '@/modules/talent/application/processPendingCvs'
import type { FileRejection } from '@/modules/talent/application/talentResults'

/**
 * Textos del ABM de Talent. Los valores internos (`diseno`, `bilingue`…) son
 * los que escribe el formulario y lee n8n; aquí solo se les pone nombre.
 */

export const STATUS_LABELS: Readonly<Record<string, string>> = {
  pending: 'Pendiente de procesar',
  started: 'Procesando',
  processed: 'Alta lista',
  sent: 'Enlace enviado',
  completed: 'Formulario enviado',
  closed: 'Completado',
  error: 'Error',
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

export const PROFILE_LABELS: Readonly<Record<string, string>> = {
  cuentas: 'Cuentas',
  comercial: 'Comercial',
  contenidos: 'Contenidos',
  copy: 'Copy',
  diseno: 'Diseño',
  estrategia: 'Estrategia',
  produccion: 'Producción',
  programacion: 'Programación',
  video: 'Vídeo',
  otro: 'Otro',
}

/** Los perfiles de la base son un valor del formulario o texto libre («Otro»). */
export function profileLabel(profile: string): string {
  return PROFILE_LABELS[profile] ?? profile
}

export const LEVEL_LABELS: Readonly<Record<string, string>> = {
  basico: 'Básico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
  bilingue: 'Bilingüe',
  nativo: 'Nativo',
}

export const WORK_TYPE_LABELS: Readonly<Record<string, string>> = {
  internship: 'Prácticas',
  parttime: 'Media jornada',
  fulltime: 'Jornada completa',
  freelance: 'Freelance',
}

export const EXPERIENCE_LABELS: Readonly<Record<string, string>> = {
  '0': 'Sin experiencia',
  '0-1': 'Menos de 1 año',
  '1-3': '1 a 3 años',
  '3-5': '3 a 5 años',
  '5-10': '5 a 10 años',
  '10+': 'Más de 10 años',
}

export const CV_KIND_LABELS: Readonly<Record<CvLocationKind, string>> = {
  drive: 'Drive',
  bucket: 'Pendiente de mover a Drive',
  external: 'Otro enlace',
  none: 'Sin CV',
}

export const REJECTION_MESSAGES: Readonly<Record<FileRejection, string>> = {
  file_empty: 'el fichero está vacío.',
  file_too_large: 'supera los 3,5 MB.',
  file_type:
    'no es un PDF, Word o imagen (png, jpg, webp) válido; el contenido no coincide con la extensión.',
  too_many_files: 'hay demasiados ficheros.',
  file_scan: 'el antivirus no lo ha dado por limpio.',
}

/** Frase para el resultado de lanzar `Procesar nuevo CV`. */
export function processingMessage(result: ProcessPendingResult): string {
  switch (result.status) {
    case 'triggered':
      return `Procesado lanzado para ${result.pending} ${result.pending === 1 ? 'CV' : 'CVs'}. n8n tarda unos minutos por CV; los estados se actualizan solos al recargar.`
    case 'nothing_pending':
      return 'No hay ningún CV pendiente de procesar.'
    case 'busy':
      return result.reason === 'in_progress'
        ? `Hay filas en «Procesando»: n8n está trabajando (o alguna se ha atascado). ${result.pending} ${result.pending === 1 ? 'CV queda' : 'CVs quedan'} pendiente${result.pending === 1 ? '' : 's'} para el siguiente lanzamiento.`
        : `El procesado se lanzó hace menos de 2 minutos. ${result.pending} ${result.pending === 1 ? 'CV queda' : 'CVs quedan'} pendiente${result.pending === 1 ? '' : 's'}; vuelve a intentarlo en un rato.`
    case 'not_configured':
      return 'Falta la variable TALENT_N8N_PROCESS_CV_WEBHOOK_URL en el servidor: los CVs se han guardado como pendientes, pero no se puede lanzar el procesado.'
    case 'unavailable':
      return 'No se ha podido contactar con n8n. Los CVs quedan como pendientes; inténtalo de nuevo en un rato.'
  }
}
