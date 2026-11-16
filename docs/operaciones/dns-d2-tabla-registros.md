# Tabla de registros DNS (etapas D0 a D2)

> **Estado a 16 de noviembre de 2026.** Exportación de D0 recibida: 39 registros del panel de Dinahosting (CSV sin TTL; los TXT consultados con `dig` salen a 300 s). La instantánea completa y fiel está en `dns-d0-zona-dinahosting.zone` (formato BIND) y es la **referencia de marcha atrás**; lo que se importa en Cloudflare es `dns-d1-zona-a-importar.zone` (32 registros: la misma zona sin los siete subdominios que Greener decidió descartar el 16 nov, §6). La zona **no está en Cloudflare**: los NS siguen siendo los cuatro de Dinahosting y DNSSEC no está activo. Todo registro que reciba Cloudflare va en «DNS only» (nube gris). Los archivos de la web siguen en Cloudinary y no intervienen en el DNS.

Esta tabla es el documento de trabajo de D1 y D2 (`migracion-infraestructura.md` §2). Sin ella, el riesgo de la migración es perder un registro que nadie recordaba, y lo que suele romperse en silencio es el correo.

## 1. Lo que dice la exportación y no decía la plantilla del 2 de noviembre

1. **La zona es compartida con otras aplicaciones.** Además de la web hay seis subdominios de Vercel (`stock`, `getitdone`, `keepintouch`, `sharing`, `backroom`, `chat`), una instancia de Clerk (`clerk`, `accounts`, `clkmail`, `clk._domainkey`, `clk2._domainkey`), Resend (`send`, `reply`, `resend._domainkey`, `rsend`) y Mailchimp (`k1._domainkey`). Ninguno es de la web de Greener y todos tienen que sobrevivir intactos al traslado. Los de Clerk, Vercel y Resend, siempre en «DNS only».
2. **Hay cambios hechos en el panel de Dinahosting sin que quien ejecuta la migración lo supiera** (confirmado el 16 nov: los hizo la dirección de Greener, sin aviso previo). Greener va a congelar el panel y avisar. Mientras la zona siga en Dinahosting puede cambiar por debajo de nosotros; después del cambio de NS, cualquier edición en Dinahosting **dejará de tener efecto** sin avisar.
   **Acceso.** Quien ejecuta la migración tiene acceso a Vercel y a Cloudflare, pero **no** a las cuentas de Clerk y Resend ni a la del registrador, que Greener cree que es **Namecheap** (por confirmar). El cambio de NS lo tiene que hacer quien controle esa cuenta.
3. **Dos SPF en el apex.** `v=spf1 include:servers.mcsv.net ?all` y `v=spf1 a mx ~all`. Un dominio solo puede tener uno por nombre: con dos, la evaluación da error permanente y el SPF falla para todo el correo del apex. El tercer SPF, el de `send` (`include:amazonses.com`), es legítimo (es el de Resend en su subdominio) y no entra en conflicto.
4. **Los MX del apex ya son los de Google Workspace** (ASPMX y ALT1 a ALT4). La plantilla suponía que ese cambio se haría en D4. En el export **no hay** SPF con `include:_spf.google.com`, DKIM de Google ni DMARC. Falta confirmar qué buzones usan hoy Workspace.
5. **Los selectores DKIM no chocan entre sí:** `default` (servidor de correo antiguo de Dinahosting), `k1` (Mailchimp), `clk` y `clk2` (Clerk) y `resend` (Resend, también en `reply`). Solo hay conflicto con los SPF del apex.
6. **`tools.` e `insight.` no están en la zona.** Se esperaba que existieran (D4 no podía cerrar mientras duraran). Falta confirmar que se quitaron a propósito.
7. **Siete subdominios sin uso conocido** (`app`, `wip`, `storm-ultra`, `mailing19`, `mailing2019`, `agroptimum10`, `countdown`): Greener decidió el 16 nov que **se pueden tirar todos**. No se importan a Cloudflare; quedan en la instantánea de D0. Siguen `ftp`, `mail`, `autodiscover` y `autoconfig` (hosting y correo antiguo de Dinahosting) hasta que D4 retire Dinahosting.
8. **El export trae los SPF con tipo `SPF`** (tipo obsoleto). En Cloudflare se crean como `TXT`: la consulta TXT ya devuelve los dos del apex.

## 2. Reglas de trabajo

1. **Congelar el panel de Dinahosting** desde la exportación hasta el cambio de NS. Antes del cambio se vuelve a exportar y se compara con `dns-d0-zona-dinahosting.zone`.
2. **Importar una copia fiel y corregir después**, de una en una, ya con la zona activa: un cambio de NS y ninguna otra novedad a la vez. La única diferencia con Dinahosting al importar son los siete subdominios descartados.
3. **Todo en DNS only.** Antes de activar la zona Cloudflare ya responde en sus servidores asignados, así que se compara cada registro contra ellos con `scripts/dns-compare.sh` (sobre `dns-d1-zona-a-importar.zone`) antes de tocar los NS.
4. Los valores que genera un panel (verificación de Vercel, SPF y DKIM de Google Workspace) **no se inventan ni se copian de otra documentación**: se pegan del panel el día que se aplican.
5. **Tras D1, Cloudflare es el único sitio donde se edita el DNS.** Quien gestiona las aplicaciones del punto 1 necesita acceso a la cuenta (o pedírselo a Greener) antes de D1.

## 3. Registros de la web

| Tipo | Nombre | Valor actual (D0) | Destino previsto | Etapa | Notas | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| A | `@` | 104.198.14.52 | Vercel (el valor lo indica el panel de Vercel al añadir el dominio) | D3 | Coincide con el despliegue actual de Netlify (confirmado el 30 oct). Va después de `www`. TTL de 300 s. No se toca hasta validar el sitio en su URL `*.vercel.app`. | listo (valor) |
| CNAME | `www` | `itsgreener.com.` | Vercel | D3 | Va primero. Decidir antes cuál es la dirección canónica (`www` o la raíz). | listo (valor) |
| TXT / CNAME | verificación de Vercel | no existe | Valor del panel de Vercel | D2 | Para validar el dominio sin tocar `@` ni `www`. | pendiente |
| CNAME | `media` | no existe | Dominio personalizado del bucket público de la web en R2 (`greener-media`) | medios F0 | Con la zona activa y **con proxy** (las transformaciones por URL solo responden en un host proxificado). | pendiente |
| CNAME | `library`, `mailing` (nombres propuestos) | no existen | Dominios personalizados de los buckets públicos de la librería (`greener-library`) y de las 4 imágenes del mailing (`greener-mailing`) | medios F0 | Decisión del 16 nov: **los tres buckets son públicos** (la librería la sirve otra web y las 4 imágenes van en un mailing). Con proxy. Los nombres acaban escritos en correos y en otra web: decidirlos antes de crearlos. No chocan con los `mailing19` y `mailing2019` descartados. Ver `docs/especificaciones/plan-migracion-medios-cloudflare.md` §2.2. | pendiente (nombres) |
| — | `tools`, `insight` | no están en la zona | — | — | Confirmar que se quitaron a propósito. | pendiente |

## 4. Correo

| Tipo | Nombre | Valor actual (D0) | Destino previsto | Notas | Estado |
| --- | --- | --- | --- | --- | --- |
| MX | `@` | `aspmx.l.google.com` (10), `alt1` (20), `alt2` (30), `alt3` (40), `alt4` (50), todos en `.l.google.com` | Igual (el panel de Workspace da los vigentes) | Ya son los de Google. No se tocan; solo se confirma que Workspace recibe. | listo |
| TXT | `@` (SPF) | `v=spf1 include:servers.mcsv.net ?all` | **Unificar** con el otro en uno solo | Tras D1, no antes. **Valor listo y comprobado** (el 16 nov, `dig +short` sobre el host del SMTP devuelve 82.98.169.92). Decisión del 16 nov, aclarada después: Google Workspace solo **recibe**; el envío (el formulario y el mailing) sale hoy del host SMTP y del buzón de Dinahosting, y Mailchimp sigue vivo. Más adelante se deja Dinahosting y el envío pasa a un buzón de Workspace. Valor: `v=spf1 include:_spf.google.com include:servers.mcsv.net ip4:82.98.169.92 ~all`. La IP es la de la fila `mail` (82.98.169.92; Greener la pasó el 16 nov). Es **compartida** con los demás usuarios del VPS, así que el SPF autoriza a cualquiera que envíe desde ese servidor: es provisional hasta que el envío pase a Workspace, y DKIM y DMARC lo compensan. Comprobado el 16 nov: `CONTACT_SMTP_HOST` resuelve a esa IP. Al pasar el formulario a Workspace se quita el `ip4`. | pendiente (valor listo; se aplica tras D1) |
| TXT | `@` (SPF) | `v=spf1 a mx ~all` | Se elimina al unificar | Era del correo de Dinahosting; `a` apunta hoy a Netlify y `mx` a Google. | pendiente (decisión) |
| TXT | `default._domainkey` | `v=DKIM1; g=*; k=rsa; p=MIGfMA0G…` (1024 bits) | Igual hasta retirar Dinahosting | Clave del servidor de correo antiguo. | listo |
| CNAME | `k1._domainkey` | `dkim.mcsv.net.` | Igual | Mailchimp. | listo |
| TXT | `google._domainkey` | no existe | Valor que genera el panel de Google Workspace | Activar la firma en el panel después de publicarlo. | pendiente |
| TXT | `_dmarc` | no existe | `v=DMARC1; p=none; rua=mailto:…` a un buzón de Greener | Política de partida `p=none`. | pendiente |
| A | `mail`, `ftp` | 82.98.169.92 | Igual hasta retirar Dinahosting | Alojamiento y correo antiguo; `mail` puede ser el host del SMTP del formulario (por confirmar con `CONTACT_SMTP_HOST`). | listo |
| A | `autodiscover`, `autoconfig` | 82.98.145.60, 82.98.145.51 | Igual; se quitan al retirar Dinahosting | Autoconfiguración del correo antiguo. | listo |

## 5. Otras aplicaciones en la zona (no son la web)

Todas se copian tal cual y en «DNS only». Quién las gestiona, por confirmar con Greener.

| Tipo | Nombre | Valor actual (D0) | Servicio | Estado |
| --- | --- | --- | --- | --- |
| CNAME | `stock` | `f92d8948ddebbd51.vercel-dns-016.com.` | Vercel | listo |
| CNAME | `getitdone` | `ae2fa5f4a3047393.vercel-dns-017.com.` | Vercel | listo |
| CNAME | `keepintouch` | `323cd6b63c183c7a.vercel-dns-017.com.` | Vercel | listo |
| CNAME | `sharing` | `3648fe99bc753f16.vercel-dns-017.com.` | Vercel | listo |
| CNAME | `chat` | `a1303867068500d0.vercel-dns-016.com.` | Vercel | listo |
| CNAME | `backroom` | `cname.vercel-dns.com.` | Vercel | listo |
| CNAME | `clerk` | `frontend-api.clerk.services.` | Clerk (nunca con proxy) | listo |
| CNAME | `accounts` | `accounts.clerk.services.` | Clerk (nunca con proxy) | listo |
| CNAME | `clkmail` | `mail.906nzm3v6tsw.clerk.services.` | Clerk (nunca con proxy) | listo |
| CNAME | `clk._domainkey`, `clk2._domainkey` | `dkim1.` y `dkim2.906nzm3v6tsw.clerk.services.` | Clerk (nunca con proxy) | listo |
| MX | `send` | `10 feedback-smtp.eu-west-1.amazonses.com.` | Resend | listo |
| TXT | `send` (SPF) | `v=spf1 include:amazonses.com ~all` | Resend (legítimo; no es el SPF del apex) | listo |
| TXT | `resend._domainkey`, `resend._domainkey.reply` | `p=MIGfMA0G…` (dos claves distintas) | Resend | listo |
| MX | `reply` | `10 receive-euw1.forge.rmta.net.` | Resend (recepción) | listo |
| CNAME | `rsend` | `send.forge.rmta.net.` | Sin identificar con certeza (mismo operador que el MX de `reply`) | pendiente |
| A | `countdown` | 167.172.110.85 | Sin identificar | descartado (§6) |

## 6. Subdominios descartados (decisión de Greener, 16 nov)

`app`, `wip`, `storm-ultra`, `mailing19`, `mailing2019` y `agroptimum10` (todos a 82.98.169.92, alojamiento de Dinahosting) y `countdown` (167.172.110.85, IP sin identificar) **se pueden tirar sin problema**. No se importan a Cloudflare (`dns-d1-zona-a-importar.zone`); sus valores siguen en `dns-d0-zona-dinahosting.zone`. El contenido que tuvieran en el alojamiento de Dinahosting se perderá al retirarlo en D4, si no se copia antes.

## 7. Qué no trae el export

`NS` y `SOA` (los gestiona Cloudflare), `CAA`, `DS` y comodines. Consta que DNSSEC no está activo y que no hay `NS` delegados dentro de la zona. Se confirma con `dig +short CAA itsgreener.com` y `dig +short DS itsgreener.com`.

## 8. Comprobaciones antes de cada etapa

- **Antes de D1.** Panel de Dinahosting congelado y reexportado sin diferencias; registrador confirmado (probablemente Namecheap) y alguien con acceso a su cuenta, con 2FA, presente para cambiar los NS; `dig +short DS itsgreener.com` vacío (si devolviera algo, hay DNSSEC en el registrador y hay que quitar el DS antes); todos los registros del `.zone` importados en Cloudflare y en DNS only; `scripts/dns-compare.sh` sin diferencias entre Dinahosting y los NS asignados por Cloudflare; TTL de 300 s confirmado en el panel; quien gestiona Vercel, Clerk y Resend, avisado.
- **Tras D1.** Zona «Active»; `dig NS` devuelve solo los de Cloudflare; la zona de Dinahosting **se deja intacta al menos 48 h** (las cachés del registro padre pueden tardar en caducar); web, correo (envío y recepción) y las aplicaciones del §5 funcionando; hora anotada.
- **Antes de D3.** Dominio añadido en Vercel y validado; sitio funcionando en su URL `*.vercel.app`; más de 48 h desde D1; Netlify mantenido siete días como marcha atrás; funciones de Vercel en la región de la UE elegida.
- **Antes de D4.** Decididos los subdominios del §6; registros de Google Workspace publicados, DKIM firmando y una prueba de envío del formulario de contacto recibida.
- **Después de cada etapa.** Consultar los registros cambiados desde fuera (`dig` o una herramienta web) y comprobar la web, `/privacy` y el envío del formulario.
