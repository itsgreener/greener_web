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
