# Greener — Estado del proyecto y próximos pasos

Este documento resume, paso a paso, todo lo construido hasta ahora en el repositorio `greener-web`, cómo verificarlo, y qué queda pendiente. Complementa (no sustituye) el documento de **Arquitectura técnica V1.3**, que sigue siendo la fuente de verdad de las decisiones de diseño; aquí se documenta la ejecución concreta de esa arquitectura.

Todas las referencias `§X` apuntan a secciones del documento de arquitectura.

---

## 1. Resumen ejecutivo

Se ha completado casi por entero la **Fase 0** del plan de ejecución (Anexo E del documento): las dos piezas de mayor riesgo técnico del proyecto —el motor de feed y el contrato de tools/insights sin iframe— están implementadas, probadas automáticamente y funcionando de extremo a extremo. El esquema de datos de Supabase está migrado y su seguridad (RLS) validada con casos reales, no solo revisada visualmente.

**Cifras actuales:**

- **33 tests automáticos**, todos en verde (`npm test`).
- **8 migraciones SQL** de Supabase, aplicadas y probadas contra una base de datos real.
- **50 casos + 9 episodios** de datos de demostración, generados, cargados y validados contra Postgres real, y consumidos con éxito por el motor de feed real.
- **0 errores** de TypeScript, **0 avisos** de ESLint, build de producción limpio.

---

## 2. Paso a paso de lo realizado

### 2.1 Scaffold del proyecto

- Next.js **16.3.0** (App Router) + React **19.2.8** + TypeScript, siguiendo la estructura de carpetas del Anexo B: `src/app`, `src/modules/{content,feed,media,packages,admin,analytics}` organizados en capas `domain/application/infrastructure` (§24.4), `src/components`, `src/lib`.
- Alias de imports `@/*` → `./src/*` configurado explícitamente en `tsconfig.json` (§24.6), ya que Next.js no lo hace por defecto.
- **ESLint + Prettier** configurados y en verde en todo el proyecto.
- `src/lib/env.ts`: validación de variables de entorno con `zod` al arrancar la aplicación (§24.5) — falla explícitamente si falta una variable, en vez de descubrirlo en producción.
- `.env.local.example`: plantilla de todas las variables necesarias (Supabase, Cloudinary), sin secretos reales.
- `next.config.ts`: `remotePatterns` configurado para que `next/image` pueda optimizar imágenes servidas desde Cloudinary.
- Fuente del sitio: se evitó `next/font/google` (requiere red en build time, arriesgado en el hosting de Dinahosting) a favor de fuentes de sistema.

### 2.2 Shell público (menú lateral)

- `src/components/shell/Shell/`: componente + hook (`useShell`) siguiendo la convención de carpeta de §24.2 (`index.tsx` / `*.module.css` / `use*.ts`).
- `src/app/(public)/layout.tsx`: monta el `Shell` una única vez para toda la sección pública, para que el menú lateral no se remonte al navegar entre secciones (§24.3).
- CSS Modules con nesting nativo (`&`) y variables globales en `src/app/globals.css` (§24.1).

### 2.3 Esquema de Supabase (Fase 0 — completado y validado)

**8 migraciones** en `supabase/migrations/`, siguiendo exactamente el modelo de datos de §7:

| Archivo                           | Contenido                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `..._enums.sql`                   | Tipos enumerados compartidos                                                        |
| `..._content_core.sql`            | Supertipo `content` + `content_translation`                                         |
| `..._content_blocks.sql`          | Bloques de contenido genéricos (`content_block`), reutilizables por `case` y `page` |
| `..._content_type_extensions.sql` | `case_detail`, `episode`, `html_package(_version)`                                  |
| `..._media_pins.sql`              | `media_asset`, `pin`, `pin_media`                                                   |
| `..._feed_taxonomy.sql`           | `tag`, `content_tag`, `feed_config`, `feed_session`, `feed_round`                   |
| `..._admin_access.sql`            | `admin_allowed_domain`, `admin_profile`, `redirect_301`, `audit_log`                |
| `..._rls_policies.sql`            | Función `is_admin()` + políticas de Row Level Security en **todas** las tablas      |

**Validación real, no solo revisión del SQL:**

- Se instaló PostgreSQL 16 en el entorno de trabajo y se aplicaron las 8 migraciones contra una base real (con un esquema `auth` simulado, ya que el proyecto Supabase real aún no está conectado).
- Se probó la seguridad con un rol **sin privilegios de superusuario** (imprescindible: Postgres ignora RLS para superusuarios):
  - Visitante anónimo → solo ve contenido `published` ✓
  - Cuenta de un dominio en `admin_allowed_domain` → ve todo y puede escribir ✓
  - Cuenta de un dominio no autorizado → bloqueada tanto en lectura de borradores como en escritura (violación real de RLS, no solo de lógica de aplicación) ✓
  - Dos intentos de suplantación por _substring_ de dominio (`notitsgreener.com`, `itsgreener.com.evil.com`) → ambos correctamente rechazados ✓
- `supabase/seed.sql`: da de alta el primer dominio admin en desarrollo local.
- `supabase/README.md`: instrucciones para aplicar las migraciones contra el proyecto real (`supabase link` + `supabase db push`).

**Decisión de negocio confirmada durante la implementación:** el "administrador único" del brief se reinterpretó como **rol único, multiusuario por dominio de correo** (no varias cuentas nombradas una a una) — corrige una ambigüedad real del brief original, confirmada contigo.

### 2.4 Motor de feed (Fase 0 — completado y validado)

Implementado en `src/modules/feed/domain/` como módulo de dominio puro (sin dependencia de Next.js ni Supabase, §24.4):

| Archivo             | Responsabilidad                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `prng.ts`           | PRNG determinista (`mulberry32`) + hash de seeds para derivar streams independientes por caso/tipo/ronda            |
| `quotas.ts`         | Reparto de cuotas por método de restos mayores, sobre el hueco que dejan los casos                                  |
| `rotateQueue.ts`    | Rotación de colas circulares: pines de caso (por fuerza) y pools de insights/tools/channel/otros                    |
| `constrainedMix.ts` | El algoritmo central: _weighted deficit round-robin_ + jitter determinista, con los 5 niveles de relajación de §8.4 |
| `generateRound.ts`  | Orquestador — misma firma que el pseudocódigo del Anexo C                                                           |

**21 tests** (`tests/unit/feed/` + `tests/property/feed/`, estos últimos con `fast-check`, **2000 ejecuciones por propiedad**), verificando exactamente los criterios de aceptación de §20.1:

- Determinismo: misma seed + config + snapshot + ronda → siempre la misma secuencia.
- Terminación garantizada, incluso con catálogos mínimos (5 insights, 30 tools).
- Conservación exacta de pines: la mezcla nunca pierde ni inventa pines.
- Separación mínima por contenido, respetando cuándo se relajó y por qué.
- Casos límite: sin casos, un único pin, `force` mayor que los pines disponibles.

**Dos bugs de diseño reales, encontrados por los tests de propiedad (no por revisión manual) y corregidos:**

1. El reparto de cuotas usaba el total completo de la tanda en vez del hueco que dejan los casos — habría desproporcionado el feed real.
2. Cuando un tipo de contenido no tiene _ningún_ pin en el universo (no solo pocos), se le seguía pidiendo una cuota imposible de cumplir — ahora se redistribuye automáticamente.

### 2.5 Tools/Insights sin iframe (Fase 0 — completado y validado)

Implementado en `src/modules/packages/` (domain/application/infrastructure, §24.4):

| Archivo                                | Responsabilidad                                                                                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain/manifest.ts`                   | Contrato del paquete (§12.2), puro                                                                                                                                |
| `application/composeToolDocument.ts`   | Compone **un único documento HTML real** (menú lateral + contenido del paquete), sin anidar `<html>`, usando `cheerio` para extraer `<head>`/`<body>` del paquete |
| `infrastructure/localPackageSource.ts` | Lee el paquete desde disco (`fixtures/`) — **stand-in explícito de Supabase Storage**, la única pieza que cambiará al conectar datos reales                       |

**Rutas servidas** (`src/app/(public)/tools/[slug]/`):

- `route.ts`: sirve el documento compuesto, con CSP específico de la ruta.
- `assets/[...file]/route.ts`: sirve los assets del paquete (CSS/JS/Worker) con el `Content-Type` correcto.

**Tool de ejemplo real**, no un mock trivial (`fixtures/tools/pixel-palette/`): dibuja un degradado en `<canvas>`, calcula la paleta dominante en un **Web Worker** propio, y permite **descargar** el resultado como JSON — las tres capacidades de mayor riesgo señaladas en §22 para la decisión de servir sin iframe.

**Problema real de arquitectura descubierto y resuelto durante la implementación:** las rutas relativas del paquete (`./assets/main.js`, y el `new Worker("./worker.js")` invocado _dentro_ del propio script) se resolvían mal sin barra final en la URL. Se corrigió inyectando `<base href>` en el documento compuesto — corrige ambos casos a la vez.

**10 tests** (`tests/unit/packages/`):

- 6 sobre la composición del documento (un único `<html>`, `<base>` correcto, variables CSS inyectadas, menú completo, contenido del paquete conservado).
- 4 ejecutando el **archivo real** `worker.js` (no una copia) dentro de un sandbox de Node (`vm`), simulando el `self` de un Web Worker — evita que un "puerto" en TypeScript se desincronice del original.

**Validado también por HTTP real** (`next build` + `next start` + `curl`, no solo tests): documento compuesto correctamente, assets servidos con MIME correcto y **byte-idénticos** al fixture, 404 correcto para una tool inexistente.

### 2.6 Política de medios (Cloudinary)

A partir del documento _"Política de subida y almacenamiento de contenido multimedia"_ que compartiste, se implementaron como reglas de dominio (`src/modules/media/`):

- `domain/mediaLimits.ts`: límites de subida puros (5 MB imagen, 100 MB / 3 min vídeo), testeables sin depender de Cloudinary.
- `domain/mediaDelivery.ts`: la regla "el feed nunca sirve el original" — anchos por contexto (feed vs. detalle) alineados con las columnas del masonry, y `poster_or_preview` vs. `full` para vídeo.
- `infrastructure/cloudinaryUrl.ts`: construcción de URLs de transformación (`q_auto`, `f_auto`) a partir de las reglas de dominio anteriores.

### 2.7 Corrección de versiones

Se corrigió el `package.json` para reflejar las versiones reales del proyecto (`next@16.3.0`, `react@19.2.8`), revirtiendo un pin incorrecto a Next 15 hecho antes de tener esa confirmación. `eslint-config-next` se realineó a la misma versión mayor.

### 2.8 Dataset de datos falsos (Fase 0/1 — completado y validado)

`scripts/generate-demo-data.mjs`: generador determinista (misma seed → mismo dataset en cada ejecución), independiente de la app. Genera:

- **50 casos**, cada uno con `content` + `content_translation` (es) + `case_detail` (variante A/B/C, fuerza 1-5 con distribución ponderada hacia 1-2, cliente/sector/servicios ficticios), 3-6 pines por caso (219 pines en total), y una etiqueta de la sección Home (Agro/Food/Biotech/Brand/Digital/Events).
- **9 episodios de Channel** (3 por programa), con `episode` + un pin propio cada uno, usando **vídeos de YouTube de terceros** (confirmado contigo: solo para probar el embed, no contenido real de Greener).
- **6 imágenes** de la cuenta demo pública de Cloudinary, **verificadas una a una por HTTP real** antes de usarlas (`sample`, `sheep`, `kitten_fighting`, `pm/woman_car`, `pm/kitchen`, `ai/hiker`), reutilizadas entre todos los pines (confirmado: no hacía falta más variedad).
- **Sin insights ni tools** (se suben manualmente, confirmado).

Salidas generadas:
- `supabase/seed_demo_data.sql` — listo para `supabase db push` / `psql`, sobre las 8 migraciones ya existentes.
- `data/demo/feed-snapshot.json` — mismo shape que `FeedSnapshot` (§ motor de feed), con un `pinDirectory` auxiliar (título, ratio, alt, imagen) para no tener que volver a consultar Supabase al construir el prototipo de masonry.

**Validado de extremo a extremo, no solo generado:**
- El SQL se aplicó contra una base Postgres real (mismo proceso usado para las migraciones), sobre las 8 migraciones ya probadas.
- Comprobada la integridad referencial con consultas reales: 0 pines huérfanos, 0 `pin_media` apuntando a un `media_asset` inexistente, 0 casos sin etiqueta, 0 episodios sin pin, 0 valores de `force` fuera de rango.
- **Se cerró el ciclo con el motor de feed real**: un nuevo test (`tests/unit/dataset/demoDataset.test.ts`) alimenta este dataset a `generateRound()` (la función real, no un mock) y confirma que lo consume sin errores — incluida la redistribución correcta del hueco de insights/tools (0 en este dataset) que corrigió uno de los dos bugs encontrados anteriormente.

---

## 3. Cómo verificar todo esto tú mismo

```bash
npm install
npm run lint          # ESLint
npx tsc --noEmit       # TypeScript
npm test               # 33 tests (unit + property-based)
npm run build           # build de producción completo
node scripts/generate-demo-data.mjs   # regenera el dataset (determinista)
```

Para probar la tool de ejemplo en vivo:

```bash
npm run build && npm run start
# visita http://localhost:3000/tools/pixel-palette
```

Para aplicar el esquema contra un proyecto Supabase real:

```bash
npx supabase login
npx supabase link --project-ref <tu-project-ref>
npx supabase db push
```

(instrucciones completas en `supabase/README.md`)

---

## 4. Qué falta — próximos pasos

### 4.1 Siguiente paso inmediato

- **Prototipo de masonry** con los datos reales del dataset generado (50 casos + 9 episodios, `data/demo/feed-snapshot.json`) — es el paso lógico natural ahora que el dataset existe y ya se validó contra `generateRound()`, y ataca el riesgo técnico principal señalado en §22 (fps y restauración de scroll).

### 4.2 Resto de la Fase 0 (Anexo E)

- Cerrar el repertorio de bloques y las restricciones de las variantes A/B/C de caso — depende de que diseño lo defina, no es algo que se pueda avanzar en código todavía (Anexo A).

### 4.3 Fase 1 (hasta el 15 de agosto)

- Especificación de formatos para Greener (depende del punto anterior de diseño).
- Inventario de URLs actuales para las redirecciones 301 (depende de datos reales vuestros).

### 4.4 Fase 2 en adelante

- Cliente de Supabase (browser/server) y endpoint `/api/feed/sessions` conectando el motor de feed ya probado con datos reales.
- Autenticación del ABM con Google OAuth (el esquema y las políticas de RLS ya están listos para esto — falta la integración en la aplicación).
- Módulos del ABM (contenidos, pines, medios, paquetes HTML).

---

## 5. Decisiones y confirmaciones registradas en esta fase de implementación

Además de las recogidas en el Anexo A del documento de arquitectura:

- Admin: rol único, multiusuario por dominio de correo (no cuentas nombradas individualmente) — confirmado.
- `client`/`sector`/`services` de caso: texto libre, no traducido — confirmado.
- Cloudinary sustituye a Supabase Storage para imagen/vídeo; Supabase Storage se reserva para paquetes HTML — confirmado e implementado.
- Tools/insights se sirven en el mismo origen, sin iframe — confirmado, implementado y validado con una tool real.
- Next.js 16.3.0 / React 19.2.8 son las versiones reales del proyecto (no Next 15 como se asumió inicialmente) — corregido.
- Dataset de demostración: 50 casos, sin insights ni tools (se suben manualmente), episodios de Channel con vídeos de terceros permitidos explícitamente para probar el embed — confirmado y generado.
