# NM-05R — Live Source-Parity Premium Teaser Path Resolution Remediation

## Disposition

**Repository:** `kudzimusar/htp-zw`

**Branch:** `fix/nm05-live-premium-teaser-path-resolution`

**Starting SHA:** `ae1bb67bb75098a6e1799bb6adc5f2cf93bdb766`

**Accepted UI-03 executable preserved:** `31d3cce2edfa37761a9cff21db0024842773058d`

**Certified remediation executable:** `c1a9f642a735ad2d02775a7d8668e797bedbb426`

**Pre-remediation diagnostic run:** `37017237308`

**Exact-head remediation certification run:** `37018423156`

**Exact-head remediation certification job:** `110874976158`

**Evidence artifact:** `11231262619`

**Evidence artifact SHA-256:** `647c685f1d99b401786a9d17eec4de907b228e487d2e2c4a864297d821defcc6`

This remediation corrects only the live/source-parity Premium teaser lookup-key contract. It does not redesign UI-03, change the one-paragraph/20-second policy, activate commerce, alter AG-05 SQL, deploy Pages, or begin UI-06 recertification.

---

## 1. Pre-remediation proof

Before product mutation, exact branch head `8daa8598dac1b4ab7233b552253df129c11aa4d0` ran the bounded diagnostic.

Run:

`37017237308 — SUCCESS`

Job:

`110870998569`

Captured source-parity fallback identity:

```text
story_id = source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks
canonical_url = https://healthtimes.co.zw/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/
snapshot_legacy_path = /zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/
outgoing_p_path = /zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/
```

Accepted AG-05 live path:

```text
/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/
```

Therefore the proven defect was a lookup-key mismatch between snapshot fallback identity and the dated WordPress legacy path expected by `ag05_public_story_teaser_document`.

---

## 2. Root cause

Before remediation:

```text
source-parity snapshot fallback
→ current.canonicalUrl
→ slug-only URL
→ canonicalPath(...)
→ slug-only p_path
→ ag05_public_story_teaser_document
→ HTTP 200 / no usable Premium teaser
→ immediate paywall
```

The AG-05 teaser authority itself was not defective.

The failure occurred because source `33190` can be absent from the initial source-parity live-list result. In that case the Reader falls back to the deterministic snapshot, whose generic canonical URL is slug-only. The consumer previously sent that fallback URL directly to the teaser authority.

---

## 3. Remediation architecture

Source-parity detail resolution now follows:

```text
snapshot/live article identity
        ↓
metadata-only WordPress slug lookup
        ↓
authoritative WordPress post.link
        ↓
canonical Premium source path
        ↓
ag05_public_story_teaser_document
        ↓
Premium/public classification
        ↓
Premium → return bounded metadata/teaser with bodyHtml=null
Public  → only then request WordPress content
```

The metadata request uses:

`wpPostQuery({includeContent:false})`

The bounded teaser authority receives only the path derived from the metadata `post.link`.

The consumer no longer calls:

`getPublicPremiumTeaserAuthority(current.canonicalUrl)`

The public body request remains behind:

`detailDecision.includeWordPressContent`

and explicitly uses:

`wpPostQuery({includeContent:true})`

only after classification remains public.

---

## 4. Fail-closed behavior

If the metadata-only WordPress lookup fails:

```text
Premium snapshot classification
→ no trusted metadata permalink
→ no teaser RPC call
→ no WordPress content request
→ bodyHtml=null
→ immediate inline Premium paywall
```

The consumer does not retry the teaser authority with the snapshot slug-only URL.

It also does not fall through to WordPress `content.rendered`.

---

## 5. Source provenance

`mapWpPost(...)` now records `sourceProvenance.wordpress.legacyPath` from the canonical path of the authoritative WordPress URL when available.

No source-specific date or post ID is hard-coded in product code.

`apps/mobile/src/source-parity/snapshot.ts` was not modified.

---

## 6. Browser/network evidence

Certified exact-head browser evidence on:

`c1a9f642a735ad2d02775a7d8668e797bedbb426`

Premium source:

`33190`

Actual post-remediation teaser request:

```text
p_path = /2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/
```

Live teaser authority response evidence:

```text
source_id = 33190
access_policy = premium_marker_review
body_html_is_null = true
teaser_paragraph_count = 1
teaser_length = 321
teaser_sha256 = f44b8953d51c5eb2484b9d207ba634a0335c1780dff3cc2c3b16f3bb688fa1cd
```

Protected teaser text is intentionally not stored in this report.

Premium repaired scenario:

```text
metadata_available = true
WordPress metadata requests = 3
WordPress content-field requests = 0
protected article requests = 0
automatic commerce requests = 0
```

The authorized teaser became visible before expiry.

After approximately 20 seconds:

- teaser preview ended;
- inline paywall became visible;
- existing UI-03 Premium subscription prompt opened;
- dismissing the prompt left the inline paywall intact;
- no additional WordPress request was made.

Metadata-failure scenario:

```text
requested_p_path = null
WordPress content-field requests = 0
protected article requests = 0
automatic commerce requests = 0
```

Public comparison scenario:

```text
public body visible = true
public WordPress content-field requests = 1
resolved public p_path = /2026/09/18/ahf-urges-zimbabwe-to-join-borrowers-forum-amid-debt-crisis/
```

This proves the remediation does not globally disable public Article body retrieval.

---

## 7. Required gate results

Exact-head workflow:

`37018423156 — SUCCESS`

Exact-head job:

`110874976158 — SUCCESS`

Exact checkout:

```text
EXPECTED_SHA=c1a9f642a735ad2d02775a7d8668e797bedbb426
CHECKED_OUT_SHA=c1a9f642a735ad2d02775a7d8668e797bedbb426
```

Results:

- lookup-key boundary diagnostic: **1/1 PASS**
- `npm run native:check`: **PASS**
- Reader product: **10/10 PASS**
- Reader fidelity: **4/4 PASS**
- Source parity: **28/28 PASS**
- Premium / HOSPAZ: **12/12 PASS**
- Growth commercial: **9/9 PASS**
- UI-03: **18/18 PASS**
- NM-05 Premium consumer: **7/7 PASS**
- NM-05 Premium live: **2/2 PASS**
- AG-05 Premium commerce/teaser Playwright: **9/9 PASS**
- source-parity Web/PWA export: **PASS**
- Chromium repaired Premium/browser/network matrix: **PASS**
- bounded evidence receipt verification: **PASS**

Node test total:

**91/91 PASS**

AG-05 Playwright:

**9/9 PASS**

Plus the three-scenario Chromium network/journey proof.

---

## 8. Exact executable changed files

Compared with starting SHA `ae1bb67bb75098a6e1799bb6adc5f2cf93bdb766`, the certified executable changes only:

1. `.github/workflows/nm05r-live-premium-teaser-path.yml`
2. `apps/mobile/src/services/premium-teaser-authority.ts`
3. `apps/mobile/src/services/source-parity.ts`
4. `apps/mobile/tests/nm05-live-path-diagnostic.test.mjs`
5. `apps/mobile/tests/nm05-premium-browser-network.mjs`
6. `apps/mobile/tests/nm05-premium-consumer.test.mjs`
7. `apps/mobile/tests/source-parity.test.mjs`
8. `tests/migration/ag05-premium-commerce-teaser.spec.js`

No snapshot mutation was required.

---

## 9. Frozen files independently checked unchanged

Blob SHA equality between the starting SHA and certified executable was confirmed for:

- `apps/mobile/src/ui/PremiumSubscriptionPrompt.tsx`
- `apps/mobile/src/growth/config.ts`
- `api/commerce.js`
- `lib/ag05-premium-commerce.js`
- `apps/mobile/src/growth/premium-store.ts`
- `.github/workflows/pages.yml`

Therefore:

- UI-03 popup presentation changed: **NO**
- one-paragraph policy changed: **NO**
- 20-second timing authority changed: **NO**
- commerce endpoint changed: **NO**
- commerce provider authority changed: **NO**
- native storefront products changed: **NO**
- Pages deployment workflow changed: **NO**

No Supabase migration or AG-05 teaser SQL file changed.

No HOSPAZ, COM, or Studio file changed.

---

## 10. Programme authority state

At closure verification:

`main = a4f1211e1a36bc16f69cd8211c6482c759eb70a2`

PR states:

- PR #49: **Draft / Open / Unmerged**
- PR #50: **Draft / Open / Unmerged**
- PR #51: **Open / Unmerged**

The remediation branch was not started from `main`, PR #51, or a deployment branch.

---

## 11. Mutation receipt

```text
one-paragraph policy changed: NO
20-second policy changed: NO
AG-05 SQL changed: NO
Supabase changed: NO
commerce activated: NO
native store products changed: NO
UI-03 popup changed: NO
HOSPAZ changed: NO
COM changed: NO
Studio changed: NO
Pages workflow changed: NO
Pages deployed: NO
production changed: NO
main changed: NO
PR #49 merged: NO
PR #50 merged: NO
PR #51 merged: NO
```

The remediation is ready for moderator exact-head review. It is not self-accepted. AG-02 remains responsible for any later Pages wrapper and UI-06 remains responsible for independent live recertification.
