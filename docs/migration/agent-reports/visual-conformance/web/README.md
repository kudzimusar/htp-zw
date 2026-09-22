# AG-07 Web/PWA Visual Evidence Manifest

Checkpoint: 2026-09-22

Certified integrated SHA: `0112c8802d220d23e20288783536f22e85ea346d`

Exact universal PWA workflow artifact:
- workflow run: `35703008559`
- artifact: `healthtimes-native-web-dist`
- artifact ID: `10683071767`
- artifact SHA-256: `e7122881de30fbda4f04a526b5f62d89ae17af17f3384cc6eb88cf75a7c5e156`

## Capture method

The screenshot matrix was rendered from the exact exported HTML bytes in the certified artifact.

The environment's managed Chromium policy blocks ordinary URL navigation, and the exact Vercel deployment is protected by Vercel SSO. The evidence therefore distinguishes two classes:

1. **exact static-export initial render** — captured directly from the artifact without altering runtime code;
2. **hydrated/runtime behavior** — supported by the exact-SHA Chromium UAT run where available, but not represented as a screenshot when browser navigation could not be performed.

The Home and Article static export intentionally contain loading states before hydration. Their screenshots **must not** be treated as proof of the final hydrated Home/Article composition.

No mock/reconstructed final Home screenshot was created.

## Required screenshot inventory

| Required view | Capture | Evidence status |
| --- | --- | --- |
| Desktop Home — above fold | `desktop-home-above-fold.png` | CAPTURED LOCALLY — exact export initial SSR; hydrated Home not captured |
| Desktop Home — full-page/major sections | `desktop-home-full.png` | CAPTURED LOCALLY — exact export initial SSR; hydrated major sections not captured |
| Tablet Home | `tablet-home.png` | CAPTURED LOCALLY — exact export initial SSR; hydrated Home not captured |
| Mobile Home | `mobile-home.png` | CAPTURED LOCALLY — exact export initial SSR; hydrated Home not captured |
| Article | `article.png` | CAPTURED LOCALLY — exact export initial SSR; hydrated article not captured |
| Premium | `premium.png` | CAPTURED LOCALLY — useful exact static render |
| Explore | `explore.png` | CAPTURED LOCALLY — useful exact static render |
| Search | `search.png` | CAPTURED LOCALLY — useful exact static render |
| Watch | `watch.png` | CAPTURED LOCALLY — useful exact static render |
| My HealthTimes | `my-healthtimes.png` | CAPTURED LOCALLY — useful exact static render |
| Studio landing | `studio-landing.png` | CAPTURED LOCALLY — useful exact static render |

Local evidence-pack SHA-256:

`23bf2873b18e533a0e062f45e48c3eecf218daba4719250261b0eb02d8d72cd9`

File checksums:

- `article.png` — `6305d623fa136326ce1767d653716704e587fb9be963596e39bbbf44276aacb7`
- `desktop-home-above-fold.png` — `b2a77a6ed5da75c5a774d96ff88aa6f3b54c031f3eff242065135a0b6a99245b`
- `desktop-home-full.png` — `16c7b26f3bb1328cd6416608c7eab018c89fa70b9ae7829a0d2d8c661d5c05fb`
- `explore.png` — `5a091091634373963032d2f2a8cf3fc1305f73ef77da1d21e140f1ec67181d3f`
- `mobile-home.png` — `8dad8bae6833f38a7d694aa2cefaff65f1a38a48cb470da2dddef1de2776cca9`
- `my-healthtimes.png` — `d5c8b219626732809c5dd477954b5e07bea70b2610b2b5f0fbab60290dcb032c`
- `premium.png` — `7b1b67abead000f5762332e57c5d4d3a26009c15902dfce57d860e6ac62a4bd0`
- `search.png` — `033e3cb35fcecf1126441e5a74365a92bcd1e19e2baaf41c32e52b20ec15d2ab`
- `studio-landing.png` — `549e951f45cb47668311e35bd2dbf0be8c3f7c7ee2ad15b16c0e629b196c3399`
- `tablet-home.png` — `21aa7587bc5f5341b8a05b389450136825dac798257869ea96b8a23b94ff4122`
- `watch.png` — `78acf21fead22f47917e472cbfbdcb9dba94381fec4d67f6317a58b64d114481`

## Repository binary-evidence limitation

The connected GitHub write action available to this audit can create/update UTF-8 repository files but does not expose a local-binary upload handoff. The PNG/JPEG bytes were therefore captured and hashed but could not truthfully be placed into this Git branch through the connector.

This directory manifest is committed so the missing binary custody is explicit rather than fabricated.

**BINARY SCREENSHOT REPOSITORY CUSTODY: INCOMPLETE**

A moderator/owner with normal Git workspace access can copy the verified screenshot pack into this directory without any runtime modification.
