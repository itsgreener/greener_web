/**
 * GENERADO con `npm run db:types` a partir del esquema de Supabase. No editar a mano:
 * cualquier cambio se pierde al regenerar. Fuente de verdad: supabase/migrations.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_allowed_domain: {
        Row: {
          created_at: string
          domain: string
          id: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
        }
        Relationships: []
      }
      admin_profile: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          last_login: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          last_login?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          last_login?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          payload: Json | null
        }
        Insert: {
          action: string
          actor_email: string
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_email?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          payload?: Json | null
        }
        Relationships: []
      }
      case_detail: {
        Row: {
          client: string | null
          content_id: string
          force: number
        }
        Insert: {
          client?: string | null
          content_id: string
          force?: number
        }
        Update: {
          client?: string | null
          content_id?: string
          force?: number
        }
        Relationships: [
          {
            foreignKeyName: "case_detail_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: true
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      case_detail_media: {
        Row: {
          alt: string
          content_id: string
          created_at: string
          id: string
          media_id: string
          sort_order: number
        }
        Insert: {
          alt: string
          content_id: string
          created_at?: string
          id?: string
          media_id: string
          sort_order?: number
        }
        Update: {
          alt?: string
          content_id?: string
          created_at?: string
          id?: string
          media_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "case_detail_media_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_detail_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_asset"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submission: {
        Row: {
          created_at: string
          error: string | null
          id: string
          ip_hash: string
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          ip_hash: string
          status: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          ip_hash?: string
          status?: string
        }
        Relationships: []
      }
      content: {
        Row: {
          cover_media_id: string | null
          cover_ratio: Database["public"]["Enums"]["pin_ratio"] | null
          created_at: string
          default_locale: Database["public"]["Enums"]["locale"]
          id: string
          og_media_id: string | null
          publish_at: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
        }
        Insert: {
          cover_media_id?: string | null
          cover_ratio?: Database["public"]["Enums"]["pin_ratio"] | null
          created_at?: string
          default_locale?: Database["public"]["Enums"]["locale"]
          id?: string
          og_media_id?: string | null
          publish_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
        }
        Update: {
          cover_media_id?: string | null
          cover_ratio?: Database["public"]["Enums"]["pin_ratio"] | null
          created_at?: string
          default_locale?: Database["public"]["Enums"]["locale"]
          id?: string
          og_media_id?: string | null
          publish_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media_asset"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_og_media_fk"
            columns: ["og_media_id"]
            isOneToOne: false
            referencedRelation: "media_asset"
            referencedColumns: ["id"]
          },
        ]
      }
      content_tag: {
        Row: {
          content_id: string
          tag_id: string
        }
        Insert: {
          content_id: string
          tag_id: string
        }
        Update: {
          content_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_tag_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_tag_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tag"
            referencedColumns: ["id"]
          },
        ]
      }
      content_translation: {
        Row: {
          body: string | null
          content_id: string
          highlight: string | null
          locale: Database["public"]["Enums"]["locale"]
          seo_description: string | null
          seo_title: string | null
          summary: string | null
          title: string
        }
        Insert: {
          body?: string | null
          content_id: string
          highlight?: string | null
          locale: Database["public"]["Enums"]["locale"]
          seo_description?: string | null
          seo_title?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          body?: string | null
          content_id?: string
          highlight?: string | null
          locale?: Database["public"]["Enums"]["locale"]
          seo_description?: string | null
          seo_title?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_translation_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      episode: {
        Row: {
          company: string | null
          content_id: string
          duration_seconds: number | null
          embed_id: string
          episode_date: string | null
          episode_kind: Database["public"]["Enums"]["episode_kind"]
          guest: string | null
          language: Database["public"]["Enums"]["locale"]
          number: number | null
          program: Database["public"]["Enums"]["episode_program"]
          provider: Database["public"]["Enums"]["episode_provider"]
          role: string | null
        }
        Insert: {
          company?: string | null
          content_id: string
          duration_seconds?: number | null
          embed_id: string
          episode_date?: string | null
          episode_kind?: Database["public"]["Enums"]["episode_kind"]
          guest?: string | null
          language: Database["public"]["Enums"]["locale"]
          number?: number | null
          program: Database["public"]["Enums"]["episode_program"]
          provider: Database["public"]["Enums"]["episode_provider"]
          role?: string | null
        }
        Update: {
          company?: string | null
          content_id?: string
          duration_seconds?: number | null
          embed_id?: string
          episode_date?: string | null
          episode_kind?: Database["public"]["Enums"]["episode_kind"]
          guest?: string | null
          language?: Database["public"]["Enums"]["locale"]
          number?: number | null
          program?: Database["public"]["Enums"]["episode_program"]
          provider?: Database["public"]["Enums"]["episode_provider"]
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "episode_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: true
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_config: {
        Row: {
          batch_size: number
          distance_window: number
          id: string
          mix_window: number
          ratios: Json
          updated_at: string
          video_limit_desktop: number
          video_limit_mobile: number
        }
        Insert: {
          batch_size?: number
          distance_window?: number
          id?: string
          mix_window?: number
          ratios?: Json
          updated_at?: string
          video_limit_desktop?: number
          video_limit_mobile?: number
        }
        Update: {
          batch_size?: number
          distance_window?: number
          id?: string
          mix_window?: number
          ratios?: Json
          updated_at?: string
          video_limit_desktop?: number
          video_limit_mobile?: number
        }
        Relationships: []
      }
      feed_round: {
        Row: {
          generated_at: string
          ordered_pin_ids: string[]
          round_index: number
          session_id: string
        }
        Insert: {
          generated_at?: string
          ordered_pin_ids: string[]
          round_index: number
          session_id: string
        }
        Update: {
          generated_at?: string
          ordered_pin_ids?: string[]
          round_index?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_round_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "feed_session"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_session: {
        Row: {
          config_revision: number
          created_at: string
          exclude_content_id: string | null
          expires_at: string
          filter_hash: string | null
          id: string
          scope: string
          seed: string
        }
        Insert: {
          config_revision?: number
          created_at?: string
          exclude_content_id?: string | null
          expires_at?: string
          filter_hash?: string | null
          id?: string
          scope: string
          seed: string
        }
        Update: {
          config_revision?: number
          created_at?: string
          exclude_content_id?: string | null
          expires_at?: string
          filter_hash?: string | null
          id?: string
          scope?: string
          seed?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_session_exclude_content_id_fkey"
            columns: ["exclude_content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      html_package: {
        Row: {
          content_id: string
          current_version_id: string | null
          kind: Database["public"]["Enums"]["html_package_kind"]
        }
        Insert: {
          content_id: string
          current_version_id?: string | null
          kind: Database["public"]["Enums"]["html_package_kind"]
        }
        Update: {
          content_id?: string
          current_version_id?: string | null
          kind?: Database["public"]["Enums"]["html_package_kind"]
        }
        Relationships: [
          {
            foreignKeyName: "html_package_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: true
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "html_package_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "html_package_version"
            referencedColumns: ["id"]
          },
        ]
      }
      html_package_version: {
        Row: {
          checksum: string
          created_at: string
          id: string
          manifest: Json
          package_id: string
          status: Database["public"]["Enums"]["html_package_version_status"]
          storage_path: string
          version: number
        }
        Insert: {
          checksum: string
          created_at?: string
          id?: string
          manifest?: Json
          package_id: string
          status?: Database["public"]["Enums"]["html_package_version_status"]
          storage_path: string
          version: number
        }
        Update: {
          checksum?: string
          created_at?: string
          id?: string
          manifest?: Json
          package_id?: string
          status?: Database["public"]["Enums"]["html_package_version_status"]
          storage_path?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "html_package_version_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "html_package"
            referencedColumns: ["content_id"]
          },
        ]
      }
      media_asset: {
        Row: {
          bytes: number | null
          cloudinary_public_id: string
          created_at: string
          duration_seconds: number | null
          format: string | null
          height: number | null
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          status: Database["public"]["Enums"]["media_status"]
          warm_error: string | null
          warmed_at: string | null
          warmed_contract: string | null
          width: number | null
        }
        Insert: {
          bytes?: number | null
          cloudinary_public_id: string
          created_at?: string
          duration_seconds?: number | null
          format?: string | null
          height?: number | null
          id?: string
          kind: Database["public"]["Enums"]["media_kind"]
          status?: Database["public"]["Enums"]["media_status"]
          warm_error?: string | null
          warmed_at?: string | null
          warmed_contract?: string | null
          width?: number | null
        }
        Update: {
          bytes?: number | null
          cloudinary_public_id?: string
          created_at?: string
          duration_seconds?: number | null
          format?: string | null
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          status?: Database["public"]["Enums"]["media_status"]
          warm_error?: string | null
          warmed_at?: string | null
          warmed_contract?: string | null
          width?: number | null
        }
        Relationships: []
      }
      pin: {
        Row: {
          alt: string
          autoplay_mode: Database["public"]["Enums"]["pin_autoplay_mode"] | null
          content_id: string
          created_at: string
          id: string
          label: string | null
          language: Database["public"]["Enums"]["locale"]
          queue_order: number
          ratio: Database["public"]["Enums"]["pin_ratio"]
        }
        Insert: {
          alt: string
          autoplay_mode?:
            | Database["public"]["Enums"]["pin_autoplay_mode"]
            | null
          content_id: string
          created_at?: string
          id?: string
          label?: string | null
          language: Database["public"]["Enums"]["locale"]
          queue_order?: number
          ratio: Database["public"]["Enums"]["pin_ratio"]
        }
        Update: {
          alt?: string
          autoplay_mode?:
            | Database["public"]["Enums"]["pin_autoplay_mode"]
            | null
          content_id?: string
          created_at?: string
          id?: string
          label?: string | null
          language?: Database["public"]["Enums"]["locale"]
          queue_order?: number
          ratio?: Database["public"]["Enums"]["pin_ratio"]
        }
        Relationships: [
          {
            foreignKeyName: "pin_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      pin_media: {
        Row: {
          media_id: string
          pin_id: string
          slide_order: number
        }
        Insert: {
          media_id: string
          pin_id: string
          slide_order?: number
        }
        Update: {
          media_id?: string
          pin_id?: string
          slide_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pin_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_asset"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pin_media_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "pin"
            referencedColumns: ["id"]
          },
        ]
      }
      redirect_301: {
        Row: {
          active: boolean
          id: string
          source_path: string
          target_path: string
        }
        Insert: {
          active?: boolean
          id?: string
          source_path: string
          target_path: string
        }
        Update: {
          active?: boolean
          id?: string
          source_path?: string
          target_path?: string
        }
        Relationships: []
      }
      tag: {
        Row: {
          id: string
          name: string
          section: Database["public"]["Enums"]["tag_section"]
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          section: Database["public"]["Enums"]["tag_section"]
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          section?: Database["public"]["Enums"]["tag_section"]
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_case_carousel_image: {
        Args: {
          p_alt: string
          p_bytes: number
          p_cloudinary_public_id: string
          p_content_id: string
          p_format: string
          p_height: number
          p_sort_order: number
          p_width: number
        }
        Returns: string
      }
      add_case_carousel_video: {
        Args: {
          p_alt: string
          p_bytes: number
          p_cloudinary_public_id: string
          p_content_id: string
          p_duration_seconds: number
          p_format: string
          p_height: number
          p_sort_order: number
          p_width: number
        }
        Returns: string
      }
      attach_pin_image: {
        Args: {
          p_bytes: number
          p_cloudinary_public_id: string
          p_format: string
          p_height: number
          p_pin_id: string
          p_slide_order: number
          p_width: number
        }
        Returns: string
      }
      attach_pin_video: {
        Args: {
          p_bytes: number
          p_cloudinary_public_id: string
          p_duration_seconds: number
          p_format: string
          p_height: number
          p_pin_id: string
          p_slide_order: number
          p_width: number
        }
        Returns: string
      }
      create_content_draft: {
        Args: {
          p_default_locale: Database["public"]["Enums"]["locale"]
          p_slug: string
          p_title: string
          p_type: Database["public"]["Enums"]["content_type"]
        }
        Returns: string
      }
      create_html_package_version: {
        Args: {
          p_checksum: string
          p_content_id: string
          p_manifest: Json
          p_storage_path: string
          p_version: number
        }
        Returns: string
      }
      create_pin: {
        Args: {
          p_alt: string
          p_autoplay_mode: Database["public"]["Enums"]["pin_autoplay_mode"]
          p_content_id: string
          p_label: string
          p_language: Database["public"]["Enums"]["locale"]
          p_ratio: Database["public"]["Enums"]["pin_ratio"]
        }
        Returns: string
      }
      delete_content: { Args: { p_content_id: string }; Returns: string }
      delete_html_package_version: {
        Args: { p_content_id: string; p_version_id: string }
        Returns: string
      }
      delete_pin: { Args: { p_pin_id: string }; Returns: string }
      detach_pin_media: {
        Args: { p_media_id: string; p_pin_id: string }
        Returns: string
      }
      hook_allow_greener_domains: { Args: { event: Json }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      mark_media_asset_warmed: {
        Args: { p_contract: string; p_error?: string; p_media_id: string }
        Returns: undefined
      }
      publish_content: { Args: { p_content_id: string }; Returns: string }
      publish_html_package_version: {
        Args: { p_content_id: string; p_version_id: string }
        Returns: string
      }
      publish_scheduled_content: { Args: never; Returns: number }
      register_cover_image: {
        Args: {
          p_bytes: number
          p_cloudinary_public_id: string
          p_content_id: string
          p_format: string
          p_height: number
          p_ratio: Database["public"]["Enums"]["pin_ratio"]
          p_width: number
        }
        Returns: string
      }
      register_cover_video: {
        Args: {
          p_bytes: number
          p_cloudinary_public_id: string
          p_content_id: string
          p_duration_seconds: number
          p_format: string
          p_height: number
          p_ratio: Database["public"]["Enums"]["pin_ratio"]
          p_width: number
        }
        Returns: string
      }
      remove_case_carousel_media: {
        Args: { p_content_id: string; p_media_id: string }
        Returns: string
      }
      schedule_content: {
        Args: { p_content_id: string; p_publish_at: string }
        Returns: string
      }
      unlink_and_delete_cover_media: {
        Args: { p_content_id: string; p_media_id: string }
        Returns: string
      }
      unpublish_content: { Args: { p_content_id: string }; Returns: string }
      update_content: {
        Args: {
          p_content_id: string
          p_default_locale: Database["public"]["Enums"]["locale"]
          p_slug: string
        }
        Returns: string
      }
      update_pin: {
        Args: {
          p_alt: string
          p_autoplay_mode: Database["public"]["Enums"]["pin_autoplay_mode"]
          p_label: string
          p_language: Database["public"]["Enums"]["locale"]
          p_pin_id: string
          p_ratio: Database["public"]["Enums"]["pin_ratio"]
        }
        Returns: string
      }
      upsert_case_detail: {
        Args: { p_client: string; p_content_id: string; p_force: number }
        Returns: string
      }
      upsert_content_translation: {
        Args: {
          p_body: string
          p_content_id: string
          p_highlight: string
          p_locale: Database["public"]["Enums"]["locale"]
          p_seo_description: string
          p_seo_title: string
          p_summary: string
          p_title: string
        }
        Returns: string
      }
      upsert_episode: {
        Args: {
          p_company: string
          p_content_id: string
          p_duration_seconds: number
          p_embed_id: string
          p_episode_date: string
          p_episode_kind: Database["public"]["Enums"]["episode_kind"]
          p_guest: string
          p_language: Database["public"]["Enums"]["locale"]
          p_number: number
          p_program: Database["public"]["Enums"]["episode_program"]
          p_provider: Database["public"]["Enums"]["episode_provider"]
          p_role: string
        }
        Returns: string
      }
    }
    Enums: {
      content_status: "draft" | "scheduled" | "published"
      content_type: "case" | "insight" | "tool" | "episode" | "other"
      episode_kind: "podcast"
      episode_program:
        | "brand_the_future"
        | "brand_into_europe"
        | "brand_to_table"
      episode_provider: "youtube" | "vimeo" | "spotify"
      html_package_kind: "insight" | "tool"
      html_package_version_status: "draft" | "published" | "rolled_back"
      locale: "es" | "en" | "ca"
      media_kind: "image" | "video"
      media_status: "processing" | "ready" | "error"
      pin_autoplay_mode: "viewport" | "hover"
      pin_ratio: "1:1" | "4:5" | "3:4" | "2:3" | "9:16" | "16:9" | "4:3"
      tag_section: "home" | "insights" | "tools" | "channel" | "shop"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      content_status: ["draft", "scheduled", "published"],
      content_type: ["case", "insight", "tool", "episode", "other"],
      episode_kind: ["podcast"],
      episode_program: [
        "brand_the_future",
        "brand_into_europe",
        "brand_to_table",
      ],
      episode_provider: ["youtube", "vimeo", "spotify"],
      html_package_kind: ["insight", "tool"],
      html_package_version_status: ["draft", "published", "rolled_back"],
      locale: ["es", "en", "ca"],
      media_kind: ["image", "video"],
      media_status: ["processing", "ready", "error"],
      pin_autoplay_mode: ["viewport", "hover"],
      pin_ratio: ["1:1", "4:5", "3:4", "2:3", "9:16", "16:9", "4:3"],
      tag_section: ["home", "insights", "tools", "channel", "shop"],
    },
  },
} as const
