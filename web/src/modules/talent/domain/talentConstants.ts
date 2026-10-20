/**
 * Constantes del contrato de datos de talent (`docs/especificaciones/
 * contrato-datos-talent.md`). Los valores salen de lo que n8n reconoce: si
 * alguno cambia, se cambia primero el contrato y luego aquí.
 */

/**
 * `status` de `candidates` es texto libre (el enumerado de la base no lo usa
 * nadie). La web escribe estos tres; el resto de estados
 * (`started`, `sent`, `closed`, `error`) los pone n8n.
 */
export const CANDIDATE_STATUS = {
  /** Subida del personal (ABM, fase 3): n8n la recoge y la procesa. */
  pending: 'pending',
  /** Alta por email: la fila ya está lista para enviarle el enlace. */
  processed: 'processed',
  /**
   * El candidato ha enviado el formulario. Lo escribía ya la web antigua
   * (`useFormSubmit.js`); `Guardar archivos` lo pasa a `closed` al terminar.
   * Si una fila se queda en `completed`, el procesado de n8n no ha acabado.
   */
  completed: 'completed',
} as const

/**
 * Estados en los que n8n está trabajando con la fila. En ellos no se reenvía el
 * enlace: `Procesar nuevo CV` ya lanza su propio envío al terminar.
 */
export const CANDIDATE_STATUS_IN_PROCESS: readonly string[] = [
  'pending',
  'started',
]

/**
 * Todos los valores de `status` que se ven en la base (el campo es texto
 * libre): los tres que escribe la web y los que pone n8n. Es la lista del
 * filtro del ABM.
 */
export const CANDIDATE_STATUS_FILTER_VALUES = [
  'pending',
  'started',
  'processed',
  'sent',
  'completed',
  'closed',
  'error',
] as const

/**
 * Estados desde los que «Reprocesar» devuelve la fila a `pending`: `started`
 * (atascada, nadie la recoge) y `error`. Solo si el CV sigue en el bucket.
 */
export const CANDIDATE_STATUS_REPROCESSABLE: readonly string[] = [
  'started',
  'error',
]

/**
 * Perfiles que ofrece el formulario. Cada valor es una carpeta de Drive en n8n
 * y cualquier otro cae en `otro`. Quien elige «Otro» escribe un texto libre,
 * que se guarda en su lugar (la web antigua quitaba `otro` y añadía el texto).
 */
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
  'Castellano',
  'Català',
  'Euskera',
  'Galego',
  'Valencià',
  'English',
  'Français',
  'Deutsch',
  'Italiano',
  'Português',
  'Nederlands',
  'Polski',
  'Română',
  'Čeština',
  'Svenska',
  '中文',
  '日本語',
  '한국어',
  'العربية',
  'हिन्दी',
  'Русский',
  'Türkçe',
  'Українська',
] as const

/** Niveles de idioma del formulario (valores internos, no las etiquetas). */
export const LANGUAGE_LEVELS = [
  'basico',
  'intermedio',
  'avanzado',
  'bilingue',
  'nativo',
] as const

/** Opciones de `experience` (tramos de años; `10+` es «más de 10»). */
export const EXPERIENCE_VALUES = [
  '0',
  '0-1',
  '1-3',
  '3-5',
  '5-10',
  '10+',
] as const

/** Opciones de `work_types`. Solo `freelance` abre el paso de tarifas. */
export const WORK_TYPE_VALUES = [
  'internship',
  'parttime',
  'fulltime',
  'freelance',
] as const

export const WORK_TYPE_FREELANCE = 'freelance'

/** Claves de `socials`; el valor es la URL. */
export const SOCIAL_KEYS = [
  'LinkedIn',
  'GitHub',
  'Behance',
  'Instagram',
  'X',
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
  phone: 40,
  comment: 2000,
  /** Perfil escrito a mano en «Otro». */
  profileLabel: 60,
  profiles: 10,
  url: 500,
  /** El formulario ofrece tres; el servidor admite algo más por holgura. */
  projects: 10,
  projectComment: 1000,
  maxJsonBodyBytes: 64 * 1024,
} as const

/**
 * Subida del personal (ABM). El navegador manda un fichero por llamada, así que
 * el tope es de cada lote: el ABM no deja elegir más de 10 de una vez.
 */
export const TALENT_STAFF_UPLOAD = {
  maxFilesPerBatch: 10,
} as const

/** Vida de la URL firmada de un CV que aún está en el bucket. */
export const CV_SIGNED_URL_SECONDS = 60

/**
 * Tiempo mínimo entre dos lanzamientos de `Procesar nuevo CV` desde el mismo
 * proceso. El workflow procesa **todas** las filas `pending`: una segunda
 * llamada mientras la primera sigue trabajando las procesaría dos veces.
 */
export const PROCESS_CV_COOLDOWN_MS = 2 * 60 * 1000

/** Filas por página del listado del ABM. */
export const TALENT_ADMIN_PAGE_SIZE = 25
