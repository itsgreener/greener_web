# Formularios: qué vive aquí y qué en cada kit (TSX-X5)

**Aquí, la lógica común** de todas las Server Actions de formulario, del admin y del sitio público: `FormActionState` (errores por campo, error general y éxito, lo que devuelve la acción a `useActionState`), `fieldErrorsOf` (los errores de un `safeParse` fallido, con `z.flattenError`), `toFormState` (el fallo de un caso de uso, ya en forma de estado) y `readHoneypot` (lee el campo señuelo, siempre como texto). No hay textos aquí: nada de «Guardando…» ni de «Sending…».

**En cada kit, la presentación**, con sus textos: en el admin, `AdminFormFooter`, `AdminCountedField` y `AdminActionForm` (`components/admin`, en español); en el sitio público, `PublicField` (`components/form`) y `Honeypot` (`components/security`), en inglés. El idioma distinto es por diseño (el admin está en español y la interfaz pública en inglés, arquitectura §2.4), así que un componente de formulario no se comparte entre los dos kits.

**Para una acción nueva:** el tipo de estado y los helpers salen de este módulo; el caso de uso devuelve `ok` o un `FormFailure`; la Server Action lo convierte con `toFormState`; y el formulario se compone con las piezas de su kit.
