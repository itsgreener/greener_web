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

  if (invalid.length > 0) {
    console.error(
      `⚠ Entorno incompleto o inválido en: ${invalid.join(', ')}. ` +
        'Esas funciones fallarán hasta que se corrija; el resto de la web sigue en pie.',
    )
  }
}
