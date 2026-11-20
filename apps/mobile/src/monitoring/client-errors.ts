// HT-MVP-PUBLIC-LAUNCH-01-G5: privacy-conscious, cost-controlled client error capture.
//
// OFF by default: nothing is installed and nothing is sent unless the build sets
// EXPO_PUBLIC_HEALTHTIMES_ERROR_ENDPOINT (an Owner decision; see
// docs/delivery/HT-MVP-G5-MONITORING-RUNBOOK.md). Reports carry no cookies'
// contents, no query strings, no emails, tokens, phone numbers or identifiers,
// are sampled, de-duplicated and capped per page session.

export type ClientErrorReport = {
  readonly kind: "error" | "unhandledrejection";
  readonly message: string;
  readonly stack: string | null;
  readonly path: string;
  readonly release: string;
  readonly at: string;
};

const MAX_MESSAGE = 300;
const MAX_STACK_FRAMES = 8;

export function scrubText(value: unknown): string {
  return String(value ?? "")
    .replace(/https?:\/\/[^\s"'()<>]+/gi, (url) => {
      try {
        const parsed = new URL(url);
        return parsed.origin + parsed.pathname;
      } catch {
        return "[url]";
      }
    })
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(\.[A-Za-z0-9_-]+)?/g, "[token]")
    .replace(/\b(sb_(publishable|secret)_[A-Za-z0-9_-]+|Bearer\s+[A-Za-z0-9._~+/=-]+)/gi, "[token]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id]")
    .replace(/\+?\d[\d\s-]{8,}\d/g, "[number]")
    .replace(/\b[A-Za-z0-9+/=_-]{32,}\b/g, "[redacted]")
    .slice(0, MAX_MESSAGE);
}

function scrubStack(stack: unknown): string | null {
  if (typeof stack !== "string" || !stack) return null;
  return stack.split("\n").slice(0, MAX_STACK_FRAMES).map((line) => scrubText(line.trim())).join("\n");
}

export function buildReport(input: { kind: ClientErrorReport["kind"]; error: unknown; path: string; release: string; now?: Date }): ClientErrorReport {
  const error = input.error as { message?: unknown; stack?: unknown } | null | undefined;
  const message = error && typeof error === "object" && "message" in error ? error.message : input.error;
  return {
    kind: input.kind,
    message: scrubText(message) || "Unknown error",
    stack: error && typeof error === "object" ? scrubStack(error.stack) : null,
    path: scrubText(String(input.path || "/").split("?")[0]?.split("#")[0] || "/"),
    release: scrubText(input.release || "unknown").slice(0, 64),
    at: (input.now ?? new Date()).toISOString()
  };
}

/** Same-origin path, or an https endpoint. Anything else disables reporting. */
export function validEndpoint(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const endpoint = value.trim();
  if (/^\/[A-Za-z0-9/_.?=&-]*$/.test(endpoint) && !endpoint.startsWith("//")) return endpoint;
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

export function createReporter(options: {
  endpoint: string | null;
  sampleRate?: number;
  maxPerSession?: number;
  send: (endpoint: string, body: string) => boolean;
  random?: () => number;
}) {
  const sampleRate = Math.max(0, Math.min(1, options.sampleRate ?? 0.25));
  const maxPerSession = Math.max(0, options.maxPerSession ?? 5);
  const random = options.random ?? Math.random;
  const seen = new Set<string>();
  let sent = 0;
  let reporting = false;
  return function report(entry: ClientErrorReport): boolean {
    if (!options.endpoint || reporting || sent >= maxPerSession) return false;
    const signature = entry.kind + "|" + entry.message + "|" + entry.path;
    if (seen.has(signature)) return false;
    seen.add(signature);
    if (random() >= sampleRate) return false;
    reporting = true;
    try {
      const delivered = options.send(options.endpoint, JSON.stringify(entry));
      if (delivered) sent += 1;
      return delivered;
    } catch {
      return false;
    } finally {
      reporting = false;
    }
  };
}

let installed = false;

/** Web only; returns false (and installs nothing) without a valid endpoint. */
export function installClientErrorReporting(options: {
  platform: string;
  endpoint?: string;
  release?: string;
  target?: { addEventListener?: (type: string, listener: (event: any) => void) => void; location?: { pathname?: string } };
  send?: (endpoint: string, body: string) => boolean;
} = { platform: "web" }): boolean {
  const endpoint = validEndpoint(options.endpoint ?? process.env.EXPO_PUBLIC_HEALTHTIMES_ERROR_ENDPOINT);
  const target = options.target ?? (globalThis as any);
  if (installed || options.platform !== "web" || !endpoint || typeof target?.addEventListener !== "function") return false;
  const send = options.send ?? ((url: string, body: string) => {
    const nav = (globalThis as any).navigator;
    return typeof nav?.sendBeacon === "function" ? nav.sendBeacon(url, body) : false;
  });
  const report = createReporter({ endpoint, send });
  const release = options.release ?? "unknown";
  const path = () => String(target.location?.pathname || "/");
  target.addEventListener("error", (event: any) => {
    report(buildReport({ kind: "error", error: event?.error ?? event?.message, path: path(), release }));
  });
  target.addEventListener("unhandledrejection", (event: any) => {
    report(buildReport({ kind: "unhandledrejection", error: event?.reason, path: path(), release }));
  });
  installed = true;
  return true;
}
