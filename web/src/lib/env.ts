import { z } from "zod";

/**
 * Validación de variables de entorno al arrancar la aplicación.
 * Si falta o es inválida alguna, la app falla de forma explícita
 * en vez de descubrirlo en producción (arquitectura §24.5).
 */
const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Cloudinary — originales, derivadas y CDN de imagen/vídeo (arquitectura §5, §9.2)
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  // Google OAuth (login del ABM vía Supabase Auth, restringido por dominio — arquitectura §15.2)
  ADMIN_ALLOWED_DOMAIN_FALLBACK: z.string().min(1).optional(),

  // Site
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "❌ Variables de entorno inválidas o incompletas:\n",
      parsed.error.flatten().fieldErrors
    );
    throw new Error(
      "Configuración de entorno inválida. Revisa .env.local contra .env.local.example."
    );
  }

  return parsed.data;
}

export const env = loadEnv();
