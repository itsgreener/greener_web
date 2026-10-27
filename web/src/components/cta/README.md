# CTA de la web pública (`components/cta`)

`Cta` es el único botón de llamada a la acción de la web pública: las cuatro formas comparten aspecto y estados (hover, foco, procesando). La posición (márgenes, `absolute`…) la pone cada sitio con `className`, no el CTA.

`CtaLink` es el enlace interno de Next: mientras navega se atenúa y no admite otro clic. `CtaAnchor` es el enlace externo (`<a>`), sin estado de espera. `CtaButton` es el botón; con `pending` se desactiva mientras se procesa la operación (el envío del contacto, por ejemplo). `CtaLabel` es la etiqueta no interactiva (la del pin).

Si necesitas un botón nuevo en la web pública, parte de uno de estos cuatro; el admin tiene el suyo en `components/admin/AdminButton`.
