# NM-02 — HealthTimes Staging Connectivity Implementation Report

**Repository:** `kudzimusar/htp-zw`  
**Branch:** `feat/native-mobile-nm02-staging-connectivity`  
**Certified runtime SHA:** `93eb43a9c2675409fdb8874e0ac5b210defe7c6b`  
**Checkpoint:** NM-02 — Staging Connectivity  
**Production systems modified:** NO

## 1. Staging authority

NM-02 connects to the accepted AG-02 staging project:

- Supabase project: `HealthTimes Staging`
- project ref: `gcdohgbmqhqwydgaxrcr`
- region: `ap-northeast-1`
- project status: `ACTIVE_HEALTHY`
- migrations present: CP1 five migrations + `ag02_staging_security_baseline`
- API client credential: modern browser-safe Supabase publishable key
- service-role/database credentials in app code: **NO**

## 2. Data state at checkpoint

Live staging inspection at NM-02 showed:

- stories: **0**
- media assets: **0**
- subscribers: **0**
- Auth users: **0**
- Storage objects: **0**

Therefore NM-02 does not present staging as containing migrated editorial data.

## 3. Runtime composition

Staging builds use:

- real Supabase Auth client;
- AsyncStorage-backed session persistence baseline;
- live platform diagnostics;
- live Auth reachability;
- live PostgREST/RLS reachability;
- live `migrated-media` Storage reachability.

Editorial Reader services remain controlled fixtures until AG-04. The UI states this as:

`STAGING APP • FIXTURE EDITORIAL DATA • LIVE STAGING PLATFORM`

Attempting to enable staging editorial-data mode fails closed until AG-04 and the required read policies are certified. Production mode also remains locked.

## 4. New application surface

- `System Status` route under My HealthTimes
- staging connectivity diagnostics for configuration, Auth, database/RLS, Storage and persisted session baseline
- environment-aware account display

No publishable key value is rendered in the UI.

## 5. CI evidence

Certified exact-SHA evidence:

- Native Mobile Foundation + Staging run: `35444603582` — **SUCCESS**
- Validate HealthTimes 2.0 run: `35444603647` — **SUCCESS**
- Expo compatibility + strict TypeScript: **PASS**
- NM-01/NM-02 foundation tests: **PASS**
- live HealthTimes Staging connectivity smoke: **PASS**
- Auth settings endpoint: **PASS**
- PostgREST/RLS empty boundary: **PASS**
- migrated-media Storage empty boundary: **PASS**
- static Expo web/PWA export: **PASS**
- PWA output verification: **PASS**
- artifact: `healthtimes-native-web-dist`
- artifact SHA-256: `6d1e780f28fc69192b01d777626e23bf2d31e5b3de6f6711420d3305aee8c506`

## 6. Outstanding dependencies

- AG-03 CP3 is still **NOT READY** because the authoritative private WordPress database export and complete uploads archive are missing.
- AG-04 therefore cannot yet populate real migrated stories/media/taxonomy.
- AG-06 production identity/authorization remains separate from the NM-02 session-connectivity baseline.
- native simulator/emulator runtime evidence remains a later native-capable certification task.

## 7. Safety

- production WordPress modified: **NO**
- production database modified: **NO**
- production DNS modified: **NO**
- production Google/AdSense modified: **NO**
- staging source rows inserted: **NO**
- staging media uploaded: **NO**
