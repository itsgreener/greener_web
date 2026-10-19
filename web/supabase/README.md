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

Esto aplica, en orden de nombre, todos los archivos de `migrations/` (56 a 19 oct 2026; lo que ya esté aplicado no se repite). El nombre empieza por la fecha, así que el orden es el cronológico. Por bloques:

1. **`20260806*` — modelo base** (arquitectura §7): enumerados, supertipo `content` y traducciones, bloques, extensiones por tipo, medios y pines, taxonomía y `feed_config`, acceso de administración y auditoría, y las políticas de RLS (`is_admin()`).
2. **`20260820*` a `20260828*` — funciones del ABM**: alta, edición y borrado de contenido, traducciones, bloques, medios de imagen y de vídeo.
3. **`20260907*` a `20260910*` — auditoría y formatos**: `audit_log` en todas las mutaciones, estados editoriales (borrador, programado, publicado), bucket y versiones de los paquetes HTML, CRUD de pines y de sus medios, dominio permitido del ABM, y el rediseño de los formatos de detalle (`page` pasa a `other`, medios del caso, modelo de pin).
4. **`20260914*` a `20260922*`**: `alt` de los medios de caso, `contact_submission` (formulario de contacto), exclusión del contenido visto en las recomendaciones, ratio de portada, **publicación programada con `pg_cron`**, episodios y la regla de que una tool o un insight sin paquete no se publica.
5. **`20261005*` a `20261016*` — vídeo, `other` y mantenimiento**: límites de vídeo por tipo, medios huérfanos, pin con rótulo opcional, retirada de la portada de tool/insight y de los carruseles, orden automático de pines, borrado de versiones de paquete, seguimiento del calentamiento de vídeos, **códigos de error tipados** (`20261009120000`, requisito del código desde el 19 oct), el subtipo `other` y su ABM, la purga diaria de `feed_session` (`pg_cron`) y la retirada de las columnas muertas de `feed_config`.

La lista exacta es el contenido de `migrations/`; cada fichero empieza con un comentario que dice qué cambia y por qué. Los pendientes de aplicar en producción están en `docs/PROGRESO.md` §4.0.

Después de aplicar migraciones que cambian tablas o firmas de funciones, se regeneran los tipos: `npm run db:types`.

**Esto es el proyecto de Greener.** El proyecto de Supabase de **talent** (CVs de candidatos) es otro distinto, con otro esquema que no se toca, y **nada de él va en `migrations/`**: sus pasos (SQL de la fase 4, variables, n8n) están en `docs/operaciones/talent-puesta-en-marcha.md`.

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
