# Despliegue — Dinahosting (PM2 + cron, con el proxy gestionado por Dinahosting)

Guía del despliegue con `output: 'standalone'` (arquitectura §19.1, ADR-12). El modelo es el que ya usáis en `tools.itsgreener.com` e `insight.itsgreener.com`: la aplicación corre con **PM2**, un **cron** la vigila, y delante hay un **proxy inverso Nginx que gestiona Dinahosting**: vosotros lo encendéis, esperáis a que os asigne un puerto y la aplicación escucha en ese puerto. Lo único que no podéis hacer es modificar ese proxy.

Distingue tres niveles de certeza:

1. **Verificado**: ejecutado de verdad en un sandbox (Node 22, PM2 7.0.4, Next 16.3.5) y, cuando procede, contrastado con la documentación oficial.
2. **Por comprobar**: depende del proxy de Dinahosting, que no se puede reproducir fuera de su servidor. Tiene su prueba concreta en el §6.
3. **Descartado**: la función «Otras aplicaciones» del panel (Passenger) que describe la ayuda de Dinahosting **no sirve para Next**, así que esta guía no la usa.

---

## 1. Qué se sube (verificado)

`npx next build` crea `.next/standalone`: un servidor mínimo (`server.js`) con solo los `node_modules` necesarios. **No incluye `public/` ni `.next/static/`** — la documentación oficial de Next lo dice expresamente, y hay que copiarlos tras cada build:

```bash
npx next build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```

Cuidado con dónde va cada uno: `public` **al lado** de `server.js`; `static` **dentro de la carpeta `.next`** que ya trae el standalone (no dentro de `app`).

```
standalone/          <- esto es lo que se sube (una «release»)
├── server.js
├── package.json
├── node_modules/
├── data/
├── public/          <- copiado a mano
├── .env.local       <- ver §2
└── .next/
    ├── server/      <- lo genera el build
    └── static/      <- copiado a mano
```

Sin esas dos copias, el sitio arranca pero los CSS, los JS y los iconos dan 404.

## 2. Variables de entorno (verificado)

Hay dos tipos y se comportan distinto:

1. **Solo tres variables se incrustan en el JavaScript del navegador al compilar**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, porque son las únicas que el código referencia de forma literal (`process.env.NEXT_PUBLIC_…`). Tienen que tener los valores reales en la máquina donde se ejecuta `next build`, y cambiarlas después en el servidor no afecta al navegador.
2. **Todo lo demás se lee en tiempo de ejecución** del `.env.local` colocado **junto a `server.js`**: las claves secretas, el SMTP, la sal del hash de IP, `APP_SIGNING_SECRET` (obligatoria en producción)… y **también `NEXT_PUBLIC_SITE_URL` y `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, pese a su prefijo**: el servidor las lee de su entorno en cada petición, no las fija el build. Probado (28 sep): con `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` solo en el build, la aplicación no recibe ningún dominio de analítica y la CSP no abre `plausible.io`; con la variable en el `.env.local` del servidor, sí. Consecuencia práctica: **esas dos variables tienen que estar en el `.env.local` del servidor**, y cambiarlas no exige recompilar. Probado también: con el entorno vacío y el fichero al lado, el servidor arranca; sin el fichero, falla con el error de validación de `src/lib/env.ts`. **Funciona además si `.env.local` es un enlace simbólico** a un fichero compartido fuera de la release (probado), que es lo cómodo con varias releases.

El build también necesita un `.env.local` válido, porque `next build` importa `env.ts`. `NEXT_PUBLIC_SITE_URL` debe ser `https://itsgreener.com`; si lleva barra final, `env.ts` la recorta, y si falta en producción, avisa al arrancar.

**Talent (gestión de CVs).** Nueve variables propias (`TALENT_*`), todas solo de servidor, con su bloque para el `.env.local.example` y los pasos fuera del repositorio (n8n y Supabase-talent): `docs/operaciones/talent-puesta-en-marcha.md`.

## 3. Arrancar con PM2 (verificado)

`server.js` lee `PORT` y `HOSTNAME` del entorno (`parseInt(process.env.PORT) || 3000`, y `0.0.0.0` por defecto). **`PORT` es el que os asigne Dinahosting.** Un fichero de configuración de PM2, `ecosystem.config.cjs`, lo deja todo en un sitio:

```js
module.exports = {
  apps: [
    {
      name: 'greener',
      // La ruta del ENLACE SIMBÓLICO, no la de una release concreta (ver §4).
      cwd: '/home/USUARIO/greener/current',
      script: 'server.js',
      // El Node elegido con nvm, por ruta absoluta (ver §5).
      interpreter: '/home/USUARIO/.nvm/versions/node/v24.x.x/bin/node',
      env: {
        NODE_ENV: 'production',
        PORT: 3000, // CAMBIAR por el puerto que asigne Dinahosting
        HOSTNAME: '0.0.0.0', // como en vuestros otros despliegues
      },
      autorestart: true,
      max_memory_restart: '700M',
    },
  ],
}
```

```bash
pm2 start ecosystem.config.cjs
```

Probado con una release real del proyecto: responde en el `PORT` indicado (páginas, `robots.txt`, iconos de `public/`), lee el `.env.local` por el enlace simbólico, y **si el proceso muere (`kill -9`), PM2 lo levanta solo**. Usad para `HOSTNAME` lo mismo que en vuestros despliegues anteriores: no sé si el proxy de Dinahosting corre en la misma máquina (bastaría `127.0.0.1`) o no (haría falta `0.0.0.0`).

### Una sola instancia (no usar `instances` ni `exec_mode: 'cluster'`)

La aplicación guarda estado **en la memoria del proceso**, así que `ecosystem.config.cjs` debe dejar **una única instancia** (el valor por defecto; no añadáis `instances` ni `exec_mode: 'cluster'`):

- **Límites de peticiones** (`modules/feed/infrastructure/feedRateLimit.ts` y `lib/rateLimit/inMemoryRateLimiter.ts`, que usan el feed, la newsletter y la analítica de paquetes): cada proceso cuenta por su cuenta, de modo que con N instancias el límite real sería N veces mayor.
- **Memoria de «última sesión del visitante»** (`rememberSession`): con varias instancias, una recarga que cae en otro proceso no encuentra la sesión anterior y devuelve una secuencia nueva.
- **Cachés de Next** (`unstable_cache`: universo publicado del feed y versión publicada de cada tool/insight): la invalidación por etiqueta desde el ABM solo llega al proceso que atendió la acción; el resto seguiría sirviendo lo anterior hasta que caduque el TTL (60 s).

Si algún día hiciera falta más de una instancia, hay que mover primero esos tres estados a un almacén compartido (Redis, o tablas en Supabase para los limitadores).

## 4. Cambiar de versión sin cortar el sitio (verificado)

Con varias releases en `releases/<nombre>` y un enlace simbólico `current` que apunta a la activa:

```bash
ln -sfn /home/USUARIO/greener/releases/NUEVA /home/USUARIO/greener/current.new
mv -Tf  /home/USUARIO/greener/current.new    /home/USUARIO/greener/current   # cambio atómico
pm2 restart greener
```

Probado: **tras cambiar el enlace, el proceso sigue sirviendo la release vieja hasta que se reinicia**; tras `pm2 restart`, arranca desde la nueva. Por eso el `cwd` del `ecosystem.config.cjs` es la ruta del enlace y no la de una release. Cada release necesita su `.env.local` (o un enlace a uno compartido, §2). Para volver atrás basta apuntar el enlace a la release anterior y reiniciar.

## 5. Node con nvm y el cron (verificado)

Next 16 exige como mínimo Node 20.9. El `engines` de este proyecto pide 24.22.1 (la versión que corrige las vulnerabilidades graves de octubre), pero solo lo comprueba `npm` al instalar; con la carpeta standalone no se ejecuta `npm` en el servidor. Toda la verificación de esta sesión se hizo con Node 22. Con nvm se puede fijar la 24 (`nvm install 24` da la última 24.x, que cumple `>=24.22.1 <25`), y es lo coherente con el `.nvmrc`. Se indica por ruta absoluta en `interpreter` (§3).

**La trampa del cron.** Un cron arranca con un entorno mínimo: **no carga nvm ni el `PATH` de vuestra sesión**. El comando `pm2` empieza por `#!/usr/bin/env node`, así que sin Node en el `PATH` falla (probado: `env: 'node': No such file or directory`). El vigilante tiene que fijar el `PATH` a la carpeta del Node elegido.

**El vigilante** (`watchdog.sh`, lo ejecuta cron cada minuto). Probado bajo un entorno mínimo tipo cron en cinco situaciones: daemon de PM2 muerto, app en marcha, app parada, app borrada de PM2 y proceso que muere.

```sh
#!/bin/sh
NODE_BIN_DIR="/home/USUARIO/.nvm/versions/node/v24.x.x/bin"
ECOSYSTEM="/home/USUARIO/greener/ecosystem.config.cjs"
export PATH="$NODE_BIN_DIR:/usr/bin:/bin"
export PM2_HOME="${HOME}/.pm2"

# Solo se acepta una línea que sea un número. Si el daemon de PM2 había muerto,
# `pm2 pid` lo arranca y escribe «[PM2] Spawning PM2 daemon…» en la salida
# estándar: leído sin filtrar, ese aviso parecía un PID válido y el vigilante
# NO hacía nada justo en el caso para el que existe (fallo real encontrado y
# corregido en las pruebas).
PID=$(pm2 pid greener 2>/dev/null | grep -E '^[0-9]+$' | tail -1)

# Vacío = no existe (o el daemon había muerto); 0 = existe pero está parada.
if [ -z "$PID" ] || [ "$PID" = "0" ]; then
  echo "$(date '+%F %T') greener no está en marcha (pid='$PID'): arrancando" >> "$HOME/greener-watchdog.log"
  pm2 startOrRestart "$ECOSYSTEM" >> "$HOME/greener-watchdog.log" 2>&1
fi
```

```cron
* * * * * /bin/sh /home/USUARIO/greener/watchdog.sh
```

Resultado de las pruebas: con el daemon muerto, la app vuelve a responder en unos 2 s; con la app en marcha no toca nada (mismo PID); parada o borrada, la arranca; si el proceso muere con el daemon vivo, lo levanta PM2 antes de que intervenga el vigilante. Si ya tenéis un cron que hace lo mismo, contrastadlo con esto: en particular, cómo lee el PID y si fija el `PATH`.

## 6. Lo que depende del proxy que no controláis: pruebas tras el primer despliegue

Nada de esto se puede reproducir fuera del servidor de Dinahosting ni configurar por vuestra parte: hay que **comprobarlo** una vez desplegado. Cada punto dice qué hacer si falla.

1. **Subida de ZIP desde el ABM.** El proxy tendrá un límite de tamaño de petición que no conocemos (el habitual en Nginx es 1 MB). Probar con un ZIP de unos 1,5 MB, otro de unos 5 MB y otro cercano a 9,9 MB. Si alguno falla con un error de servidor (`413 Request Entity Too Large`, una página que no es de la aplicación), es ese límite: pedir a soporte (900 854 000, soporte@dinahosting.com) que lo suban a **al menos 11 MB**, o a 25 MB si queréis que un ZIP de 10-20 MB reciba el mensaje claro de la aplicación («supera el límite de 10 MB») en vez de un error del servidor. Dentro de la aplicación, los topes de Next ya están alineados (`bodySizeLimit` y `proxyClientMaxBodySize`, con test de guarda).
2. **Server Actions detrás del proxy.** Iniciar sesión en el ABM y guardar un cambio cualquiera. Next compara el origen de la petición con el `Host` que le llega; si el proxy lo cambiara, fallaría con «Invalid Server Actions request». Si ocurre, se arregla en una línea añadiendo a `next.config.ts`, dentro de `experimental.serverActions`, `allowedOrigins: ['itsgreener.com']`. No se ha añadido de antemano porque no hay evidencia de que haga falta.
3. **IP del visitante.** El formulario de contacto la saca de `x-forwarded-for` o `x-real-ip` (`modules/contact/infrastructure/clientIp.ts`). Si el proxy no las envía, **todos los visitantes cuentan como una sola IP** y el límite de 5 mensajes por hora (`RATE_LIMIT_MAX_SUBMISSIONS`) se aplicaría al sitio entero: el sexto mensaje de cualquier persona en esa hora sería rechazado. Para comprobarlo, enviar dos mensajes desde redes distintas (wifi y datos móviles) y ver en la tabla `contact_submission` que el `ip_hash` **es distinto**. Si es igual, hay que preguntar a Dinahosting qué cabecera lleva la IP real. **Comprobado el 14 oct 2026** (ruta temporal en `insight.itsgreener.com`, mismo proxy): el proxy rellena `x-forwarded-for` y `x-real-ip` con la IP real, y ante un `X-Forwarded-For: 1.2.3.4` enviado por el cliente lo deja como `1.2.3.4, <IP real>` (añade al final, no sobrescribe). Por eso `lib/http/clientIpFromHeaders.ts` lee el **último** valor y usa `x-real-ip` de respaldo.
4. **Analítica (Plausible).** Solo funciona en producción y con `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` definida **en el `.env.local` del servidor** (junto a `server.js`; se lee en tiempo de ejecución, no en el build). Con las herramientas de desarrollador, abrir la home y pulsar un pin: en la pestaña Network debe verse una petición `POST` a `plausible.io/api/event` con respuesta 202, y la consola no debe mostrar ningún error de Content-Security-Policy. Hasta el 28 de septiembre la CSP no permitía ese origen y el navegador bloqueaba todos los eventos en silencio; ahora se abre solo si la variable está definida. Si no hay peticiones, la variable falta en el `.env.local` del servidor; si hay error de CSP, revisar `connect-src` (`src/lib/securityHeaders.ts`).
5. **Comprobaciones básicas**, con `curl` o en el navegador:

```bash
curl -sI https://itsgreener.com/                          # 200 y cabecera content-security-policy
curl -sI https://itsgreener.com/icons/logo_greener.svg    # 200 (si da 404, falta copiar public/)
curl -s  https://itsgreener.com/robots.txt                # con https://itsgreener.com/sitemap.xml
curl -s  https://itsgreener.com/sitemap.xml | head        # URLs con https://itsgreener.com, no localhost
curl -sI https://itsgreener.com/ruta-que-no-existe        # 404
```

Y en el navegador, que los ficheros de `/_next/static/` dan 200 (si dan 404, falta copiar `.next/static`).

## 7. Redirecciones 301 de las URLs antiguas

**Para qué sirve, en corto.** Una redirección 301 no tiene nada que ver con cómo se sirve un caso o un episodio dentro de la web nueva. Sirve para las direcciones **viejas**, las que ya no existen: cuando alguien (o Google) entra en una URL antigua, en vez de un 404 el servidor responde «esto se ha movido a esta otra dirección» y el navegador salta solo. Su valor está en los enlaces ya publicados y en el posicionamiento en Google. Solo tiene sentido si la URL nueva contiene **lo mismo** que la antigua.

**Decisión (28 sep): sin redirecciones desde `tools.itsgreener.com` ni `insight.itsgreener.com`.** Eran pruebas de un proyecto que no llegó a terminarse, sin visitas, y sus contenidos no tienen equivalente en la web nueva: ninguna de las 9 tools antiguas se corresponde con las 12 nuevas, y de los 4 insights solo 3 tienen equivalente. Redirigir una tool antigua a otra distinta es peor que un 404, y mandar todo lo desconocido al listado es el patrón que Google trata como «soft 404». La tabla `redirect_301` se conserva en el esquema por si más adelante hiciera falta, pero nada la lee.

Lo que sí conviene hacer con esas dos apps antiguas:

1. **Comprobar si Google las tiene indexadas**, buscando `site:tools.itsgreener.com` y `site:insight.itsgreener.com`. Si no sale nada, no hay nada que preservar y este punto está cerrado. Si saliera algo con visitas reales, esa URL concreta sí merecería una redirección.
2. **Apagarlas cuando la web nueva esté publicada** (`pm2 stop`/`pm2 delete` si corren con PM2), en vez de dejarlas encendidas: son código con dependencias sin mantener y contenido de pruebas que Google podría seguir mostrando.

**Rutas antiguas del propio `itsgreener.com`.** Este caso es distinto: es el sitio corporativo actual, que la web nueva sustituye, y probablemente sí tiene enlaces y posicionamiento. Habría que sacar la lista de URLs **antes de cambiar el sitio** (por ejemplo, del `sitemap.xml` del sitio actual, mientras siga publicado) y decidir cuáles tienen una página equivalente en la nueva. Para esas se usa el bloque `redirects()` de `next.config.ts`. Ojo: **`permanent: true` devuelve un 308, no un 301**. Para Google equivalen; si se quiere un 301 literal, se escribe `statusCode: 301` en lugar de `permanent`.

---

## 8. Comprobación de vida: `GET /api/health`

Un endpoint para el monitor del servidor (o para vosotros, con `curl`). Sin sesión, sin caché y sin detalles del fallo:

| Respuesta | Cuerpo | Significa |
| --- | --- | --- |
| `200` | `{"status":"ok"}` | La app responde y llega a Supabase (lee la fila única de `feed_config`). |
| `503` | `{"status":"error"}` | La app responde pero no llega a la base: caída, variables mal puestas o esquema sin aplicar. |

Va con `Cache-Control: no-store`, tiene un tiempo máximo de 3 s para la lectura (un monitor no debe quedarse colgado) y no devuelve el motivo del fallo: el detalle está en el registro de PM2 (`pm2 logs`), no en una respuesta pública. El proxy solo le añade las cabeceras de seguridad globales; no entra en la CSP propia de las apps empaquetadas ni requiere sesión de admin.

```
curl -fsS https://<dominio>/api/health        # devuelve {"status":"ok"} o sale con error
```

Es una comprobación de **la app y su base de datos**, no del proceso PM2 (eso lo vigila el cron del §5): si el proceso está caído, simplemente no hay respuesta.

---

## 9. Tareas programadas en Supabase (`pg_cron`)

Corren dentro de la base, no en el servidor de Dinahosting. Las crea la migración correspondiente (`npx supabase db push`) y son idempotentes por nombre: repetir la migración reemplaza el job, no lo duplica.

| Job | Cuándo | Qué hace | Migración |
| --- | --- | --- | --- |
| `publish-scheduled-content` | cada minuto | Pasa a publicado el contenido programado cuya fecha ya ha llegado. | `20260922090000` |
| `purge-expired-feed-sessions` | cada día a las 03:15 UTC | Borra las `feed_session` caducadas hace más de 24 h; `feed_round` se borra en cascada. Sin él la tabla solo crecía (cada visita a la home crea una sesión). Borra por lotes de 5.000. | `20261016100000` |
| `purge-expired-contact-submissions` | cada día a las 03:30 UTC | Borra los `contact_submission` (hash de IP, resultado y error del envío) con más de **30 días**, el plazo que declara el texto de `/privacy`. Borra por lotes de 5.000. | `20261019140000` |

Para comprobar que están programados, en el SQL Editor de Supabase: `select jobname, schedule, active from cron.job;`. Para ver sus últimas ejecuciones: `select jobname, status, start_time, return_message from cron.job_run_details order by start_time desc limit 20;`.

La primera ejecución de la purga puede borrar mucho si la tabla llevaba meses acumulando; por eso va por lotes.

## 10. Registros del servidor: 30 días (texto de `/privacy`)

El texto de `/privacy` dice que los registros de seguridad (la ruta, la IP y el user agent de las visitas a la ruta señuelo y a rutas de escáner, `logBotTrap` en `src/lib/botTraps.ts`) «se borran automáticamente del log del servidor a los 30 días». PM2 **no rota los logs por sí solo**: sin lo de abajo, `~/.pm2/logs/greener-out.log` crece sin límite y la frase es falsa. Hay que hacerlo en el servidor de Dinahosting:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'   # una vez al día, a medianoche
pm2 set pm2-logrotate:max_size 1G                  # que el tamaño no fuerce rotaciones intermedias
pm2 set pm2-logrotate:retain 30                    # conserva 30 ficheros rotados (≈ 30 días)
pm2 set pm2-logrotate:compress true
```

`retain` cuenta ficheros, no días: con `max_size` alto y rotación diaria, 30 ficheros son unos 30 días. **No se ha probado aquí** (no hay PM2 contra el servidor real); tras configurarlo, comprobar con `pm2 conf pm2-logrotate` y, a los pocos días, que aparecen los ficheros rotados. Si el proxy de Dinahosting guarda además sus propios logs de acceso, su plazo no lo controla la aplicación: conviene preguntárselo al proveedor y, si es mayor, decírselo al asesor.

El correo del formulario sale por el servidor SMTP de Dinahosting (`CONTACT_SMTP_*`, §2).
