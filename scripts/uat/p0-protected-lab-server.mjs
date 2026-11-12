// Local stand-in for the protected Vercel preview. Requests with no session get
// the 401 Deployment Protection returns, and the API barrier answers as the sealed
// artifact does. A permissive static server hid both from earlier lab runs.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

export const LAB_SESSION_COOKIE = "_vercel_jwt";
export const FORBIDDEN_PAGE_PATH = "/p0-lab-forbidden";

const TYPES = {
  ".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",
  ".webp":"image/webp",".ico":"image/x-icon",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf",".txt":"text/plain; charset=utf-8"
};

export function startProtectedLab({ distDir, port, legacyWorkerPath }) {
  const root = path.resolve(distDir);
  let serveLegacyWorker = false;
  let outage = false;

  const file = (relative) => {
    const candidate = path.join(root, relative);
    return candidate.startsWith(root + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : null;
  };
  const resolvePage = (pathname) => {
    if (pathname === "/") return file("index.html");
    const relative = pathname.replace(/^\/+/, "");
    const hit = file(relative) ?? file(relative + ".html") ?? file(path.join(relative, "index.html"));
    if (hit) return hit;
    for (const [pattern, fallback] of [[/^article\//, "article/fallback.html"], [/^author\//, "author/fallback.html"], [/^studio\/staff\//, "studio/staff/fallback.html"]]) {
      if (pattern.test(relative)) return file(fallback);
    }
    return null;
  };
  const send = (res, status, type, body) => {
    res.writeHead(status, { "content-type": type, "cache-control": "public, max-age=0, must-revalidate" });
    res.end(body);
  };

  const server = http.createServer((req, res) => {
    if (outage) { req.socket.destroy(); return; }
    const { pathname, searchParams } = new URL(req.url, "http://127.0.0.1");
    const json = "application/json; charset=utf-8";
    if (!new RegExp("(^|;\\s*)" + LAB_SESSION_COOKIE + "=").test(req.headers.cookie ?? "")) {
      return send(res, 401, json, JSON.stringify({ error: "authentication_required" }));
    }
    if (pathname === "/sw.js" && serveLegacyWorker) return send(res, 200, TYPES[".js"], fs.readFileSync(legacyWorkerPath));
    if (pathname === FORBIDDEN_PAGE_PATH) return send(res, 403, TYPES[".html"], "<!doctype html><title>Forbidden</title>");
    if (pathname === "/api/public") return send(res, 503, json, JSON.stringify({ error: "NOT_CONFIGURED" }));
    if (/^\/api\/(commerce|newsroom|communications)$/.test(pathname)) {
      const action = (searchParams.get("action") ?? "").toLowerCase();
      if (req.method === "GET" && (!action || action === "providerhealth")) return send(res, 200, json, JSON.stringify({ ready: false, mode: "preview-isolated" }));
      return send(res, 403, json, JSON.stringify({ ok: false, error: "PREVIEW_MUTATION_BLOCKED" }));
    }
    const hit = resolvePage(decodeURIComponent(pathname));
    if (!hit) return send(res, 404, "text/plain", "Not found");
    send(res, 200, TYPES[path.extname(hit).toLowerCase()] ?? "application/octet-stream", fs.readFileSync(hit));
  });

  return new Promise((ready) => server.listen(port, "127.0.0.1", () => ready({
    useLegacyWorker: (value) => { serveLegacyWorker = value; },
    setOutage: (value) => { outage = value; },
    close: () => new Promise((done) => { server.closeAllConnections?.(); server.close(done); })
  })));
}
