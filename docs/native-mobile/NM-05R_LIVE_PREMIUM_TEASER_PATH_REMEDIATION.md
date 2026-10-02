# NM-05R — Live Source-Party Premium Teaser Path Resolution Remediation

## Disposition

**Repository:** `kudzimusar/htp-zw`

**Branch:** `fix/nm05-live-premium-teaser-path-resolution`

**Required starting SHA:** `ae1bb67bb75098a6e1799bb6adc5f2cf93bdb766`

**Certified executable candidate:** `c1a9f642a735ad2d02775a7d8668e797bedbb426`

**Certification run:** `37018423156`

**Certification job:** `110874976158`

**Evidence artifact:** `11231262619`

**Artifact digest:** `sha256:647c685f1d99b401786a9d17eec4de907b228e487d2e2c4a864297d821defcc6`

No Pages deployment was performed from this branch.

---

## 1. Proven pre-remediation lookup key

Dedicated diagnostic run:

`37017237308`

Exact diagnostic SHA:

`8daa8598dac1b4ab7233b552253df129c11aa4d0`

The source-parity fallback story for source `33190` produced:

```text
canonical_url = https://healthtimes.co.zw/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/
snapshot_legacy_path = /zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/
outgoing_p_path = /zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/
```

The accepted AG-05 authority resolves source `33190` using:

```text
/2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/
```

This proves the live failure was a fallback permalink lookup-key mismatch.

---

## 2. Root cause

Before remediation:

```text
snapshot fallback identity
→ canonicalUrl = /slug/
→ canonicalPath(...)
→ ag05_public_story_teaser_document(p_path=/slug/)
→ HTTP 200 / no usable teaser projection
→ immediate paywall
```

The source-parity fallback did not have the dated WordPress permalink that the AG-05 legacy mapping authority expects.

The AG-05 teaser SQL and bounded projection were already operating correctly and were not modified.

---

## 3. Implementation

Primary product changes are limited to:

- `apps/mobile/src/services/premium-teaser-authority.ts`
- `apps/mobile/src/services/source-parity.ts`

The repaired source-parity detail flow is:

```text
snapshot/live-list identity
→ WordPress slug metadata request (_fields excludes content)
→ trusted WordPress post.link
→ canonical Premium source path
→ ag05_public_story_teaser_document(p_path=resolved path)
→ Premium/public classification
→ if Premium: return bounded teaser + bodyHtml=null
→ if public: perform second WordPress request with content
```

Premium no longer performs teaser lookup directly from the snapshot `canonicalUrl`.

If WordPress metadata cannot produce a trusted permalink:

```text
no trusted path
→ no teaser RPC
→ Premium remains Premium
→ bodyHtml=null
→ immediate paywall
```

There is no fallback from teaser failure to protected WordPress content.

---

## 4. Proven post-remediation path

Exact-head Chromium/network evidence at candidate `c1a9f642...`:

```text
story_source_id = 33190
requested_p_path = /2026/09/18/zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks/
access_policy = premium_marker_review
teaser_paragraph_count = 1
teaser_length = 321
teaser_sha256 = f44b8953d51c5eb2484b9d207ba634a0335c1780dff3cc2c3b16f3bb688fa1cd
body_html_is_null = true
```

Protected teaser text is intentionally not recorded.

---

## 5. Browser/network proof

Repaired Premium scenario:

```text
metadata_available = true
WordPress metadata requests = 3
WordPress content-field requests = 0
protected article requests = 0
automatic commerce requests = 0
```

Metadata failure scenario:

```text
metadata_available = false
requested_p_path = null
WordPress content-field requests = 0
protected article requests = 0
automatic commerce requests = 0
```

Therefore metadata/path failure fails closed directly to the paywall.

Public comparison scenario:

```text
public_body_visible = true
public_content_field_requests = 1
public_requested_p_path = /2026/09/18/ahf-urges-zimbabwe-to-join-borrowers-forum-amid-debt-crisis/
```

Public stories therefore remain capable of obtaining public body content, but only after metadata/teaser classification.

---

## 6. 20-second journey and UI-03 preservation

The existing UI-03 Premium prompt implementation was not changed.

The browser regression proves:

- Premium preview appears before expiry;
- inline paywall is absent while preview is active;
- after approximately 20 seconds the inline paywall appears;
- the existing UI-03 subscription prompt appears;
- dismissing the prompt leaves the inline paywall in place;
- expiry generates no new WordPress request;
- protected article requests remain zero;
- automatic commerce requests remain zero.

Owner policy remains:

- one teaser paragraph;
- 20 seconds.

---

## 7. Required exact-head gates

All required gates passed at exact candidate `c1a9f642a735ad2d02775a7d8668e797bedbb426`.

### Node suites

- lookup-key boundary diagnostic — 1/1
- Reader product — 10/10
- Reader fidelity — 4/4
- Source Parity — 28/28
- Premium/HOSPAZ — 12/12
- Growth commercial — 9/9
- UI-03 — 18/18
- NM-05 Premium consumer — 7/7
- NM-05 Premium live — 2/2

**Node total: 91/91 PASS**

### AG-05 protection suite

`tests/migration/ag05-premium-commerce-teaser.spec.js`

**9/9 PASS**

Also passed:

- `npm run native:check`
- `npm run native:export:web`
- Chromium network/path regression
- evidence receipt verification

---

## 8. Exact changed files at executable candidate

Compared with required base `ae1bb67...`, executable candidate `c1a9f642...` changes exactly 8 files:

1. `.github/workflows/nm05r-live-premium-teaser-path.yml`
2. `apps/mobile/src/services/premium-teaser-authority.ts`
3. `apps/mobile/src/services/source-parity.ts`
4. `apps/mobile/tests/nm05-live-path-diagnostic.test.mjs`
5. `apps/mobile/tests/nm05-premium-browser-network.mjs`
6. `apps/mobile/tests/nm05-premium-consumer.test.mjs`
7. `apps/mobile/tests/source-parity.test.mjs`
8. `tests/migration/ag05-premium-commerce-teaser.spec.js`

No source-parity snapshot mutation was required.

---

## 9. Frozen authority receipt

```text
apps/mobile/src/ui/PremiumSubscriptionPrompt.tsx changed: NO
UI-03 popup presentation changed: NO
one-paragraph policy changed: NO
20-second policy changed: NO
api/commerce.js changed: NO
lib/ag05-premium-commerce.js changed: NO
Paynow/PayPal changed: NO
native store products changed: NO
HOSPAZ changed: NO
COM changed: NO
Studio changed: NO
Supabase migrations changed: NO
AG-05 teaser SQL changed: NO
PR #49 changed/merged: NO
PR #50 changed/merged: NO
PR #51 changed/merged: NO
main changed: NO
Pages deployment workflow changed: NO
Pages deployed from remediation branch: NO
```

---

## 10. Moderator review boundary

This implementation is ready for moderator exact-head review only.

It does **not** self-accept.

After moderator acceptance:

1. AG-02 may produce a new Pages wrapper.
2. UI-06 independently reruns the full live 20-second journey.

NM-05 does not perform either step.
