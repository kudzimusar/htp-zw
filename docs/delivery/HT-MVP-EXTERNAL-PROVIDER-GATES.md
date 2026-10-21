# HealthTimes 2.0 — External Provider Dependency & Integration Gates
## Third-Party Service Register, Credential Hygiene & Degradation Fallbacks

- **Document ID:** `HT-MVP-EXTERNAL-PROVIDER-GATES`
- **Release Candidate:** `release/ht-mvp-rc01-udpcs-launch-control`
- **Controlling Base SHA:** `d5af42d6b7018dfd3451ac9d621482e0edf9664f`
- **Governing Standard:** 11-11 Tech UDPCS 1.0 Sections 34 & 61
- **Target Delivery Date:** 24 October 2026

---

## 1. Provider Landscape & Operational Readiness

HealthTimes 2.0 utilizes targeted external infrastructure services to deliver authentication, database persistence, media CDN, multi-channel audience dispatch, and mobile application distribution. Under UDPCS 1.0 Section 34, every external dependency must be bounded by explicit credential requirements, sandbox behavior rules, failure modes, and client-assigned provisioning actions.

### Provider Status Summary
```text
TOTAL_EXTERNAL_PROVIDERS    = 6
ACTIVE_AND_VERIFIED         = 2 (Supabase Cloud, GitHub Actions CI)
STAGED_WITH_MOCK_FALLBACK   = 3 (Meta WhatsApp, Brevo Email, Apple/Google Push)
OPTIONAL / DEFERRED         = 1 (Direct Payment Gateway / Paynow)
```

---

## 2. External Provider Detailed Inventory & Gates

### 2.1 Supabase Cloud Platform (PostgreSQL, Auth, Storage, Realtime)
- **Service Role:** Core platform infrastructure, relational database, JWT authentication, binary media storage, and live updates.
- **Current Status:** **ACTIVE & OPERATIONAL** (Staging Project `gcdohgbmqhqwydgaxrcr`)
- **Required Credentials:**
  - `EXPO_PUBLIC_SUPABASE_URL` (Client-safe public URL)
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Client-safe anon key)
  - `SUPABASE_SERVICE_ROLE_KEY` (Server-only administrative secret, strictly restricted from client builds)
- **Staging Verification:**
  - 96 database migrations successfully applied.
  - PostgreSQL 17.6 active with RLS enabled across all application tables.
  - Supabase Storage buckets configured: `article-media`, `ad-creatives`, `newsroom-assets`.
- **Degradation / Failure Fallback:**
  - If Supabase REST API experiences intermittent outage, Reader falls back to cached articles in AsyncStorage.
  - Stale-while-revalidate caching shields user experience during transient blips.
- **Client Action Required:** Client to approve production Supabase organization billing tier prior to public launch.

---

### 2.2 Meta WhatsApp Cloud API (Audience Distribution)
- **Service Role:** Transmission of breaking health alerts and weekly digests to verified WhatsApp subscribers.
- **Current Status:** **STAGED WITH VERIFIED QUEUE FALLBACK**
- **Required Credentials:**
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_BUSINESS_ACCOUNT_ID`
  - `WHATSAPP_SYSTEM_USER_ACCESS_TOKEN` (Long-lived system user token)
- **Staging vs Production Behavior:**
  - In MVP Staging: Dispatches drafted in the Audience Desk are fully validated, serialized into the database queue (`broadcast_dispatches`), and recorded in the audit trail. When live API credentials are empty, the dispatcher logs the payload and marks status as `staged_sandbox`.
  - In Production: Background Edge Function or worker reads from `broadcast_dispatches` and dispatches authenticated POST requests to `https://graph.facebook.com/v20.0/{PHONE_ID}/messages`.
- **Degradation / Failure Fallback:**
  - If Meta API returns rate-limit (`131056`) or authorization error, jobs enter retry queue with exponential backoff; Newsroom UI alerts the audience specialist with exact HTTP status.
- **Client Action Required:** Client must register Meta Business Manager account, verify HealthTimes phone number, and generate a System User Access Token by 24 October 2026.

---

### 2.3 Brevo / Sendinblue (Newsletter & Email Dispatch)
- **Service Role:** High-deliverability transactional email (magic link authentication) and mass editorial newsletter broadcasts.
- **Current Status:** **STAGED WITH MOCK / STAGING QUEUE**
- **Required Credentials:**
  - `BREVO_API_KEY` (v3 API key)
  - `BREVO_SENDER_EMAIL` (e.g., `editorial@healthtimes.co.zw` with SPF/DKIM verification)
- **Staging vs Production Behavior:**
  - In MVP Staging: Newsletter campaigns are composed, tested in responsive preview, and stored in `newsletter_campaigns`. External dispatch endpoint mocks transmission unless a sandbox test key is provided.
  - In Production: Full automated broadcast dispatch to subscriber lists via Brevo Campaigns API.
- **Degradation / Failure Fallback:**
  - Editorial staff can export the campaign recipient list as CSV/JSON to manually dispatch via backup email provider if primary API fails.
- **Client Action Required:** Client must provision Brevo organization account, add custom sending domain `healthtimes.co.zw`, and configure DNS TXT/CNAME records for SPF, DKIM, and DMARC.

---

### 2.4 Apple Developer Program & Google Play Console (Mobile Push / APNs / FCM)
- **Service Role:** Native operating system push notification delivery to iOS and Android physical device lock screens.
- **Current Status:** **STAGED WITH IN-APP NOTIFICATION BELL**
- **Required Credentials:**
  - Apple: Team ID, APNs Auth Key (`.p8`), Key ID, Bundle Identifier (`zw.co.healthtimes.app`)
  - Google: Firebase Project ID, `google-services.json` server key
- **Staging vs Production Behavior:**
  - In MVP Staging: Push campaigns composed in the Audience Desk trigger real-time in-app notification events via Supabase Realtime channel. Readers see notification badges and in-app toast alerts.
  - In Production: EAS (Expo Application Services) native build integrates APNs and FCM binary certificates for background OS-level delivery.
- **Degradation / Failure Fallback:**
  - In-app notification center remains active independently of OS push permissions; web readers receive web notifications when permitted.
- **Client Action Required:** Client must invite HealthTimes delivery team to Apple Developer Enterprise/Organization team and Google Play Console as release managers.

---

### 2.5 Paynow Zimbabwe & Stripe (Commercial Billing / Payments)
- **Service Role:** Automated online credit card, Ecocash, and OneMoney payment processing for advertiser invoices and reader subscriptions.
- **Current Status:** **FORMALLY DEFERRED TO V1.1 (DIRECT INVOICING ACTIVE)**
- **Required Credentials:**
  - `PAYNOW_INTEGRATION_ID` & `PAYNOW_INTEGRATION_KEY`
  - `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`
- **MVP Operational Workaround:**
  - Commercial Desk in Newsroom OS tracks advertiser contracts and flight dates.
  - Finance Desk issues direct manual invoices with standard bank transfer instructions (ZB Bank / Stanbic Bank Zimbabwe).
  - Revenue received is posted directly into the General Ledger (Cash Dr, Ad Revenue Cr).
- **Client Action Required:** Client to establish merchant accounts with Paynow and local commercial banks for automated V1.1 online checkout.

---

## 3. Fallback Contingency Summary Matrix

| External Service | Failure Mode | Degraded Behavior | Staff Mitigation Procedure |
| :--- | :--- | :--- | :--- |
| **Supabase Database** | Network unreachable / timeout | App serves cached offline storage | Viewers read existing cached news; staff work saved to local storage draft. |
| **Meta WhatsApp API** | Token expired or rate limited | Outbound messages remain queued | Audience Desk displays warning badge; admin updates token in Newsroom settings. |
| **Brevo Email API** | API quota exceeded / HTTP 402 | Newsletter dispatches paused | Export subscriber CSV from audience desk and dispatch via backup webmail. |
| **Apple APNs / FCM** | Certificate invalid / missing | In-app alerts continue working | Readers see in-app news badge when opening app; push retried after re-signing. |

---

## 4. Client External Provisioning Sign-Off

```text
================================================================
CLIENT EXTERNAL PROVIDER ACKNOWLEDGEMENT
================================================================
1. The client understands that live WhatsApp sending requires Meta
   Business verification and a funded WhatsApp Business account.
2. The client understands that live email newsletters require domain
   DNS ownership (SPF/DKIM) for healthtimes.co.zw.
3. The client understands that mobile app store submissions require
   active Apple Developer ($99/yr) and Google Play ($25) accounts.
4. For MVP Client Dry-Run, all integrations are proven using verified
   staging queues, mock handlers, and database audit trails.

Target Account Completion: 24 October 2026
Acknowledged for Client: ___________________________
================================================================
```
