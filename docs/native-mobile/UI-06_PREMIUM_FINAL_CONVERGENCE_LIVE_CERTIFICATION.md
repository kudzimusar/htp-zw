# UI-06 — Premium Final Convergence Live Certification Closure

## Moderator disposition

**ACCEPTED — LIVE PREMIUM FINAL CONVERGENCE CERTIFIED**

Repository: `kudzimusar/htp-zw`

Programme: HealthTimes UI / Premium Recovery

Certification branch: `test/ui06-premium-final-convergence-live-cert`

No merge to `main` was performed.

## Exact authority identities

| Role | Exact identity |
| --- | --- |
| Accepted combined product executable | `9d093426970cdc09c23663022480af60a079f712` |
| Product certification tooling | `370508db916a502089420a3bee37004406d2ff82` |
| Product certification run | `37079586703` — SUCCESS |
| Product certification job | `111076939839` — SUCCESS |
| Live deployed Pages wrapper | `98c657718fa907568818463ee242d2aa1fdda2fb` |
| Pages build/deploy run | `37079736528` |
| Pages build job | `111077386725` — SUCCESS |
| Pages deploy job | `111077993710` — SUCCESS |
| Pages artifact | `11257489692` |
| Pages artifact digest | `sha256:f5793220771b83a55526765052a770ee563b4cbc8eb911d11c66cce390375689` |
| UI-06 certification tooling | `6f842dbb8489064c03ad2a32be7d5e4324e2c83d` |
| UI-06 live run | `37081102856` — SUCCESS |
| UI-06 live job | `111081590763` — SUCCESS |
| UI-06 evidence artifact | `11258696657` |
| UI-06 evidence digest | `sha256:63dca8edbace5ac31c6932199428c6fa495994efbc22a8a0b7494523e5ba3092` |
| Deployment custody-lock head | `102c90ce56a88a1784a204d7c6eaa4b9d1c84d4b` |
| Custody-lock run | `37081044997` — SKIPPED by design |

The deployment run was later marked cancelled only because a newer workflow-only custody attempt superseded its post-deploy verification phase. Its build and `deploy-native-preview` jobs had already completed successfully. UI-06 independently proved live `/build-info.json` is exactly `98c657718fa907568818463ee242d2aa1fdda2fb`, so the deployment identity is independently closed.

The later queued workflow-only wrapper `2951c9dcf487b3834b4f29e03cac58bb73186f24` was cancelled before execution. The custody-lock commit prevents it from overwriting the certified live wrapper.

## Accepted combined product changes

The final executable `9d093426...` is based on the accepted NM-05R2 product and contains only the bounded final Premium convergence changes:

- `apps/mobile/src/services/premium-teaser-authority.ts`
  - source-parity remains the authority for public-vs-Premium classification;
  - a legacy `premium_marker_review` projection may provide bounded teaser evidence for an already-Premium story;
  - that review marker cannot by itself promote a source-parity public story into paid access.

- `apps/mobile/src/ui/PremiumSubscriptionPrompt.tsx`
  - Web mobile Premium sheet is explicitly pinned to the viewport bottom;
  - native behavior and tablet/desktop centered-card behavior remain preserved.

- associated bounded tests:
  - `apps/mobile/tests/nm05-premium-consumer.test.mjs`
  - `apps/mobile/tests/ui03-premium-subscription-prompt.test.mjs`

The exact-product certification reran the preservation matrix, live NM-05 Premium authority checks, AG-05 teaser/commerce protection contract, UI-03 checks, source-parity tests and Pages-equivalent export. All controlling gates passed.

## Live Premium source 33190

Reference route:

`/article/source-zimbabwe-strengthens-social-contracting-as-hiv-donor-funding-shrinks`

The live certification proves:

- source `33190` remains Premium;
- first editorial paragraph only;
- initial preview countdown: **20 seconds**;
- measured primary elapsed preview: **19.42 seconds**, within scheduler/render tolerance around the fixed 20-second policy;
- popup absent before expiry: **true**;
- popup visible after expiry: **true**;
- popup open count: **1**;
- Not now dismissal: **true**;
- Close dismissal: **true**;
- desktop Escape dismissal: **true**;
- inline paywall remains after dismissal: **true**;
- teaser does not restart after refresh: **true**;
- popup does not reopen after refresh: **true**.

The one-paragraph / 20-second owner policy was not changed or shortened for CI.

## Protected-content / network proof

Anonymous Premium delivery remained fail-closed:

- protected body received: **false**;
- protected body rendered: **false**;
- paragraph 2 delivered/rendered: **false**;
- WordPress content-field requests: **0**;
- protected Article requests: **0**;
- commerce request on popup open: **0**;
- commerce requests after Explore Premium: **0**.

The full Premium article is not downloaded and hidden underneath the prompt.

## Public comparison classification

Reference route:

`/article/source-fiji-hiv-emergency-epidemic-spreads-beyond-drug-users`

Live AG-05 projection evidence for source `33149` still reports:

`access_policy = premium_marker_review`

That review marker no longer promotes this source-parity public story into paid access.

UI-06 proved on mobile and desktop:

- Premium preview absent;
- Premium paywall absent;
- Premium subscription prompt absent;
- public Article presentation normal;
- hero media loaded successfully;
- horizontal overflow absent;
- React #418 absent;
- page errors absent.

This closes the public-vs-Premium policy-boundary defect without weakening source `33190`.

## Responsive / visual proof

Certified viewports:

- mobile `390×844`;
- tablet `834×1112`;
- desktop `1440×1000`;
- dark mobile;
- dark desktop.

Results:

- mobile sheet reaches the viewport bottom;
- tablet card width `600px`, centered;
- desktop card width `600px`, centered;
- no horizontal overflow;
- dark-mode card uses the dark paper surface rather than fixed white;
- no React #418;
- no primary page error in the certified Premium journeys.

## Accessibility proof

The live prompt exposes independent accessible controls:

- Close: **1**;
- Explore Premium: **1**;
- Member sign in: **1**;
- Not now: **1**;
- heading semantics present: **true**;
- desktop keyboard focus reaches an action;
- Escape closes the prompt;
- no duplicate hidden close control is required for operation.

## CTA / commerce proof

Current fail-closed commercial behavior remains:

- primary CTA: **Explore Premium**;
- route: `/premium`;
- Member sign in route: `/account-access`;
- no checkout request is automatically initiated;
- no entitlement is granted by redirect/browser state;
- no fabricated price, currency, free trial or promotional claim is introduced.

Paynow / PayPal operational provider activation remains outside this certification.

## Shared shell smoke

The deployed canonical Reader returned HTTP 200 for:

- `/`
- `/explore`
- `/search`
- `/live`
- `/watch`
- `/my`
- `/account-access`
- `/appearance`

Home Hero story and Top Stories resolved. No React #418 or page errors were observed in the shell smoke.

## Residual out-of-scope debt

Two previously known items remain and did not block this release:

1. **P4 Watch media**
   - `https://img.youtube.com/vi/8K9nxwmj-1k/maxresdefault.jpg`
   - returns HTTP 404;
   - classified as the existing Watch thumbnail/resource debt.

2. **P3 provider activation**
   - Paynow / PayPal commerce authority remains intentionally unconfigured;
   - no price/currency/provider entitlement authority was fabricated.

## Authority preservation

- one-paragraph policy changed: **NO**
- 20-second policy changed: **NO**
- AG-05 SQL changed: **NO**
- Supabase migrations changed: **NO**
- protected body exposed: **NO**
- payment provider activated: **NO**
- HOSPAZ authority changed: **NO**
- COM authority changed: **NO**
- `main` changed by this programme closure: **NO**
- PR #49 merged: **NO**
- PR #50 merged: **NO**
- PR #51 merged: **NO**

At closure, `main` remains:

`a4f1211e1a36bc16f69cd8211c6482c759eb70a2`

## Final programme disposition

**UI-03 PREMIUM SUBSCRIPTION PROMPT + NM-05 PREMIUM TEASER POLICY + PAGES DEPLOYMENT + UI-06 LIVE CERTIFICATION: ACCEPTED / FROZEN**

No further Premium presentation remediation is required in this phase.

The next Premium-commercial work, if released by the moderator, must be a separate provider-activation/payment-authority lane and must not reopen the certified Reader/prompt/security implementation.

**UI-06 LIVE PREMIUM FINAL CONVERGENCE CERTIFIED — EXACT EXECUTABLE / LIVE WRAPPER / ONE-PARAGRAPH 20-SECOND PREVIEW / SUBSCRIPTION PROMPT / PUBLIC-PREMIUM CLASSIFICATION / FAIL-CLOSED COMMERCE VERIFIED**
