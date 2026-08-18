# Greener — contexto del proyecto

Este archivo es la puerta de entrada para cualquiera (persona o IA) que retome el desarrollo. Resume el proyecto, fija las convenciones de trabajo y remite a los documentos de detalle. Colócalo en la raíz del repo.

## 1. Qué es Greener

Sitio web de descubrimiento visual estilo Pinterest para XAGA/Greener: home con feed masonry aleatorio-pero-determinista, páginas de caso, insights y tools servidos como HTML autónomo en el mismo origen (sin iframe), Channel (episodios de vídeo) y un ABM multiusuario sin acceso a código. V1 no incluye Shop ni cobros.

## 2. Jerarquía documental — léela en este orden

1. **`P26096.pdf` — Arquitectura técnica V1.3**: fuente de verdad de *diseño*. Las decisiones (ADR de la sección 4) son vinculantes salvo que se registre lo contrario aquí o en PROGRESO.md.
2. **`PROGRESO.md`**: fuente de verdad de *ejecución* — qué está hecho, probado y pendiente. Debe actualizarse en cada sesión de trabajo relevante; si no se actualiza, se queda obsoleto rápido (ver informe de inconsistencias, ya ha pasado).
3. **Este archivo (`CLAUDE.md`)**: normas de trabajo y contexto de arranque rápido. No duplica el estado de avance — para eso está PROGRESO.md.

Si algo en el PDF y algo en PROGRESO.md se contradicen, gana PROGRESO.md (es más reciente), pero regístralo como cambio explícito, no en silencio.

## 3. Stack real (verificado contra `package.json`, no supuesto)

| Pieza | Versión / detalle |
|---|---|
| Next.js | 16.3.x, App Router, Turbopack |
| React | 19.2.8 |
| TypeScript | 5.x, `strict: true` |
| Datos/Auth/Storage HTML | Supabase (Postgres + Auth + Storage + RLS) |
| Imagen/vídeo | Cloudinary (originales, derivadas, CDN) |
| Estilos | CSS Modules + nesting nativo, sin librería de componentes |
| Tests | Vitest + fast-check (property-based) |
| Hosting | Dinahosting, PM2, Nginx (reverse proxy) — **no** Vercel, **no** Edge Runtime |

**`src/proxy.ts` no es un error de nombre.** Next.js 16 renombró `middleware.ts` → `proxy.ts` (misma función, runtime Node.js por defecto en vez de Edge). Está usado correctamente aquí — no lo renombres de vuelta a `middleware.ts`.

## 4. Decisiones que no hay que reabrir sin motivo

- **Sin iframe para tools/insights** (ADR-07): se sirven en ruta propia del mismo origen (`/tools/[slug]`, `/insights/[slug]`), porque el HTML lo sube un único rol de confianza, no público anónimo. No reintroducir aislamiento por subdominio/iframe salvo cambio real de modelo de amenaza.
- **Supabase, no Postgres+S3 separados** (ADR-02, ADR-12, ADR-13): Postgres+Auth+Storage en Supabase; Cloudinary para todo lo visual; Supabase Storage solo para paquetes ZIP de tools/insights.
- **Sin Redis** (ADR-09) y **sin microservicios** (ADR-01) salvo que aparezcan métricas reales que lo justifiquen.
- **Admin = rol único, multiusuario por dominio de correo** (Google OAuth vía Supabase Auth + `admin_allowed_domain`), no cuentas nombradas una a una. La sugerencia `hd` en el login es solo UX; la restricción real es `is_admin()` server-side en cada request (middleware + RLS).
- **Shop queda fuera de V1 por completo** (ADR-10): nada de tablas, endpoints ni menú "por si acaso" (principio §3, "evolución sin código muerto").
- **Capas `domain/application/infrastructure` por módulo de negocio**, no MVC clásico (ADR-15, §24.4). El dominio no depende de Next.js ni de Supabase — así se testea sin levantar nada.

## 5. Convenciones de código obligatorias (§24 de la arquitectura)

- **Alias de imports**: `@/*` → `./src/*` (ya configurado en `tsconfig.json`). No usar rutas relativas largas (`../../../..`); si hace falta subir más de un nivel, usa el alias.
- **CSS**: módulos (`*.module.css`) junto al componente, nesting nativo (`&`), variables globales solo en `app/globals.css`. Nada de CSS inline ni en JSX.
- **Componente con mucho estado/efectos** → separar en `index.tsx` (JSX) + `use<Nombre>.ts` (hook con estado/efectos/datos). Carpeta por componente:
  ```
  components/PinCard/
    index.tsx
    PinCard.module.css
    usePinCard.ts
  ```
- **Validación compartida**: mismos schemas de `zod` en Server Action y en el formulario cliente (`react-hook-form`). Variables de entorno validadas con `zod` al arrancar vía `src/lib/env.ts` — **todo el código que necesite una env var debe importar `env` desde ahí, nunca leer `process.env` directamente con `!`** (ahora mismo hay código que no cumple esto — ver informe de inconsistencias).
- **Server Actions / route handlers**: capa fina, validan con zod y delegan en `application/`. Sin lógica de negocio ahí.
- El menú lateral vive una sola vez en `app/(public)/layout.tsx`, no se repite por página.

## 6. Estructura de carpetas (Anexo B, ya scaffoldeada)

```
src/
  app/(public)/...        shell público, home, work/[slug], tools/[slug], insights/[slug], channel/[slug]
  app/admin/...           ABM (Google OAuth + Supabase Auth)
  app/api/...             endpoints públicos
  modules/{content,feed,media,packages,admin,analytics}/
    domain/  application/  infrastructure/
  components/{shell,masonry,pin,case-blocks}/
  lib/{auth,env.ts,security,supabase,validation}/
supabase/{migrations,seed.sql}
tests/{unit,property}/
fixtures/tools/            paquetes ZIP de ejemplo (stand-in de Supabase Storage)
data/demo/                 dataset sintético para prototipos
```

Varios `modules/*/` siguen con solo `.gitkeep` (content, admin, analytics, media/application) — es scaffold, no implementación pendiente de "arreglar".

## 7. Cómo verificar el proyecto

```bash
npm install
npm run lint            # ESLint
npx next build           # genera tipos de ruta (.next/types) — hazlo ANTES de tsc si quieres un check limpio
npx tsc --noEmit          # TypeScript (sin el build previo, dará falsos positivos de LayoutProps)
npm test                  # Vitest (unit + property-based)
node scripts/generate-demo-data.mjs   # regenera el dataset determinista
```

Para probar una tool en vivo: `npm run build && npm run start` → `http://localhost:3000/tools/pixel-palette`.

## 8. Estado y trampas conocidas

El estado detallado y verificado está en `INFORME_INCONSISTENCIAS.md` y `CHECKLIST.md` (18 ago 2026). Resumen de lo más importante para no perder tiempo:

- El build de producción **no compila ahora mismo** (export roto en `feed/domain/index.ts`) — es lo primero a arreglar.
- La suite de tests no llega a 59 en verde; hay 4 tests reales en rojo y un fichero que ni arranca por dependencias de testing que faltan en `package.json`.
- `src/lib/env.ts` valida nombres de variables **legacy** de Supabase (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) que no coinciden con las que usa realmente el proyecto (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, confirmado contra el `.env` real) ni con las que leen `client.ts`/`server.ts`/`proxy.ts`. Hay que actualizar `env.ts` a los nombres nuevos — ya usados correctamente en el resto del código.
- Ya existe `.env.local.example` en la raíz del repo (creado a partir del `.env.local` real, sin secretos) — mantenlo sincronizado si añades variables nuevas.
- El módulo de login/ABM (Google OAuth, callback, `proxy.ts`) ya existe y parece correcto y alineado con las prácticas actuales de Supabase, pero no tiene tests ni está documentado en PROGRESO.md — confirmar con quien lo esté llevando antes de darlo por cerrado.
- El `.gitignore` es el básico que genera `create-next-app`; no cubre las carpetas propias de la CLI de Supabase (`supabase/.temp/`), que sí está presente en el repo con datos identificativos del proyecto real — ver informe de inconsistencias.

## 9. Reglas de trabajo

- Actualiza `PROGRESO.md` cuando cierres un bloque de trabajo real (no en cada commit menor). Si algo que documenta ya no es cierto, corrígelo ahí mismo en vez de dejarlo desactualizado.
- Sigue el orden de Anexo E (`CHECKLIST.md` lo desglosa): el motor de feed y el contrato de tools/insights se validan antes que nada porque un error ahí obliga a rehacer trabajo aguas abajo; el resto es mayormente repetición del mismo patrón sobre nuevas entidades.
- No implementes nada de Shop/pagos ni insights de pago — son extensión futura explícitamente fuera de alcance (§2.3, ADR-10).
- Las decisiones abiertas con Greener están en el Anexo A del PDF y en `CHECKLIST.md` §"Decisiones pendientes" — no las asumas, regístralas cuando se cierren.
