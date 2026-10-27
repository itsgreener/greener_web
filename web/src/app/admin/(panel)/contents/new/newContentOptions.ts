/**
 * Opciones del selector de «Nuevo contenido»: los cinco tipos y los dos
 * subtipos de Other, con su letra, nombre y descripción. El valor es el del
 * dominio (`contentTypeSchema` y `otherKindSchema`); aquí solo vive el texto
 * que se enseña en cada tarjeta.
 */

export const CONTENT_TYPE_CARDS = [
  {
    value: 'case',
    label: 'Case',
    description:
      'Proyecto o caso de trabajo con ficha, medios y contenido editorial.',
    symbol: 'C',
  },
  {
    value: 'insight',
    label: 'Insight',
    description:
      'Contenido editorial interactivo servido mediante paquete HTML.',
    symbol: 'I',
  },
  {
    value: 'tool',
    label: 'Tool',
    description: 'Herramienta interactiva ejecutada desde su propia página.',
    symbol: 'T',
  },
  {
    value: 'episode',
    label: 'Episode',
    description: 'Episodio de Channel con vídeo, podcast y datos del programa.',
    symbol: 'E',
  },
  {
    value: 'other',
    label: 'Other',
    description:
      'Pin de newsletter dentro del feed o página satélite de Greener.',
    symbol: 'O',
  },
] as const

export type ContentTypeValue = (typeof CONTENT_TYPE_CARDS)[number]['value']

export const OTHER_KIND_CARDS = [
  {
    value: 'newsletter',
    symbol: 'N',
    label: 'Pin de newsletter',
    description:
      'Tarjeta con formulario de alta dentro del feed. No tiene página ni destino: se rellena con título y texto.',
  },
  {
    value: 'page',
    symbol: 'P',
    label: 'Página satélite',
    description:
      'Página propia de Greener (campaña, careers, evento…) servida como paquete HTML y enlazada desde un pin del feed.',
  },
] as const

export type OtherKindValue = (typeof OTHER_KIND_CARDS)[number]['value']
