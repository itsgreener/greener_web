# Plan: «¿Has finalizado tus estudios?» en el formulario de talent

**Estado:** planificado y **ejecutado el 11 nov 2026** (SQL de §4.7 de `talent-puesta-en-marcha.md` pendiente de aplicar por Greener; despliegues en el orden del §8). Respuestas de Greener (11 nov): fecha completa con calendario nativo y opcional; añadir ya la frase a la política y preguntar al asesor (consulta 35); el aviso de n8n lo hará Greener cuando esté el SQL; el legacy se compila y sube a Dinahosting desde `talent-legacy.zip`; ubicación entre móvil y comentario y «Sí» sin fecha permitido (por defecto). Regla de trabajo: primero se planifica y luego se ejecuta; este plan se borra cuando lo que describe esté aplicado y recogido en `contrato-datos-talent.md`.

## 1. Qué se pide y qué está decidido

Un candidato, en el último paso del formulario (el de los datos de contacto), indica si ha finalizado sus estudios y, si es que sí, cuándo. Hay que reflejarlo en Supabase-talent, en el formulario nuevo (el paquete `variety` que sirve la web) y en el formulario de la web antigua de talent (legacy, que sigue en uso un tiempo en `talent.itsgreener.com`).

Decisiones de Greener (11 nov): la pregunta es Sí/No y solo si responde que sí aparece la fecha; la fecha es completa (día, mes y año) con el calendario nativo del navegador; es opcional, y «sin responder» es un estado distinto de «No».

## 2. Hallazgo sobre el ZIP recibido (`talent-v3.zip`)

No es el repositorio fuente, es **el paquete ya compilado**: `index.html`, `manifest.json` y ocho ficheros de `assets/` (JS y CSS minificados, la fuente, el logotipo y `og.png`). No hay `src/`, `package.json` ni el script `build:package`, así que el repo «talent adaptado» sigue sin aparecer. El bundle principal (59 KB) es legible: la lógica del último paso, el estado del formulario y el cuerpo del `PUT` se identifican sin problema (§6).

Consecuencia: el paquete nuevo se obtiene **parcheando el bundle** y probándolo en un navegador, no recompilando. Funciona, pero deja un riesgo que conviene saber: cualquier cambio futuro tendrá que seguir parcheando el bundle mientras no se recupere el fuente. La alternativa es que Greener localice el repo adaptado (o el `talent-form-package.zip` original de la fase 2 con su código) y se haga todo en fuente; si aparece antes de ejecutar, se cambia el §6 sin tocar el resto. Los hash de los ficheros (`index-5b7e1c3a.js`, `index-DVRw-sDh.css`) se conservan para no mover referencias; el ABM identifica la versión por el contenido, no por el nombre.

## 3. Datos: Supabase-talent

Dos columnas nuevas, nulables y sin valor por defecto en `public.candidates`:

| Columna | Tipo | Significado |
| --- | --- | --- |
| `studies_finished` | boolean | `true` sí, `false` no, `null` sin responder |
| `studies_end_date` | date | fecha de finalización; solo con `studies_finished = true` |

Dos columnas y no una, porque con una sola no se distingue «No» de «no ha contestado». Las filas existentes (1.018) quedan en `null`, que es exactamente «sin responder».

Es un cambio **aditivo**: ningún nodo de n8n las lee ni las escribe (los nodos de Supabase trabajan con columnas concretas, y los `select` que devuelven la fila entera solo añaden dos campos que nadie usa). La decisión de no tocar el esquema (plan de talent, decisión 2) se refería a no romper n8n; esto no lo rompe. Va como SQL manual en el SQL Editor del proyecto **de talent**, no en `supabase/migrations`, y se documenta como §4.7 de `docs/operaciones/talent-puesta-en-marcha.md` (precedente: §4.6, caducidad del enlace):

```sql
alter table public.candidates
  add column if not exists studies_finished boolean,
  add column if not exists studies_end_date date;

alter table public.candidates
  drop constraint if exists candidates_studies_end_date_needs_finished;
alter table public.candidates
  add constraint candidates_studies_end_date_needs_finished
  check (studies_end_date is null or studies_finished is true);

notify pgrst, 'reload schema';
```

El `check` evita que alguien (un SQL a mano, un nodo futuro) deje una fecha con «No» o sin responder; la sentencia `notify` hace que la API vea las columnas sin esperar. **Hay que ejecutarlo ANTES de desplegar la web**: el código las lee en `FORM_COLUMNS` y `DETAIL_COLUMNS` y, si no existen, Supabase rechaza la consulta y el formulario y la ficha del ABM dan «no disponible» (mismo caso que el §4.6).

## 4. Servidor (esta web, módulo `talent`)

Los dos formularios hablan con las mismas rutas (`GET` y `PUT /api/talent/form/<token>`), así que el servidor es el punto central y lo primero que se despliega.

1. **Esquema del `PUT`** (`candidateFormSchema`, `talentSchemas.ts`): `studiesFinished` (`boolean`, admite `null`) y `studiesEndDate` (cadena `AAAA-MM-DD` que sea una fecha real, no anterior a 1950-01-01 y no posterior a mañana en UTC, que cubre a quien rellene el formulario en un huso adelantado). Reglas: con `studiesFinished` distinto de `true`, la fecha se descarta (`null`); con `true` y sin fecha, se acepta (la fecha es opcional); con `true` y una fecha inválida, `400 invalid` con `fieldErrors.studiesEndDate`.
2. **Clientes antiguos.** `candidateFormSchema` ignora hoy las claves desconocidas, pero el `PUT` escribe **todas** las columnas, así que un cliente que no mande las claves nuevas (el paquete actual, la web antigua sin actualizar) borraría con `null` lo que ya hubiera guardado. Por eso las dos claves **ausentes** (`undefined`) no se incluyen en el `update`, y solo las presentes se escriben; `null` explícito sí limpia la respuesta. `CandidateUpdateRow` pasa a tener ambas columnas opcionales y `buildCandidateUpdate` las añade solo cuando vienen.
3. **Lectura** (`GET`): `FORM_COLUMNS`, `CandidateFormRecord` y `CandidateFormView` añaden `studiesFinished: boolean | null` y `studiesEndDate: string | null` (PostgREST devuelve `date` como `AAAA-MM-DD`). `getCandidateForm` los pasa tal cual: aquí **no** se convierte `null` en `false` (con `newsletterAccepted` sí, aquí sería mentir).
4. Sin variables de entorno nuevas, sin cambios en límites de peticiones ni en el orden de la secuencia de guardado (candidato, proyectos, newsletter, webhook).

## 5. ABM (`/admin/talent/[id]`)

`DETAIL_COLUMNS` (`supabaseTalentAdminRepository.ts`), `CandidateDetail` (`talentAdminModels.ts`) y una fila nueva en la ficha, junto a «Experiencia» y «Newsletter»: **Estudios finalizados**, con «Sin responder», «No» o «Sí · 15/06/2026». La fecha se formatea partiendo la cadena `AAAA-MM-DD`, sin pasar por `new Date()`, para que un huso horario no mueva el día. No se añade a la lista ni al buscador (se puede añadir un filtro después si lo piden).

## 6. Paquete nuevo (formulario de la web)

Cambios sobre el bundle `assets/index-5b7e1c3a.js` y su CSS; el último paso es el 9 (`canAdvance` caso 9: email válido, política aceptada y móvil válido).

1. **Estado** (hook del formulario): `studiesFinished` (`null`, `true`, `false`) y `studiesEndDate` (cadena), hidratados desde `candidate.studiesFinished` y `studiesEndDate` en `hydrate` (sin conversión: `null` es «sin responder»).
2. **Cuerpo del `PUT`** (función `buildPayload`): `studiesFinished` y `studiesEndDate` (esta solo con `true`, si no `null`). Se mandan siempre, para que cambiar de respuesta o dejarla en blanco se guarde.
3. **Interfaz** (último paso, entre el móvil y el comentario libre): una pregunta con dos opciones de radio (Sí y No, en un `fieldset` con su `legend`, accesibles por teclado) y, solo con «Sí», un `<input type="date">` con `min="1950-01-01"` y `max` igual a hoy en hora local. Cambiar a «No» oculta y vacía la fecha. Textos en los tres idiomas:
   | | Pregunta | Sí / No | Fecha |
   | --- | --- | --- | --- |
   | es | ¿Has finalizado tus estudios? | Sí / No | ¿Cuándo los finalizaste? |
   | ca | Has finalitzat els teus estudis? | Sí / No | Quan els vas finalitzar? |
   | en | Have you finished your studies? | Yes / No | When did you finish? |
4. **Validación:** no bloquea el avance si no se contesta (es opcional). Con «Sí», una fecha fuera de rango (escrita a mano, el calendario ya la impide) muestra el error en línea y desactiva «Enviar»; el servidor repite la comprobación.
5. **Estilos:** reglas nuevas añadidas al CSS con nombres propios, reutilizando los tokens (color, borde, radio, tipografía) de los campos del último paso; el formato de la fecha lo decide el navegador.
6. **Manifest, dominios y política de privacidad:** `externalDomains` no cambia. El texto de `#/privacy` enumera lo que se recoge («Datos profesionales: perfil o disciplina, años de experiencia, nivel de idiomas…»): hay que añadir «si has finalizado tus estudios y, en su caso, cuándo» a esa línea (decisión de Greener en §9) y, aunque no es dato de categoría especial, anotarlo en el documento de consultas al asesor como consulta nueva, como se hizo con el plazo de retención.
7. **Entrega:** `talent-form-package.zip` con el mismo contenido y los dos ficheros parcheados, validado con `validateHtmlPackageZip` antes de entregarlo. Se sube desde el ABM como **versión nueva en borrador** del contenido `talent`, y se publica cuando Greener quiera; «Volver a esta versión» devuelve la anterior sin subir nada.

## 7. Web antigua (legacy)

Mismas piezas en `talent legacy`, sin cambio de arquitectura: ya no toca la base de datos, habla con la API de esta web (`talentApi.js`). `useForm.js` (estado e hidratación), `StepFinal.jsx` y `StepFinal.module.css` (pregunta, radios, fecha, textos es/ca/en y política de privacidad si la lleva), `HiddenFormFields.jsx` (dos campos ocultos) y `useFormSubmit.js` (las dos claves en el cuerpo del `PUT`, **solo si el candidato ha contestado**: este formulario no hidrata los demás campos y no debe pisar una respuesta dada en el formulario nuevo). Es transitorio y se retira con la web antigua; por eso va el último y con lo mínimo.

## 8. Orden de despliegue y compatibilidad

1. **SQL** del §3 en Supabase-talent (antes que nada).
2. **Web** (§4 y §5). Los clientes actuales siguen funcionando sin tocarlos: no mandan las claves, el servidor no escribe esas columnas.
3. **Paquete nuevo** como versión en borrador y, tras probarlo, publicarla.
4. **Legacy**, cuando se quiera.

Marcha atrás: la web y el paquete se pueden revertir sin tocar la base de datos (las columnas quedan sin usar, no estorban). Lo único irreversible es borrar las columnas, y no hace falta.

## 9. Verificación

**Web:** tests de dominio y de contrato actualizados: `talentRows.contract.test.ts` (columnas exactas, y que las claves ausentes no escriben), `talentSchemas.test.ts` (fechas válidas e inválidas con fast-check, con `false` o `null` la fecha se descarta, límites 1950 y mañana), `saveCandidateForm`, `getCandidateForm`, los dos repositorios de Supabase (consultas exactas), `legacyFormPayload.test.ts` (cuerpo antiguo sin claves y cuerpo nuevo con ellas) y la ficha del ABM (`talentAdminPages.test.tsx`: los tres estados y el formato de la fecha). Más `tsc`, ESLint, Prettier y la suite completa.

**Paquete y legacy:** recorrido completo en Chromium contra un servidor de pruebas que imita `/api/talent` (como en la fase 2): responder Sí con fecha, No, no responder, volver a abrir el enlace con la respuesta ya guardada, fecha fuera de rango, móvil de 390 px y escritorio, y el cuerpo exacto del `PUT` en cada caso. **No se puede probar** contra Supabase-talent, n8n ni Mailchimp reales: queda para Greener la prueba del §5 de `talent-puesta-en-marcha.md` con un candidato real.

## 10. Entregables

El proyecto completo de la web (zip), el SQL del §3 (también en el reply, y en el §4.7 de la guía de puesta en marcha), `talent-form-package.zip` (paquete listo para subir), el repo de la web antigua actualizado (zip), contrato de datos y guías al día. Ningún fichero oculto cambia salvo que el legacy lleve alguno; si es así, se transcribe entero en la respuesta.

## 11. Pendiente de Greener

1. **Dónde va dentro del último paso.** Por defecto, entre el móvil y el comentario libre.
2. **Sí sin fecha.** Por defecto, se permite (la fecha es opcional aunque diga que sí).
3. **Política de privacidad.** Por defecto, se añade la frase de §6.6 ya en el paquete y en el legacy y se manda a consulta al asesor, igual que el plazo de retención; si se prefiere esperar al asesor, el formulario sale sin ella.
4. **Aviso a Greener de n8n.** El resumen que llega a `contact@itsgreener.com` (`Recibir datos candidato`) no incluirá la respuesta salvo que se añada una línea a su plantilla; los datos ya llegarán en la fila. Es un cambio en n8n que haría Greener, opcional.
5. **El repo fuente de talent adaptado.** Si aparece, se hace todo en fuente (§2).
