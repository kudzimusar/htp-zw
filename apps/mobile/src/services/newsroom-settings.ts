import type { SupabaseClient } from "@supabase/supabase-js";
import { getStagingSupabaseClient } from "../platform/supabase";
import type {
  NewsroomPlatformSettingItem,
  NewsroomPlatformSettingsOverview,
  NewsroomIntegrationHealth
} from "../domain/models";
import type { NewsroomSettingsService } from "../domain/contracts";

export function mapPlatformSettingItem(raw: any): NewsroomPlatformSettingItem {
  return {
    key: String(raw?.key ?? ""),
    category: String(raw?.category ?? "infrastructure"),
    description: String(raw?.description ?? ""),
    value: typeof raw?.value === "object" && raw?.value !== null ? raw.value : {},
    updatedAt: String(raw?.updated_at ?? raw?.updatedAt ?? new Date().toISOString()),
    updatedBy: raw?.updated_by ? String(raw.updated_by) : (raw?.updatedBy ? String(raw.updatedBy) : null)
  };
}

export function mapPlatformSettingsOverview(data: any): NewsroomPlatformSettingsOverview {
  const rawSettings = Array.isArray(data?.settings) ? data.settings : [];
  const rawIntegrations = typeof data?.integrations === "object" && data?.integrations !== null
    ? data.integrations
    : {};
  const rawAudit = data?.audit_summary ?? data?.auditSummary ?? {};

  const integrations: Record<string, NewsroomIntegrationHealth> = {};
  for (const [key, val] of Object.entries(rawIntegrations)) {
    if (typeof val === "object" && val !== null) {
      const v = val as any;
      integrations[key] = {
        name: String(v.name ?? key),
        provider: String(v.provider ?? ""),
        status: String(v.status ?? "unknown"),
        secretConfigured: Boolean(v.secret_configured ?? v.secretConfigured ?? false),
        ...v
      };
    }
  }

  return {
    settings: rawSettings.map(mapPlatformSettingItem),
    integrations,
    auditSummary: {
      totalAuditEvents24h: Number(rawAudit.total_audit_events_24h ?? rawAudit.totalAuditEvents24h ?? 0),
      lastAuditAction: String(rawAudit.last_audit_action ?? rawAudit.lastAuditAction ?? "none"),
      lastAuditAt: rawAudit.last_audit_at ? String(rawAudit.last_audit_at) : (rawAudit.lastAuditAt ? String(rawAudit.lastAuditAt) : null)
    }
  };
}

export function createNewsroomSettingsService(client?: SupabaseClient | null): NewsroomSettingsService {
  const getClient = (): SupabaseClient =>
    client ?? (getStagingSupabaseClient() as unknown as SupabaseClient);

  return {
    async getPlatformSettings(): Promise<NewsroomPlatformSettingsOverview> {
      const sb = getClient();
      if (!sb) throw new Error("Supabase client unavailable");

      const { data, error } = await (sb.rpc as any)("newsroom_get_platform_settings");
      if (error) {
        throw new Error(`Failed to fetch platform settings: ${error.message}`);
      }
      return mapPlatformSettingsOverview(data);
    },

    async updatePlatformSetting(key: string, value: Record<string, unknown>): Promise<{ key: string; updated: boolean }> {
      const sb = getClient();
      if (!sb) throw new Error("Supabase client unavailable");

      const { data, error } = await (sb.rpc as any)("newsroom_update_platform_setting", {
        p_key: key,
        p_value: value
      });

      if (error) {
        throw new Error(`Failed to update platform setting: ${error.message}`);
      }
      const rawData = data as Record<string, unknown> | null;
      return {
        key: String(rawData?.key ?? key),
        updated: Boolean(rawData?.updated ?? true)
      };
    }
  };
}

export const stagingNewsroomSettingsService = createNewsroomSettingsService();
