# Supabase — esquema de Greener

Migraciones del modelo de datos de la arquitectura técnica (§7), validadas
localmente contra PostgreSQL 16 antes de entregarse: aplican sin errores y
las políticas de RLS se probaron con casos reales (admin de dominio
permitido, dominio no permitido, y dos intentos de suplantación por
substring de dominio).

## Aplicar contra el proyecto real

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Esto aplica, en orden, todos los archivos de `migrations/`:

1. `20260806090000_enums.sql` — tipos enumerados compartidos.
2. `20260806090100_content_core.sql` — supertipo `content` + traducciones.
3. `20260806090200_content_blocks.sql` — bloques de contenido genéricos.
4. `20260806090300_content_type_extensions.sql` — caso, episodio, paquetes HTML.
5. `20260806090400_media_pins.sql` — medios y pines.
6. `20260806090500_feed_taxonomy.sql` — etiquetas y configuración del feed.
7. `20260806090600_admin_access.sql` — allowlist de dominio, redirects, auditoría.
8. `20260806090700_rls_policies.sql` — `is_admin()` y políticas de RLS.

## Desarrollo local

`supabase/seed.sql` da de alta el primer dominio admin (`itsgreener.com`) al
ejecutar `supabase db reset`. Cambiar ese dominio antes de aplicarlo si hace
falta un valor distinto en desarrollo.

## Notas

- `is_admin()` compara el dominio exacto del email del JWT contra
  `admin_allowed_domain`, no una coincidencia de substring (probado contra
  `notitsgreener.com` e `itsgreener.com.evil.com`, ambos correctamente
  rechazados).
- No hay roles diferenciados: cualquier cuenta del dominio permitido tiene
  el mismo nivel de acceso administrador (arquitectura §15.2, confirmado con
  Greener).
- `feed_session` y `feed_round` no tienen política de lectura pública: solo
  se acceden con la service role key desde el route handler del feed, para
  que el cliente no pueda alterar cuotas ni semilla (arquitectura §8.5).
