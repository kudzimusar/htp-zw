# NM-02 — HealthTimes Staging Connectivity Report

**Repository:** `kudzimusar/htp-zw`  
**Branch:** `feat/native-mobile-nm02-staging-connectivity`  
**Checkpoint:** NM-02 — Staging Connectivity  
**Certified runtime SHA:** `f071316bc56e57bc4b3baa80e76c10f1f85cbf56`  
**Production systems modified:** NO

## 1. AG-02 staging identity verified

Live project evidence:

- project: `HealthTimes Staging`
- project ref: `gcdohgbmqhqwydgaxrcr`
- region: `ap-northeast-1`
- status: `ACTIVE_HEALTHY`
- Supabase API URL: `https://gcdohgbmqhqwydgaxrcr.supabase.co`
- API credential used by the app: modern browser-safe publishable key only
- privileged service-role/database credential in app: **NO**

Live migration history:

1. `20260909000100 content_core`
2. `20260909000200 taxonomy_and_geo`
3. `20260909000300 redirects_and_seo`
4. `20260909000400 analytics_and_ads`
5. `20260909000500 migration_runs_and_checkpoints`
6. `20260916030642 ag02_staging_security_baseline`

## 2. Live data boundary reverified

At NM-02 certification:

- stories: `0`
- media assets: `0`
- subscribers: `0`
- Auth users: `0`
- Storage objects: `0`

Therefore NM-02 does **not** claim real migrated editorial content.

## 3. Staging integration implemented

The universal Reader now includes:

- Supabase JS client for the certified HealthTimes Staging project;
- Expo/React-Native-compatible persisted Auth storage;
- auto-refresh/persisted session baseline;
- real staging Reader session lookup;
- real staging sign-out path;
- staging platform diagnostics;
- Auth service connectivity check;
- PostgREST/RLS boundary check;
- `migrated-media` Storage reachability check;
- explicit staging project-ref validation;
- network timeout/error handling;
- System Status screen.

## 4. Transparent fixture/staging composition

The staging application deliberately runs:

`LIVE AG-02 PLATFORM + FIXTURE EDITORIAL DATA`

until AG-04 and AG-06 establish real migrated content plus the required public/read authorization boundary.

The UI visibly labels this state.

Attempts to select `staging` editorial-data mode fail closed.

Production mode also remains fail closed.

## 5. Security boundary

- service-role key in app: **NO**
- database password in app: **NO**
- private provider token in `EXPO_PUBLIC_*`: **NO**
- modern Supabase publishable key: **YES — expected browser/mobile public identifier**
- RLS remains server authority.
- anonymous Reader access does not create staff/editorial authority.
- Studio authority remains AG-06-owned.

## 6. Certified automation evidence

### Native Mobile Foundation + Staging

- workflow run: `35444509230`
- result: **SUCCESS**
- candidate SHA: `f071316bc56e57bc4b3baa80e76c10f1f85cbf56`

Passed gates:

1. dependency installation — PASS
2. Expo dependency compatibility — PASS
3. strict TypeScript — PASS
4. NM-01/NM-02 foundation integrity tests — PASS
5. live HealthTimes Staging Auth smoke — PASS
6. live HealthTimes Staging PostgREST/RLS smoke — PASS
7. live HealthTimes Staging Storage smoke — PASS
8. static Expo web/PWA export — PASS
9. PWA output verification — PASS
10. artifact upload — PASS

Generated artifact:

- name: `healthtimes-native-web-dist`
- artifact id: `10584642464`
- SHA-256: `47f13b807ceaa2c290ae778cfb453ccabdb3cc3d65f41a85a3ed1a8b4b015ab8`

### Existing HealthTimes validation

- workflow run: `35444509250`
- result: **SUCCESS**

The existing client-review/static publication remains green.

### Vercel

- branch preview status: **SUCCESS**

This validates the preserved root client-review deployment path; the Expo web artifact is separately certified by the native workflow above.

## 7. NM-02 acceptance result

- no service-role/database secret in app — **PASS**
- staging only — **PASS**
- API failures handled — **PASS**
- common staging project/contract for Android/iOS/web — **PASS at source/config level**
- persisted Auth/session integration baseline — **PASS**
- Storage/media connectivity baseline — **PASS**
- native iOS Simulator execution — **NOT CLAIMED**
- native Android Emulator execution — **NOT CLAIMED**

The connected environment does not expose the required local native simulator/emulator toolchains, so source/config/build certification is not relabeled as physical runtime certification.

## 8. Downstream boundary

NM-03 may reconcile typed content/taxonomy contracts against the live staging schema and AG-03 evidence.

Real Reader content replacement remains blocked until AG-04 has authoritative migrated content.

Production remains untouched.
