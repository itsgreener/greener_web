/**
 * En qué paso falló «crear un pin con su medio». Quien llama lo necesita para
 * decir al equipo qué ha ido mal (el archivo, el pin o el adjuntado) sin
 * adivinarlo por el texto del error.
 *
 *  - `verify`: el almacén de medios rechazó el archivo (aún no se creó nada).
 *  - `invalid_media`: los metadatos reales del archivo no pasan el esquema
 *    (aún no se creó nada); `cause` es el `ZodError`.
 *  - `create_pin`: no se pudo crear el pin.
 *  - `attach`: el pin se creó pero no se pudo adjuntarle el medio; el pin se
 *    ha borrado (best-effort) para no dejar pines vacíos.
 */
export type CreatePinWithMediaStage =
  'verify' | 'invalid_media' | 'create_pin' | 'attach'

export class CreatePinWithMediaError extends Error {
  readonly stage: CreatePinWithMediaStage

  constructor(stage: CreatePinWithMediaStage, cause: unknown) {
    super(`No se pudo crear el pin con su medio (${stage}).`, { cause })

    this.name = 'CreatePinWithMediaError'
    this.stage = stage
  }
}
