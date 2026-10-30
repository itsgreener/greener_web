/**
 * Se ejecuta una vez al arrancar el servidor de Next. Valida las variables
 * de entorno de cada integración (Cloudinary, SMTP, Mailchimp...) para que
 * un despliegue mal configurado deje un error claro en el log desde el
 * primer minuto, en vez de esperar al primer formulario enviado. No detiene
 * el servidor: lo que no depende de la variable que falta sigue funcionando.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { validateServerEnv } = await import('@/lib/serverEnv')
  const invalid = validateServerEnv()

  // Sin almacén compartido, los límites de uso son por instancia y en un
  // entorno serverless apenas frenan nada (SEC-PUB-A1/A2).
  const { isRateLimitStoreConfigured } = await import('@/lib/serverEnv')

  if (process.env.NODE_ENV === 'production' && !isRateLimitStoreConfigured()) {
    console.warn(
      '⚠ Sin almacén compartido de límites (UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN, ' +
        'o KV_REST_API_URL y KV_REST_API_TOKEN, o UPSTASH_KV_REST_API_URL y UPSTASH_KV_REST_API_TOKEN): ' +
        'los límites de uso son por instancia.',
    )
  }

  // Los webhooks de n8n de talent aceptan peticiones de quien conozca su URL
  // hasta que se activa la cabecera de autenticación (RES-D1; procedimiento en
  // `docs/operaciones/talent-puesta-en-marcha.md` §3.4).
  const { isTalentWebhookAuthMissing } = await import('@/lib/serverEnv')

  if (process.env.NODE_ENV === 'production' && isTalentWebhookAuthMissing()) {
    console.warn(
      '⚠ Los webhooks de n8n de talent no tienen cabecera de autenticación ' +
        '(TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME y TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE): ' +
        'solo los protege que su URL sea secreta.',
    )
  }

  if (invalid.length > 0) {
    console.error(
      `⚠ Entorno incompleto o inválido en: ${invalid.join(', ')}. ` +
        'Esas funciones fallarán hasta que se corrija; el resto de la web sigue en pie.',
    )
  }
}
