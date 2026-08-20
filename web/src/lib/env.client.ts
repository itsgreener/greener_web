import { z } from "zod";

/**
 * Variables de entorno seguras para el navegador — solo NEXT_PUBLIC_*.
 *
 * A propósito NO reutiliza src/lib/env.ts: ese módulo valida
 * process.env entero de una sola vez, pasado como objeto a zod. Next.js
 * solo sustituye process.env.NEXT_PUBLIC_X por su valor real en el
 * bundle del navegador cuando encuentra esa referencia escrita en
 * literal en el código — al pasarle el objeto completo a una función
 * genérica, no puede rastrear qué claves se van a leer y no sustituye
 * nada. El resultado en el navegador es que TODAS las variables llegan
 * undefined, incluidas las públicas, y por descontado las privadas
 * (SUPABASE_SECRET_KEY, CLOUDINARY_API_KEY/SECRET) — que además no
 * deberían existir en código de navegador bajo ningún concepto.
 *
 * Por eso aquí cada variable se referencia una a una, en literal, para
 * que el compilador de Next.js pueda encontrarla y sustituirla.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

function loadClientEnv(): ClientEnv {
  const raw = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };

  const parsed = clientEnvSchema.safeParse(raw);

  if (!parsed.success) {
    console.error(
      "❌ Variables de entorno de navegador inválidas o incompletas:\n",
      parsed.error.flatten().fieldErrors
    );
    throw new Error(
      "Configuración de entorno del navegador inválida. Revisa .env.local contra .env.local.example."
    );
  }

  return parsed.data;
}

export const clientEnv = loadClientEnv();