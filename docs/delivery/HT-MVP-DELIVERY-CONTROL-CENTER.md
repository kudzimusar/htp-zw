# HealthTimes 2.0 MVP Delivery Control Center

**Document Identifier:** `HT-MVP-DELIVERY-CONTROL-CENTER`  
**Governing Standard:** 11-11 Tech Universal Digital Platform Capability Standard — UDPCS 1.0  
**Programme:** HealthTimes 2.0 (Reader + Newsroom OS + Commercial + Finance + Distribution + Platform)  
**Target Client Handoff:** 24 October 2026  
**Document Owner:** HealthTimes Final MVP Release Integration Lead  
**Last Verified At:** 2026-10-21  
**Target Release Candidate Head:** `release/ht-mvp-rc02-final-unified-candidate`  
**Exact Unified Commit SHA:** `bdbfa4d42b32c4b8b65fb4e451ea406e86db1e01`  
**Controlling Base Commit:** `d5af42d6b7018dfd3451ac9d621482e0edf9664f` (PR #118)  
**Reader Authority Commit:** `c4e779dbbc2b65232c90b4e69b74551b62f1910d` (PR #116)  
**Staging Environment:** Supabase Postgres 17.6 (`gcdohgbmqhqwydgaxrcr`)  
**Staging Migration Level:** Migration 96 (`20261021050000_ht_nr_rc01_owner_auth_email_verification.sql`)  
**Overall Decision:** `READY_FOR_FINAL_OWNER_UAT`

---

## 1. What HealthTimes Is

HealthTimes 2.0 is an enterprise-grade digital health journalism platform and modern newsroom operating system built specifically for Southern Africa and global public health reporting.

The platform unifies three core operational pillars:
1. **Public Reader Experience:** A fast, accessible, offline-capable progressive web application and cross-platform native mobile reader providing public health journalism, interactive live coverage, video health series, audio listen feeds, and tiered subscriber memberships.
2. **Newsroom Operating System (Newsroom OS):** A comprehensive staff workspace structured across 7 operational domains and 12 specialized desks—encompassing reporter story drafting, multi-stage editorial review, homepage curation, digital asset management, breaking news live coverage, and multi-channel audience distribution (Social, Newsletters, Push Alerts, and WhatsApp).
3. **Commercial & Financial Control Plane:** A double-entry general ledger (GAAP/IFRS aligned) integrating ad sales, sponsor campaigns, automated invoice-to-ledger postings, payment settlements, expense claims, credit notes, and real-time financial reporting (Trial Balance, P&L, Balance Sheet, and Customer Statements).

---

## 2. What Is Being Delivered for MVP

```mermaid
flowchart TD
    subgraph ClientDelivery ["HealthTimes 2.0 Client MVP Delivery Scope"]
        subgraph ReaderScope ["1. Public Reader Platform"]
            PWA["Universal Web / PWA (Screens 1–12)"]
            NativeReader["iOS & Android Native Mobile App"]
            ReaderDiscovery["Migrated Corpus + Native Story Dual-Feed"]
            ContextDiscovery["Category, Author, and Topic Context Pages"]
            ReaderDiscussion["Attributed Reader Discussions & Moderation"]
            PremiumAccess["Subscriber Tiers & Timed Previews"]
        end
        subgraph NewsroomScope ["2. Newsroom Operating System"]
            SevenDomains["7 Operational Domains"]
            TwelveDesks["12 Professional Desks"]
            StoryWorkspace["Rich Markdown Workspace & Revision History"]
            ReviewQueue["Urgency & Deadline-Driven Review Queue"]
            DistributionHub["Multi-Channel Distribution (Social, Newsletters, Push, WhatsApp)"]
            StaffRBAC["Staff Directory & 74-Capability Role Matrix"]
            ExecutiveActivation["First Owner Parameterless Auth (/studio/activate)"]
        end
        subgraph CommercialFinanceScope ["3. Commercial & Finance Control Plane"]
            AdManagement["Campaign Management & Ad Inventory Slots"]
            DoubleEntryGL["19-Account Chart of Accounts & Fiscal Periods"]
            AutomatedPosting["Automated Invoice & Payment Ledger Triggers"]
            GAAPReports["Trial Balance, P&L, Balance Sheet, Statements"]
        end
    end
```

---

## 3. Controlling Release Topology & Branch Lineage

The previous branch divergence between Reader authority (PR #116) and Newsroom authority (PR #118) has been completely resolved. All accepted subsystems are merged into **ONE releasable exact git head** on branch `release/ht-mvp-rc02-final-unified-candidate`:

```mermaid
gitGraph
   commit id: "main (6994aa1)"
   branch ReaderTrack
   checkout ReaderTrack
   commit id: "PR #115 (8e07fda)"
   commit id: "PR #116 (c4e779d - Reader Authority)"
   checkout main
   branch NewsroomTrack
   checkout NewsroomTrack
   commit id: "PR #106 (d1b4912 - Newsroom Base)"
   commit id: "PR #117 (cd2bc75 - UI-01)"
   commit id: "PR #118 (d5af42d - Newsroom Authority)"
   branch LaunchControl
   checkout LaunchControl
   commit id: "PR #119 (a57b274 - RC-01)"
   branch UnifiedRelease
   checkout UnifiedRelease
   merge ReaderTrack id: "RC-02 Unified Candidate (bdbfa4d)"
```

### Topology Status:
- `SINGLE_RELEASABLE_HEAD_EXISTS=YES`
- `UNIFIED_RELEASE_HEAD=bdbfa4d42b32c4b8b65fb4e451ea406e86db1e01`
- `FINAL_READER_AUTHORITY=PR #116 (c4e779dbbc2b65232c90b4e69b74551b62f1910d) [MERGED]`
- `FINAL_NEWSROOM_AUTHORITY=PR #118 (d5af42d6b7018dfd3451ac9d621482e0edf9664f) [MERGED]`
- `RELEASE_INTEGRATION_BLOCKER=RESOLVED`
- `P0-REL-01=RESOLVED`

---

## 4. Current Staging Environment Truth

- **Database Host:** Supabase Postgres 17.6
- **Project Ref:** `gcdohgbmqhqwydgaxrcr`
- **Total Applied Migrations:** 96 migrations recorded in `supabase_migrations.schema_migrations`
- **Migration Tip:** `20261021050000_ht_nr_rc01_owner_auth_email_verification.sql` (Migration 96)
- **Data Integrity:** Clean staging zero-state. Zero synthetic ad invoices, fake payments, or fictional news stories persisted outside test transaction envelopes.
- **Owner Bootstrap Security:** `OWNER_BOOTSTRAP_SECURITY=STAGING_RUNTIME_PROVEN`
- **Owner Physical Auth Status:** `OWNER_PHYSICAL_AUTH=OWNER_ACTION_REQUIRED` (`OWNER_AUTH_USER_COUNT=0`, `OWNER_ACTIVE_STAFF_COUNT=0`). Owner activation available at `/studio/activate`.
- **Production Environment:** Strictly unauthorized. Zero production database access or external provider dispatches.

---

## 5. What Works (Proven Operational Capabilities)

| Capability Area | Operational Reality | Evidence Class |
|---|---|---|
| **Reader Web/PWA** | Complete 12-screen reader with responsive mobile, tablet, and desktop layouts; dark/light mode; offline persistence. | `TEST_PROVEN` & `STAGING_RUNTIME_PROVEN` |
| **Reader Discovery** | Dual-feed architecture fetching both migrated WordPress corpus and native Newsroom stories. | `SOURCE_PROVEN` & `TEST_PROVEN` |
| **Reader Context** | Category, Author, and Topic discovery surfaces with HTTPS media boundary enforcement. | `TEST_PROVEN` |
| **Story Drafting** | Rich Markdown editor, word counter, image insertion, metadata tags, revision restore. | `TEST_PROVEN` |
| **Review Queue** | Multi-stage editorial workflow (Draft -> In Review -> Changes Requested -> Approved -> Published). | `TEST_PROVEN` |
| **Homepage Curation** | Section ordering, lead story pinning, edition scheduling, breaking news alerts. | `TEST_PROVEN` |
| **Media Library** | Media upload, metadata tagging, public promotion pipeline, storage isolation. | `TEST_PROVEN` |
| **Audience Distribution** | UI consoles for Social, Newsletters, Push Alerts, and WhatsApp broadcasts with suppression rules. | `TEST_PROVEN` |
| **First Owner Auth** | Parameterless `newsroom_bootstrap_owner()` strictly bounded to confirmed `kudzimusar@gmail.com`. | `SOURCE_PROVEN` & `TEST_PROVEN` |
| **Double-Entry GL** | 19-account COA, fiscal period locks, immutable posted journals, automated invoice/payment triggers. | `TEST_PROVEN` & `STAGING_RUNTIME_PROVEN` |
| **Financial Statements** | Balanced Trial Balance, Profit & Loss Surplus, Balance Sheet equality, Customer Statements. | `TEST_PROVEN` & `STAGING_RUNTIME_PROVEN` |
| **Role-Based RBAC** | Strict domain gating across 7 personas ensuring complete segregation of duties. | `TEST_PROVEN` |

---

## 6. What Remains External (Provider Dependencies)

The core application code, UI desks, validation rules, and database functions are 100% operational. The following third-party credentials are client-managed dependencies:

1. **Meta WhatsApp Business API:** Requires client production WABA (WhatsApp Business Account) credentials and verified Meta Business Manager for live subscriber broadcasts. (Staging fallback: mock provider simulation).
2. **Brevo (Sendinblue) Transactional Email:** Requires client production API keys for external newsletter and subscriber emails. (Staging fallback: mock delivery simulator).
3. **Apple Developer & Google Play Console:** Requires client provisioning profiles and production keys for native App Store and Play Store app publishing. (Staging fallback: Expo local build & simulator).
4. **Google AdSense / Direct Ad Server:** Ad inventory slots (`hospaz-header-direct`, `home_after_live`, `article_after_intro`, `article_end`, `watch_feed`, `live_feed`) are built and compliant with health advertising policy; client ad network IDs to be inserted at cutover.

---

## 7. What Remains Deferred (Controlled V1.1/V1.2 Roadmap)

In accordance with UDPCS 1.0 governance, the following 7 capabilities are explicitly classified as `DEFERRED_V1_1`:
1. **Public Developer Portal / External REST API (DEV-01):** Internal context RPCs are fully secured; public 3rd-party developer APIs deferred to V1.1.
2. **Model Context Protocol (MCP) & Autonomous AI Copilot (MCP-01):** Human journalists author directly; human desk editors review in Review Queue; external MCP gateways deferred to V1.2.
3. **Self-Service Advertiser Portal & Card Payment Checkout (COR-01 / PRT-01):** Direct campaign booking in Commercial Desk; GL invoice & payment posting active.
4. **Real-Time Multi-Cursor Collaborative Article Editing (CMS-01):** Optimistic locking, sequential workflow, and revision history active; CRDTs deferred to V2.0.
5. **Offline Audio Background Download Queue (EXP-01 / A11Y-01):** Real-time audio streaming active; article text and images 100% offline-cached.
6. **Corporate Human Resources & Automated Payroll (CTL-01 / FIN-01):** Staff RBAC managed in Staff Desk; contributor payments tracked as GL expenses.
7. **Automated Electronic ZIMRA Tax Return Filing (LEG-01 / FIN-01):** Balance Sheet, P&L, and VAT Payable ledger export active for accountant portal filing.

---

## 8. Current Blocker & Issue Inventory (P0 / P1 / P2)

### P0 Blockers (Launch Critical):
*None remaining.*
- **P0-REL-01 (Branch Divergence):** **RESOLVED** via candidate branch `release/ht-mvp-rc02-final-unified-candidate` (`bdbfa4d4`).
- **P0-SEC-01 (Owner Auth Escalation):** **RESOLVED** via additive Migration 96 (`20261021050000_ht_nr_rc01_owner_auth_email_verification.sql`).

### P1 Pre-Handoff Tasks:
1. **P1-1: Physical Owner Authentication Activation Ceremony**  
   *Description:* Kudzi Musarurwa must navigate to `/studio/activate`, sign up, confirm email ownership, and activate the live Publisher/Owner role on Staging (`OWNER_ACTION_REQUIRED`).  
2. **P1-2: Pre-Flight Script Run on Clean Environment**  
   *Description:* Execute `scripts/release/ht-mvp-preflight.mjs` to verify all 18 delivery documents, 96 migrations, and git hashes.  
3. **P1-3: Internal Client Dry-Run Rehearsal**  
   *Description:* Conduct the 30–45 minute dry-run script with the internal team prior to the client demonstration.

### P2 Disclosed & Deferred Items:
- All 7 formal deferrals listed in [HT-MVP-V1.1-DEFERRED-REGISTER.md](HT-MVP-V1.1-DEFERRED-REGISTER.md).

---

## 9. Master Document Navigation Index

All delivery documentation is consolidated in `docs/delivery/`:

| Document Name | File Path | Purpose |
|---|---|---|
| **Delivery Control Center** | [HT-MVP-DELIVERY-CONTROL-CENTER.md](HT-MVP-DELIVERY-CONTROL-CENTER.md) | Master front door and executive status overview |
| **Final Release Manifest** | [HT-MVP-FINAL-RELEASE-MANIFEST.md](HT-MVP-FINAL-RELEASE-MANIFEST.md) | Authoritative manifest of unified release candidate |
| **UDPCS Capability Register** | [HT-MVP-UDPCS-CAPABILITY-REGISTER.md](HT-MVP-UDPCS-CAPABILITY-REGISTER.md) | Exhaustive 35-domain assessment across all 5 planes |
| **Feature Completeness Gates** | [HT-MVP-FEATURE-COMPLETENESS-GATES.md](HT-MVP-FEATURE-COMPLETENESS-GATES.md) | 9-dimension gate analysis for all material capabilities |
| **Capability Mirror** | [HT-MVP-CAPABILITY-MIRROR.md](HT-MVP-CAPABILITY-MIRROR.md) | 15-question architectural mirror for core workflows |
| **Evidence Register** | [HT-MVP-EVIDENCE-REGISTER.md](HT-MVP-EVIDENCE-REGISTER.md) | Truthful claim-to-evidence mapping with evidence classes |
| **Release Topology** | [HT-MVP-RELEASE-TOPOLOGY.md](HT-MVP-RELEASE-TOPOLOGY.md) | Git ancestry graph and unified branch integration proof |
| **Go / No-Go Board** | [HT-MVP-GO-NO-GO.md](HT-MVP-GO-NO-GO.md) | Comprehensive launch decision matrix and scoring |
| **Client Dry Run Guide** | [HT-MVP-CLIENT-DRY-RUN.md](HT-MVP-CLIENT-DRY-RUN.md) | Complete 30–45 minute presentation flow and script |
| **Owner UAT Guide** | [HT-MVP-OWNER-UAT.md](HT-MVP-OWNER-UAT.md) | Hands-on walkthrough across all 7 staff personas |
| **External Provider Gates** | [HT-MVP-EXTERNAL-PROVIDER-GATES.md](HT-MVP-EXTERNAL-PROVIDER-GATES.md) | Status of Meta, Brevo, Apple, Google, and Supabase |
| **Operations Runbook** | [HT-MVP-OPERATIONS-RUNBOOK.md](HT-MVP-OPERATIONS-RUNBOOK.md) | Day-to-day newsroom and platform operating guide |
| **Incident Management Runbook** | [HT-MVP-INCIDENT-RUNBOOK.md](HT-MVP-INCIDENT-RUNBOOK.md) | SEV-1/2/3 definitions, containment, and recovery |
| **Backup & Disaster Recovery** | [HT-MVP-BACKUP-RECOVERY.md](HT-MVP-BACKUP-RECOVERY.md) | Data asset recovery procedures and limitations |
| **Security, Privacy & Legal Register** | [HT-MVP-SECURITY-PRIVACY-LEGAL-REGISTER.md](HT-MVP-SECURITY-PRIVACY-LEGAL-REGISTER.md) | Compliance registers and professional advisor gates |
| **Client Handoff Pack** | [HT-MVP-CLIENT-HANDOFF-PACK.md](HT-MVP-CLIENT-HANDOFF-PACK.md) | Client-facing delivery summary and acceptance form |
| **V1.1 Deferred Register** | [HT-MVP-V1.1-DEFERRED-REGISTER.md](HT-MVP-V1.1-DEFERRED-REGISTER.md) | Formal record of non-MVP capabilities and workarounds |
| **Machine-Readable Register** | [ht-mvp-capability-register.json](ht-mvp-capability-register.json) | JSON export of all 35 domains and material features |
