'use client'

import { useActionState, useState } from 'react'

import {
  createContentAction,
  type CreateContentActionState,
} from '@/app/admin/(panel)/contents/actions'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput, AdminSelect } from '@/components/admin/AdminControls'
import { AdminField, AdminFieldError } from '@/components/admin/AdminField'
import { AdminFormGrid } from '@/components/admin/AdminForm'
import { AdminMessage } from '@/components/admin/AdminMessage'
import { cx } from '@/components/admin/cx'
import {
  OTHER_DEFAULT_FREQUENCY,
  OTHER_MIN_FREQUENCY,
} from '@/modules/content/domain/otherSchema'

import styles from './NewContentForm.module.css'

const initialState: CreateContentActionState = {}

const contentTypes = [
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

type ContentTypeValue = (typeof contentTypes)[number]['value']

const otherKinds = [
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

type TypeCardProps = {
  name: string
  value: string
  symbol: string
  label: string
  description: string
  selected: boolean
  required?: boolean
  onSelect: () => void
}

/** Tarjeta de un radio (tipo de contenido o subtipo de Other). */
function TypeCard({
  name,
  value,
  symbol,
  label,
  description,
  selected,
  required,
  onSelect,
}: TypeCardProps) {
  return (
    <label className={cx(styles.typeCard, selected && styles.selected)}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={onSelect}
        required={required}
      />

      <span className={styles.symbol}>{symbol}</span>

      <span className={styles.copy}>
        <strong className={styles.copyTitle}>{label}</strong>

        <small className={styles.copyText}>{description}</small>
      </span>

      <span className={styles.check} aria-hidden="true">
        {selected ? '✓' : ''}
      </span>
    </label>
  )
}

function SectionHeading({
  step,
  title,
  children,
}: {
  step: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className={styles.sectionHeading}>
      <span className={styles.step}>{step}</span>

      <div>
        <h3 className={styles.sectionTitle}>{title}</h3>

        <p className={styles.sectionText}>{children}</p>
      </div>
    </div>
  )
}

export default function NewContentForm() {
  const [state, formAction, pending] = useActionState(
    createContentAction,
    initialState,
  )

  const [selectedType, setSelectedType] = useState<ContentTypeValue>('case')

  const [selectedKind, setSelectedKind] = useState<
    (typeof otherKinds)[number]['value'] | null
  >(null)

  const isOther = selectedType === 'other'

  // Una newsletter no tiene página ni URL, y su titular se escribe en el
  // editor: no necesita título, slug ni idioma para crear el borrador.
  const isNewsletter = isOther && selectedKind === 'newsletter'

  return (
    <form action={formAction}>
      <div className={styles.section}>
        <SectionHeading step={1} title="Tipo de contenido">
          Determina qué opciones estarán disponibles después en el editor.
        </SectionHeading>

        <div className={styles.typeGrid}>
          {contentTypes.map((type) => (
            <TypeCard
              key={type.value}
              name="type"
              value={type.value}
              symbol={type.symbol}
              label={type.label}
              description={type.description}
              selected={selectedType === type.value}
              onSelect={() => setSelectedType(type.value)}
            />
          ))}
        </div>

        <AdminFieldError>{state.fieldErrors?.type?.[0]}</AdminFieldError>
      </div>

      {isOther && (
        <div className={styles.section}>
          <SectionHeading step={2} title="Qué tipo de Other">
            Se elige ahora y no se puede cambiar después. Determina el editor y
            cómo aparece en el feed.
          </SectionHeading>

          <div className={styles.typeGrid}>
            {otherKinds.map((kind) => (
              <TypeCard
                key={kind.value}
                name="kind"
                value={kind.value}
                symbol={kind.symbol}
                label={kind.label}
                description={kind.description}
                selected={selectedKind === kind.value}
                required
                onSelect={() => setSelectedKind(kind.value)}
              />
            ))}
          </div>

          <AdminFieldError>{state.fieldErrors?.kind?.[0]}</AdminFieldError>

          <AdminField
            label="Frecuencia (una aparición cada N pines)"
            htmlFor="frequency"
            help={`Mínimo ${OTHER_MIN_FREQUENCY}. Las primeras apariciones se reparten desde el pin 10 y se espacian 8-15 pines entre contenidos; después, cada N. Podrás cambiarla desde el editor.`}
            error={state.fieldErrors?.frequency?.[0]}
          >
            <AdminInput
              id="frequency"
              name="frequency"
              type="number"
              inputMode="numeric"
              min={OTHER_MIN_FREQUENCY}
              step={1}
              defaultValue={OTHER_DEFAULT_FREQUENCY}
              required
            />
          </AdminField>
        </div>
      )}

      {!isNewsletter && (
        <div className={styles.section}>
          <SectionHeading step={isOther ? 3 : 2} title="Datos básicos">
            Define cómo se identificará el contenido dentro del panel y en la
            web.
          </SectionHeading>

          <AdminField
            label="Título"
            htmlFor="title"
            help="Podrás modificarlo después y añadir traducciones desde el editor."
            error={state.fieldErrors?.title?.[0]}
          >
            <AdminInput
              id="title"
              name="title"
              type="text"
              placeholder="Ej. Nutrivo Group — Biotecnología"
              required
              autoFocus
            />
          </AdminField>

          <AdminFormGrid>
            <AdminField
              label="Slug"
              htmlFor="slug"
              help="Forma parte de la URL pública. Utiliza minúsculas y guiones."
              error={state.fieldErrors?.slug?.[0]}
            >
              <div className={styles.slug}>
                <span className={styles.slugPrefix}>/</span>

                <AdminInput
                  id="slug"
                  name="slug"
                  type="text"
                  placeholder="mi-primer-caso"
                  required
                />
              </div>
            </AdminField>

            <AdminField
              label="Idioma principal"
              htmlFor="defaultLocale"
              help="Será el idioma principal del contenido."
              error={state.fieldErrors?.defaultLocale?.[0]}
            >
              <AdminSelect
                id="defaultLocale"
                name="defaultLocale"
                defaultValue="es"
              >
                <option value="es">Español</option>

                <option value="en">English</option>

                <option value="ca">Català</option>
              </AdminSelect>
            </AdminField>
          </AdminFormGrid>
        </div>
      )}

      {state.formError && (
        <AdminMessage kind="error">{state.formError}</AdminMessage>
      )}

      <div className={styles.footer}>
        <div className={styles.note}>
          <span className={styles.noteIcon} aria-hidden="true">
            i
          </span>

          <p className={styles.noteText}>
            <strong>Se creará como borrador.</strong>{' '}
            {isNewsletter
              ? 'Después escribirás el titular y el texto en el editor antes de publicarla.'
              : 'Después podrás añadir el resto de información antes de publicarlo.'}
          </p>
        </div>

        <AdminButton
          type="submit"
          variant="primary"
          className={styles.submit}
          disabled={pending}
        >
          {pending ? 'Creando borrador...' : 'Crear borrador →'}
        </AdminButton>
      </div>
    </form>
  )
}
