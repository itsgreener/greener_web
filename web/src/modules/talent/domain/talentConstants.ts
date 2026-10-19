/**
 * Constantes del contrato de datos de talent (`docs/especificaciones/
 * contrato-datos-talent.md`). Los valores salen de lo que n8n reconoce: si
 * alguno cambia, se cambia primero el contrato y luego aquí.
 */

/**
 * `status` de `candidates` es texto libre (el enumerado de la base no lo usa
 * nadie). La web solo escribe estos dos; el resto de estados
 * (`started`, `sent`, `closed`, `error`) los pone n8n.
 */
export const CANDIDATE_STATUS = {
  /** Subida del personal (ABM, fase 3): n8n la recoge y la procesa. */
  pending: 'pending',
  /** Alta por email: la fila ya está lista para enviarle el enlace. */
  processed: 'processed',
} as const

/**
 * Estados en los que n8n está trabajando con la fila. En ellos no se reenvía el
 * enlace: `Procesar nuevo CV` ya lanza su propio envío al terminar.
 */
export const CANDIDATE_STATUS_IN_PROCESS: readonly string[] = [
  'pending',
  'started',
]

/** Cada valor es una carpeta de Drive en n8n; cualquier otro cae en `otro`. */
export const PROFILE_VALUES = [
  'cuentas',
  'comercial',
  'contenidos',
  'copy',
  'diseno',
  'estrategia',
  'produccion',
  'programacion',
  'video',
  'otro',
] as const

/**
 * Claves de `languages`: el nombre del idioma en ese idioma, tal cual. n8n lee
 * `English` por nombre, así que no se traducen ni se cambian por códigos.
 */
export const LANGUAGE_KEYS = [
  'English',
  'Castellano',
  'Català',
  'Italiano',
  'Français',
  'Euskera',
  '한국어',
  'Galego',
] as const

/** Claves de `socials`; el valor es la URL. */
export const SOCIAL_KEYS = [
  'LinkedIn',
  'Behance',
  'Instagram',
  'TikTok',
] as const

/** Bucket privado de Supabase-talent y carpeta donde n8n espera los ficheros. */
export const CV_BUCKET = 'cvs'
export const CV_UPLOAD_PREFIX = 'uploads/'

/**
 * Límites de subida (valores por defecto de la fase 1, plan §5.2). 10 MB en
 * decimal, igual que el tope del escaneo antivirus: un fichero mayor no se
 * podría escanear y no se acepta sin escanear.
 */
export const TALENT_FILE_LIMITS = {
  maxFilesPerCandidate: 10,
  maxFileBytes: 10 * 1000 * 1000,
} as const

/** Ficheros que se aceptan, por extensión. */
export const ALLOWED_FILE_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'png',
  'jpg',
  'jpeg',
  'webp',
] as const

export type AllowedFileExtension = (typeof ALLOWED_FILE_EXTENSIONS)[number]

/** Tope de proyectos, de longitudes de texto y del cuerpo JSON de las rutas. */
export const TALENT_TEXT_LIMITS = {
  name: 120,
  phone: 40,
  comment: 2000,
  experience: 500,
  workTypeLabel: 60,
  workTypes: 20,
  languageLevel: 40,
  url: 500,
  projects: 20,
  projectComment: 1000,
  maxJsonBodyBytes: 64 * 1024,
} as const
