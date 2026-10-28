type Props = {
  /** `name` del campo: es lo que lee `readHoneypot` en la server action. */
  name: string

  /** `id` del input; el label se enlaza a él. */
  id: string

  /** Texto del label, plausible para el nombre del campo. */
  label: string
}

/**
 * Campo señuelo anti-bot compartido por el contacto y el pin de newsletter.
 * Oculto por CSS (clase global `.honeypot`), no con `display:none` ni
 * `type="hidden"`: algunos bots evitan justamente esos dos casos.
 * `tabIndex` y `autoComplete` impiden que un visitante real llegue a él sin
 * querer. La server action lo lee con `readHoneypot`.
 *
 * Ojo con el NOMBRE y la etiqueta: Chrome y los gestores de contraseñas
 * rellenan por heurística de nombre (`website`, `url`, `company`, `phone`…) e
 * ignoran `autoComplete="off"`, y un campo señuelo relleno por el navegador
 * hace que el envío de una persona real se descarte como si fuera un bot (se
 * fingió el éxito el 28 oct con `website`). Por eso se usa un nombre fuera del
 * vocabulario de autorrelleno (`reference_code`) y los atributos que respetan
 * 1Password, LastPass, Bitwarden y Dashlane.
 */
export function Honeypot({ name, id, label }: Props) {
  return (
    <div className="honeypot" aria-hidden="true">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        data-1p-ignore="true"
        data-lpignore="true"
        data-bwignore="true"
        data-form-type="other"
      />
    </div>
  )
}
