/**
 * Variables de entorno mínimas para que src/lib/env.ts valide con éxito
 * al ejecutar tests. No son secretos reales — solo hacen falta para que
 * cualquier módulo que dependa (aunque sea transitivamente) de `env` se
 * pueda importar en el sandbox de Vitest, que no lee .env.local.
 *
 * Los tests que necesiten un valor concreto (por ejemplo, el HMAC del
 * cursor usando SUPABASE_SECRET_KEY) siguen siendo deterministas: el
 * valor es fijo aquí, así que la firma es estable entre ejecuciones.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://test-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??=
  'sb_publishable_test_00000000000000000000'
process.env.SUPABASE_SECRET_KEY ??= 'sb_secret_test_000000000000000000000000'
process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??= 'test-cloud'
process.env.CLOUDINARY_API_KEY ??= 'test-cloudinary-key'
process.env.CLOUDINARY_API_SECRET ??= 'test-cloudinary-secret'
process.env.CLOUDMERSIVE_API_KEY ??= 'test-cloudmersive-key'
process.env.CONTACT_SMTP_HOST ??= 'smtp.test.local'
process.env.CONTACT_SMTP_PORT ??= '587'
process.env.CONTACT_SMTP_USER ??= 'test-smtp-user'
process.env.CONTACT_SMTP_PASSWORD ??= 'test-smtp-password'
process.env.CONTACT_EMAIL_TO ??= 'contact-test@example.com'
process.env.CONTACT_EMAIL_FROM ??= 'no-reply-test@example.com'
process.env.MAILCHIMP_API_KEY ??= 'test-mailchimp-key-us21'
process.env.MAILCHIMP_AUDIENCE_ID ??= 'test-audience-id'
process.env.MAILCHIMP_SERVER_PREFIX ??= 'us21'

/**
 * cleanup() global (decisión del 22 sep): antes cada fichero con jsdom
 * (`// @vitest-environment jsdom`) tenía que acordarse de llamarlo en su
 * propio afterEach — uno se quedó sin ninguno (`privacy.smoke.test.tsx`)
 * sin que nadie lo notara. Registrarlo aquí una sola vez cubre los 11
 * ficheros por igual, sin depender de que cada uno se acuerde. En los
 * ficheros sin DOM (la mayoría, entorno 'node' por defecto — ver
 * vitest.config.ts) cleanup() no encuentra nada que desmontar y no hace
 * nada, así que registrarlo aquí es inofensivo para todos ellos.
 *
 * Esto no es (ni pretende ser) el arreglo del "1 error" intermitente de
 * `window is not defined` que a veces aparece en la suite completa — ese
 * viene de una macrotask del propio scheduler de React que a veces
 * dispara después de que Vitest ya haya desmontado el entorno jsdom del
 * fichero, y cleanup() no cancela esa macrotask, solo desmonta el árbol
 * de React de forma síncrona. Se deja documentado aquí para quien lo
 * vuelva a ver y busque el porqué.
 */
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(cleanup)

/**
 * `next/font/local` solo funciona con la transformación (SWC) de Next, que
 * Vitest no aplica: fuera de `next build/dev` la función importada no es
 * ejecutable. Basta con un doble que devuelva lo que el layout lee
 * (`variable`, `className`); las fuentes reales se comprueban en el build
 * y en navegador, no aquí. Registrado en el setup para cubrir cualquier test
 * que importe el layout raíz (p. ej. seo/siteMetadata.test.ts).
 */
vi.mock('next/font/local', () => ({
  default: () => ({
    className: 'font-stub',
    variable: 'font-variable-stub',
    style: { fontFamily: 'font-stub' },
  }),
}))

/**
 * jsdom no implementa la reproducción real: `load()` y `pause()` solo emiten un aviso de
 * «Not implemented» que ensucia la salida. Los tests que necesitan comprobar
 * que se llama (liberar un vídeo) lo espían con vi.spyOn.
 */
if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.load = function load() {}
  HTMLMediaElement.prototype.pause = function pause() {}
}
