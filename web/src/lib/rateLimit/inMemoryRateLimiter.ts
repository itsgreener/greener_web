export interface RateLimiter {
  /** true = la petición está permitida (y ya cuenta); false = supera el límite. */
  check(key: string): boolean
}

interface Bucket {
  count: number
  windowStart: number
}

/**
 * Limitador de ventana fija, en memoria del propio proceso — no en
 * Supabase ni en ningún almacén compartido (decisión del 29 sep, ver
 * PROGRESO §2.16): pensado para amortiguar ruido y tráfico automatizado
 * en endpoints públicos de alto volumen (cada visita normal los toca),
 * no como una defensa real contra abuso deliberado. Quien controla sus
 * propias peticiones puede rotar de identificador tan fácilmente como
 * puede rotar de IP.
 *
 * Ventana FIJA, no deslizante: empieza en la primera petición de esa
 * `key` y se reinicia entera al expirar; no se prolonga con cada
 * petición nueva. Es una distinción real, no un detalle de implementación
 * — una ventana que se prolongara en cada toque nunca volvería a
 * reiniciarse para un visitante activo a un ritmo bajo pero constante
 * (una petición cada pocos segundos, sin hueco nunca de duración
 * `windowMs`), y acabaría bloqueándolo para siempre sin haber hecho
 * nada indebido.
 *
 * Costes aceptados a propósito, por ser en memoria de proceso: no se
 * comparte entre procesos (si algún día la app corre en más de un
 * proceso PM2, el límite real se multiplica por el número de procesos)
 * y no sobrevive a un reinicio (cada reinicio parte de cero).
 */
export function createFixedWindowRateLimiter(options: {
  max: number
  windowMs: number
  /** Inyectable para tests deterministas; por defecto Date.now. */
  now?: () => number
  /** Cada cuántas comprobaciones se purgan las entradas caducadas. */
  sweepEveryChecks?: number
}): RateLimiter {
  const now = options.now ?? Date.now
  const sweepEveryChecks = options.sweepEveryChecks ?? 1000
  const buckets = new Map<string, Bucket>()
  let checksSinceSweep = 0

  // Purga perezosa, sin temporizador de fondo (nada que limpiar en tests,
  // nada que sobreviva entre procesos ni que cortar al apagar el
  // servidor): cada `sweepEveryChecks` comprobaciones se recorren las
  // entradas y se borran las que ya caducaron, para que el mapa no crezca
  // sin límite con cada identificador nuevo que aparece.
  function sweep(currentTime: number): void {
    for (const [key, bucket] of buckets) {
      if (currentTime - bucket.windowStart >= options.windowMs) {
        buckets.delete(key)
      }
    }
  }

  return {
    check(key: string): boolean {
      const currentTime = now()

      checksSinceSweep += 1
      if (checksSinceSweep >= sweepEveryChecks) {
        checksSinceSweep = 0
        sweep(currentTime)
      }

      const bucket = buckets.get(key)

      if (!bucket || currentTime - bucket.windowStart >= options.windowMs) {
        buckets.set(key, { count: 1, windowStart: currentTime })
        return true
      }

      if (bucket.count >= options.max) {
        return false
      }

      bucket.count += 1
      return true
    },
  }
}
