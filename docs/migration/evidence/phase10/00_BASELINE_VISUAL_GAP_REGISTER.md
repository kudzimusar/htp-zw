# Phase 10 — Baseline Visual Gap Register

**Repository:** `kudzimusar/htp-zw`  
**Phase 10 branch:** `integration/ag07-nm07-phase10-visual-conformance`  
**Accepted Phase 9 closure:** `86df1f08e0b3e578348227c30248e32437687352`  
**Certified executable baseline under review:** `8fef4c2e7863afd6d0118dda7e0cf42ebf96d85b`  
**Design authority:** `docs/native-mobile/DESIGN.md`  
**Wireframe PNG:** absent from repository custody; no reconstruction is permitted.

## Evidence captured before remediation

The Phase 10 evidence harness checks out the frozen certified executable baseline directly rather than the Phase 10 branch head.

- Web/PWA source-parity baseline workflow: run `35862974220`, job `107187504110` — SUCCESS.
- Web/PWA baseline screenshot artifact: `phase10-before-web-pwa-screenshots`, artifact `10750654475`, SHA-256 `62f600bd3f0971ce1c5d5d49eef0526a53f1afe5ac1d3dc4593904bb2174b0a2`.
- Secondary staging-service baseline Web artifact: `phase10-baseline-web-screenshots`, artifact `10750239377`, SHA-256 `7e8d16722a3a370d2bc643f544f6437cccc991dff66489a1e8b577e75d85a3a7`.
- Frozen-baseline iOS Simulator and Android emulator jobs were started before remediation and check out `8fef4c2e...` explicitly. Their final artifact IDs are to be recorded in the Phase 10 closure.

The source-parity artifact contains mobile 390x844, tablet 834x1112 and desktop 1440x1000 captures for Home, Explore, Search, Live, Watch, My HT, Premium, Saved, Edition, Notifications, Listen, Onboarding and Studio.

## Baseline findings before code changes

| Surface | Baseline classification | Evidence / reason | Phase 10 action |
| --- | --- | --- | --- |
| Home | **MATERIAL GAP** | Hydrated Home is blank at mobile, tablet and desktop. Source inspection shows `useMemo` is invoked only after loading/error early returns, changing Hook order after async Home data resolves. | Fix Hook-order defect without changing editorial/data authority. |
| Global Reader shell | **MINOR GAP** | Brand, Edition, Search and Alerts are coherent, but Premium is not a first-screen utility despite the approved requirement for clear Premium discovery. | Add a restrained Premium utility action without changing the five-destination Reader IA. |
| Desktop five-destination navigation | **MATERIAL GAP** | Desktop header correctly expands the five Reader destinations, but the mobile bottom tab bar is also rendered on desktop captures. Desktop therefore looks partly like a stretched phone shell. | Suppress bottom tab bar reliably at desktop width while preserving mobile/tablet/native navigation. |
| Explore | **CONFORMS** | Source-parity capture presents a taxonomy gateway with canonical desks, Zimbabwe, regions and search entry; it is not merely another article feed. | Preserve. |
| Intelligent Search | **CONFORMS** | Dedicated search surface, content filters, taxonomy-derived filters and no chat-first AI UI. | Preserve. |
| Article Reader | **MINOR GAP** | Reader implementation has headline/byline/date/hero/body/actions/Premium lock/ads/related coverage, but public UI exposes internal migration labels `Canonical desk` and `Legacy source taxonomy`. | Remove internal migration terminology from public presentation while preserving domain data. |
| Live | **CONFORMS** | Dedicated Live surface; no-Live state collapses honestly; red is reserved for Live semantics. | Preserve. |
| Watch | **CONFORMS** | Strong image-forward featured video, dedicated tabs and verified-source behavior. | Preserve. |
| Listen / Audio | **NOT IMPLEMENTED — ACCEPTED PRODUCT GAP** | Dedicated visual treatment exists, but current authoritative corpus has no audio and playback adapter remains unavailable. | Do not fabricate podcasts, progress or media sources. |
| Saved / Offline | **CONFORMS** | Saved, offline and history are visibly distinct; Premium offline body remains fail-closed. | Preserve. |
| My HealthTimes | **MINOR GAP** | Core list architecture conforms, but public Reader exposes staging/environment wording plus internal `System Status` and `Growth & Commercial Readiness` entries. `Payment Methods` is exposed despite no configured commerce. | Remove internal/readiness wording and unsupported payment-method affordance; preserve truthful membership and security controls. |
| Edition / geography | **CONFORMS** | Primary Edition and Followed Countries/Regions are distinct, with explicit note that edition and billing country differ. | Preserve. |
| Premium | **CONFORMS** | Premium screen is visually strong and truthful: configuration-required commerce, no invented prices/products, secure entitlement check and source-backed Premium reporting. | Preserve; improve discovery through shell/Home rather than invent commerce. |
| Advertising / HOSPAZ | **MINOR GAP pending Home repair** | Direct-ad component is clearly labeled, reserves layout space and is non-clickable without verified HTTPS destination. Current Home crash prevents owner-visible proof in Home baseline. | Re-prove after Home repair; do not alter destination/schedule/placement truth. |
| Notifications | **CONFORMS** | Lightweight list/filter model with empty state and destination gating. | Preserve. |
| Social / deep links | **CONFORMS structurally** | Article uses native/system share and root deep-link bridge routes canonical article destinations. | Preserve. |
| Onboarding | **MINOR GAP** | Welcome content itself conforms, but it is wrapped inside the full Reader header/utility chrome, duplicating HealthTimes identity and weakening the short onboarding composition. | Allow onboarding to render without full Reader chrome while retaining accessibility and safe-area behavior. |
| Studio/Admin | **CONFORMS** | Current Studio capture is visually distinct: dark operational navigation, light denser workspace and status/action hierarchy. | Preserve; do not weaken server-assigned authorization. |
| Responsive mobile | **CONFORMS with Home blocker** | Explore/Live/Watch/My HT/Premium/Saved/Edition are recognizably mobile and share the same product language. | Re-prove Home after fix. |
| Responsive tablet | **CONFORMS with Home blocker** | Tablet expands taxonomy density and gutters without becoming a stretched phone. | Re-prove Home after fix. |
| Responsive desktop | **MATERIAL GAP** | Desktop content grids and header are appropriate, but duplicate mobile bottom navigation remains visible and Home is blank. | Fix both. |
| Accessibility baseline | **CONFORMS / must not regress** | Existing semantic roles, labels, 44px-equivalent targets, selected/disabled states and live regions are present. | Preserve; Phase 10 does not claim formal WCAG certification. |

## Bounded remediation set

Only the following visual/product remediations are authorized by this register:

1. Repair Home hydration by eliminating conditional Hook-order change.
2. Hide the five-tab bottom navigation on desktop while keeping the same five-destination information architecture.
3. Add restrained Premium discovery to the shared Reader utility header.
4. Remove migration/internal-readiness terminology from public Reader presentation.
5. Remove unsupported `Payment Methods` from My HealthTimes until commerce authority exists.
6. Render onboarding without the full Reader header/utility chrome.
7. Add exact-candidate visual assertions/evidence so blank Home or desktop duplicate navigation cannot self-certify.

No migration, database, storage, Premium entitlement, HOSPAZ commercial, taxonomy, AG-06, CA-01, COM-01 or Studio authorization semantics are changed by this remediation set.
