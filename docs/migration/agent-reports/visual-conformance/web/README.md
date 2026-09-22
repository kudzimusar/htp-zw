# Web/PWA Visual Conformance Evidence

Runtime: `0112c8802d220d23e20288783536f22e85ea346d`

Source artifact: `healthtimes-native-web-dist`, workflow run `35703008559`, artifact ID `10683071767`, digest `sha256:e7122881de30fbda4f04a526b5f62d89ae17af17f3384cc6eb88cf75a7c5e156`.

These images were rendered from the exact certified exported PWA artifact without changing repository/runtime code.

Capture classes:

- `STATIC EXPORT RENDERED`: the exported HTML contains the complete pre-rendered screen and the evidence image represents that compiled surface.
- `PRE-HYDRATION ONLY`: Home and Article export loading shells and require browser hydration/data loading before their final content appears. These images are retained as truthful artifact evidence but are **not** used as proof of the final hydrated editorial hierarchy.

The audit environment's managed Chromium enforces `URLBlocklist: ["*"]`, blocking live URL/localhost navigation. A separate browser binary could not be downloaded because outbound DNS is unavailable. No screenshot was fabricated to bypass this limitation.

The dimensions below are the **capture viewport dimensions**. Repository copies may be losslessly or visually downscaled/compressed after capture solely to keep binary evidence bounded; no UI content was added, removed or reconstructed.

Inventory:

- `desktop-home-above-fold.webp` — PRE-HYDRATION ONLY — capture viewport 1440×1000
- `desktop-home-full.webp` — PRE-HYDRATION ONLY — capture viewport 1440×1000
- `tablet-home.webp` — PRE-HYDRATION ONLY — capture viewport 768×1024
- `mobile-home.webp` — PRE-HYDRATION ONLY — capture viewport 390×844
- `article.webp` — PRE-HYDRATION ONLY — capture viewport 1440×1000
- `premium.webp` — STATIC EXPORT RENDERED — capture viewport 1440×1000
- `explore.webp` — STATIC EXPORT RENDERED — capture viewport 1440×1000
- `search.webp` — STATIC EXPORT RENDERED — capture viewport 1440×1000
- `watch.webp` — STATIC EXPORT RENDERED — capture viewport 1440×1000
- `my-healthtimes.webp` — STATIC EXPORT RENDERED — capture viewport 1440×1000
- `studio-landing.webp` — STATIC EXPORT RENDERED — capture viewport 1440×1000

See `docs/migration/agent-reports/VISUAL_CONFORMANCE_WEB_PWA.md` for findings and severity classification.
