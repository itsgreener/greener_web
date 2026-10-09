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

  if (invalid.length > 0) {
    console.error(
      `⚠ Entorno incompleto o inválido en: ${invalid.join(', ')}. ` +
        'Esas funciones fallarán hasta que se corrija; el resto de la web sigue en pie.',
    )
  }
}
