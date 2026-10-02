# AG-05 — Premium Commerce + First-Paragraph Teaser Authority

## Disposition

**TEASER AUTHORITY: RECOVERED / STAGING-APPLIED / EXACT-HEAD CERTIFIED**

**COMMERCE ACTIVATION: BLOCKED / FAIL-CLOSED**

Certified runtime:

`af7ca9a2dc2a2d86b26c0f831d42d44871c790ab`

Starting SHA:

`6cbfcaa9ee6c06e25f59c99eb21bf86211990605`

Accepted UI-03 documentation closure preserved as prior authority:

`db9eebb7fef6b8ee9f3d784d14f1f5394a234499`

Branch:

`recovery/ag05-premium-commerce-teaser-authority`

This report is the documentation-only closure above the certified runtime.

No UI redesign, HOSPAZ change, Newsroom change, COM change, Pages deployment, production DNS change, `main` mutation, native-store activation, production provider activation, or production deployment was performed.

---

## 1. Owner commercial policy

The owner policy is now treated as product authority, not test configuration:

- `premium_teaser_paragraph_count = 1`
- `premium_teaser_duration_seconds = 20`

Public Premium sequence:

1. public metadata;
2. exactly one authorized editorial body paragraph;
3. 20-second preview allocation;
4. paywall / subscribe prompt;
5. verified entitlement;
6. protected full article.

Paragraph 2 onward remains protected.

Missing/invalid teaser or invalid policy state fails closed to immediate paywall.

---

## 2. Source evidence reviewed

Repository-safe authority reviewed before implementation:

- `docs/migration/agent-reports/AG-03_SOURCE_DATA_CAPTURE.md`
- `docs/migration/02_WORDPRESS_SOURCE_INVENTORY.md`
- `docs/migration/13_ANALYTICS_SEO_MONETIZATION_INVENTORY.md`
- retired interaction provenance: `premium.html`, `app.js`, `v21.js`
- current canonical commerce boundary: `apps/mobile/src/growth/premium-store.ts`
- current Reader policy/config: `apps/mobile/src/growth/config.ts`
- current source-parity bridge: `apps/mobile/src/services/source-parity.ts`
- current migrated-corpus bridge: `apps/mobile/src/services/migrated-corpus.ts`
- current CP5 public capability: `lib/ag05-capability.js`, `api/public.js`
- current accepted UI-03 Article Reader: `apps/mobile/app/article/[id].tsx`

The private AG-03 source package itself was not copied into Git and no secret/customer/payment rows were exposed.

---

## 3. Legacy WooCommerce / Premium authority audit

### Proven

The authoritative capture proves:

- WooCommerce installed / tables present: **YES**
- WooCommerce Memberships installed: **YES**
- WooCommerce Subscriptions installed: **YES**
- WooCommerce PayPal Payments installed: **YES**
- Paynow Zimbabwe installed: **YES**
- Google for WooCommerce present: **YES**
- WooCommerce version metadata observed: **11.1.0**
- WooCommerce orders in captured snapshot: **0**
- WooCommerce subscriptions in captured snapshot: **0**
- WooCommerce payment tokens in captured snapshot: **0**
- WooCommerce membership plans in captured snapshot: **1**
- WPForms payment rows: **0**
- month-to-date WooCommerce admin view observed no sales/orders data during the source capture.

### Not proven by repository-safe authority

The captured safe evidence does **not** establish:

- membership-plan identity/name;
- WooCommerce subscription configuration;
- configured commerce currency;
- billing interval;
- WooCommerce product/plan IDs;
- membership-plan/product linkage;
- active/historical member entitlement population;
- Paynow plugin configuration values;
- PayPal Payments configuration values;
- provider sandbox/live mode;
- callback/return URL authority;
- webhook/IPN authority;
- provider account operational state;
- external provider transaction history.

Those values remain unresolved rather than inferred.

---

## 4. Paynow authority state

| Category | State |
| --- | --- |
| plugin installed | **PROVEN** |
| plugin configured | **UNVERIFIED** |
| provider account operational | **UNVERIFIED** |
| sandbox/live mode | **UNRESOLVED** |
| callback/return URL | **UNRESOLVED** |
| webhook/IPN configuration | **UNRESOLVED** |
| historical provider transactions | **UNVERIFIED** |

No Paynow merchant secret, integration secret, key, or customer data was requested or committed.

---

## 5. PayPal authority state

| Category | State |
| --- | --- |
| plugin installed | **PROVEN** |
| plugin configured | **UNVERIFIED** |
| provider account operational | **UNVERIFIED** |
| sandbox/live mode | **UNRESOLVED** |
| callback/return URL | **UNRESOLVED** |
| webhook configuration | **UNRESOLVED** |
| historical provider transactions | **UNVERIFIED** |

No PayPal client secret, merchant secret, signing secret, customer data, or card data was requested or committed.

---

## 6. Price / currency authority

Retired frontend provenance contains:

`US$5/month`

This remains **historical UX evidence only**.

It was **not** promoted into current billing authority.

Current canonical state remains:

- price: **UNRESOLVED**
- currency: **UNRESOLVED**
- billing interval: **UNRESOLVED**
- product/plan identifiers: **UNRESOLVED**

Native storefront configuration also remains unchanged and fail-closed:

- iOS monthly product ID: `null`
- iOS yearly product ID: `null`
- Android monthly product ID: `null`
- Android yearly product ID: `null`

---

## 7. Transaction-history disposition

Captured WordPress/WooCommerce transaction population:

- orders: **0**
- subscriptions: **0**
- payment tokens: **0**

Therefore no customer/order/subscription import programme was fabricated.

External provider history is a separate authority question:

- Paynow provider history: **UNVERIFIED**
- PayPal provider history: **UNVERIFIED**

No conclusion about provider-level historical transaction volume is made.

---

## 8. Secure first-paragraph teaser authority

### Domain contract

`ArticleDetail` now has a separate authority field:

`premiumTeaserHtml?: string | null`

It is intentionally distinct from:

- `bodyHtml`;
- `excerpt`;
- `standfirst`.

Meaning:

**one explicitly public editorial paragraph extracted server-side from otherwise protected Premium content.**

### Server extraction rule

New staging function:

`public.ag05_first_editorial_paragraph_html(text)`

selects the first safe non-empty editorial paragraph and rejects paragraph candidates that are structurally/provenance-wise associated with:

- captions;
- advertising/sponsored blocks;
- shortcode-like blocks;
- embeds;
- social blocks;
- author/bio modules;
- pull quotes;
- related-content modules;
- images/figures;
- block quotes;
- lists;
- scripts/styles;
- iframe/embed/object/video/audio blocks.

The output is normalized to one plain sanitized `<p>...</p>` paragraph.

If no safe paragraph exists, it returns null.

### Public projection

New staging function:

`public.ag05_public_story_teaser_document(text)`

builds from the existing `ag05_public_story_document` authority and adds only:

`premium_teaser_html`

For non-public/Premium content:

- `body_html` remains null;
- one teaser paragraph may be present;
- paragraph 2 onward is not returned.

The low-level extractor is **not executable** by `anon` or `authenticated`. Only the bounded teaser-document projection is executable by Reader roles.

---

## 9. Source-parity safety

The existing source-parity invariant remains intact:

`current.accessPolicy === "premium" -> includeContent = false`

The anonymous Reader still never requests raw WordPress `content.rendered` for Premium stories.

The source-parity mapper can carry only an explicitly authorized/precomputed `premiumTeaserHtml`; otherwise it returns null and the Reader fails closed to the paywall.

No browser-side “fetch full Premium body then extract paragraph 1” implementation exists.

---

## 10. Migrated-corpus / CP5 safety

The migrated-corpus mapper now understands:

`premium_teaser_html`

but continues to force:

`bodyHtml = null`

for Premium/non-public access policy.

The migrated-corpus service requests the new bounded teaser-document RPC first. During a staged rollout, if that RPC is unavailable, it falls back to the existing `ag05_public_story_document`, whose Premium body remains protected; that fallback produces immediate paywall rather than full content.

`lib/ag05-capability.js` independently sanitizes and accepts only a single paragraph-shaped teaser field for its public capability response.

---

## 11. Live staging teaser proof

Project:

`gcdohgbmqhqwydgaxrcr`

Reference Premium source:

`33190`

Verification was deliberately performed using lengths/digests/booleans rather than emitting protected article text.

Observed after migration:

- Premium public `body_html` remains null: **YES**
- teaser present: **YES**
- teaser equals server-derived first eligible editorial paragraph: **YES**
- teaser contains exactly one paragraph: **YES**
- public teaser HTML length: **321 characters**
- first editorial paragraph plain-text length: **314 characters**
- second eligible editorial paragraph length: **230 characters**
- teaser digest equals first-paragraph digest: **YES**
- paragraph 2 absent from the entire public response: **YES**
- `anon` can execute bounded teaser projection: **YES**
- `authenticated` can execute bounded teaser projection: **YES**
- `anon` can execute low-level protected extractor: **NO**
- `authenticated` can execute low-level protected extractor: **NO**

This proves the new public field does not require anonymous delivery of the protected body.

---

## 12. Staging migration custody

Two additive migrations were applied to **HealthTimes Staging only**:

1. `20261002060846_ag05_premium_teaser_public_projection`
2. `20261002061027_ag05_premium_teaser_helper_privilege_hardening`

Post-application staging migration-ledger count:

**62**

Repository migration filenames were aligned to the exact live ledger versions before final certification:

- `supabase/migrations/20261002060846_ag05_premium_teaser_public_projection.sql`
- `supabase/migrations/20261002061027_ag05_premium_teaser_helper_privilege_hardening.sql`

No database reset, destructive migration, storage mutation, stale-object cleanup, production migration, or production database change occurred.

---

## 13. 20-second refresh/replay semantics

Canonical Reader policy:

- paragraph count: **1**
- duration: **20 seconds**
- source: **owner-policy**

Reader persistence now maintains an anonymous/local preview ledger keyed by:

- local anonymous preview scope;
- stable story identity (`canonicalStoryId` where available, otherwise article ID).

The ledger stores only:

- story identity;
- local scope ID;
- preview start timestamp.

It is a UX/commercial timing control only.

It does **not**:

- grant Premium;
- substitute for entitlement;
- contain protected article body;
- contain health-condition targeting attributes;
- reset on ordinary refresh of the same article.

Invalid/missing policy, missing teaser, expired ledger, or invalid duration fails closed to immediate paywall.

---

## 14. Commerce service architecture

New bounded server surface:

`api/commerce.js`

Current state is intentionally:

`configuration-required`

The endpoint does not place provider secrets in Expo/React Native code.

Conceptual authority remains:

Reader
→ HealthTimes server commerce endpoint
→ verified provider checkout
→ signed/verified callback or webhook
→ explicit payment/subscription state
→ authoritative entitlement
→ `PremiumService.hasEntitlement()`

Current implementation returns no checkout URL and grants no entitlement because provider configuration is not yet verified.

Browser query parameters such as:

- `?paid=true`
- `?premium=true`
- `?success=1`

are explicitly non-authoritative and never grant Premium.

### Required activation controls

Before a provider can be activated the server implementation must have:

- provider signature verification where supported;
- server-only secret custody;
- idempotency;
- replay protection;
- persisted provider transaction reference;
- explicit payment status;
- explicit subscription/membership state;
- audit timestamps;
- entitlement linkage.

Raw PAN/card data and CVV must never be handled/stored by HealthTimes.

Hosted/provider checkout remains the expected payment surface.

---

## 15. Native/store boundary

This AG-05 work does not activate paid digital membership on iOS/Android.

`PremiumStoreService` remains the native authority and still has no approved Apple/Google product IDs.

Web/PWA provider checkout and native App Store/Google Play commerce remain separate policy/provider lanes.

Any native commerce activation belongs to NM-05 and requires separate platform-policy/product authority.

---

## 16. Provider/manual dependencies

To move commerce from fail-closed architecture to an operational checkout, the owner/provider lane must supply **verified non-secret evidence** and securely configure secrets outside Git.

### Paynow evidence required

- authoritative HealthTimes Paynow merchant/account identity;
- account operational status;
- sandbox vs live mode;
- approved currency;
- current product/plan/price authority or explicit owner commercial authorization;
- return/callback URL configuration;
- webhook/IPN verification method and current endpoint configuration;
- sanitized historical transaction export/count if historical continuity matters;
- server-side merchant credentials through the approved secret manager, not chat/Git.

### PayPal evidence required

- authoritative HealthTimes PayPal merchant/account identity;
- account operational status;
- sandbox vs live mode;
- approved currency;
- product/subscription-plan identifiers if PayPal subscriptions are to be used;
- webhook endpoint configuration;
- webhook signature verification authority;
- sanitized historical transaction/subscription evidence if continuity matters;
- server-side app credentials through the approved secret manager, not chat/Git.

### WooCommerce evidence still required if legacy plan continuity is desired

- identity/name of the single captured membership plan;
- product/plan IDs;
- billing interval;
- currency;
- membership-plan/product linkage;
- whether that plan is intended to remain current commercial authority.

---

## 17. Exact-head certification

Final runtime:

`af7ca9a2dc2a2d86b26c0f831d42d44871c790ab`

Workflow:

**AG-05 Premium Commerce + Teaser Authority**

Run:

`36972579791`

Job:

`110729483435`

Result:

**SUCCESS**

Exact-head proof:

`EXPECTED_SHA=af7ca9a2dc2a2d86b26c0f831d42d44871c790ab`

`CHECKED_OUT_SHA=af7ca9a2dc2a2d86b26c0f831d42d44871c790ab`

Certification matrix:

| Gate | Result |
| --- | --- |
| canonical Reader TypeScript / Expo check | SUCCESS |
| AG-05 Premium commerce + teaser contract | **9 / 9 PASS** |
| CP5 public capability regression | **10 / 10 PASS** |
| UI-03 commercial/security regression | **11 / 11 PASS** |
| Premium + HOSPAZ regression | **12 / 12 PASS** |
| migrated-corpus regression | **14 / 14 PASS** |
| growth/commercial regression | **9 / 9 PASS** |
| source-parity regression | **28 / 28 PASS** |

No test was weakened to expose a protected Premium body.

---

## 18. Remediation history

### Candidate `d95a5a0042bea3c6ae2c148206f52032a6a7d2e0`

First implementation candidate.

CI correctly failed TypeScript because the teaser parser result had not been narrowed to a paragraph-specific union member.

Disposition: **NOT ACCEPTED**.

### Candidate `5ef72ad6172b843840072930b7e8fbc9b7b805a6`

Bounded type-guard remediation.

Repository certification passed.

Live staging verification then found the low-level extractor was unnecessarily executable by Reader roles.

The helper itself did not read database content and therefore did not independently expose a protected story, but the privilege exceeded the required boundary.

Disposition: **SUPERSEDED / NOT FINAL**.

### Candidate `4a1ebb5cc52fb0e3c8c339228daf7577552f1e61`

Added explicit low-level extractor privilege revocation.

Exact-head CI: SUCCESS.

Live privilege proof:

- bounded public projection: Reader execution allowed;
- low-level extractor: Reader execution denied.

Repository migration timestamps still differed from the live Supabase ledger versions generated at application time.

Disposition: **SUPERSEDED FOR CUSTODY ALIGNMENT**.

### Final runtime `af7ca9a2dc2a2d86b26c0f831d42d44871c790ab`

Repository migration filenames aligned to the exact live staging ledger versions.

Exact-head full certification: **SUCCESS**.

This is the only accepted runtime for this task.

---

## 19. Exact changed files

Relative to accepted UI-03 executable `6cbfcaa9ee6c06e25f59c99eb21bf86211990605`, final runtime is four commits ahead and zero behind.

Changed files:

1. `.github/workflows/ag05-premium-commerce-teaser.yml`
2. `api/commerce.js`
3. `api/public.js`
4. `apps/mobile/app/article/[id].tsx`
5. `apps/mobile/src/domain/contracts.ts`
6. `apps/mobile/src/domain/models.ts`
7. `apps/mobile/src/growth/config.ts`
8. `apps/mobile/src/services/migrated-corpus-mapper.ts`
9. `apps/mobile/src/services/migrated-corpus.ts`
10. `apps/mobile/src/services/reader-persistence.ts`
11. `apps/mobile/src/services/source-parity.ts`
12. `apps/mobile/tests/ui03-commercial-reader.test.mjs`
13. `lib/ag05-capability.js`
14. `lib/ag05-premium-commerce.js`
15. `supabase/migrations/20261002060846_ag05_premium_teaser_public_projection.sql`
16. `supabase/migrations/20261002061027_ag05_premium_teaser_helper_privilege_hardening.sql`
17. `tests/migration/ag05-premium-commerce-teaser.spec.js`

The documentation closure adds only:

`docs/migration/AG-05_PREMIUM_COMMERCE_TEASER_AUTHORITY.md`

---

## 20. Finding classification

### P0 — payment/content-security breach

**NONE OPEN.**

Protected Premium body remains absent from anonymous/public delivery. Browser redirect/query state cannot grant entitlement.

### P1 — checkout/entitlement cannot function

**Not yet testable as an operational flow because no verified provider configuration is available.**

The server boundary intentionally refuses checkout rather than fabricating one.

### P2 — required commercial authority not migrated

**OPEN.**

Unresolved:

- membership-plan identity/linkage;
- currency;
- billing interval;
- product/plan identifiers;
- authoritative current price;
- operational gateway selection/configuration.

### P3 — provider/account configuration outstanding

**OPEN / BLOCKING COMMERCIAL ACTIVATION.**

Paynow and PayPal provider-account operational/configuration evidence is unavailable.

### P4 — refinement

Deferred to consumer/UI/native lanes after commerce authority exists.

---

## 21. Governance receipt

This task did **not**:

- expose a Premium full body to anonymous/public delivery;
- fetch raw Premium WordPress content in the anonymous browser;
- make excerpt or standfirst masquerade as the authorized body paragraph;
- hard-code the legacy US$5/month UX value as billing truth;
- grant membership from local storage;
- trust success/paid/premium query parameters;
- put payment secrets in Expo/React Native;
- activate Paynow or PayPal;
- create provider transactions;
- fabricate transaction history;
- activate Apple/Google products;
- redesign the UI-03 paywall card;
- change HOSPAZ;
- change advertising targeting;
- change Newsroom;
- change COM;
- deploy Pages;
- deploy production;
- change production DNS;
- mutate `main`;
- merge unrelated PRs.

---

## 22. Moderator disposition

The **secure first-paragraph teaser authority is recovered and staging-proven**, and the owner 20-second contract is ready for downstream NM-05/UI-03 consumption.

The **commerce activation is not complete** because no verified Paynow/PayPal configuration/account authority, current price/currency/product authority, or provider webhook authority is available. The new commerce endpoint therefore remains intentionally fail-closed.

**AG-05 PREMIUM COMMERCE RECOVERY BLOCKED — PAYNOW / PAYPAL PROVIDER CONFIGURATION AND OPERATIONAL ACCOUNT AUTHORITY UNVERIFIED; VERIFIED ACCOUNT / PRODUCT / CALLBACK-WEBHOOK AUTHORITY AND SECURE SERVER CREDENTIALS REQUIRED**
