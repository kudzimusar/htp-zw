// Generated from HealthTimes Staging (2026-09-19).
// Source project: gcdohgbmqhqwydgaxrcr. Do not hand-edit; regenerate from Supabase.

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
      ad_campaigns: {
        Row: {
          advertiser_id: string
          created_at: string
          end_at: string | null
          id: string
          name: string
          review_status: string
          start_at: string | null
          status: string
        }
        Insert: {
          advertiser_id: string
          created_at?: string
          end_at?: string | null
          id?: string
          name: string
          review_status?: string
          start_at?: string | null
          status?: string
        }
        Update: {
          advertiser_id?: string
          created_at?: string
          end_at?: string | null
          id?: string
          name?: string
          review_status?: string
          start_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_creatives: {
        Row: {
          campaign_id: string
          created_at: string
          destination_url: string | null
          disclosure_label: string
          id: string
          media_id: string | null
          placement: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          destination_url?: string | null
          disclosure_label?: string
          id?: string
          media_id?: string | null
          placement: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          destination_url?: string | null
          disclosure_label?: string
          id?: string
          media_id?: string | null
          placement?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creatives_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_events: {
        Row: {
          anonymous_actor_id: string | null
          campaign_id: string | null
          country: string | null
          creative_id: string | null
          device_category: string | null
          event_name: string
          id: string
          occurred_at: string
          page_path: string | null
          placement_id: string | null
          raw: Json
          story_id: string | null
        }
        Insert: {
          anonymous_actor_id?: string | null
          campaign_id?: string | null
          country?: string | null
          creative_id?: string | null
          device_category?: string | null
          event_name: string
          id?: string
          occurred_at: string
          page_path?: string | null
          placement_id?: string | null
          raw?: Json
          story_id?: string | null
        }
        Update: {
          anonymous_actor_id?: string | null
          campaign_id?: string | null
          country?: string | null
          creative_id?: string | null
          device_category?: string | null
          event_name?: string
          id?: string
          occurred_at?: string
          page_path?: string | null
          placement_id?: string | null
          raw?: Json
          story_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "ad_placements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_placements: {
        Row: {
          allowed_sources: string[]
          created_at: string
          default_source: string
          id: string
          layout_policy: Json
          name: string
          placement_key: string
          status: string
        }
        Insert: {
          allowed_sources?: string[]
          created_at?: string
          default_source?: string
          id?: string
          layout_policy?: Json
          name: string
          placement_key: string
          status?: string
        }
        Update: {
          allowed_sources?: string[]
          created_at?: string
          default_source?: string
          id?: string
          layout_policy?: Json
          name?: string
          placement_key?: string
          status?: string
        }
        Relationships: []
      }
      adsense_daily_metrics: {
        Row: {
          ad_client_id: string | null
          ad_impressions: number | null
          ad_rpm: number | null
          ad_slot_id: string | null
          clicks: number | null
          country: string | null
          cpc: number | null
          device_category: string | null
          estimated_earnings: number | null
          id: string
          imported_at: string
          ingestion_run_id: string | null
          integration_id: string | null
          metric_date: string
          page_path: string | null
          page_rpm: number | null
          publisher_id: string | null
          raw: Json
          viewability: number | null
        }
        Insert: {
          ad_client_id?: string | null
          ad_impressions?: number | null
          ad_rpm?: number | null
          ad_slot_id?: string | null
          clicks?: number | null
          country?: string | null
          cpc?: number | null
          device_category?: string | null
          estimated_earnings?: number | null
          id?: string
          imported_at?: string
          ingestion_run_id?: string | null
          integration_id?: string | null
          metric_date: string
          page_path?: string | null
          page_rpm?: number | null
          publisher_id?: string | null
          raw?: Json
          viewability?: number | null
        }
        Update: {
          ad_client_id?: string | null
          ad_impressions?: number | null
          ad_rpm?: number | null
          ad_slot_id?: string | null
          clicks?: number | null
          country?: string | null
          cpc?: number | null
          device_category?: string | null
          estimated_earnings?: number | null
          id?: string
          imported_at?: string
          ingestion_run_id?: string | null
          integration_id?: string | null
          metric_date?: string
          page_path?: string | null
          page_rpm?: number | null
          publisher_id?: string | null
          raw?: Json
          viewability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "adsense_daily_metrics_ingestion_run_id_fkey"
            columns: ["ingestion_run_id"]
            isOneToOne: false
            referencedRelation: "analytics_ingestion_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adsense_daily_metrics_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "analytics_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisers: {
        Row: {
          contact_notes: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          contact_notes?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          contact_notes?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      analytics_daily_metrics: {
        Row: {
          ad_clicks: number | null
          ad_impressions: number | null
          ad_revenue: number | null
          average_engagement_seconds: number | null
          bounce_rate: number | null
          campaign: string | null
          conversion_count: number | null
          country: string | null
          device_category: string | null
          engaged_sessions: number | null
          event_count: number | null
          event_name: string | null
          id: string
          imported_at: string
          ingestion_run_id: string | null
          integration_id: string | null
          medium: string | null
          metric_date: string
          page_views: number | null
          path: string | null
          raw: Json
          region: string | null
          sessions_count: number | null
          source: string | null
          source_property_id: string | null
          source_system: string
          story_id: string | null
          users_count: number | null
        }
        Insert: {
          ad_clicks?: number | null
          ad_impressions?: number | null
          ad_revenue?: number | null
          average_engagement_seconds?: number | null
          bounce_rate?: number | null
          campaign?: string | null
          conversion_count?: number | null
          country?: string | null
          device_category?: string | null
          engaged_sessions?: number | null
          event_count?: number | null
          event_name?: string | null
          id?: string
          imported_at?: string
          ingestion_run_id?: string | null
          integration_id?: string | null
          medium?: string | null
          metric_date: string
          page_views?: number | null
          path?: string | null
          raw?: Json
          region?: string | null
          sessions_count?: number | null
          source?: string | null
          source_property_id?: string | null
          source_system?: string
          story_id?: string | null
          users_count?: number | null
        }
        Update: {
          ad_clicks?: number | null
          ad_impressions?: number | null
          ad_revenue?: number | null
          average_engagement_seconds?: number | null
          bounce_rate?: number | null
          campaign?: string | null
          conversion_count?: number | null
          country?: string | null
          device_category?: string | null
          engaged_sessions?: number | null
          event_count?: number | null
          event_name?: string | null
          id?: string
          imported_at?: string
          ingestion_run_id?: string | null
          integration_id?: string | null
          medium?: string | null
          metric_date?: string
          page_views?: number | null
          path?: string | null
          raw?: Json
          region?: string | null
          sessions_count?: number | null
          source?: string | null
          source_property_id?: string | null
          source_system?: string
          story_id?: string | null
          users_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_daily_metrics_ingestion_run_id_fkey"
            columns: ["ingestion_run_id"]
            isOneToOne: false
            referencedRelation: "analytics_ingestion_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_daily_metrics_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "analytics_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_daily_metrics_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_ingestion_runs: {
        Row: {
          checkpoint: Json
          error: string | null
          finished_at: string | null
          id: string
          integration_id: string | null
          job_key: string
          range_end: string | null
          range_start: string | null
          rows_inserted: number
          rows_processed: number
          rows_updated: number
          source_property_id: string | null
          source_system: string
          started_at: string
          status: string
        }
        Insert: {
          checkpoint?: Json
          error?: string | null
          finished_at?: string | null
          id?: string
          integration_id?: string | null
          job_key: string
          range_end?: string | null
          range_start?: string | null
          rows_inserted?: number
          rows_processed?: number
          rows_updated?: number
          source_property_id?: string | null
          source_system: string
          started_at?: string
          status?: string
        }
        Update: {
          checkpoint?: Json
          error?: string | null
          finished_at?: string | null
          id?: string
          integration_id?: string | null
          job_key?: string
          range_end?: string | null
          range_start?: string | null
          rows_inserted?: number
          rows_processed?: number
          rows_updated?: number
          source_property_id?: string | null
          source_system?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_ingestion_runs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "analytics_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_integrations: {
        Row: {
          configuration: Json
          created_at: string
          credential_secret_ref: string | null
          external_account_id: string | null
          external_measurement_id: string | null
          external_property_id: string | null
          external_stream_id: string | null
          id: string
          integration_key: string
          last_error: string | null
          last_error_at: string | null
          last_success_at: string | null
          notes: string | null
          provider: string
          public_identifier: string | null
          status: string
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          credential_secret_ref?: string | null
          external_account_id?: string | null
          external_measurement_id?: string | null
          external_property_id?: string | null
          external_stream_id?: string | null
          id?: string
          integration_key: string
          last_error?: string | null
          last_error_at?: string | null
          last_success_at?: string | null
          notes?: string | null
          provider: string
          public_identifier?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          credential_secret_ref?: string | null
          external_account_id?: string | null
          external_measurement_id?: string | null
          external_property_id?: string | null
          external_stream_id?: string | null
          id?: string
          integration_key?: string
          last_error?: string | null
          last_error_at?: string | null
          last_success_at?: string | null
          notes?: string | null
          provider?: string
          public_identifier?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      audience_events: {
        Row: {
          anonymous_actor_id: string | null
          campaign: string | null
          country: string | null
          device_category: string | null
          event_name: string
          event_version: string
          id: string
          medium: string | null
          occurred_at: string
          page_path: string | null
          parameters: Json
          region: string | null
          source: string | null
          story_id: string | null
          subscriber_id: string | null
        }
        Insert: {
          anonymous_actor_id?: string | null
          campaign?: string | null
          country?: string | null
          device_category?: string | null
          event_name: string
          event_version?: string
          id?: string
          medium?: string | null
          occurred_at: string
          page_path?: string | null
          parameters?: Json
          region?: string | null
          source?: string | null
          story_id?: string | null
          subscriber_id?: string | null
        }
        Update: {
          anonymous_actor_id?: string | null
          campaign?: string | null
          country?: string | null
          device_category?: string | null
          event_name?: string
          event_version?: string
          id?: string
          medium?: string | null
          occurred_at?: string
          page_path?: string | null
          parameters?: Json
          region?: string | null
          source?: string | null
          story_id?: string | null
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audience_events_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audience_events_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_staff_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_staff_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_staff_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_staff_id_fkey"
            columns: ["actor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      authors: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string
          id: string
          slug: string
          wordpress_source_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name: string
          id?: string
          slug: string
          wordpress_source_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          slug?: string
          wordpress_source_id?: string | null
        }
        Relationships: []
      }
      citation_references: {
        Row: {
          authority_score: number | null
          cited_at: string | null
          country: string | null
          created_at: string
          id: string
          provider: string | null
          provider_reference: string | null
          raw: Json
          reference_type: string
          source_name: string | null
          source_url: string | null
          status: string
          story_id: string | null
          title: string | null
        }
        Insert: {
          authority_score?: number | null
          cited_at?: string | null
          country?: string | null
          created_at?: string
          id?: string
          provider?: string | null
          provider_reference?: string | null
          raw?: Json
          reference_type: string
          source_name?: string | null
          source_url?: string | null
          status?: string
          story_id?: string | null
          title?: string | null
        }
        Update: {
          authority_score?: number | null
          cited_at?: string | null
          country?: string | null
          created_at?: string
          id?: string
          provider?: string | null
          provider_reference?: string | null
          raw?: Json
          reference_type?: string
          source_name?: string | null
          source_url?: string | null
          status?: string
          story_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "citation_references_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_desks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      geographic_zones: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          parent_zone_id: string | null
          slug: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          parent_zone_id?: string | null
          slug: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_zone_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "geographic_zones_parent_zone_id_fkey"
            columns: ["parent_zone_id"]
            isOneToOne: false
            referencedRelation: "geographic_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_sources: {
        Row: {
          checksum: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          raw: Json
          site_url: string
          source_id: string
          source_type: string
          source_url: string | null
          stable_key: string
          system: string
        }
        Insert: {
          checksum?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          raw?: Json
          site_url: string
          source_id: string
          source_type: string
          source_url?: string | null
          stable_key: string
          system: string
        }
        Update: {
          checksum?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          raw?: Json
          site_url?: string
          source_id?: string
          source_type?: string
          source_url?: string | null
          stable_key?: string
          system?: string
        }
        Relationships: []
      }
      legacy_url_mappings: {
        Row: {
          id: string
          legacy_source_id: string | null
          new_path: string
          old_path: string
          preservation_strategy: string
          redirect_status: number
          verified_at: string | null
        }
        Insert: {
          id?: string
          legacy_source_id?: string | null
          new_path: string
          old_path: string
          preservation_strategy?: string
          redirect_status?: number
          verified_at?: string | null
        }
        Update: {
          id?: string
          legacy_source_id?: string | null
          new_path?: string
          old_path?: string
          preservation_strategy?: string
          redirect_status?: number
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legacy_url_mappings_legacy_source_id_fkey"
            columns: ["legacy_source_id"]
            isOneToOne: false
            referencedRelation: "legacy_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string | null
          caption: string | null
          checksum: string | null
          created_at: string
          credit: string | null
          filename: string
          height: number | null
          id: string
          legacy_source_id: string | null
          mime_type: string | null
          public_url: string | null
          source_url: string | null
          status: string
          storage_bucket: string | null
          storage_key: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          checksum?: string | null
          created_at?: string
          credit?: string | null
          filename: string
          height?: number | null
          id?: string
          legacy_source_id?: string | null
          mime_type?: string | null
          public_url?: string | null
          source_url?: string | null
          status?: string
          storage_bucket?: string | null
          storage_key?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          checksum?: string | null
          created_at?: string
          credit?: string | null
          filename?: string
          height?: number | null
          id?: string
          legacy_source_id?: string | null
          mime_type?: string | null
          public_url?: string | null
          source_url?: string | null
          status?: string
          storage_bucket?: string | null
          storage_key?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_legacy_source_id_fkey"
            columns: ["legacy_source_id"]
            isOneToOne: true
            referencedRelation: "legacy_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      media_usage: {
        Row: {
          media_id: string
          source_context: Json
          story_id: string
          usage_type: string
        }
        Insert: {
          media_id: string
          source_context?: Json
          story_id: string
          usage_type: string
        }
        Update: {
          media_id?: string
          source_context?: Json
          story_id?: string
          usage_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_usage_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_usage_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_runs: {
        Row: {
          counts: Json
          dry_run: boolean
          exceptions: Json
          finished_at: string | null
          id: string
          manifest_checksum: string | null
          mode: string
          source_system: string
          started_at: string
          status: string
        }
        Insert: {
          counts?: Json
          dry_run?: boolean
          exceptions?: Json
          finished_at?: string | null
          id?: string
          manifest_checksum?: string | null
          mode: string
          source_system: string
          started_at?: string
          status?: string
        }
        Update: {
          counts?: Json
          dry_run?: boolean
          exceptions?: Json
          finished_at?: string | null
          id?: string
          manifest_checksum?: string | null
          mode?: string
          source_system?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      monetization_settings: {
        Row: {
          ad_client_id: string | null
          ad_slot_id: string | null
          configuration: Json
          created_at: string
          id: string
          placement_key: string
          provider: string
          public_identifier: string | null
          seller_account_id: string | null
          source_plugin: string | null
          status: string
        }
        Insert: {
          ad_client_id?: string | null
          ad_slot_id?: string | null
          configuration?: Json
          created_at?: string
          id?: string
          placement_key: string
          provider: string
          public_identifier?: string | null
          seller_account_id?: string | null
          source_plugin?: string | null
          status?: string
        }
        Update: {
          ad_client_id?: string | null
          ad_slot_id?: string | null
          configuration?: Json
          created_at?: string
          id?: string
          placement_key?: string
          provider?: string
          public_identifier?: string | null
          seller_account_id?: string | null
          source_plugin?: string | null
          status?: string
        }
        Relationships: []
      }
      newsroom_capabilities: {
        Row: {
          description: string
          key: string
        }
        Insert: {
          description: string
          key: string
        }
        Update: {
          description?: string
          key?: string
        }
        Relationships: []
      }
      newsroom_role_capabilities: {
        Row: {
          capability_key: string
          role_id: string
        }
        Insert: {
          capability_key: string
          role_id: string
        }
        Update: {
          capability_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_role_capabilities_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "newsroom_capabilities"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "newsroom_role_capabilities_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "newsroom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      premium_entitlements: {
        Row: {
          ends_at: string | null
          id: string
          policy_key: string
          provider: string | null
          provider_reference: string | null
          starts_at: string
          subscriber_id: string
        }
        Insert: {
          ends_at?: string | null
          id?: string
          policy_key: string
          provider?: string | null
          provider_reference?: string | null
          starts_at?: string
          subscriber_id: string
        }
        Update: {
          ends_at?: string | null
          id?: string
          policy_key?: string
          provider?: string | null
          provider_reference?: string | null
          starts_at?: string
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_entitlements_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      search_console_daily_metrics: {
        Row: {
          average_position: number | null
          clicks: number | null
          country: string | null
          ctr: number | null
          device: string | null
          id: string
          imported_at: string
          impressions: number | null
          ingestion_run_id: string | null
          integration_id: string | null
          metric_date: string
          page: string | null
          query: string | null
          raw: Json
          search_appearance: string | null
          source_property_id: string | null
          story_id: string | null
        }
        Insert: {
          average_position?: number | null
          clicks?: number | null
          country?: string | null
          ctr?: number | null
          device?: string | null
          id?: string
          imported_at?: string
          impressions?: number | null
          ingestion_run_id?: string | null
          integration_id?: string | null
          metric_date: string
          page?: string | null
          query?: string | null
          raw?: Json
          search_appearance?: string | null
          source_property_id?: string | null
          story_id?: string | null
        }
        Update: {
          average_position?: number | null
          clicks?: number | null
          country?: string | null
          ctr?: number | null
          device?: string | null
          id?: string
          imported_at?: string
          impressions?: number | null
          ingestion_run_id?: string | null
          integration_id?: string | null
          metric_date?: string
          page?: string | null
          query?: string | null
          raw?: Json
          search_appearance?: string | null
          source_property_id?: string | null
          story_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_console_daily_metrics_ingestion_run_id_fkey"
            columns: ["ingestion_run_id"]
            isOneToOne: false
            referencedRelation: "analytics_ingestion_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_console_daily_metrics_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "analytics_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_console_daily_metrics_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          slug: string
          wordpress_source_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          wordpress_source_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          wordpress_source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_metadata: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: string | null
          id: string
          index_policy: string | null
          legacy_source_id: string | null
          open_graph: Json
          open_graph_description: string | null
          open_graph_image: string | null
          open_graph_title: string | null
          review_status: string
          reviewed_at: string | null
          robots: string | null
          schema_org: Json
          source_plugin: string | null
          story_id: string | null
          structured_data_type: string | null
          title: string | null
          twitter_card: Json
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          index_policy?: string | null
          legacy_source_id?: string | null
          open_graph?: Json
          open_graph_description?: string | null
          open_graph_image?: string | null
          open_graph_title?: string | null
          review_status?: string
          reviewed_at?: string | null
          robots?: string | null
          schema_org?: Json
          source_plugin?: string | null
          story_id?: string | null
          structured_data_type?: string | null
          title?: string | null
          twitter_card?: Json
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          index_policy?: string | null
          legacy_source_id?: string | null
          open_graph?: Json
          open_graph_description?: string | null
          open_graph_image?: string | null
          open_graph_title?: string | null
          review_status?: string
          reviewed_at?: string | null
          robots?: string | null
          schema_org?: Json
          source_plugin?: string | null
          story_id?: string | null
          structured_data_type?: string | null
          title?: string | null
          twitter_card?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_metadata_legacy_source_id_fkey"
            columns: ["legacy_source_id"]
            isOneToOne: true
            referencedRelation: "legacy_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_metadata_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: true
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          auth_user_id: string | null
          created_at: string
          desk: string | null
          display_name: string
          email: string
          id: string
          mfa_required: boolean
          revoked_at: string | null
          role_id: string | null
          status: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          desk?: string | null
          display_name: string
          email: string
          id?: string
          mfa_required?: boolean
          revoked_at?: string | null
          role_id?: string | null
          status?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          desk?: string | null
          display_name?: string
          email?: string
          id?: string
          mfa_required?: boolean
          revoked_at?: string | null
          role_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "newsroom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          access_policy: string
          author_id: string | null
          body_html: string | null
          body_json: Json | null
          canonical_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          legacy_source_id: string | null
          modified_at: string | null
          primary_section_id: string | null
          published_at: string | null
          scheduled_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          standfirst: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          access_policy?: string
          author_id?: string | null
          body_html?: string | null
          body_json?: Json | null
          canonical_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          legacy_source_id?: string | null
          modified_at?: string | null
          primary_section_id?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          standfirst?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          access_policy?: string
          author_id?: string | null
          body_html?: string | null
          body_json?: Json | null
          canonical_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          legacy_source_id?: string | null
          modified_at?: string | null
          primary_section_id?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          standfirst?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_stories_primary_section"
            columns: ["primary_section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_legacy_source_id_fkey"
            columns: ["legacy_source_id"]
            isOneToOne: true
            referencedRelation: "legacy_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      story_lifecycle_events: {
        Row: {
          actor_staff_id: string | null
          created_at: string
          from_status: string | null
          id: string
          reason: string | null
          story_id: string
          to_status: string
        }
        Insert: {
          actor_staff_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          story_id: string
          to_status: string
        }
        Update: {
          actor_staff_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          reason?: string | null
          story_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_lifecycle_events_actor_staff_id_fkey"
            columns: ["actor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_lifecycle_events_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_revisions: {
        Row: {
          body_html: string | null
          body_json: Json | null
          change_summary: string | null
          created_at: string
          editor_id: string | null
          id: string
          legacy_source_id: string | null
          revision_number: number
          story_id: string
          title: string | null
        }
        Insert: {
          body_html?: string | null
          body_json?: Json | null
          change_summary?: string | null
          created_at?: string
          editor_id?: string | null
          id?: string
          legacy_source_id?: string | null
          revision_number: number
          story_id: string
          title?: string | null
        }
        Update: {
          body_html?: string | null
          body_json?: Json | null
          change_summary?: string | null
          created_at?: string
          editor_id?: string | null
          id?: string
          legacy_source_id?: string | null
          revision_number?: number
          story_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_revisions_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_revisions_legacy_source_id_fkey"
            columns: ["legacy_source_id"]
            isOneToOne: false
            referencedRelation: "legacy_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_revisions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_tags: {
        Row: {
          story_id: string
          tag_id: string
        }
        Insert: {
          story_id: string
          tag_id: string
        }
        Update: {
          story_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_tags_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          auth_user_id: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          status: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          status?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          wordpress_source_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          wordpress_source_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          wordpress_source_id?: string | null
        }
        Relationships: []
      }
      web_vitals_daily_metrics: {
        Row: {
          cls: number | null
          expensive_assets: Json
          field_data_available: boolean
          id: string
          imported_at: string
          ingestion_run_id: string | null
          inp_ms: number | null
          integration_id: string | null
          lcp_ms: number | null
          metric_date: string
          page_path: string
          performance_score: number | null
          raw: Json
          strategy: string
        }
        Insert: {
          cls?: number | null
          expensive_assets?: Json
          field_data_available?: boolean
          id?: string
          imported_at?: string
          ingestion_run_id?: string | null
          inp_ms?: number | null
          integration_id?: string | null
          lcp_ms?: number | null
          metric_date: string
          page_path: string
          performance_score?: number | null
          raw?: Json
          strategy: string
        }
        Update: {
          cls?: number | null
          expensive_assets?: Json
          field_data_available?: boolean
          id?: string
          imported_at?: string
          ingestion_run_id?: string | null
          inp_ms?: number | null
          integration_id?: string | null
          lcp_ms?: number | null
          metric_date?: string
          page_path?: string
          performance_score?: number | null
          raw?: Json
          strategy?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_vitals_daily_metrics_ingestion_run_id_fkey"
            columns: ["ingestion_run_id"]
            isOneToOne: false
            referencedRelation: "analytics_ingestion_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_vitals_daily_metrics_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "analytics_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
