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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ad_campaigns: {
        Row: {
          advertiser_id: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          end_at: string | null
          id: string
          name: string
          review_status: string
          start_at: string | null
          status: string
        }
        Insert: {
          advertiser_id: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: string
          name: string
          review_status?: string
          start_at?: string | null
          status?: string
        }
        Update: {
          advertiser_id?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
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
          {
            foreignKeyName: "ad_campaigns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_creatives: {
        Row: {
          campaign_id: string
          created_at: string
          created_by: string | null
          destination_url: string | null
          disclosure_label: string
          id: string
          media_id: string | null
          placement: string
          status: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          created_by?: string | null
          destination_url?: string | null
          disclosure_label?: string
          id?: string
          media_id?: string | null
          placement: string
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          created_by?: string | null
          destination_url?: string | null
          disclosure_label?: string
          id?: string
          media_id?: string | null
          placement?: string
          status?: string
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
            foreignKeyName: "ad_creatives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
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
      ad_placement_provenance: {
        Row: {
          ad_inserter_placement: boolean
          created_at: string
          current_source_attachment_id: string | null
          destination_url: string | null
          destination_url_state: string
          historical_revision_ids: string[]
          id: string
          notes: string | null
          placement_conditions: Json | null
          placement_conditions_state: string
          placement_id: string
          schedule: Json | null
          schedule_state: string
          source_system: string
          source_template_id: string | null
          source_template_title: string | null
          standalone_campaign_register_found: boolean | null
        }
        Insert: {
          ad_inserter_placement?: boolean
          created_at?: string
          current_source_attachment_id?: string | null
          destination_url?: string | null
          destination_url_state: string
          historical_revision_ids?: string[]
          id?: string
          notes?: string | null
          placement_conditions?: Json | null
          placement_conditions_state: string
          placement_id: string
          schedule?: Json | null
          schedule_state: string
          source_system: string
          source_template_id?: string | null
          source_template_title?: string | null
          standalone_campaign_register_found?: boolean | null
        }
        Update: {
          ad_inserter_placement?: boolean
          created_at?: string
          current_source_attachment_id?: string | null
          destination_url?: string | null
          destination_url_state?: string
          historical_revision_ids?: string[]
          id?: string
          notes?: string | null
          placement_conditions?: Json | null
          placement_conditions_state?: string
          placement_id?: string
          schedule?: Json | null
          schedule_state?: string
          source_system?: string
          source_template_id?: string | null
          source_template_title?: string | null
          standalone_campaign_register_found?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_placement_provenance_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "ad_placements"
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
      ad_source_assets: {
        Row: {
          advertiser_id: string | null
          asset_source_provenance: string
          byte_identity_group: string | null
          campaign_id: string | null
          checksum_sha256: string | null
          created_at: string
          creative_id: string | null
          id: string
          media_id: string | null
          notes: string | null
          source_attachment_id: string
          source_role: string
          source_system: string
        }
        Insert: {
          advertiser_id?: string | null
          asset_source_provenance: string
          byte_identity_group?: string | null
          campaign_id?: string | null
          checksum_sha256?: string | null
          created_at?: string
          creative_id?: string | null
          id?: string
          media_id?: string | null
          notes?: string | null
          source_attachment_id: string
          source_role: string
          source_system: string
        }
        Update: {
          advertiser_id?: string | null
          asset_source_provenance?: string
          byte_identity_group?: string | null
          campaign_id?: string | null
          checksum_sha256?: string | null
          created_at?: string
          creative_id?: string | null
          id?: string
          media_id?: string | null
          notes?: string | null
          source_attachment_id?: string
          source_role?: string
          source_system?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_source_assets_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_source_assets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_source_assets_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_source_assets_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
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
      ag05_internal_link_audit: {
        Row: {
          classification: string
          http_status: number
          occurrences: number
          path: string
          reason: string | null
          refreshed_at: string
          target_path: string | null
        }
        Insert: {
          classification: string
          http_status: number
          occurrences: number
          path: string
          reason?: string | null
          refreshed_at?: string
          target_path?: string | null
        }
        Update: {
          classification?: string
          http_status?: number
          occurrences?: number
          path?: string
          reason?: string | null
          refreshed_at?: string
          target_path?: string | null
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
      analytics_event_definitions: {
        Row: {
          created_at: string
          event_name: string
          event_version: string
          id: string
          notes: string | null
          prohibited_parameters: string[]
          required_parameters: string[]
          scope: string
          status: string
        }
        Insert: {
          created_at?: string
          event_name: string
          event_version: string
          id?: string
          notes?: string | null
          prohibited_parameters?: string[]
          required_parameters?: string[]
          scope?: string
          status?: string
        }
        Update: {
          created_at?: string
          event_name?: string
          event_version?: string
          id?: string
          notes?: string | null
          prohibited_parameters?: string[]
          required_parameters?: string[]
          scope?: string
          status?: string
        }
        Relationships: []
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
      audience_campaigns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          channel: string
          created_at: string
          created_by: string
          html_content: string | null
          id: string
          metadata: Json
          name: string
          provider: string
          provider_campaign_id: string | null
          purpose: string
          scheduled_at: string | null
          segment_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          text_content: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          channel?: string
          created_at?: string
          created_by: string
          html_content?: string | null
          id?: string
          metadata?: Json
          name: string
          provider?: string
          provider_campaign_id?: string | null
          purpose: string
          scheduled_at?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          text_content?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          channel?: string
          created_at?: string
          created_by?: string
          html_content?: string | null
          id?: string
          metadata?: Json
          name?: string
          provider?: string
          provider_campaign_id?: string | null
          purpose?: string
          scheduled_at?: string | null
          segment_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          text_content?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audience_campaigns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audience_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audience_campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "contact_segments"
            referencedColumns: ["id"]
          },
        ]
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
      campaign_recipients: {
        Row: {
          campaign_id: string
          contact_id: string
          eligibility_status: string
          last_event_at: string | null
          metadata: Json
          provider_recipient_id: string | null
        }
        Insert: {
          campaign_id: string
          contact_id: string
          eligibility_status: string
          last_event_at?: string | null
          metadata?: Json
          provider_recipient_id?: string | null
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          eligibility_status?: string
          last_event_at?: string | null
          metadata?: Json
          provider_recipient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "audience_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      communication_accounts: {
        Row: {
          account_key: string
          config_metadata: Json
          created_at: string
          environment: string
          id: string
          inbound_identity: string | null
          last_verified_at: string | null
          provider: string
          purpose: string
          sender_identity: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_key: string
          config_metadata?: Json
          created_at?: string
          environment?: string
          id?: string
          inbound_identity?: string | null
          last_verified_at?: string | null
          provider: string
          purpose: string
          sender_identity?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_key?: string
          config_metadata?: Json
          created_at?: string
          environment?: string
          id?: string
          inbound_identity?: string | null
          last_verified_at?: string | null
          provider?: string
          purpose?: string
          sender_identity?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      communication_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          released_at: string | null
          staff_profile_id: string
          status: string
          thread_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          released_at?: string | null
          staff_profile_id: string
          status?: string
          thread_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          released_at?: string | null
          staff_profile_id?: string
          status?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_assignments_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_assignments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_attachments: {
        Row: {
          byte_size: number
          created_at: string
          deleted_at: string | null
          filename: string
          id: string
          message_id: string
          mime_type: string
          quarantine_reason: string | null
          ready_at: string | null
          scan_status: string
          sha256: string | null
          status: string
          storage_bucket: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          byte_size: number
          created_at?: string
          deleted_at?: string | null
          filename: string
          id?: string
          message_id: string
          mime_type: string
          quarantine_reason?: string | null
          ready_at?: string | null
          scan_status?: string
          sha256?: string | null
          status?: string
          storage_bucket?: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          byte_size?: number
          created_at?: string
          deleted_at?: string | null
          filename?: string
          id?: string
          message_id?: string
          mime_type?: string
          quarantine_reason?: string | null
          ready_at?: string | null
          scan_status?: string
          sha256?: string | null
          status?: string
          storage_bucket?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "communication_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_channels: {
        Row: {
          channel_type: string
          created_at: string
          display_name: string
          environment: string
          id: string
          inbound_identity: string | null
          key: string
          outbound_identity: string | null
          provider: string | null
          queue_scope: string
          status: string
          updated_at: string
        }
        Insert: {
          channel_type?: string
          created_at?: string
          display_name: string
          environment?: string
          id?: string
          inbound_identity?: string | null
          key: string
          outbound_identity?: string | null
          provider?: string | null
          queue_scope: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel_type?: string
          created_at?: string
          display_name?: string
          environment?: string
          id?: string
          inbound_identity?: string | null
          key?: string
          outbound_identity?: string | null
          provider?: string | null
          queue_scope?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      communication_events: {
        Row: {
          contact_id: string | null
          created_at: string
          event_type: string
          id: string
          message_id: string | null
          metadata: Json
          occurred_at: string
          provider: string
          provider_event_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          message_id?: string | null
          metadata?: Json
          occurred_at?: string
          provider: string
          provider_event_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          message_id?: string | null
          metadata?: Json
          occurred_at?: string
          provider?: string
          provider_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "communication_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_idempotency_keys: {
        Row: {
          created_at: string
          id: string
          key: string
          resource_id: string | null
          resource_type: string | null
          scope: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          resource_id?: string | null
          resource_type?: string | null
          scope: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          resource_id?: string | null
          resource_type?: string | null
          scope?: string
        }
        Relationships: []
      }
      communication_messages: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string
          created_by_staff_id: string | null
          direction: string
          id: string
          idempotency_key: string | null
          message_kind: string
          provider: string | null
          provider_created_at: string | null
          provider_message_id: string | null
          recipient_emails: Json
          reply_to: string | null
          sender_email: string | null
          sent_at: string | null
          status: string
          subject: string | null
          thread_id: string
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          created_by_staff_id?: string | null
          direction: string
          id?: string
          idempotency_key?: string | null
          message_kind?: string
          provider?: string | null
          provider_created_at?: string | null
          provider_message_id?: string | null
          recipient_emails?: Json
          reply_to?: string | null
          sender_email?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          thread_id: string
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          created_by_staff_id?: string | null
          direction?: string
          id?: string
          idempotency_key?: string | null
          message_kind?: string
          provider?: string | null
          provider_created_at?: string | null
          provider_message_id?: string | null
          recipient_emails?: Json
          reply_to?: string | null
          sender_email?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_messages_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_notification_escalations: {
        Row: {
          created_at: string
          escalated_by: string
          id: string
          message_id: string
          notification_id: string
          provider: string | null
          provider_message_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          escalated_by: string
          id?: string
          message_id: string
          notification_id: string
          provider?: string | null
          provider_message_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          escalated_by?: string
          id?: string
          message_id?: string
          notification_id?: string
          provider?: string | null
          provider_message_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_notification_escalations_escalated_by_fkey"
            columns: ["escalated_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_notification_escalations_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "communication_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_notification_escalations_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: true
            referencedRelation: "newsroom_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_participants: {
        Row: {
          contact_id: string | null
          created_at: string
          display_name: string | null
          external_email: string | null
          id: string
          participant_type: string
          role: string
          staff_profile_id: string | null
          thread_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          display_name?: string | null
          external_email?: string | null
          id?: string
          participant_type: string
          role?: string
          staff_profile_id?: string | null
          thread_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          display_name?: string | null
          external_email?: string | null
          id?: string
          participant_type?: string
          role?: string
          staff_profile_id?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_participants_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_participants_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_suppressions: {
        Row: {
          active: boolean
          channel: string
          contact_id: string | null
          created_at: string
          email: string
          id: string
          lifted_at: string | null
          metadata: Json
          provider: string | null
          reason: string
          scope: string
          source_event_id: string | null
        }
        Insert: {
          active?: boolean
          channel?: string
          contact_id?: string | null
          created_at?: string
          email: string
          id?: string
          lifted_at?: string | null
          metadata?: Json
          provider?: string | null
          reason: string
          scope: string
          source_event_id?: string | null
        }
        Update: {
          active?: boolean
          channel?: string
          contact_id?: string | null
          created_at?: string
          email?: string
          id?: string
          lifted_at?: string | null
          metadata?: Json
          provider?: string | null
          reason?: string
          scope?: string
          source_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_suppressions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          active: boolean
          body_html_template: string | null
          body_text_template: string | null
          created_at: string
          created_by: string | null
          id: string
          key: string
          name: string
          purpose: string
          subject_template: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          body_html_template?: string | null
          body_text_template?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          key: string
          name: string
          purpose: string
          subject_template?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          body_html_template?: string | null
          body_text_template?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          key?: string
          name?: string
          purpose?: string
          subject_template?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_threads: {
        Row: {
          assigned_staff_id: string | null
          channel_id: string
          closed_at: string | null
          contact_id: string | null
          created_at: string
          created_by_staff_id: string | null
          id: string
          last_message_at: string
          linked_story_id: string | null
          opaque_reply_token: string
          priority: string
          queue_key: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_staff_id?: string | null
          channel_id: string
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by_staff_id?: string | null
          id?: string
          last_message_at?: string
          linked_story_id?: string | null
          opaque_reply_token?: string
          priority?: string
          queue_key: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_staff_id?: string | null
          channel_id?: string
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by_staff_id?: string | null
          id?: string
          last_message_at?: string
          linked_story_id?: string | null
          opaque_reply_token?: string
          priority?: string
          queue_key?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_threads_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "communication_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_linked_story_id_fkey"
            columns: ["linked_story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_queue_key_fkey"
            columns: ["queue_key"]
            isOneToOne: false
            referencedRelation: "communication_channels"
            referencedColumns: ["key"]
          },
        ]
      }
      contact_consents: {
        Row: {
          channel: string
          contact_id: string
          created_at: string
          granted_at: string | null
          id: string
          policy_version: string
          provider_sync_error: string | null
          provider_sync_state: string
          purpose: string
          source: string
          status: string
          updated_at: string
          withdrawn_at: string | null
        }
        Insert: {
          channel: string
          contact_id: string
          created_at?: string
          granted_at?: string | null
          id?: string
          policy_version: string
          provider_sync_error?: string | null
          provider_sync_state?: string
          purpose: string
          source: string
          status: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Update: {
          channel?: string
          contact_id?: string
          created_at?: string
          granted_at?: string | null
          id?: string
          policy_version?: string
          provider_sync_error?: string | null
          provider_sync_state?: string
          purpose?: string
          source?: string
          status?: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_consents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          locale: string | null
          metadata: Json
          phone: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          locale?: string | null
          metadata?: Json
          phone?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          locale?: string | null
          metadata?: Json
          phone?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_segment_members: {
        Row: {
          contact_id: string
          created_at: string
          segment_id: string
          source: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          segment_id: string
          source?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          segment_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_segment_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_segment_members_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "contact_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_segments: {
        Row: {
          created_at: string
          id: string
          key: string
          metadata: Json
          name: string
          provider: string | null
          provider_segment_id: string | null
          sync_state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          metadata?: Json
          name: string
          provider?: string | null
          provider_segment_id?: string | null
          sync_state?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          metadata?: Json
          name?: string
          provider?: string | null
          provider_segment_id?: string | null
          sync_state?: string
          updated_at?: string
        }
        Relationships: []
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
      http_resolution_events: {
        Row: {
          id: string
          legacy_url_mapping_id: string | null
          occurred_at: string
          referrer_host: string | null
          requested_path: string
          resolution: string
          response_status: number
        }
        Insert: {
          id?: string
          legacy_url_mapping_id?: string | null
          occurred_at?: string
          referrer_host?: string | null
          requested_path: string
          resolution: string
          response_status: number
        }
        Update: {
          id?: string
          legacy_url_mapping_id?: string | null
          occurred_at?: string
          referrer_host?: string | null
          requested_path?: string
          resolution?: string
          response_status?: number
        }
        Relationships: [
          {
            foreignKeyName: "http_resolution_events_legacy_url_mapping_id_fkey"
            columns: ["legacy_url_mapping_id"]
            isOneToOne: false
            referencedRelation: "legacy_url_mappings"
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
      legacy_url_exceptions: {
        Row: {
          canonical_url: string | null
          created_at: string
          handling: string
          http_status: number | null
          id: string
          legacy_source_id: string | null
          reason: string
          snapshot_id: string | null
          source_object_id: string | null
          source_object_type: string
          source_url: string
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          handling: string
          http_status?: number | null
          id?: string
          legacy_source_id?: string | null
          reason: string
          snapshot_id?: string | null
          source_object_id?: string | null
          source_object_type: string
          source_url: string
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          handling?: string
          http_status?: number | null
          id?: string
          legacy_source_id?: string | null
          reason?: string
          snapshot_id?: string | null
          source_object_id?: string | null
          source_object_type?: string
          source_url?: string
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legacy_url_exceptions_legacy_source_id_fkey"
            columns: ["legacy_source_id"]
            isOneToOne: false
            referencedRelation: "legacy_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legacy_url_exceptions_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "migration_source_snapshots"
            referencedColumns: ["id"]
          },
        ]
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
          byte_size: number | null
          caption: string | null
          checksum: string | null
          created_at: string
          credit: string | null
          filename: string
          height: number | null
          id: string
          legacy_source_id: string | null
          mime_type: string | null
          public_published_at: string | null
          public_published_by_staff_id: string | null
          public_staged_at: string | null
          public_storage_bucket: string | null
          public_storage_key: string | null
          public_url: string | null
          source_provenance: string | null
          source_url: string | null
          status: string
          storage_bucket: string | null
          storage_key: string | null
          updated_at: string
          uploaded_by_staff_id: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          byte_size?: number | null
          caption?: string | null
          checksum?: string | null
          created_at?: string
          credit?: string | null
          filename: string
          height?: number | null
          id?: string
          legacy_source_id?: string | null
          mime_type?: string | null
          public_published_at?: string | null
          public_published_by_staff_id?: string | null
          public_staged_at?: string | null
          public_storage_bucket?: string | null
          public_storage_key?: string | null
          public_url?: string | null
          source_provenance?: string | null
          source_url?: string | null
          status?: string
          storage_bucket?: string | null
          storage_key?: string | null
          updated_at?: string
          uploaded_by_staff_id?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          byte_size?: number | null
          caption?: string | null
          checksum?: string | null
          created_at?: string
          credit?: string | null
          filename?: string
          height?: number | null
          id?: string
          legacy_source_id?: string | null
          mime_type?: string | null
          public_published_at?: string | null
          public_published_by_staff_id?: string | null
          public_staged_at?: string | null
          public_storage_bucket?: string | null
          public_storage_key?: string | null
          public_url?: string | null
          source_provenance?: string | null
          source_url?: string | null
          status?: string
          storage_bucket?: string | null
          storage_key?: string | null
          updated_at?: string
          uploaded_by_staff_id?: string | null
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
          {
            foreignKeyName: "media_assets_public_published_by_staff_id_fkey"
            columns: ["public_published_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_uploaded_by_staff_id_fkey"
            columns: ["uploaded_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
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
      migration_source_snapshots: {
        Row: {
          author_count: number | null
          category_count: number | null
          created_at: string
          database_sha256: string | null
          id: string
          media_count: number | null
          published_pages: number
          published_posts: number
          snapshot_date: string
          snapshot_key: string
          snapshot_status: string
          source_site: string
          tag_count: number | null
          uploads_sha256: string | null
        }
        Insert: {
          author_count?: number | null
          category_count?: number | null
          created_at?: string
          database_sha256?: string | null
          id?: string
          media_count?: number | null
          published_pages: number
          published_posts: number
          snapshot_date: string
          snapshot_key: string
          snapshot_status: string
          source_site: string
          tag_count?: number | null
          uploads_sha256?: string | null
        }
        Update: {
          author_count?: number | null
          category_count?: number | null
          created_at?: string
          database_sha256?: string | null
          id?: string
          media_count?: number | null
          published_pages?: number
          published_posts?: number
          snapshot_date?: string
          snapshot_key?: string
          snapshot_status?: string
          source_site?: string
          tag_count?: number | null
          uploads_sha256?: string | null
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
      newsroom_announcements: {
        Row: {
          archived_at: string | null
          audience_scope: string
          body: string
          created_at: string
          created_by: string
          desk_id: string | null
          expires_at: string | null
          id: string
          priority: string
          published_at: string
          requires_ack: boolean
          title: string
        }
        Insert: {
          archived_at?: string | null
          audience_scope: string
          body: string
          created_at?: string
          created_by: string
          desk_id?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          published_at?: string
          requires_ack?: boolean
          title: string
        }
        Update: {
          archived_at?: string | null
          audience_scope?: string
          body?: string
          created_at?: string
          created_by?: string
          desk_id?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          published_at?: string
          requires_ack?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_announcements_desk_id_fkey"
            columns: ["desk_id"]
            isOneToOne: false
            referencedRelation: "newsroom_desks"
            referencedColumns: ["id"]
          },
        ]
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
      newsroom_communication_attachments: {
        Row: {
          byte_size: number
          created_at: string
          deleted_at: string | null
          filename: string
          id: string
          mime_type: string
          newsroom_message_id: string | null
          ready_at: string | null
          sha256: string | null
          status: string
          storage_bucket: string
          storage_path: string
          story_internal_comment_id: string | null
          uploaded_by: string
        }
        Insert: {
          byte_size: number
          created_at?: string
          deleted_at?: string | null
          filename: string
          id?: string
          mime_type: string
          newsroom_message_id?: string | null
          ready_at?: string | null
          sha256?: string | null
          status?: string
          storage_bucket?: string
          storage_path: string
          story_internal_comment_id?: string | null
          uploaded_by: string
        }
        Update: {
          byte_size?: number
          created_at?: string
          deleted_at?: string | null
          filename?: string
          id?: string
          mime_type?: string
          newsroom_message_id?: string | null
          ready_at?: string | null
          sha256?: string | null
          status?: string
          storage_bucket?: string
          storage_path?: string
          story_internal_comment_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_communication_attachmen_story_internal_comment_id_fkey"
            columns: ["story_internal_comment_id"]
            isOneToOne: false
            referencedRelation: "story_internal_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_communication_attachments_newsroom_message_id_fkey"
            columns: ["newsroom_message_id"]
            isOneToOne: false
            referencedRelation: "newsroom_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_communication_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_desk_members: {
        Row: {
          added_by: string | null
          desk_id: string
          joined_at: string
          left_at: string | null
          member_role: string
          staff_profile_id: string
        }
        Insert: {
          added_by?: string | null
          desk_id: string
          joined_at?: string
          left_at?: string | null
          member_role?: string
          staff_profile_id: string
        }
        Update: {
          added_by?: string | null
          desk_id?: string
          joined_at?: string
          left_at?: string | null
          member_role?: string
          staff_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_desk_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_desk_members_desk_id_fkey"
            columns: ["desk_id"]
            isOneToOne: false
            referencedRelation: "newsroom_desks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_desk_members_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_desks: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_desks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_message_mentions: {
        Row: {
          created_at: string
          mentioned_staff_id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          mentioned_staff_id: string
          message_id: string
        }
        Update: {
          created_at?: string
          mentioned_staff_id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_message_mentions_mentioned_staff_id_fkey"
            columns: ["mentioned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_message_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "newsroom_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_messages: {
        Row: {
          author_staff_id: string
          body: string
          created_at: string
          id: string
          parent_message_id: string | null
          thread_id: string
        }
        Insert: {
          author_staff_id: string
          body: string
          created_at?: string
          id?: string
          parent_message_id?: string | null
          thread_id: string
        }
        Update: {
          author_staff_id?: string
          body?: string
          created_at?: string
          id?: string
          parent_message_id?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_messages_author_staff_id_fkey"
            columns: ["author_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "newsroom_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "newsroom_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_notifications: {
        Row: {
          acknowledged_at: string | null
          actor_staff_id: string | null
          archived_at: string | null
          category: string
          created_at: string
          dedupe_key: string | null
          event_type: string
          expires_at: string | null
          id: string
          payload: Json
          priority: string
          read_at: string | null
          requires_ack: boolean
          staff_profile_id: string
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          actor_staff_id?: string | null
          archived_at?: string | null
          category?: string
          created_at?: string
          dedupe_key?: string | null
          event_type: string
          expires_at?: string | null
          id?: string
          payload?: Json
          priority?: string
          read_at?: string | null
          requires_ack?: boolean
          staff_profile_id: string
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          actor_staff_id?: string | null
          archived_at?: string | null
          category?: string
          created_at?: string
          dedupe_key?: string | null
          event_type?: string
          expires_at?: string | null
          id?: string
          payload?: Json
          priority?: string
          read_at?: string | null
          requires_ack?: boolean
          staff_profile_id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_notifications_actor_staff_id_fkey"
            columns: ["actor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_notifications_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      newsroom_sessions: {
        Row: {
          auth_user_id: string
          created_at: string
          id: string
          last_seen_at: string
          provider_session_id: string
          revoked_at: string | null
          revoked_by: string | null
          staff_profile_id: string
          user_agent: string | null
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          id?: string
          last_seen_at?: string
          provider_session_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          staff_profile_id: string
          user_agent?: string | null
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          id?: string
          last_seen_at?: string
          provider_session_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          staff_profile_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_sessions_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_sessions_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_staff_capability_overrides: {
        Row: {
          allowed: boolean
          capability_key: string
          created_at: string
          granted_by: string | null
          staff_profile_id: string
        }
        Insert: {
          allowed: boolean
          capability_key: string
          created_at?: string
          granted_by?: string | null
          staff_profile_id: string
        }
        Update: {
          allowed?: boolean
          capability_key?: string
          created_at?: string
          granted_by?: string | null
          staff_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_staff_capability_overrides_capability_key_fkey"
            columns: ["capability_key"]
            isOneToOne: false
            referencedRelation: "newsroom_capabilities"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "newsroom_staff_capability_overrides_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_staff_capability_overrides_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_staff_invitations: {
        Row: {
          accepted_at: string | null
          assigned_editor_id: string | null
          auth_user_id: string | null
          country: string | null
          created_at: string
          desk: string | null
          display_name: string
          expires_at: string
          id: string
          invited_by: string
          invited_email: string
          invited_role_id: string
          metadata: Json
          status: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_editor_id?: string | null
          auth_user_id?: string | null
          country?: string | null
          created_at?: string
          desk?: string | null
          display_name: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_email: string
          invited_role_id: string
          metadata?: Json
          status?: string
        }
        Update: {
          accepted_at?: string | null
          assigned_editor_id?: string | null
          auth_user_id?: string | null
          country?: string | null
          created_at?: string
          desk?: string | null
          display_name?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          invited_role_id?: string
          metadata?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_staff_invitations_assigned_editor_id_fkey"
            columns: ["assigned_editor_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_staff_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_staff_invitations_invited_role_id_fkey"
            columns: ["invited_role_id"]
            isOneToOne: false
            referencedRelation: "newsroom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_thread_members: {
        Row: {
          joined_at: string
          last_read_at: string | null
          left_at: string | null
          member_role: string
          staff_profile_id: string
          thread_id: string
        }
        Insert: {
          joined_at?: string
          last_read_at?: string | null
          left_at?: string | null
          member_role?: string
          staff_profile_id: string
          thread_id: string
        }
        Update: {
          joined_at?: string
          last_read_at?: string | null
          left_at?: string | null
          member_role?: string
          staff_profile_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_thread_members_staff_profile_id_fkey"
            columns: ["staff_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_thread_members_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "newsroom_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_threads: {
        Row: {
          assignment_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string
          desk_id: string | null
          expires_at: string | null
          id: string
          opened_at: string
          priority: string
          status: string
          thread_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assignment_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          desk_id?: string | null
          expires_at?: string | null
          id?: string
          opened_at?: string
          priority?: string
          status?: string
          thread_type: string
          title: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string
          desk_id?: string | null
          expires_at?: string | null
          id?: string
          opened_at?: string
          priority?: string
          status?: string
          thread_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_threads_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "story_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_threads_desk_id_fkey"
            columns: ["desk_id"]
            isOneToOne: false
            referencedRelation: "newsroom_desks"
            referencedColumns: ["id"]
          },
        ]
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
      provider_webhook_events: {
        Row: {
          error: string | null
          event_type: string
          id: string
          payload: Json
          payload_hash: string
          processed_at: string | null
          provider: string
          provider_event_id: string
          received_at: string
          signature_valid: boolean
          status: string
        }
        Insert: {
          error?: string | null
          event_type: string
          id?: string
          payload?: Json
          payload_hash: string
          processed_at?: string | null
          provider: string
          provider_event_id: string
          received_at?: string
          signature_valid: boolean
          status?: string
        }
        Update: {
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          payload_hash?: string
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          received_at?: string
          signature_valid?: boolean
          status?: string
        }
        Relationships: []
      }
      reader_comment_profiles: {
        Row: {
          auth_user_id: string
          created_at: string
          display_name: string
          id: string
          last_comment_at: string | null
          state: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          display_name: string
          id?: string
          last_comment_at?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          display_name?: string
          id?: string
          last_comment_at?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      reader_comment_restrictions: {
        Row: {
          created_at: string
          created_by_staff_id: string
          ends_at: string | null
          id: string
          kind: string
          lifted_at: string | null
          lifted_by_staff_id: string | null
          notes: string | null
          reader_profile_id: string
          reason_code: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          created_by_staff_id: string
          ends_at?: string | null
          id?: string
          kind: string
          lifted_at?: string | null
          lifted_by_staff_id?: string | null
          notes?: string | null
          reader_profile_id: string
          reason_code: string
          starts_at?: string
        }
        Update: {
          created_at?: string
          created_by_staff_id?: string
          ends_at?: string | null
          id?: string
          kind?: string
          lifted_at?: string | null
          lifted_by_staff_id?: string | null
          notes?: string | null
          reader_profile_id?: string
          reason_code?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_comment_restrictions_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reader_comment_restrictions_lifted_by_staff_id_fkey"
            columns: ["lifted_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reader_comment_restrictions_reader_profile_id_fkey"
            columns: ["reader_profile_id"]
            isOneToOne: false
            referencedRelation: "reader_comment_profiles"
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
      social_accounts: {
        Row: {
          account_label: string
          created_at: string
          environment: string
          id: string
          metadata: Json
          provider: string
          provider_account_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_label: string
          created_at?: string
          environment?: string
          id?: string
          metadata?: Json
          provider: string
          provider_account_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_label?: string
          created_at?: string
          environment?: string
          id?: string
          metadata?: Json
          provider?: string
          provider_account_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body: string
          created_at: string
          created_by: string
          id: string
          provider: string
          provider_post_id: string | null
          published_at: string | null
          social_account_id: string | null
          status: string
          story_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body: string
          created_at?: string
          created_by: string
          id?: string
          provider: string
          provider_post_id?: string | null
          published_at?: string | null
          social_account_id?: string | null
          status?: string
          story_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          provider?: string
          provider_post_id?: string | null
          published_at?: string | null
          social_account_id?: string | null
          status?: string
          story_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      social_publication_attempts: {
        Row: {
          attempted_at: string
          attempted_by: string
          completed_at: string | null
          id: string
          provider: string
          provider_post_id: string | null
          provider_response: Json
          social_post_id: string
          status: string
        }
        Insert: {
          attempted_at?: string
          attempted_by: string
          completed_at?: string | null
          id?: string
          provider: string
          provider_post_id?: string | null
          provider_response?: Json
          social_post_id: string
          status: string
        }
        Update: {
          attempted_at?: string
          attempted_by?: string
          completed_at?: string | null
          id?: string
          provider?: string
          provider_post_id?: string | null
          provider_response?: Json
          social_post_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_publication_attempts_attempted_by_fkey"
            columns: ["attempted_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_publication_attempts_social_post_id_fkey"
            columns: ["social_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          assigned_editor_id: string | null
          auth_user_id: string | null
          beat: string | null
          bio: string | null
          country: string | null
          created_at: string
          desk: string | null
          display_name: string
          email: string
          handle: string | null
          id: string
          last_login_at: string | null
          mfa_enrolled_at: string | null
          mfa_required: boolean
          notification_preferences: Json
          phone: string | null
          profile_image_url: string | null
          public_author_id: string | null
          region: string | null
          revoked_at: string | null
          role_id: string | null
          social_links: Json
          status: string
          updated_at: string
        }
        Insert: {
          assigned_editor_id?: string | null
          auth_user_id?: string | null
          beat?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          desk?: string | null
          display_name: string
          email: string
          handle?: string | null
          id?: string
          last_login_at?: string | null
          mfa_enrolled_at?: string | null
          mfa_required?: boolean
          notification_preferences?: Json
          phone?: string | null
          profile_image_url?: string | null
          public_author_id?: string | null
          region?: string | null
          revoked_at?: string | null
          role_id?: string | null
          social_links?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_editor_id?: string | null
          auth_user_id?: string | null
          beat?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          desk?: string | null
          display_name?: string
          email?: string
          handle?: string | null
          id?: string
          last_login_at?: string | null
          mfa_enrolled_at?: string | null
          mfa_required?: boolean
          notification_preferences?: Json
          phone?: string | null
          profile_image_url?: string | null
          public_author_id?: string | null
          region?: string | null
          revoked_at?: string | null
          role_id?: string | null
          social_links?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_assigned_editor_id_fkey"
            columns: ["assigned_editor_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_public_author_id_fkey"
            columns: ["public_author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
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
          ad_setting: string
          assigned_editor_staff_id: string | null
          author_id: string | null
          body_html: string | null
          body_json: Json | null
          canonical_url: string | null
          comment_policy: string
          copy_editor_staff_id: string | null
          country: string | null
          created_at: string
          deadline_at: string | null
          desk: string | null
          distribution: Json
          excerpt: string | null
          fact_checker_staff_id: string | null
          health_reviewer_staff_id: string | null
          id: string
          internal_notes: string | null
          last_saved_by: string | null
          legacy_source_id: string | null
          lock_version: number
          modified_at: string | null
          owner_staff_id: string | null
          primary_section_id: string | null
          published_at: string | null
          region: string | null
          scheduled_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          source_notes: string | null
          standfirst: string | null
          status: string
          title: string
          topic: string | null
          updated_at: string
          workflow_status: string | null
        }
        Insert: {
          access_policy?: string
          ad_setting?: string
          assigned_editor_staff_id?: string | null
          author_id?: string | null
          body_html?: string | null
          body_json?: Json | null
          canonical_url?: string | null
          comment_policy?: string
          copy_editor_staff_id?: string | null
          country?: string | null
          created_at?: string
          deadline_at?: string | null
          desk?: string | null
          distribution?: Json
          excerpt?: string | null
          fact_checker_staff_id?: string | null
          health_reviewer_staff_id?: string | null
          id?: string
          internal_notes?: string | null
          last_saved_by?: string | null
          legacy_source_id?: string | null
          lock_version?: number
          modified_at?: string | null
          owner_staff_id?: string | null
          primary_section_id?: string | null
          published_at?: string | null
          region?: string | null
          scheduled_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          source_notes?: string | null
          standfirst?: string | null
          status?: string
          title: string
          topic?: string | null
          updated_at?: string
          workflow_status?: string | null
        }
        Update: {
          access_policy?: string
          ad_setting?: string
          assigned_editor_staff_id?: string | null
          author_id?: string | null
          body_html?: string | null
          body_json?: Json | null
          canonical_url?: string | null
          comment_policy?: string
          copy_editor_staff_id?: string | null
          country?: string | null
          created_at?: string
          deadline_at?: string | null
          desk?: string | null
          distribution?: Json
          excerpt?: string | null
          fact_checker_staff_id?: string | null
          health_reviewer_staff_id?: string | null
          id?: string
          internal_notes?: string | null
          last_saved_by?: string | null
          legacy_source_id?: string | null
          lock_version?: number
          modified_at?: string | null
          owner_staff_id?: string | null
          primary_section_id?: string | null
          published_at?: string | null
          region?: string | null
          scheduled_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          source_notes?: string | null
          standfirst?: string | null
          status?: string
          title?: string
          topic?: string | null
          updated_at?: string
          workflow_status?: string | null
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
            foreignKeyName: "stories_assigned_editor_staff_id_fkey"
            columns: ["assigned_editor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
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
            foreignKeyName: "stories_copy_editor_staff_id_fkey"
            columns: ["copy_editor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_fact_checker_staff_id_fkey"
            columns: ["fact_checker_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_health_reviewer_staff_id_fkey"
            columns: ["health_reviewer_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_last_saved_by_fkey"
            columns: ["last_saved_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_legacy_source_id_fkey"
            columns: ["legacy_source_id"]
            isOneToOne: true
            referencedRelation: "legacy_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_owner_staff_id_fkey"
            columns: ["owner_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_assignments: {
        Row: {
          assigned_by: string
          assigned_editor_staff_id: string | null
          created_at: string
          deadline_at: string | null
          desk: string | null
          id: string
          notes: string | null
          priority: string
          reporter_staff_id: string
          status: string
          story_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_editor_staff_id?: string | null
          created_at?: string
          deadline_at?: string | null
          desk?: string | null
          id?: string
          notes?: string | null
          priority?: string
          reporter_staff_id: string
          status?: string
          story_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_editor_staff_id?: string | null
          created_at?: string
          deadline_at?: string | null
          desk?: string | null
          id?: string
          notes?: string | null
          priority?: string
          reporter_staff_id?: string
          status?: string
          story_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_assignments_assigned_editor_staff_id_fkey"
            columns: ["assigned_editor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_assignments_reporter_staff_id_fkey"
            columns: ["reporter_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_assignments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_autosaves: {
        Row: {
          body_html: string | null
          lock_version: number
          saved_at: string
          saved_by: string
          standfirst: string | null
          story_id: string
          title: string | null
        }
        Insert: {
          body_html?: string | null
          lock_version: number
          saved_at?: string
          saved_by: string
          standfirst?: string | null
          story_id: string
          title?: string | null
        }
        Update: {
          body_html?: string | null
          lock_version?: number
          saved_at?: string
          saved_by?: string
          standfirst?: string | null
          story_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_autosaves_saved_by_fkey"
            columns: ["saved_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_autosaves_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: true
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_comment_moderation_actions: {
        Row: {
          action: string
          actor_staff_id: string
          comment_id: string
          created_at: string
          id: string
          new_state: string
          notes: string | null
          previous_state: string
          reason_code: string
        }
        Insert: {
          action: string
          actor_staff_id: string
          comment_id: string
          created_at?: string
          id?: string
          new_state: string
          notes?: string | null
          previous_state: string
          reason_code: string
        }
        Update: {
          action?: string
          actor_staff_id?: string
          comment_id?: string
          created_at?: string
          id?: string
          new_state?: string
          notes?: string | null
          previous_state?: string
          reason_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comment_moderation_actions_actor_staff_id_fkey"
            columns: ["actor_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_comment_moderation_actions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "story_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      story_comment_reports: {
        Row: {
          comment_id: string
          created_at: string
          details: string | null
          id: string
          reason_code: string
          reporter_profile_id: string
          resolved_at: string | null
          resolved_by_staff_id: string | null
          status: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          details?: string | null
          id?: string
          reason_code: string
          reporter_profile_id: string
          resolved_at?: string | null
          resolved_by_staff_id?: string | null
          status?: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          details?: string | null
          id?: string
          reason_code?: string
          reporter_profile_id?: string
          resolved_at?: string | null
          resolved_by_staff_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comment_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "story_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_comment_reports_reporter_profile_id_fkey"
            columns: ["reporter_profile_id"]
            isOneToOne: false
            referencedRelation: "reader_comment_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_comment_reports_resolved_by_staff_id_fkey"
            columns: ["resolved_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_comment_revisions: {
        Row: {
          actor_auth_user_id: string
          comment_id: string
          created_at: string
          id: string
          previous_body: string
          revision_type: string
        }
        Insert: {
          actor_auth_user_id: string
          comment_id: string
          created_at?: string
          id?: string
          previous_body: string
          revision_type: string
        }
        Update: {
          actor_auth_user_id?: string
          comment_id?: string
          created_at?: string
          id?: string
          previous_body?: string
          revision_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comment_revisions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "story_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      story_comments: {
        Row: {
          author_profile_id: string
          body: string
          created_at: string
          edited_at: string | null
          id: string
          parent_comment_id: string | null
          published_at: string | null
          removed_by_author_at: string | null
          risk_flags: string[]
          state: string
          story_id: string
          updated_at: string
        }
        Insert: {
          author_profile_id: string
          body: string
          created_at?: string
          edited_at?: string | null
          id?: string
          parent_comment_id?: string | null
          published_at?: string | null
          removed_by_author_at?: string | null
          risk_flags?: string[]
          state: string
          story_id: string
          updated_at?: string
        }
        Update: {
          author_profile_id?: string
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          parent_comment_id?: string | null
          published_at?: string | null
          removed_by_author_at?: string | null
          risk_flags?: string[]
          state?: string
          story_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comments_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "reader_comment_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "story_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_corrections: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          new_revision_id: string | null
          previous_revision_id: string | null
          reason: string
          story_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          new_revision_id?: string | null
          previous_revision_id?: string | null
          reason: string
          story_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          new_revision_id?: string | null
          previous_revision_id?: string | null
          reason?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_corrections_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_corrections_new_revision_id_fkey"
            columns: ["new_revision_id"]
            isOneToOne: false
            referencedRelation: "story_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_corrections_previous_revision_id_fkey"
            columns: ["previous_revision_id"]
            isOneToOne: false
            referencedRelation: "story_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_corrections_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_internal_comment_mentions: {
        Row: {
          comment_id: string
          created_at: string
          mentioned_staff_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          mentioned_staff_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          mentioned_staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_internal_comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "story_internal_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_internal_comment_mentions_mentioned_staff_id_fkey"
            columns: ["mentioned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_internal_comment_revisions: {
        Row: {
          comment_id: string
          created_at: string
          edited_by: string
          id: string
          previous_body: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          edited_by: string
          id?: string
          previous_body: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          edited_by?: string
          id?: string
          previous_body?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_internal_comment_revisions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "story_internal_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_internal_comment_revisions_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_internal_comments: {
        Row: {
          author_staff_id: string
          body: string
          created_at: string
          edited_at: string | null
          edited_by: string | null
          id: string
          parent_comment_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          story_id: string
        }
        Insert: {
          author_staff_id: string
          body: string
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          parent_comment_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          story_id: string
        }
        Update: {
          author_staff_id?: string
          body?: string
          created_at?: string
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          parent_comment_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_internal_comments_author_staff_id_fkey"
            columns: ["author_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_internal_comments_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_internal_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "story_internal_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_internal_comments_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_internal_comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
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
      story_reviews: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          review_type: string
          status: string
          story_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          review_type: string
          status?: string
          story_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          review_type?: string
          status?: string
          story_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reviews_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_reviews_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_reviews_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_reviews_story_id_fkey"
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
      ag05_url_coverage_status: {
        Row: {
          coverage_status: string | null
          distinct_mapped_sources: number | null
          duplicate_sources: number | null
          exception_rows: number | null
          expected_public_objects: number | null
          explicit_exceptions: number | null
          invalid_homepage_catchalls: number | null
          mapping_rows: number | null
          noindex_archive: number | null
          preserved_direct: number | null
          redirected: number | null
          snapshot_key: string | null
          source_rows: number | null
          unresolved: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      ag05_first_editorial_paragraph_html: {
        Args: { p_body_html: string }
        Returns: string
      }
      ag05_hospaz_direct_ad_preview: { Args: never; Returns: Json }
      ag05_internal_link_exceptions: {
        Args: never
        Returns: {
          http_status: number
          occurrences: number
          path: string
          reason: string
        }[]
      }
      ag05_internal_link_ledger: {
        Args: never
        Returns: {
          classification: string
          http_status: number
          occurrences: number
          path: string
          reason: string
          target_path: string
        }[]
      }
      ag05_internal_link_ledger_summary: { Args: never; Returns: Json }
      ag05_normalize_path: { Args: { p_path: string }; Returns: string }
      ag05_public_context_document: { Args: { p_path: string }; Returns: Json }
      ag05_public_feed_rows: {
        Args: { p_limit?: number }
        Returns: {
          author_name: string
          canonical_url: string
          description: string
          modified_at: string
          published_at: string
          title: string
        }[]
      }
      ag05_public_sitemap_rows: {
        Args: never
        Returns: {
          canonical_url: string
          modified_at: string
          source_id: string
          source_type: string
        }[]
      }
      ag05_public_sitemap_xml: { Args: never; Returns: string }
      ag05_public_story_document: { Args: { p_path: string }; Returns: Json }
      ag05_public_story_teaser_document: {
        Args: { p_path: string }
        Returns: Json
      }
      ag05_refresh_internal_link_audit: { Args: never; Returns: Json }
      ag05_rehearsal_readiness_status: { Args: never; Returns: Json }
      ag05_resolve_public_path: { Args: { p_path: string }; Returns: Json }
      ca01_safe_uuid: { Args: { p_value: string }; Returns: string }
      communications_approve_campaign: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      communications_approve_social_post: {
        Args: { p_social_post_id: string }
        Returns: undefined
      }
      communications_assign_thread: {
        Args: { p_staff_profile_id: string; p_thread_id: string }
        Returns: string
      }
      communications_can_access_attachment: {
        Args: { p_attachment_id: string }
        Returns: boolean
      }
      communications_can_access_thread: {
        Args: { p_thread_id: string }
        Returns: boolean
      }
      communications_close_thread: {
        Args: { p_thread_id: string }
        Returns: undefined
      }
      communications_contact_for_email: {
        Args: { p_email: string; p_source?: string }
        Returns: string
      }
      communications_create_campaign: {
        Args: {
          p_html_content: string
          p_name: string
          p_purpose: string
          p_segment_id: string
          p_subject: string
          p_text_content: string
        }
        Returns: string
      }
      communications_create_social_draft: {
        Args: {
          p_body: string
          p_provider: string
          p_social_account_id?: string
          p_story_id: string
        }
        Returns: string
      }
      communications_delete_attachment: {
        Args: { p_attachment_id: string }
        Returns: undefined
      }
      communications_finalize_attachment: {
        Args: { p_attachment_id: string }
        Returns: Json
      }
      communications_ingest_inbound: {
        Args: {
          p_body_html: string
          p_body_text: string
          p_event_id: string
          p_from_email: string
          p_payload?: Json
          p_payload_hash?: string
          p_provider: string
          p_provider_message_id?: string
          p_queue_key: string
          p_reply_token?: string
          p_subject: string
          p_to_email: string
        }
        Returns: Json
      }
      communications_ingest_provider_event: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_payload?: Json
          p_payload_hash: string
          p_provider: string
          p_provider_message_id: string
          p_recipient_email: string
        }
        Returns: Json
      }
      communications_mark_attachment_scan: {
        Args: {
          p_attachment_id: string
          p_reason?: string
          p_scan_status: string
        }
        Returns: undefined
      }
      communications_mark_consent_sync: {
        Args: {
          p_contact_id: string
          p_error?: string
          p_purpose: string
          p_state: string
        }
        Returns: undefined
      }
      communications_marketing_eligible: {
        Args: { p_contact_id: string; p_purpose: string }
        Returns: boolean
      }
      communications_prepare_attachment: {
        Args: {
          p_byte_size: number
          p_filename: string
          p_message_id: string
          p_mime_type: string
          p_sha256?: string
        }
        Returns: Json
      }
      communications_prepare_campaign_send: {
        Args: { p_campaign_id: string }
        Returns: Json
      }
      communications_prepare_notification_escalation: {
        Args: { p_notification_id: string }
        Returns: Json
      }
      communications_prepare_reply: {
        Args: { p_body_text: string; p_subject?: string; p_thread_id: string }
        Returns: Json
      }
      communications_prepare_social_publish: {
        Args: { p_social_post_id: string }
        Returns: Json
      }
      communications_queue_allowed: {
        Args: { p_queue_key: string }
        Returns: boolean
      }
      communications_record_campaign_result: {
        Args: {
          p_campaign_id: string
          p_error?: string
          p_provider_campaign_id: string
          p_status: string
        }
        Returns: undefined
      }
      communications_record_consent: {
        Args: {
          p_channel: string
          p_email: string
          p_granted: boolean
          p_policy_version: string
          p_purpose: string
          p_source: string
        }
        Returns: Json
      }
      communications_record_notification_escalation_result: {
        Args: {
          p_error?: string
          p_escalation_id: string
          p_provider_message_id: string
          p_status: string
        }
        Returns: undefined
      }
      communications_record_send_result: {
        Args: {
          p_error?: string
          p_message_id: string
          p_provider_message_id: string
          p_status: string
        }
        Returns: undefined
      }
      communications_record_social_result: {
        Args: {
          p_attempt_id: string
          p_provider_post_id?: string
          p_provider_response?: Json
          p_succeeded: boolean
        }
        Returns: undefined
      }
      communications_transactional_eligible: {
        Args: { p_contact_id: string; p_kind: string }
        Returns: boolean
      }
      newsroom_ack_notification: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      newsroom_add_comment: {
        Args: { p_body: string; p_story_id: string }
        Returns: string
      }
      newsroom_add_internal_comment: {
        Args: {
          p_body: string
          p_mention_staff_ids?: string[]
          p_parent_comment_id?: string
          p_story_id: string
        }
        Returns: string
      }
      newsroom_approve_campaign: {
        Args: { p_approved: boolean; p_campaign_id: string }
        Returns: string
      }
      newsroom_archive_announcement: {
        Args: { p_announcement_id: string }
        Returns: undefined
      }
      newsroom_archive_notification: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      newsroom_attach_story_media: {
        Args: { p_media_id: string; p_story_id: string; p_usage_type: string }
        Returns: undefined
      }
      newsroom_bind_staff_public_author: {
        Args: { p_author_id: string; p_staff_id: string }
        Returns: Json
      }
      newsroom_can_delete_staged_public_media_object: {
        Args: { p_bucket: string; p_name: string }
        Returns: boolean
      }
      newsroom_can_edit_story: {
        Args: { p_story_id: string }
        Returns: boolean
      }
      newsroom_can_join_realtime_topic: {
        Args: { p_topic: string }
        Returns: boolean
      }
      newsroom_can_promote_public_media_object: {
        Args: { p_bucket: string; p_name: string }
        Returns: boolean
      }
      newsroom_can_read_announcement: {
        Args: { p_announcement_id: string }
        Returns: boolean
      }
      newsroom_can_read_communication_attachment: {
        Args: { p_attachment_id: string }
        Returns: boolean
      }
      newsroom_can_read_desk: { Args: { p_desk_id: string }; Returns: boolean }
      newsroom_can_read_media: {
        Args: { p_media_id: string }
        Returns: boolean
      }
      newsroom_can_read_media_object: {
        Args: { p_bucket: string; p_object_name: string }
        Returns: boolean
      }
      newsroom_can_read_story: {
        Args: { p_story_id: string }
        Returns: boolean
      }
      newsroom_can_read_thread: {
        Args: { p_thread_id: string }
        Returns: boolean
      }
      newsroom_can_upload_prepared_media_object: {
        Args: { p_bucket: string; p_object_name: string }
        Returns: boolean
      }
      newsroom_can_use_presence: { Args: { p_topic: string }; Returns: boolean }
      newsroom_change_staff_role: {
        Args: { p_role_name: string; p_staff_id: string }
        Returns: undefined
      }
      newsroom_clear_certification_public_author_bindings: {
        Args: { p_profile_ids: string[] }
        Returns: number
      }
      newsroom_clear_staged_story_media: {
        Args: { p_media_id: string; p_story_id: string }
        Returns: undefined
      }
      newsroom_close_thread: {
        Args: { p_thread_id: string }
        Returns: undefined
      }
      newsroom_create_assignment: { Args: { p_payload: Json }; Returns: string }
      newsroom_create_campaign: {
        Args: {
          p_advertiser_id: string
          p_end_at?: string
          p_name: string
          p_start_at?: string
        }
        Returns: string
      }
      newsroom_create_desk: {
        Args: { p_description?: string; p_key: string; p_name: string }
        Returns: string
      }
      newsroom_create_invitation: {
        Args: {
          p_assigned_editor_id?: string
          p_country?: string
          p_desk?: string
          p_display_name: string
          p_email: string
          p_role_name: string
        }
        Returns: Json
      }
      newsroom_create_public_author: {
        Args: {
          p_bio?: string
          p_display_name: string
          p_slug: string
          p_staff_id?: string
        }
        Returns: string
      }
      newsroom_create_story: { Args: { p_story: Json }; Returns: string }
      newsroom_create_thread: {
        Args: {
          p_assignment_id?: string
          p_desk_id?: string
          p_expires_at?: string
          p_priority?: string
          p_thread_type: string
          p_title: string
        }
        Returns: string
      }
      newsroom_current_context: { Args: never; Returns: Json }
      newsroom_current_staff_id_basic: { Args: never; Returns: string }
      newsroom_detach_story_media: {
        Args: { p_media_id: string; p_story_id: string; p_usage_type: string }
        Returns: undefined
      }
      newsroom_edit_internal_comment: {
        Args: {
          p_body: string
          p_comment_id: string
          p_mention_staff_ids?: string[]
        }
        Returns: undefined
      }
      newsroom_emit_notification: {
        Args: {
          p_actor_staff_id?: string
          p_category?: string
          p_dedupe_key?: string
          p_event_type: string
          p_expires_at?: string
          p_payload?: Json
          p_priority?: string
          p_requires_ack?: boolean
          p_staff_profile_id: string
          p_target_id: string
          p_target_table: string
        }
        Returns: string
      }
      newsroom_finalize_communication_attachment: {
        Args: { p_attachment_id: string }
        Returns: Json
      }
      newsroom_finalize_story_media: {
        Args: {
          p_checksum?: string
          p_media_id: string
          p_story_id: string
          p_usage_type: string
        }
        Returns: Json
      }
      newsroom_get_communication_attachment: {
        Args: { p_attachment_id: string }
        Returns: {
          byte_size: number
          filename: string
          id: string
          mime_type: string
          status: string
          storage_bucket: string
          storage_path: string
        }[]
      }
      newsroom_get_media_preview: {
        Args: { p_media_id: string }
        Returns: Json
      }
      newsroom_has_capability: {
        Args: { p_capability: string }
        Returns: boolean
      }
      newsroom_inbox_summary: { Args: never; Returns: Json }
      newsroom_inline_media_marker: {
        Args: { p_media_id: string }
        Returns: string
      }
      newsroom_jwt_session_id: { Args: never; Returns: string }
      newsroom_lift_reader_comment_restriction: {
        Args: { p_notes?: string; p_restriction_id: string }
        Returns: undefined
      }
      newsroom_list_comment_moderation_queue: {
        Args: { p_limit?: number; p_state?: string }
        Returns: {
          author_profile_id: string
          body: string
          created_at: string
          edited_at: string | null
          id: string
          parent_comment_id: string | null
          published_at: string | null
          removed_by_author_at: string | null
          risk_flags: string[]
          state: string
          story_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "story_comments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      newsroom_list_inbox: {
        Args: { p_before?: string; p_filter?: string; p_limit?: number }
        Returns: {
          acknowledged_at: string | null
          actor_staff_id: string | null
          archived_at: string | null
          category: string
          created_at: string
          dedupe_key: string | null
          event_type: string
          expires_at: string | null
          id: string
          payload: Json
          priority: string
          read_at: string | null
          requires_ack: boolean
          staff_profile_id: string
          target_id: string | null
          target_table: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "newsroom_notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      newsroom_list_media: {
        Args: { p_limit?: number; p_search?: string }
        Returns: {
          alt_text: string
          byte_size: number
          caption: string
          checksum: string
          created_at: string
          credit: string
          filename: string
          height: number
          id: string
          mime_type: string
          public_url: string
          source_provenance: string
          source_url: string
          status: string
          storage_bucket: string
          storage_key: string
          updated_at: string
          uploaded_by_staff_id: string
          usage: Json
          width: number
        }[]
      }
      newsroom_list_public_authors: {
        Args: never
        Returns: {
          bio: string
          display_name: string
          id: string
          linked_staff: Json
          provenance: string
          slug: string
          wordpress_source_id: string
        }[]
      }
      newsroom_list_sections: {
        Args: never
        Returns: {
          id: string
          name: string
          parent_id: string
          provenance: string
          slug: string
          wordpress_source_id: string
        }[]
      }
      newsroom_list_stories: {
        Args: { p_limit?: number }
        Returns: {
          access_policy: string
          ad_setting: string
          assigned_editor_staff_id: string | null
          author_id: string | null
          body_html: string | null
          body_json: Json | null
          canonical_url: string | null
          comment_policy: string
          copy_editor_staff_id: string | null
          country: string | null
          created_at: string
          deadline_at: string | null
          desk: string | null
          distribution: Json
          excerpt: string | null
          fact_checker_staff_id: string | null
          health_reviewer_staff_id: string | null
          id: string
          internal_notes: string | null
          last_saved_by: string | null
          legacy_source_id: string | null
          lock_version: number
          modified_at: string | null
          owner_staff_id: string | null
          primary_section_id: string | null
          published_at: string | null
          region: string | null
          scheduled_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          source_notes: string | null
          standfirst: string | null
          status: string
          title: string
          topic: string | null
          updated_at: string
          workflow_status: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "stories"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      newsroom_mark_communication_attachment_deleted: {
        Args: { p_attachment_id: string }
        Returns: undefined
      }
      newsroom_mark_notification_read: {
        Args: { p_notification_id: string; p_read?: boolean }
        Returns: undefined
      }
      newsroom_mark_thread_read: {
        Args: { p_thread_id: string }
        Returns: undefined
      }
      newsroom_media_upload_context: {
        Args: { p_media_id: string; p_story_id: string }
        Returns: Json
      }
      newsroom_media_usage_type_valid: {
        Args: { p_usage_type: string }
        Returns: boolean
      }
      newsroom_moderate_story_comment: {
        Args: {
          p_action: string
          p_comment_id: string
          p_notes?: string
          p_reason_code: string
        }
        Returns: string
      }
      newsroom_post_thread_message: {
        Args: {
          p_body: string
          p_mention_staff_ids?: string[]
          p_parent_message_id?: string
          p_thread_id: string
        }
        Returns: string
      }
      newsroom_prepare_communication_attachment: {
        Args: {
          p_byte_size?: number
          p_filename?: string
          p_mime_type?: string
          p_newsroom_message_id?: string
          p_sha256?: string
          p_story_internal_comment_id?: string
        }
        Returns: Json
      }
      newsroom_prepare_story_media: {
        Args: {
          p_alt_text?: string
          p_byte_size: number
          p_caption?: string
          p_checksum?: string
          p_credit?: string
          p_filename: string
          p_mime_type: string
          p_source_provenance?: string
          p_story_id: string
          p_usage_type?: string
        }
        Returns: Json
      }
      newsroom_progress_assignment: {
        Args: { p_assignment_id: string }
        Returns: string
      }
      newsroom_public_context_document: {
        Args: { p_path: string }
        Returns: Json
      }
      newsroom_public_published_stories: {
        Args: { p_slug?: string }
        Returns: {
          body_html: string
          canonical_url: string
          excerpt: string
          id: string
          modified_at: string
          published_at: string
          seo_description: string
          seo_title: string
          slug: string
          standfirst: string
          title: string
        }[]
      }
      newsroom_public_story_document: {
        Args: { p_path: string }
        Returns: Json
      }
      newsroom_publish_announcement: {
        Args: {
          p_audience_scope: string
          p_body: string
          p_desk_id?: string
          p_expires_at?: string
          p_priority?: string
          p_requires_ack?: boolean
          p_title: string
        }
        Returns: string
      }
      newsroom_record_review: {
        Args: {
          p_notes?: string
          p_review_type: string
          p_status: string
          p_story_id: string
        }
        Returns: string
      }
      newsroom_register_session: {
        Args: { p_user_agent?: string }
        Returns: Json
      }
      newsroom_request_story_changes: {
        Args: { p_reason: string; p_story_id: string }
        Returns: Json
      }
      newsroom_restore_revision: {
        Args: {
          p_expected_version: number
          p_revision_id: string
          p_story_id: string
        }
        Returns: number
      }
      newsroom_restrict_reader_comments: {
        Args: {
          p_ends_at?: string
          p_kind: string
          p_notes?: string
          p_reader_profile_id: string
          p_reason_code: string
        }
        Returns: string
      }
      newsroom_revoke_session: {
        Args: { p_provider_session_id?: string; p_staff_id: string }
        Returns: number
      }
      newsroom_revoke_staff: {
        Args: { p_staff_id: string; p_status?: string }
        Returns: undefined
      }
      newsroom_safe_editor_text: { Args: { p_value: string }; Returns: string }
      newsroom_save_story: {
        Args: {
          p_expected_version: number
          p_patch: Json
          p_reason?: string
          p_story_id: string
        }
        Returns: number
      }
      newsroom_session_authorized: { Args: never; Returns: boolean }
      newsroom_set_desk_member: {
        Args: {
          p_active?: boolean
          p_desk_id: string
          p_member_role?: string
          p_staff_id: string
        }
        Returns: undefined
      }
      newsroom_set_internal_comment_resolved: {
        Args: { p_comment_id: string; p_resolved: boolean }
        Returns: undefined
      }
      newsroom_set_story_access: {
        Args: { p_access_policy: string; p_story_id: string }
        Returns: string
      }
      newsroom_set_story_comment_policy: {
        Args: { p_policy: string; p_story_id: string }
        Returns: string
      }
      newsroom_set_thread_member: {
        Args: { p_active?: boolean; p_staff_id: string; p_thread_id: string }
        Returns: undefined
      }
      newsroom_staff_can_read_story: {
        Args: { p_staff_id: string; p_story_id: string }
        Returns: boolean
      }
      newsroom_staff_can_read_thread: {
        Args: { p_staff_id: string; p_thread_id: string }
        Returns: boolean
      }
      newsroom_staff_directory: {
        Args: never
        Returns: {
          assigned_editor_id: string
          beat: string
          country: string
          desk: string
          display_name: string
          handle: string
          id: string
          region: string
          role: string
          status: string
        }[]
      }
      newsroom_staff_has_capability: {
        Args: { p_capability: string; p_staff_id: string }
        Returns: boolean
      }
      newsroom_stage_story_media_promotion: {
        Args: {
          p_media_id: string
          p_public_storage_key: string
          p_story_id: string
          p_verified_checksum: string
        }
        Returns: Json
      }
      newsroom_story_media_promotion_plan: {
        Args: { p_story_id: string }
        Returns: {
          byte_size: number
          checksum: string
          filename: string
          media_id: string
          media_status: string
          mime_type: string
          private_bucket: string
          private_key: string
          public_storage_bucket: string
          public_storage_key: string
          public_url: string
          usage_type: string
        }[]
      }
      newsroom_transition_story: {
        Args: { p_next_status: string; p_reason?: string; p_story_id: string }
        Returns: string
      }
      newsroom_update_notification_preferences: {
        Args: { p_preferences: Json }
        Returns: Json
      }
      newsroom_update_story_media_metadata: {
        Args: {
          p_alt_text?: string
          p_caption?: string
          p_credit?: string
          p_media_id: string
          p_source_provenance?: string
        }
        Returns: undefined
      }
      newsroom_validate_inline_body_bindings: {
        Args: { p_story_id: string }
        Returns: string[]
      }
      reader_can_join_comment_topic: {
        Args: { p_topic: string }
        Returns: boolean
      }
      reader_comment_eligibility: {
        Args: { p_story_id: string }
        Returns: Json
      }
      reader_current_comment_profile_id: { Args: never; Returns: string }
      reader_edit_story_comment: {
        Args: { p_body: string; p_comment_id: string }
        Returns: undefined
      }
      reader_email_verified: { Args: never; Returns: boolean }
      reader_has_active_comment_restriction: {
        Args: { p_kind: string; p_profile_id: string }
        Returns: boolean
      }
      reader_public_story_comments: {
        Args: { p_before?: string; p_limit?: number; p_story_id: string }
        Returns: {
          body: string
          display_name: string
          edited: boolean
          id: string
          parent_comment_id: string
          published_at: string
          story_id: string
        }[]
      }
      reader_register_comment_profile: {
        Args: { p_display_name: string }
        Returns: string
      }
      reader_report_story_comment: {
        Args: {
          p_comment_id: string
          p_details?: string
          p_reason_code: string
        }
        Returns: string
      }
      reader_story_discussion_visible: {
        Args: { p_story_id: string }
        Returns: boolean
      }
      reader_story_is_commentable: {
        Args: { p_story_id: string }
        Returns: boolean
      }
      reader_submit_story_comment: {
        Args: {
          p_body: string
          p_parent_comment_id?: string
          p_story_id: string
        }
        Returns: string
      }
      reader_withdraw_story_comment: {
        Args: { p_comment_id: string }
        Returns: undefined
      }
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
