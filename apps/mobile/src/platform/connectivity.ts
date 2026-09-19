import { getStagingSupabaseClient } from "./supabase";
import { hasStagingConfig, stagingConfig } from "./config";

export type ConnectivityCheck = {
  key: "configuration" | "auth" | "database" | "storage" | "session";
  label: string;
  status: "pass" | "fail";
  detail: string;
};

export type ConnectivityReport = {
  status: "healthy" | "degraded" | "misconfigured";
  checkedAt: string;
  projectRef: string | null;
  checks: ConnectivityCheck[];
};

function projectRefFromUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    return host.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkStagingConnectivity(): Promise<ConnectivityReport> {
  const checkedAt = new Date().toISOString();
  const projectRef = projectRefFromUrl(stagingConfig.url);
  const checks: ConnectivityCheck[] = [];

  if (!hasStagingConfig || projectRef !== stagingConfig.expectedProjectRef) {
    checks.push({
      key: "configuration",
      label: "Staging configuration",
      status: "fail",
      detail: "Expected HealthTimes Staging URL and modern publishable key are not configured."
    });
    return { status: "misconfigured", checkedAt, projectRef, checks };
  }

  checks.push({
    key: "configuration",
    label: "Staging configuration",
    status: "pass",
    detail: "Configured for the certified HealthTimes Staging project."
  });

  const headers = {
    apikey: stagingConfig.publishableKey,
    Authorization: `Bearer ${stagingConfig.publishableKey}`
  };

  try {
    const response = await fetchWithTimeout(
      `${stagingConfig.url}/auth/v1/settings`,
      { headers }
    );
    checks.push({
      key: "auth",
      label: "Auth service",
      status: response.ok ? "pass" : "fail",
      detail: response.ok
        ? "Supabase Auth settings endpoint is reachable."
        : `Auth endpoint returned HTTP ${response.status}.`
    });
  } catch (error) {
    checks.push({
      key: "auth",
      label: "Auth service",
      status: "fail",
      detail: error instanceof Error ? error.message : String(error)
    });
  }

  const supabase = getStagingSupabaseClient();

  try {
    const { data, error } = await supabase.from("stories").select("id").limit(1);
    checks.push({
      key: "database",
      label: "Database / RLS boundary",
      status: error ? "fail" : "pass",
      detail: error
        ? error.message
        : `PostgREST reachable; anonymous result count ${data?.length ?? 0}. Empty is expected before AG-04 / public read policies.`
    });
  } catch (error) {
    checks.push({
      key: "database",
      label: "Database / RLS boundary",
      status: "fail",
      detail: error instanceof Error ? error.message : String(error)
    });
  }

  try {
    const { data, error } = await supabase.storage
      .from("migrated-media")
      .list("", { limit: 1, offset: 0 });

    checks.push({
      key: "storage",
      label: "Public migrated media bucket",
      status: error ? "fail" : "pass",
      detail: error
        ? error.message
        : `Storage reachable; object sample count ${data?.length ?? 0}.`
    });
  } catch (error) {
    checks.push({
      key: "storage",
      label: "Public migrated media bucket",
      status: "fail",
      detail: error instanceof Error ? error.message : String(error)
    });
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    checks.push({
      key: "session",
      label: "Session persistence baseline",
      status: error ? "fail" : "pass",
      detail: error
        ? error.message
        : data.session
          ? "A persisted staging session is available."
          : "No active staging session; persistence provider initialized successfully."
    });
  } catch (error) {
    checks.push({
      key: "session",
      label: "Session persistence baseline",
      status: "fail",
      detail: error instanceof Error ? error.message : String(error)
    });
  }

  return {
    status: checks.every((check) => check.status === "pass") ? "healthy" : "degraded",
    checkedAt,
    projectRef,
    checks
  };
}
