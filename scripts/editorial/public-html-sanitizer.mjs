// Allowlist sanitizer for public WordPress HTML. A spec-compliant parser builds
// the same tree a browser would, then only known-safe nodes are serialized, so
// nothing depends on recognizing an attack pattern. Build-time only: never
// bundled into the Reader.
import { parseFragment } from "parse5";

const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
const PUBLISHER_HOSTS = new Set(["healthtimes.co.zw", "www.healthtimes.co.zw"]);
const MEDIA_PATH_PREFIX = "/wp-content/uploads/";
const MAX_INPUT_LENGTH = 500_000;
const MAX_DEPTH = 64;
const MAX_STABILIZING_PASSES = 4;

// Must stay a subset of what the Reader's article parser renders.
const KEPT_ELEMENTS = new Set(["p","h2","h3","blockquote","ul","ol","li","figure","figcaption","img","a","strong","b","em","i","br"]);
const VOID_ELEMENTS = new Set(["img","br"]);
// The content of these is code, a nested document or a form, never article text.
const DROPPED_ELEMENTS = new Set([
  "script","style","template","noscript","noembed","noframes","iframe","frame","frameset",
  "object","embed","applet","form","input","button","select","textarea","datalist","option",
  "head","title","meta","link","base","canvas","audio","video","source","track","map","area",
  "xmp","plaintext","listing","marquee","dialog"
]);

function parseUrl(value, baseUrl) {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  // Browsers strip tabs and newlines from URLs, which is how split schemes work.
  if (!candidate || /[\u0000-\u001F\u007F]/.test(candidate)) return null;
  try {
    return baseUrl ? new URL(candidate, baseUrl) : new URL(candidate);
  } catch {
    return null;
  }
}

export function safeMediaUrl(value, baseUrl = null) {
  const url = parseUrl(value, baseUrl);
  if (!url || url.protocol !== "https:" || url.username || url.password || url.port || url.search) return null;
  if (!PUBLISHER_HOSTS.has(url.hostname) || !url.pathname.startsWith(MEDIA_PATH_PREFIX)) return null;
  return url.href;
}

export function safeLinkUrl(value, baseUrl = null) {
  const url = parseUrl(value, baseUrl);
  if (!url || url.username || url.password) return null;
  return ["https:","http:","mailto:"].includes(url.protocol) ? url.href : null;
}

const escapeText = (value) => value
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/ /g,"&nbsp;");
const escapeAttribute = (value) => escapeText(value).replace(/"/g,"&quot;");
const attributeOf = (node, name) => node.attrs.find((attr) => attr.name === name && !attr.prefix)?.value;
const isDropped = (node) => node.namespaceURI !== HTML_NAMESPACE || DROPPED_ELEMENTS.has(node.tagName);

function serializeChildren(node, baseUrl, depth) {
  return (node.childNodes ?? []).map((child) => serializeNode(child, baseUrl, depth)).join("");
}

function serializeNode(node, baseUrl, depth) {
  if (node.nodeName === "#text") return escapeText(node.value);
  if (!node.tagName || depth > MAX_DEPTH || isDropped(node)) return "";
  const name = node.tagName;
  const children = VOID_ELEMENTS.has(name) ? "" : serializeChildren(node, baseUrl, depth + 1);
  if (!KEPT_ELEMENTS.has(name)) return children;
  if (name === "img") {
    const src = safeMediaUrl(attributeOf(node,"src"), baseUrl);
    if (!src) return "";
    const alt = attributeOf(node,"alt");
    return `<img src="${escapeAttribute(src)}"${alt ? ` alt="${escapeAttribute(alt)}"` : ""}>`;
  }
  if (name === "br") return "<br>";
  if (name === "a") {
    const href = safeLinkUrl(attributeOf(node,"href"), baseUrl);
    return href ? `<a href="${escapeAttribute(href)}">${children}</a>` : children;
  }
  return `<${name}>${children}</${name}>`;
}

export function sanitizePublicHtml(html, { baseUrl = null } = {}) {
  if (typeof html !== "string" || html.length > MAX_INPUT_LENGTH) return "";
  // Unwrapping can leave markup a parser would rearrange, so repeat until the
  // output re-parses to itself. Anything that will not settle is rejected.
  let current = html;
  for (let pass = 0; pass < MAX_STABILIZING_PASSES; pass += 1) {
    const next = serializeChildren(parseFragment(current), baseUrl, 0).trim();
    if (next === current) return next;
    current = next;
  }
  return "";
}

function collectText(node, depth) {
  if (node.nodeName === "#text") return node.value;
  if (depth > MAX_DEPTH) return "";
  if (node.tagName) {
    if (isDropped(node)) return "";
    if (node.tagName === "a" && /\b(?:read-more|more-link)\b/.test(attributeOf(node,"class") ?? "")) return "";
  }
  return (node.childNodes ?? []).map((child) => collectText(child, depth + 1)).join(" ");
}

// Returns decoded plain text for fields the Reader shows as text, never as markup.
export function publicPlainText(html) {
  if (typeof html !== "string" || html.length > MAX_INPUT_LENGTH) return "";
  return collectText(parseFragment(html), 0).replace(/\s+/g," ").trim();
}
