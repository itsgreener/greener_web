# Tabla de registros DNS (etapa D2)

> **Estado a 2 de noviembre de 2026.** Plantilla preparada, **sin los valores actuales**: salen de la exportación de la zona que hace Greener en la etapa D0 y desde aquí no se pueden consultar. Las filas ya recogen lo que consta en la documentación y en las decisiones de Greener; todo lo que depende de un panel (Vercel, Google Workspace) dice de cuál. Cloudflare gestiona **solo el dominio**: ningún registro va con proxy, todos en «DNS only» (nube gris). Los archivos de la web siguen en Cloudinary y no intervienen en el DNS.

Esta tabla es el documento de trabajo de D2 (`migracion-infraestructura.md` §2): se rellena con la exportación de D0, se revisa antes de D1 (traslado de la zona) y se vuelve a revisar antes de D3 (cambio de `@` y `www`). Sin ella, el riesgo de la migración es perder un registro que nadie recordaba, y lo que suele romperse en silencio es el correo.

## 1. Cómo se rellena

1. Exportar la zona completa de Dinahosting con su TTL (etapa D0) y pegar **cada** registro como una fila, también los que no se van a tocar. Si la exportación trae un registro que no está en la tabla, no se traslada la zona hasta decidir qué hacer con él.
2. La columna «Destino previsto» dice a dónde apunta el registro cuando termine la migración. «Igual» significa que se copia tal cual a Cloudflare en D1.
3. Estado: `pendiente` (falta el valor), `listo` (valor y destino confirmados), `hecho` (aplicado y comprobado).
4. Los valores que genera un panel (verificación de Vercel, MX, SPF y DKIM de Google Workspace) **no se inventan ni se copian de otra documentación**: se pegan del panel el día que se aplican.

## 2. Registros de la web

| Tipo | Nombre | Valor actual (D0) | TTL | Destino previsto | Etapa | Proxy | Notas | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A / CNAME | `@` (itsgreener.com) | _de la exportación_ | _de la exportación_ | Vercel (el valor lo indica el panel de Vercel al añadir el dominio) | D3 | No (DNS only) | Va después de `www`. TTL de 300 s desde 24 h antes. No se toca hasta que el sitio esté validado en su URL `*.vercel.app`. | pendiente |
| CNAME | `www` | _de la exportación_ | _de la exportación_ | Vercel | D3 | No (DNS only) | Va primero. Decidir antes qué dirección es la canónica (`www` o la raíz) y que la otra redirija a ella: afecta a SEO y a la cookie de consentimiento. | pendiente |
| TXT / CNAME | verificación de Vercel | no existe | _300 s_ | Valor del panel de Vercel | D2 | No | Se añade en D2 para validar el dominio **sin tocar** `@` ni `www`. | pendiente |
| _a comprobar_ | `tools` | _de la exportación_ | _de la exportación_ | **Se apaga** | tras D3 | No | Subdominio que va a desaparecer. Sus contenidos están en `/tools` de la web principal. Mientras exista, impide dar de baja Dinahosting (D4). Sin redirección: se elimina el registro. | pendiente |
| _a comprobar_ | `insight` | _de la exportación_ | _de la exportación_ | **Se apaga** | tras D3 | No | Igual que `tools`: sus contenidos están en `/insights`. | pendiente |

## 3. Correo (etapa D4, no el mismo día que D3)

El correo se migra una semana después del cambio de `@` y `www`, para que un fallo tenga una sola causa posible. Hasta D4 no se tocan los registros de correo actuales.

| Tipo | Nombre | Valor actual (D0) | TTL | Destino previsto | Proxy | Notas | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MX | `@` | _de la exportación_ | _de la exportación_ | Los que indique el panel de Google Workspace | No (los MX nunca llevan proxy) | Es el registro que más duele perder. Se cambian todos a la vez; no se dejan mezclados los de dos proveedores. | pendiente |
| TXT | `@` (SPF) | _de la exportación_ | _de la exportación_ | SPF con Google Workspace (valor del panel), manteniendo lo que envíe correo en nombre del dominio | No | Debe existir **un solo** registro SPF. Si Mailchimp u otro servicio envía con el dominio, su `include` se conserva. | pendiente |
| TXT | selector DKIM de Workspace (`<selector>._domainkey`) | no existe | _300 s_ | Valor que genera el panel de Google Workspace | No | El selector lo genera el panel. Hay que activar la firma en el panel después de publicarlo. | pendiente |
| TXT | `_dmarc` | _de la exportación_ | _de la exportación_ | Igual, o política de partida `p=none` con aviso a un buzón de Greener | No | Si ya existe, no se endurece en la misma semana que el cambio de MX. | pendiente |
| _a comprobar_ | DKIM u otros registros del servicio de newsletter | _de la exportación_ | _de la exportación_ | Igual | No | Registros que el servicio de newsletter pide para enviar con el dominio. No tocar. | pendiente |

## 4. Otros registros de la zona

Aquí van todos los demás que traiga la exportación (`NS`, `CAA`, `TXT` de verificación de otros servicios, `SRV`, etc.). Cada uno con su destino «Igual», salvo que se decida otra cosa.

| Tipo | Nombre | Valor actual (D0) | TTL | Destino previsto | Notas | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| NS | `@` | Servidores de Dinahosting | _de la exportación_ | Servidores que asigne Cloudflare | Se cambian en el registrador, no en la zona (D1). | pendiente |
| DS (DNSSEC) | `@` | _comprobar en D0_ | — | Quitar antes de cambiar los NS y volver a crear en Cloudflare | Si hay DNSSEC y no se quita el DS antes, el dominio deja de resolver. | pendiente |
| CAA | `@` | _de la exportación_ | _de la exportación_ | Igual, **añadiendo** la autoridad que use Vercel para sus certificados si hay CAA | Si no hay ningún CAA, no se crea ninguno. | pendiente |
| _otros_ | _…_ | _…_ | _…_ | _…_ | _…_ | pendiente |

## 5. Comprobaciones antes de cada etapa

- **Antes de D1.** Todos los registros de la exportación están en la tabla y en la zona de Cloudflare; todos en DNS only; TTL bajado a 300 s al menos 24 h antes de cambiar los NS; DS quitado si había DNSSEC.
- **Antes de D3.** El dominio está añadido en Vercel y validado; el sitio funciona en su URL `*.vercel.app`; han pasado más de 48 h desde D1; las funciones de Vercel están en la región de la UE elegida.
- **Antes de D4.** `tools` e `insight` ya no existen en la zona; los registros de Google Workspace están publicados, el DKIM firmando y una prueba de envío del formulario de contacto llega al buzón.
- **Después de cada etapa.** Consultar los registros cambiados desde fuera (`dig` o una herramienta web de consulta DNS) y comprobar la web, `/privacy` y el envío del formulario. Dejar anotada la hora.
