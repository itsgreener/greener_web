import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database as GeneratedDatabase,
  Enums,
  Tables,
  TablesInsert,
  TablesUpdate,
} from '@/lib/supabase/database.types'

export type { Enums, Tables, TablesInsert, TablesUpdate }

/**
 * `Database` que usan los clientes de Supabase: el tipo GENERADO
 * (`database.types.ts`, no se edita a mano) más una única corrección.
 *
 * La CLI de Supabase tipa todos los argumentos de las funciones RPC como no
 * nulos, aunque Postgres los acepte (`p_label text` admite `null`). Aquí se
 * listan los parámetros que SÍ aceptan `null`, para que `rpc()` los deje
 * pasar sin casts. Si añades una función con un parámetro nullable, apúntalo
 * en `NullableRpcArgs`; si te olvidas, tsc lo avisa en la primera llamada.
 */
type NullableRpcArgs = {
  create_pin: 'p_label' | 'p_autoplay_mode'
  update_pin: 'p_label' | 'p_autoplay_mode'
  attach_pin_image: 'p_format'
  attach_pin_video: 'p_format'
  upsert_case_detail: 'p_client'
  upsert_content_translation:
    'p_seo_title' | 'p_seo_description' | 'p_summary' | 'p_highlight' | 'p_body'
  upsert_episode:
    | 'p_number'
    | 'p_guest'
    | 'p_role'
    | 'p_company'
    | 'p_episode_date'
    | 'p_duration_seconds'
  mark_media_asset_warmed: 'p_error'
}

type GeneratedFunctions = GeneratedDatabase['public']['Functions']

type WithNullableArgs<Fn, Keys extends PropertyKey> = Fn extends {
  Args: infer A
}
  ? Omit<Fn, 'Args'> & {
      Args: { [K in keyof A]: K extends Keys ? A[K] | null : A[K] }
    }
  : Fn

type PatchedFunctions = {
  [Name in keyof GeneratedFunctions]: Name extends keyof NullableRpcArgs
    ? WithNullableArgs<GeneratedFunctions[Name], NullableRpcArgs[Name]>
    : GeneratedFunctions[Name]
}

export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GeneratedDatabase['public'], 'Functions'> & {
    Functions: PatchedFunctions
  }
}

/** Cliente de Supabase tipado con el esquema; sirve para funciones que reciben uno ya creado. */
export type AppSupabaseClient = SupabaseClient<Database>
