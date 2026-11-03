/**
 * Longitud máxima de cada campo del formulario de contacto. Una sola fuente
 * para el esquema (`contactSchema.ts`, que valida en el servidor), para el
 * `maxLength` del HTML (`ContactForm.tsx`) y para recortar lo que la acción
 * devuelve al navegador. Va aparte del esquema para que el componente de
 * cliente no tenga que importar zod. 254 es el máximo de una dirección de
 * correo (RFC 5321).
 */
export const CONTACT_LIMITS = {
  name: 200,
  phone: 40,
  email: 254,
  message: 5000,
} as const

export type ContactField = keyof typeof CONTACT_LIMITS
