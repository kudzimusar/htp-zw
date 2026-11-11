import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./ts-module-loader.mjs";

// The real expo-linking parsers: mocking these is what hid native URL semantics.
const webLinking = loadTs("node_modules/expo-linking/src/createURL.web.ts");
const nativeLinking = loadTs("node_modules/expo-linking/src/createURL.ts", { mocks: {
  "./Schemes": { hasCustomScheme: () => true, resolveScheme: () => "healthtimes" },
  "./validateURL": { validateURL() {} }
} });

const flush = () => new Promise((done) => setImmediate(done));
const ORIGIN = "https://preview.example";

// Runs real component code with only React's hooks stubbed.
function hooks() {
  const refs = []; const states = []; let effects = []; let refAt = 0; let stateAt = 0;
  return {
    react: {
      useRef: (value) => { const at = refAt++; refs[at] ??= { current: value }; return refs[at]; },
      useState: (value) => { const at = stateAt++; if (!(at in states)) states[at] = value; return [states[at], (next) => { states[at] = next; }]; },
      useEffect: (run, deps) => effects.push({ run, deps }),
      useCallback: (fn) => fn,
      useMemo: (fn) => fn()
    },
    render(component) { refAt = 0; stateAt = 0; effects = []; component(); return effects; },
    states
  };
}

function fakeBrowser(href) {
  const listeners = [];
  return {
    location: new URL(href),
    addEventListener: (type, fn) => { if (type === "message") listeners.push(fn); },
    removeEventListener: (type, fn) => { const at = listeners.indexOf(fn); if (at >= 0) listeners.splice(at, 1); },
    message(data, origin = "https://evil.example") { for (const fn of [...listeners]) fn({ data, origin }); },
    get messageListeners() { return listeners.length; }
  };
}

// Mirrors expo-linking: on web the "url" event is bound to window "message" events.
function linkingFor(os, browser, initialUrl) {
  const native = [];
  return {
    parse: os === "web" ? webLinking.parse : nativeLinking.parse,
    createURL: (path) => "healthtimes://" + path,
    getInitialURL: async () => initialUrl ?? (browser ? browser.location.href : null),
    addEventListener(type, listener) {
      if (os === "web") {
        const relay = (nativeEvent) => listener({ url: browser.location.href, nativeEvent });
        browser.addEventListener("message", relay);
        return { remove: () => browser.removeEventListener("message", relay) };
      }
      native.push(listener);
      return { remove() { native.splice(native.indexOf(listener), 1); } };
    },
    open(url) { for (const fn of [...native]) fn({ url }); },
    get nativeListeners() { return native.length; }
  };
}

function withWindow(browser, run) {
  const previous = globalThis.window;
  if (browser) globalThis.window = browser; else delete globalThis.window;
  return Promise.resolve().then(run).finally(() => {
    if (previous === undefined) delete globalThis.window; else globalThis.window = previous;
  });
}

const parserFor = (os, browser) => loadTs("src/growth/deepLinks.ts", { mocks: { "expo-linking": linkingFor(os, browser) } });

function mountBridge({ os, browser, initialUrl, pathname = "/" }) {
  const h = hooks();
  const linking = linkingFor(os, browser, initialUrl);
  const pushes = [];
  const state = { pathname };
  const router = { push: (target) => pushes.push(target) };
  const { DeepLinkBridge } = loadTs("app/_layout.tsx", { mocks: {
    react: h.react,
    "react/jsx-runtime": { jsx() {}, jsxs() {}, Fragment: "f" },
    "react-native": { Platform: { OS: os } },
    "expo-linking": linking,
    "expo-router": { Stack: Object.assign(() => null, { Screen: () => null }), usePathname: () => state.pathname, useRouter: () => router },
    "expo-status-bar": { StatusBar: () => null },
    "../src/theme/AppearanceProvider": { AppearanceProvider: () => null }
  } });
  const cleanups = h.render(DeepLinkBridge).map((effect) => effect.run());
  return {
    linking, pushes,
    navigateTo(path) { state.pathname = path; h.render(DeepLinkBridge).at(-1).run(); },
    unmount() { for (const cleanup of cleanups) cleanup?.(); }
  };
}

test("parser accepts the app's own article links under real native semantics", () => withWindow(null, () => {
  const { parseHealthTimesDeepLink: parse } = parserFor("ios");
  assert.deepEqual(parse("healthtimes://article/art-123"), { type: "article", articleId: "art-123" });
  assert.deepEqual(parse("healthtimes:///article/art-123"), { type: "article", articleId: "art-123" });
}));

test("parser accepts publisher links carrying an article id", () => withWindow(null, () => {
  const { parseHealthTimesDeepLink: parse } = parserFor("ios");
  assert.deepEqual(parse("https://healthtimes.co.zw/story/?ht_article_id=art-123"), { type: "article", articleId: "art-123" });
  assert.deepEqual(parse("https://www.healthtimes.co.zw/story/?ht_article_id=art-123"), { type: "article", articleId: "art-123" });
}));

test("parser accepts the current web origin's article path", () => withWindow(fakeBrowser(ORIGIN + "/"), () => {
  const { parseHealthTimesDeepLink: parse } = parserFor("web", globalThis.window);
  assert.deepEqual(parse(ORIGIN + "/article/art-123"), { type: "article", articleId: "art-123" });
}));

for (const [label, url] of Object.entries({
  "another origin's article path": "https://evil.example/article/abc",
  "article id on an untrusted host": "https://evil.example/?ht_article_id=abc",
  "lookalike host": "https://healthtimes.co.zw.evil.example/?ht_article_id=abc",
  "insecure publisher link": "http://healthtimes.co.zw/?ht_article_id=abc",
  "embedded credentials": "https://user:pw@healthtimes.co.zw/?ht_article_id=abc",
  "javascript scheme": "javascript:alert(1)",
  "data scheme": "data:text/html,<a>",
  "file scheme": "file:///article/abc",
  "ftp scheme": "ftp://healthtimes.co.zw/article/abc",
  "non-article app route": "healthtimes://edition",
  "account route": "healthtimes://account-access",
  "missing article id": "healthtimes://article/",
  "extra path segment": "healthtimes://article/a/b",
  "malformed percent encoding": "healthtimes://article/%E0%A4%A",
  "encoded traversal": "healthtimes://article/..%2F..%2Fstudio",
  "encoded slash": "healthtimes://article/a%2Fb",
  "traversal in article id parameter": "https://healthtimes.co.zw/?ht_article_id=../../studio",
  "markup in article id parameter": "https://healthtimes.co.zw/?ht_article_id=%3Cscript%3E",
  "oversized article id": "https://healthtimes.co.zw/?ht_article_id=" + "a".repeat(161),
  "oversized link": "healthtimes://article/" + "a".repeat(3000),
  "not a URL": "not a url",
  "empty string": ""
})) {
  test("parser rejects " + label, () => withWindow(fakeBrowser(ORIGIN + "/"), () => {
    const { parseHealthTimesDeepLink: parse } = parserFor("web", globalThis.window);
    assert.equal(parse(url), null);
  }));
}

test("web registers no message listener and untrusted messages cannot navigate", () => withWindow(fakeBrowser(ORIGIN + "/article/art-123?utm=x"), async () => {
  const browser = globalThis.window;
  const bridge = mountBridge({ os: "web", browser, pathname: "/article/art-123" });
  await flush();
  assert.equal(browser.messageListeners, 0);
  for (let n = 0; n < 200; n += 1) browser.message({ n, url: "https://evil.example/article/stolen" });
  await flush();
  assert.deepEqual(bridge.pushes, []);
  bridge.unmount();
}));

test("a publisher web link navigates exactly once and message traffic adds nothing", () => withWindow(fakeBrowser("https://healthtimes.co.zw/story/?ht_article_id=art-123"), async () => {
  const browser = globalThis.window;
  const bridge = mountBridge({ os: "web", browser, pathname: "/story" });
  await flush();
  for (let n = 0; n < 50; n += 1) browser.message({ n });
  await flush();
  assert.deepEqual(bridge.pushes, ["/article/art-123"]);
  bridge.unmount();
}));

test("native keeps its URL listener", () => withWindow(null, async () => {
  const bridge = mountBridge({ os: "ios", initialUrl: null });
  await flush();
  assert.equal(bridge.linking.nativeListeners, 1);
  bridge.unmount();
  assert.equal(bridge.linking.nativeListeners, 0);
}));

test("native leaves app-scheme links to Expo Router so they open exactly once", () => withWindow(null, async () => {
  const bridge = mountBridge({ os: "android", initialUrl: "healthtimes://article/art-123" });
  await flush();
  bridge.linking.open("healthtimes://article/art-123");
  await flush();
  assert.deepEqual(bridge.pushes, []);
  bridge.unmount();
}));

test("a native publisher link navigates once and identical repeats are deduplicated", () => withWindow(null, async () => {
  const bridge = mountBridge({ os: "ios", initialUrl: null });
  await flush();
  const link = "https://healthtimes.co.zw/story/?ht_article_id=art-123";
  bridge.linking.open(link);
  bridge.linking.open(link);
  bridge.linking.open(link);
  assert.deepEqual(bridge.pushes, ["/article/art-123"]);
  bridge.navigateTo("/article/art-123");
  bridge.linking.open(link);
  assert.deepEqual(bridge.pushes, ["/article/art-123"]);
  bridge.unmount();
}));

test("the same native link works again after the reader leaves the article", () => withWindow(null, async () => {
  const bridge = mountBridge({ os: "ios", initialUrl: null });
  await flush();
  const link = "https://healthtimes.co.zw/story/?ht_article_id=art-123";
  bridge.linking.open(link);
  bridge.navigateTo("/article/art-123");
  bridge.navigateTo("/");
  bridge.linking.open(link);
  assert.deepEqual(bridge.pushes, ["/article/art-123", "/article/art-123"]);
  bridge.unmount();
}));

test("native rejects a hostile link without throwing", () => withWindow(null, async () => {
  const bridge = mountBridge({ os: "ios", initialUrl: null });
  await flush();
  for (const url of ["https://evil.example/?ht_article_id=abc", "not a url", "https://healthtimes.co.zw/?ht_article_id=%E0%A4%A"]) bridge.linking.open(url);
  assert.deepEqual(bridge.pushes, []);
  bridge.unmount();
}));

function mountAccount({ os, browser, initialUrl, callback = { status: "success", message: "ok" }, owner = { success: true } }) {
  const h = hooks();
  const linking = linkingFor(os, browser, initialUrl);
  const calls = { callbacks: [], bootstraps: 0, replaced: [] };
  const element = () => null;
  const { default: Screen } = loadTs("app/account-access.tsx", { mocks: {
    react: h.react,
    "react/jsx-runtime": { jsx() {}, jsxs() {}, Fragment: "f" },
    "react-native": { Platform: { OS: os }, Pressable: element, StyleSheet: { create: (s) => s }, Text: element, TextInput: element, View: element },
    "expo-linking": linking,
    "expo-router": { useRouter: () => ({ replace: (path) => calls.replaced.push(path) }) },
    "../src/ui/Layout": { Chip: element, Page: element, Section: element, SectionHeader: element },
    "../src/services": { services: {
      auth: { handleAuthCallback: async (url) => { calls.callbacks.push(url); return callback; } },
      newsroomStaff: { bootstrapOwner: async () => { calls.bootstraps += 1; return owner; } }
    } },
    "../src/theme/tokens": { layout: {}, radius: {}, spacing: {} },
    "../src/theme/AppearanceProvider": { useAppearance: () => ({ palette: {} }) }
  } });
  const cleanups = h.render(Screen).map((effect) => effect.run());
  return { linking, calls, states: h.states, unmount() { for (const cleanup of cleanups) cleanup?.(); } };
}

const OWNER_CALLBACK = ORIGIN + "/account-access?mode=owner-activation&code=one-time";

test("web account callback registers no message listener", () => withWindow(fakeBrowser(OWNER_CALLBACK), async () => {
  const browser = globalThis.window;
  const screen = mountAccount({ os: "web", browser });
  await flush();
  assert.equal(browser.messageListeners, 0);
  screen.unmount();
}));

test("unrelated messages cannot re-run the auth callback or owner bootstrap", () => withWindow(fakeBrowser(OWNER_CALLBACK), async () => {
  const browser = globalThis.window;
  const screen = mountAccount({ os: "web", browser });
  await flush();
  assert.equal(screen.calls.callbacks.length, 1);
  assert.equal(screen.calls.bootstraps, 1);
  for (let n = 0; n < 100; n += 1) browser.message({ n });
  await flush();
  assert.equal(screen.calls.callbacks.length, 1);
  assert.equal(screen.calls.bootstraps, 1);
  screen.unmount();
}));

test("a failed callback never bootstraps the owner", () => withWindow(fakeBrowser(OWNER_CALLBACK), async () => {
  const screen = mountAccount({ os: "web", browser: globalThis.window, callback: { status: "error", message: "bad" } });
  await flush();
  assert.equal(screen.calls.bootstraps, 0);
  screen.unmount();
}));

for (const [label, url] of Object.entries({
  "another path mentioning account-access": ORIGIN + "/evil?next=account-access&mode=owner-activation&code=x",
  "a nested path": ORIGIN + "/account-access/extra?mode=owner-activation&code=x",
  "another origin": "https://evil.example/account-access?mode=owner-activation&code=x",
  "an unknown mode": ORIGIN + "/account-access?mode=admin&code=x",
  "a duplicated mode": ORIGIN + "/account-access?mode=recovery&mode=owner-activation&code=x",
  "no callback credentials": ORIGIN + "/account-access?mode=owner-activation",
  "an access token without a refresh token": ORIGIN + "/account-access?mode=recovery#access_token=x"
})) {
  test("the account callback ignores " + label, () => withWindow(fakeBrowser(ORIGIN + "/account-access"), async () => {
    const screen = mountAccount({ os: "web", browser: globalThis.window, initialUrl: url });
    await flush();
    assert.equal(screen.calls.callbacks.length, 0);
    assert.equal(screen.calls.bootstraps, 0);
    screen.unmount();
  }));
}

test("owner bootstrap needs the exact mode, not a look-alike parameter", () => withWindow(fakeBrowser(ORIGIN + "/account-access"), async () => {
  const url = ORIGIN + "/account-access?mode=recovery&note=mode=owner-activation&code=x";
  const screen = mountAccount({ os: "web", browser: globalThis.window, initialUrl: url });
  await flush();
  assert.equal(screen.calls.callbacks.length, 1);
  assert.equal(screen.calls.bootstraps, 0);
  screen.unmount();
}));

test("a plain visit to the account page processes nothing", () => withWindow(fakeBrowser(ORIGIN + "/account-access"), async () => {
  const screen = mountAccount({ os: "web", browser: globalThis.window });
  await flush();
  assert.equal(screen.calls.callbacks.length, 0);
  screen.unmount();
}));

test("a native callback is consumed once even when delivered twice", () => withWindow(null, async () => {
  const url = "healthtimes://account-access?mode=recovery&code=one-time";
  const screen = mountAccount({ os: "ios", initialUrl: url });
  await flush();
  screen.linking.open(url);
  await flush();
  assert.equal(screen.calls.callbacks.length, 1);
  screen.unmount();
}));

test("a native token callback in the URL fragment is accepted", () => withWindow(null, async () => {
  const url = "healthtimes://account-access?mode=verification#access_token=a&refresh_token=b";
  const screen = mountAccount({ os: "android", initialUrl: url });
  await flush();
  assert.equal(screen.calls.callbacks.length, 1);
  screen.unmount();
}));

function authServiceWith(client) {
  return loadTs("src/services/staging.ts", { mocks: {
    "expo-linking": { createURL: (path) => "healthtimes://" + path },
    "../fixtures/content": { notifications: [] },
    "../platform/connectivity": { checkStagingConnectivity() {} },
    "../platform/supabase": { getStagingSupabaseClient: () => client },
    "../security/push": { requestPushRegistrationBaseline() {} }
  } }).stagingAuthService;
}
const CALLBACK = "healthtimes://account-access?mode=verification";

test("a valid code is exchanged exactly once for a session", async () => {
  const exchanged = [];
  const auth = authServiceWith({ auth: { exchangeCodeForSession: async (code) => { exchanged.push(code); return { error: null }; } } });
  const result = await auth.handleAuthCallback(CALLBACK + "&code=abc");
  assert.equal(result.status, "success");
  assert.deepEqual(exchanged, ["abc"]);
});

test("a rejected code does not report a session", async () => {
  const auth = authServiceWith({ auth: { exchangeCodeForSession: async () => ({ error: new Error("invalid") }) } });
  assert.equal((await auth.handleAuthCallback(CALLBACK + "&code=expired")).status, "error");
});

test("both session tokens are required", async () => {
  let set = 0;
  const auth = authServiceWith({ auth: { setSession: async () => { set += 1; return { error: null }; } } });
  assert.equal((await auth.handleAuthCallback(CALLBACK + "#access_token=a")).status, "blocked");
  assert.equal(set, 0);
  assert.equal((await auth.handleAuthCallback(CALLBACK + "#access_token=a&refresh_token=b")).status, "success");
  assert.equal(set, 1);
});

test("rejected session tokens do not report a session", async () => {
  const auth = authServiceWith({ auth: { setSession: async () => ({ error: new Error("invalid") }) } });
  assert.equal((await auth.handleAuthCallback(CALLBACK + "#access_token=a&refresh_token=b")).status, "error");
});

test("a provider error or a malformed callback never yields a session", async () => {
  const auth = authServiceWith({ auth: {} });
  assert.equal((await auth.handleAuthCallback(CALLBACK + "&error=access_denied")).status, "blocked");
  assert.equal((await auth.handleAuthCallback("not a url")).status, "error");
});
