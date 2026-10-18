import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewsroomStaffService } from "../domain/contracts";
import type {
  NewsroomStaffMember,
  NewsroomStaffInvitation,
  NewsroomRole,
  NewsroomCapability,
  NewsroomAuditRecord,
  NewsroomStaffOperationsDirectory,
  NewsroomStaffInviteInput
} from "../domain/models";

export function mapStaffMember(raw: Record<string, unknown>): NewsroomStaffMember {
  return {
    id: String(raw.id ?? ""),
    displayName: String(raw.display_name ?? "Unknown Staff"),
    email: String(raw.email ?? ""),
    handle: String(raw.handle ?? ""),
    roleId: raw.role_id ? String(raw.role_id) : null,
    roleName: String(raw.role_name ?? "Unassigned"),
    desk: raw.desk ? String(raw.desk) : null,
    beat: raw.beat ? String(raw.beat) : null,
    country: raw.country ? String(raw.country) : null,
    region: raw.region ? String(raw.region) : null,
    status: String(raw.status ?? "invited"),
    mfaRequired: Boolean(raw.mfa_required ?? true),
    lastLoginAt: raw.last_login_at ? String(raw.last_login_at) : null,
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    activeSessionsCount: Number(raw.active_sessions_count ?? 0),
    capabilities: Array.isArray(raw.capabilities) ? raw.capabilities.map(String) : []
  };
}

export function mapStaffInvitation(raw: Record<string, unknown>): NewsroomStaffInvitation {
  return {
    id: String(raw.id ?? ""),
    invitedEmail: String(raw.invited_email ?? ""),
    displayName: String(raw.display_name ?? ""),
    roleName: String(raw.role_name ?? "Reporter / Journalist"),
    desk: raw.desk ? String(raw.desk) : null,
    country: raw.country ? String(raw.country) : null,
    status: String(raw.status ?? "pending"),
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    expiresAt: String(raw.expires_at ?? "")
  };
}

export function mapRole(raw: Record<string, unknown>): NewsroomRole {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    description: raw.description ? String(raw.description) : null,
    capabilities: Array.isArray(raw.capabilities) ? raw.capabilities.map(String) : []
  };
}

export function mapCapability(raw: Record<string, unknown>): NewsroomCapability {
  const categoryRaw = String(raw.category ?? "");
  const category: NewsroomCapability["category"] =
    categoryRaw === "editorial" ||
    categoryRaw === "distribution" ||
    categoryRaw === "commercial" ||
    categoryRaw === "audit"
      ? categoryRaw
      : "staff_admin";

  return {
    key: String(raw.key ?? ""),
    description: String(raw.description ?? ""),
    category
  };
}

export function mapAuditRecord(raw: Record<string, unknown>): NewsroomAuditRecord {
  return {
    id: String(raw.id ?? ""),
    action: String(raw.action ?? ""),
    actorStaffId: raw.actor_staff_id ? String(raw.actor_staff_id) : null,
    actorName: raw.actor_name ? String(raw.actor_name) : null,
    targetTable: String(raw.target_table ?? ""),
    targetId: raw.target_id ? String(raw.target_id) : null,
    metadata: (raw.metadata && typeof raw.metadata === "object")
      ? (raw.metadata as Record<string, unknown>)
      : {},
    createdAt: String(raw.created_at ?? new Date().toISOString())
  };
}

export function mapStaffOperationsDirectory(
  raw: Record<string, unknown>
): NewsroomStaffOperationsDirectory {
  const staff = Array.isArray(raw.staff)
    ? raw.staff.map((s) => mapStaffMember(s as Record<string, unknown>))
    : [];

  const invitations = Array.isArray(raw.invitations)
    ? raw.invitations.map((i) => mapStaffInvitation(i as Record<string, unknown>))
    : [];

  const roles = Array.isArray(raw.roles)
    ? raw.roles.map((r) => mapRole(r as Record<string, unknown>))
    : [];

  const capabilities = Array.isArray(raw.capabilities)
    ? raw.capabilities.map((c) => mapCapability(c as Record<string, unknown>))
    : [];

  const auditHistory = Array.isArray(raw.audit_history)
    ? raw.audit_history.map((a) => mapAuditRecord(a as Record<string, unknown>))
    : [];

  return {
    staff,
    invitations,
    roles,
    capabilities,
    auditHistory,
    canManageStaff: Boolean(raw.can_manage_staff ?? false)
  };
}

import { getStagingSupabaseClient } from "../platform/supabase";

export function createNewsroomStaffService(
  clientOrFactory: SupabaseClient | (() => SupabaseClient) = getStagingSupabaseClient
): NewsroomStaffService {
  const getClient = () =>
    typeof clientOrFactory === "function" ? clientOrFactory() : clientOrFactory;

  return {
    async getStaffOperationsDirectory(): Promise<NewsroomStaffOperationsDirectory> {
      const client = getClient();
      const { data, error } = await client.rpc(
        "newsroom_get_staff_operations_directory"
      );
      if (error) {
        throw new Error(
          `Failed to load newsroom staff directory: ${error.message} (code ${error.code})`
        );
      }
      return mapStaffOperationsDirectory((data as Record<string, unknown>) ?? {});
    },

    async changeStaffRole(staffId: string, roleName: string): Promise<void> {
      const client = getClient();
      const { error } = await client.rpc("newsroom_change_staff_role", {
        p_staff_id: staffId,
        p_role_name: roleName
      });
      if (error) {
        throw new Error(
          `Failed to change staff role: ${error.message} (code ${error.code})`
        );
      }
    },

    async updateStaffStatus(
      staffId: string,
      status: "active" | "suspended" | "revoked" | "deactivated"
    ): Promise<void> {
      const client = getClient();
      const { error } = await client.rpc("newsroom_update_staff_status", {
        p_staff_id: staffId,
        p_status: status
      });
      if (error) {
        throw new Error(
          `Failed to update staff status: ${error.message} (code ${error.code})`
        );
      }
    },

    async revokeStaffSession(
      staffId: string,
      providerSessionId?: string | null
    ): Promise<number> {
      const client = getClient();
      const { data, error } = await client.rpc("newsroom_revoke_session", {
        p_staff_id: staffId,
        p_provider_session_id: providerSessionId ?? null
      });
      if (error) {
        throw new Error(
          `Failed to revoke staff session: ${error.message} (code ${error.code})`
        );
      }
      return Number(data ?? 0);
    },

    async createInvitation(
      input: NewsroomStaffInviteInput
    ): Promise<{ id: string; email: string; displayName: string; role: string }> {
      const client = getClient();
      const { data, error } = await client.rpc("newsroom_create_invitation", {
        p_email: input.email,
        p_display_name: input.displayName,
        p_role_name: input.roleName,
        p_desk: input.desk ?? null,
        p_country: input.country ?? null
      });
      if (error) {
        throw new Error(
          `Failed to invite staff member: ${error.message} (code ${error.code})`
        );
      }
      const res = data as Record<string, unknown>;
      return {
        id: String(res.id ?? ""),
        email: String(res.email ?? input.email),
        displayName: String(res.display_name ?? input.displayName),
        role: String(res.role ?? input.roleName)
      };
    },

    async cancelInvitation(invitationId: string): Promise<void> {
      const client = getClient();
      const { error } = await client.rpc("newsroom_cancel_invitation", {
        p_invitation_id: invitationId
      });
      if (error) {
        throw new Error(
          `Failed to cancel staff invitation: ${error.message} (code ${error.code})`
        );
      }
    }
  };
}

export const stagingNewsroomStaffService = createNewsroomStaffService(getStagingSupabaseClient);

