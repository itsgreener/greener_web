# Migración de infraestructura: de Dinahosting a Vercel, Cloudflare y Google Workspace

> **REANUDADA el 16 de noviembre de 2026 (decisión de Greener; estuvo en pausa desde el 3 de noviembre).** Orden: primero el dominio y el DNS (D0 a D4) y el entorno de medios en Cloudflare, y solo después el código. Decisiones del 16 nov: R2 de pago ya contratado (el resto de Cloudflare, en gratuito); **Images de pago** necesario y **Stream** por contratar; vídeo largo en **Cloudflare Stream** (se descartan Bunny y Mux); jurisdicción UE para R2; sin calentamiento, WebM ni AVIF (el tratamiento previo ya entrega MP4 y WebP). Estado real de la zona DNS en `docs/operaciones/dns-d2-tabla-registros.md` (§2.157). La web sigue en la preview de Vercel y Cloudinary sigue siendo el proveedor de medios. **El plan cerrado de medios (16 nov) es `docs/especificaciones/plan-migracion-medios-cloudflare.md`** y sustituye a las filas de medios de este documento.

**Estado a 30 de octubre de 2026 (revisado el 3 de noviembre: no consta ningún paso de la migración ejecutado desde entonces).** Resumen operativo de lo decidido entre el 26 y el 29 de octubre. Los planes completos (con fuentes, cuentas de costes, riesgos y protocolos de prueba) son tres documentos del proyecto de Claude que **no viajan en este repositorio**: *Plan de migración del dominio y del DNS a Cloudflare* (27 oct), *Plan de migración de medios: de Cloudinary a Cloudflare* (26 y 27 oct) y *Bunny Stream para vídeos largos: implementación y prueba técnica* (29 oct). Este documento recoge lo que el repositorio necesita saber; el seguimiento de las tareas está en `docs/PROGRESO.md` §4.0.

**Nada de esto está ejecutado en producción.** El 27 de octubre `itsgreener.com` no estaba en Cloudflare: el registro del dominio está en un proveedor distinto de Dinahosting, su DNS está integrado en Dinahosting y todos los registros apuntan a Dinahosting salvo `@`, que apunta (confirmado por Greener el 30 de octubre) al despliegue real actual de la web en Netlify; se cambiará a Vercel cuando se despliegue (D3). Lo único en marcha es la **preview de la web en Vercel** (desde el 28 de octubre), con las funciones en la región `cdg1` (París) que fija `vercel.json`, la más cercana al proyecto de Supabase (Frankfurt).

## 1. Qué cambia y por qué

| Pieza | Hoy (documentos antiguos) | Destino decidido |
| --- | --- | --- |
| Alojamiento de la web | Dinahosting con PM2, cron de vigilancia y proxy Nginx de Dinahosting (`despliegue.md`, arquitectura V1.3 ADR-12 y §19.1) | **Vercel** (preview funcionando; límites de uso en Upstash, `vercel.json` con un cron) |
| DNS | Dinahosting | **Cloudflare**, sin proxy en el sitio principal (solo DNS). Única excepción: el subdominio de medios |
| Correo | Servicio de correo de Dinahosting (ya no sirve) | **Google Workspace**. El formulario de contacto envía hoy por el SMTP de Dinahosting (funciona desde Vercel; en local da error 535, §2.114) y habrá que cambiar `CONTACT_SMTP_*` |
| Imágenes y vídeo ≤ 15 s y ≤ 15 MB | Cloudinary Free | **Cloudflare**: originales en R2 (tres buckets públicos en la UE: web, librería y mailing, con `media.`, `library.` y `mailing.` proxificados), imágenes con Image Transformations y vídeo corto con Media Transformations |
| Vídeo de más de 15 s o de más de 15 MB (hasta 300 s y 125 MB) | Cloudinary (tope de 300 s desde el 13 nov) | **Cloudflare Stream** (decidido el 16 nov; Bunny y Mux descartados) |
| Contenido para el feed | WebM y MP4 | Tras el tratamiento previo, **MP4**; imágenes siempre **WebP** (AVIF sale de las subidas) |

Decisiones de Greener que lo condicionan (26 y 27 oct): proxy de Cloudflare solo en un subdominio de medios; AVIF fuera; los vídeos de más de 60 s son obligatorios (no se limitan); primero se migra el dominio y desde allí el resto; el correo va aparte; la web se queda sin proxy de Cloudflare; BotID de Vercel, como opción para el asesor, sin decidir.

## 2. Orden y calendario

Regla: **no se solapan en la misma semana** el cambio de `@` y `www` (D3), el cambio de proveedor de medios (fase 4) y la migración del correo (D4). Así un fallo tiene una sola causa posible.

| Etapa | Qué se hace | Depende de |
| --- | --- | --- |
| **D0** Preparar | Accesos y 2FA; exportar la zona de Dinahosting con TTL; anotar a dónde apuntan `@` y `www`; comprobar DNSSEC; decidir la cuenta de Cloudflare (la misma que el bucket de R2) | Nada |
| **D1** Migrar el dominio | Zona Free en Cloudflare con los mismos registros y todo en DNS only (nube gris); quitar el DS si hay DNSSEC; bajar TTL; cambiar los NS en el registrador a primera hora de un día laborable, no en viernes | D0 |
| **D2** Preparar el DNS | Tabla final de registros; añadir el dominio en Vercel con sus registros de verificación sin tocar `@` ni `www`; decidir `www` ↔ apex; crear `media.itsgreener.com` | D1 estable |
| **D3** Cambiar `www` y `@` | Primero `www`, luego `@`, ambos en DNS only; TTL de 300 s desde hace más de 24 h; no antes de 48 h tras D1; Netlify desplegado al menos 7 días como marcha atrás | D2 y sitio validado en su URL `*.vercel.app` |
| **D4** Correo y Dinahosting | MX, SPF, DKIM y DMARC de Google Workspace; cambiar el SMTP del formulario; retirar Dinahosting cuando ningún registro ni servicio (incluidos `tools.` e `insight.`) apunte a él | D3 y una semana de distancia |
| Medios, fase 0 | Prueba de concepto (P2 a P8) en un subdominio de prueba de `itsgreener.com`. El plan original la hacía en `bckffc.com`, pero ese dominio es ajeno al proyecto (Greener, 30 oct), y las transformaciones de Cloudflare exigen una zona propia de la cuenta | D1 (zona activa), o un dominio propio de Greener para probar antes |
| Medios, fase 1 | Tres buckets en la UE (`greener-media`, `greener-library`, `greener-mailing`), dominios `media.`, `library.` y `mailing.`, `r2.dev` apagado, Images de pago y Stream, CORS, tokens por bucket, regla WAF y alertas de uso (F0 del plan cerrado) | D1 (zona activa) |
| Medios, fase 2 | Código en rama (6-9 días): `cloudflareUrl.ts`, `r2Server.ts`, verificación por rango, AVIF y calentamiento fuera, Stream para más de 15 s o 15 MB (F1 del plan cerrado) | Prueba de concepto |
| Medios, fases 3 a 5 | Copia con un script nuevo, `scripts/migrate-cloudinary-to-r2.mjs` (por escribir; simulación por defecto), cambio de proveedor por despliegue, **entrega de la librería y del mailing** (sus URLs están fuera de este repositorio), Cloudinary vivo 30 días y limpieza (F2 a F4) | D3 y D4 con al menos una semana de distancia |
| Medios, fase 2B | Absorbida por F1 del plan cerrado: Stream entra en el mismo código que el resto | — |

## 3. Prueba técnica de Bunny Stream

> **Descartada el 16 nov.** El vídeo largo va a Cloudflare Stream y no hay prueba de proveedores. Se conserva el texto como histórico.

Greener tiene una cuenta de prueba activa (14 días, 20 USD de crédito sin tarjeta; el 29 de octubre quedaban unos 10 días, es decir, hasta aproximadamente el **8 de noviembre**). Greener hará la prueba la semana del 2 de noviembre. El plan define trece pruebas (B0 a B13: tiempo de codificación, API, subida `tus` desde el navegador con CORS y reanudación, webhook, iframe, MP4 de respaldo, token de embed, token de CDN, miniaturas, borrado, errores, costes y privacidad), unos dos o tres días de trabajo. Claude puede preparar `scripts/bunny-probe.mjs` y una página mínima de `tus` y del iframe si Greener lo pide; las claves de API no se pegan en el chat, solo van como variables de entorno en la máquina de quien ejecuta la prueba.

Lo que decide la prueba: tiempo hasta «listo» de un vídeo de 3:30 (propuesta: 10 minutos como máximo en hora normal), calidad y peso del MP4 a 720p, CORS y `Range` desde un `<video>`, comportamiento real del webhook (que solo reintenta unas 4 horas) y esquema de token de la zona de descarga. Recomendación de partida del plan: MP4 del proveedor en un `<video>` normal, sin reproductor ni analítica de terceros, de modo que el tercero solo vea la petición cuando se pulsa play.

## 4. Impacto en el repositorio

1. **Documentación técnica.** `despliegue.md` describe el modelo de Dinahosting y queda como referencia hasta que se cierre la migración; las secciones que solo valen allí están marcadas. Hace falta un ADR nuevo que sustituya a ADR-12 y a §19.1 de la arquitectura V1.3, y otro que sustituya a ADR-13 (medios).
2. **Código.** `next.config.ts` conserva `output: 'standalone'` y un comentario que habla de Dinahosting; en Vercel es inocuo, pero conviene revisarlo al cerrar la migración. `images.remotePatterns` ya se retiró el 29 de octubre (§2.121).
3. **Base de datos.** Los topes de duración y peso de vídeo están repetidos en SQL (`p_duration_seconds > 180` y `p_bytes > 104857600` en las funciones de `20261009120000_typed_error_codes.sql`): subirlos para el vídeo largo exige una migración, no solo tocar `mediaLimits.ts`.
4. **Legal.** Cambian los encargados del tratamiento (Dinahosting sale; entran Vercel, Cloudflare, el proveedor de vídeo largo y, si se usa, BotID; Upstash ya está en la consulta 29). Hay que actualizar `policyContent.ts`, `cookies-inventario.md` y `consultas-asesor-legal.md`, y preparar el documento de preguntas nuevas para el asesor que Greener pidió el 26 de octubre. El texto de «Security logs» de `/privacy` promete borrar los registros a los 30 días con la rotación de PM2. En Vercel la retención de los runtime logs depende del plan (Hobby 1 hora, Pro 1 día, Pro con Observability Plus 30 días, Enterprise 3 días; documentación de Vercel, 28 ago 2026): hay que elegir plan, comprobar que no hay Log Drains y ajustar el texto; pasos en `PROGRESO.md` §4.1. A 2 de noviembre Greener usa la cuenta gratuita (Hobby, 1 hora) para probar y pasará a Pro; con Pro hay 1 día de logs y los 30 requieren Observability Plus.
5. **Variables de entorno.** Las de Vercel (Production) son las de `despliegue.md` §2, más las de Upstash y `CRON_SECRET`. Se añadirán las de R2 y del proveedor de vídeo largo cuando entren las fases 2 y 2B; con `NEXT_PUBLIC_*` hay que referenciarlas como literal para que Next las incruste.

## 5. Preguntas abiertas (a 30 de octubre; contestadas o actualizadas el 16 de noviembre)

> **16 nov.** Contestadas: D0 hecho (exportación en `dns-d0-zona-dinahosting.zone`), sin DNSSEC, `www` es un CNAME a `@`, R2 de pago contratado, vídeo largo en Cloudflare Stream (más de 15 s o 15 MB), Images de pago necesario, R2 en jurisdicción UE, sin calentamiento, WebM ni AVIF. Decididas también: los siete subdominios sin uso se tiran y los medios van a **tres buckets** de R2 en la UE (web, librería y cuatro activos sueltos). Siguen abiertas: confirmar el registrador (Greener cree que es Namecheap y quien ejecuta no tiene acceso a esa cuenta), quién puede contratar Images y Stream, las fechas de D1, D3 y del cambio de medios, y la IP del SMTP de Dinahosting para el SPF.

> **16 nov (más tarde).** Aclarado: los **tres buckets son públicos** (la librería de 1.043 imágenes la sirve otra web y las 4 imágenes van en un mailing); las 1.043 no incluyen las 622 de la web (622 + 1.043 + 83 + 4 + 57 = 1.809 frente a los 1,81 K originales de la captura de Cloudinary); el correo se envía hoy desde Dinahosting (formulario y mailing) y Workspace solo recibe. Plan cerrado: `docs/especificaciones/plan-migracion-medios-cloudflare.md`.

> **16 nov (14:00).** Alcance acotado: la librería y las 4 imágenes del mailing **se quedan en Cloudinary, sin borrar**, y se abordarán más adelante; ahora se migra solo la web (629 imágenes y 83 vídeos en `media_asset`, de los que 39 superan 15 s o 15 MB y van a Stream). D1 se intentará el 17 nov si la dirección puede hacer el cambio de NS; D3 no tiene fecha. SPF: IP del envío 82.98.169.92 (compartida con el VPS).

1. ¿Qué etapas de D0 y D1 están hechas? El plan del 27 de octubre las dejaba sin empezar.
2. ¿En qué proveedor está registrado el dominio, qué sirve `www` en Dinahosting y hay DNSSEC activo? (`@` ya está confirmado: apunta al despliegue real en Netlify.)
3. ¿Quién puede añadir zonas y suscripciones (Images, Stream) en la cuenta de Cloudflare? (`bckffc.com`, la única zona hoy, es ajeno al proyecto: no se usa.)
4. Fechas de D1, D3 y del cambio de medios.
5. Proveedor de vídeo largo: Bunny, Mux o Cloudflare Stream; ¿vídeos de caso públicos (basta con dominios permitidos) o con token?; ¿se conservan los originales en el proveedor?; dónde se almacenan los datos y dónde está radicada la empresa (pregunta para el proveedor y el asesor).
6. Umbral de peso aceptable para el vídeo corto (propuesta: 1,5 veces el WebM VP9 actual) y si se retira el calentamiento de vídeo.
