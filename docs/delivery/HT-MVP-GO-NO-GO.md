# HealthTimes 2.0 — Launch Decision Board & Go / No-Go Register
## UDPCS 1.0 Release Score, Defect Classification & Dry-Run Readiness

- **Document ID:** `HT-MVP-GO-NO-GO`
- **Release Candidate:** `release/ht-mvp-rc02-final-unified-candidate`
- **Exact Head SHA:** `641b20267f6b6b0fbcb80044b5c271400c12bda1`
- **Controlling Base SHA:** `d5af42d6b7018dfd3451ac9d621482e0edf9664f` (PR #118)
- **Reader Authority SHA:** `c4e779dbbc2b65232c90b4e69b74551b62f1910d` (PR #116)
- **Launch Control Parent SHA:** `a57b2748a4aaa46478028ac3857f0f84fbeae5f2` (PR #119)
- **Governing Standard:** 11-11 Tech UDPCS 1.0 Sections 15, 59, 60
- **Target Delivery Date:** 24 October 2026

---

## 1. Blocker Classification Definitions

Under UDPCS 1.0 Section 15, defects and operational gaps are strictly partitioned into three severity tiers:

- **P0 (Critical / Launch Blocker):** Must be resolved before any client dry-run or release candidate approval. Includes: security vulnerabilities, data loss/corruption, broken authentication, unbalanced financial ledgers, or un-runnable application states.
- **P1 (Major / Managed Operational Risk):** Significant functionality gap or external dependency limitation that does not prevent platform demonstration or core usage. Permissible for Client Dry-Run if a verified manual/operational workaround is documented and signed off by the Owner.
- **P2 (Minor / Polish & Deferred):** Non-blocking cosmetic, workflow enhancement, or future automation feature. Formally assigned to the V1.1 Deferred Register.

---

## 2. Active Defect & Gap Census

### 2.1 P0 Defect Census (Current Count: 0)

| ID | Title | Status | Remediation & Proof |
| :--- | :--- | :---: | :--- |
| **P0-SEC-01** | First-Owner Auth Unconfirmed Email Privilege Escalation Risk | **RESOLVED** | Fixed via additive Migration 96 (`20261021050000_ht_nr_rc01_owner_auth_email_verification.sql`). 6/6 transactional tests pass in `supabase/tests/ht_nr_rc01_owner_auth_assurance_tests.sql`. |
| **P0-REL-01** | Parallel Branches Divergence (Reader PR #116 vs Newsroom PR #118) | **RESOLVED** | Unified onto `release/ht-mvp-rc02-final-unified-candidate` (`641b2026`). Single releasable head exists (`SINGLE_RELEASABLE_HEAD_EXISTS=YES`). 466 Newsroom + 74 Reader unit tests pass, TypeScript compiles with 0 errors. |

*Active P0 Blockers Remaining:* **0**

---

### 2.2 P1 Operational Risk Census (Current Count: 3)

| ID | Title | Impact | Managed Workaround / Client Action |
| :--- | :--- | :--- | :--- |
| **P1-EXT-01** | Meta WhatsApp Cloud API Production Account Unprovisioned | Live WhatsApp dispatches cannot send to real phone numbers. | Dispatches stage in verified database queue and log to audit trail. Client to provide Meta Business Manager System User Token for live send. |
| **P1-EXT-02** | Brevo SMTP / Newsletter API Key Placeholder in Staging | Mass email campaigns cannot dispatch external emails. | Campaign builder fully operational; campaigns staged in DB. Client to provide verified Brevo v3 API key. |
| **P1-EXT-03** | Apple Push Notification (APNs) & Google FCM Credentials Missing | Mobile push notifications cannot deliver to physical device lock screens. | In-app notification bell and notification center fully functional; push payload generator validated in unit tests. Client Apple Developer Team ID and Firebase google-services.json required for app store build. |

---

### 2.3 P2 Minor Polish & Deferred Items (Current Count: 7)

| ID | Title | Deferred Domain | Operational Workaround Active in MVP |
| :--- | :--- | :---: | :--- |
| **P2-DEF-01** | Public API Gateway & Third-Party Developer Portal | DEV-01 | Internal context RPC queries active; manual database exports by technical lead. |
| **P2-DEF-02** | Model Context Protocol (MCP) & Autonomous AI Copilot | MCP-01 | Human journalists author directly; human desk editors review in Review Queue. |
| **P2-DEF-03** | Self-Service Advertiser Portal & Card Payment Checkout | COR-01 / PRT-01 | Direct campaign booking in Commercial Desk; GL invoice & payment posting. |
| **P2-DEF-04** | Real-Time Multi-Cursor Collaborative Article Editing | CMS-01 | Optimistic locking, sequential workflow, and revision history active. |
| **P2-DEF-05** | Offline Audio Background Download Queue | EXP-01 / A11Y-01 | Real-time audio streaming active; article text and images 100% offline-cached. |
| **P2-DEF-06** | Corporate Human Resources & Automated Payroll | CTL-01 / FIN-01 | Staff RBAC managed in Staff Desk; contributor payments tracked as GL expenses. |
| **P2-DEF-07** | Automated Electronic ZIMRA Tax Return Filing | LEG-01 / FIN-01 | Balance Sheet, P&L, and VAT Payable ledger export active for accountant portal filing. |

---

## 3. UDPCS 1.0 Release Scorecard (35 Domains Across 5 Planes)

Under UDPCS 1.0, capability assessment is evaluated across the **Five Operating Planes** using individual domain operational states and the 9-dimension criteria (Maturity, Ownership, Authority, Data, Runtime, Audit, Operations, Support, Recovery):

| Operating Plane | Total Domains | Production Ready | Operational with Workaround | Deferred to V1.1/V1.2 | 9-Dimension Criteria Ratio | Plane Operational Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Plane 1: Experience** | 11 | 8 | 3 (MSG-01, GRO-01, PRT-01) | 0 | 95 / 99 (96.0%) | **OPERATIONAL** |
| **Plane 2: Control** | 6 | 5 | 1 (COR-01) | 0 | 53 / 54 (98.1%) | **OPERATIONAL** |
| **Plane 3: Platform** | 6 | 3 | 1 (INT-01) | 2 (DEV-01, MCP-01) | 48 / 54 (88.9%) | **OPERATIONAL** |
| **Plane 4: Operations** | 8 | 8 | 0 | 0 | 72 / 72 (100.0%) | **PRODUCTION READY** |
| **Plane 5: Governance** | 4 | 2 | 2 (LEG-01, RSK-01) | 0 | 32 / 36 (88.9%) | **OPERATIONAL** |
| **TOTALS** | **35** | **26** | **7** | **2** | **300 / 315 (95.2%)** | **READY FOR OWNER UAT** |

*Methodological Note:* Rather than masking system reality behind a single aggregated percentage, this register accounts for all 35 domains truthfully: 26 domains are fully production-certified in code, schema, and tests; 7 domains operate with documented manual/external workarounds; 2 platform domains are explicitly deferred with operational fallbacks. Zero capabilities are faked.

---

## 4. Release Decision Board & Governance Sign-Off

| Board Role | Representative | Disposition | Comments & Conditions |
| :--- | :--- | :---: | :--- |
| **Executive Owner** | Kudzai Musarurwa | **PENDING OWNER UAT** | Single releasable head `release/ht-mvp-rc02-final-unified-candidate` prepared for physical walkthrough. Activation URL available at `/studio/activate`. |
| **Technical Lead** | Lead Architect | **GO FOR OWNER UAT** | Codebase passes TypeScript strict check (0 errors); 466 Newsroom + 74 Reader unit tests pass (100%). Single releasable head created (`641b2026`). Staging migration tip 96 verified. |
| **Security & Privacy Lead** | SecOps Officer | **GO FOR OWNER UAT** | Migration 96 resolved first-owner bootstrap vulnerability. `OWNER_BOOTSTRAP_SECURITY=STAGING_RUNTIME_PROVEN`. RLS active across 100% of public tables. Zero plain secrets. Physical activation pending (`OWNER_ACTION_REQUIRED`). |
| **Financial Controller** | Finance Lead | **GO FOR OWNER UAT** | General Ledger engine enforces double-entry invariant at database engine level. 19-account chart of accounts verified. Trial balance verified. |
| **Client Delivery Lead** | Delivery Manager | **GO FOR OWNER UAT** | Runbooks, evidence registers, and handoff documentation complete. Delivery pack unified on RC-02. System ready for Owner UAT & Client Dry-Run. |

---

## 5. Professional Advisory Sign-Off Gates

| Advisory Gate | Scope | Status | Notes / Prerequisites |
| :--- | :--- | :---: | :--- |
| **Legal Counsel Gate** | Defamation policy, ZMC compliance, medical disclaimers | **NOT_EVIDENCED — REVIEW_REQUIRED** | Code & policy text prepared; formal legal counsel sign-off pending client appointment. |
| **Tax & Audit Advisor Gate** | Chart of accounts, VAT liability ledger, double-entry invariance | **NOT_EVIDENCED — REVIEW_REQUIRED** | PostgreSQL engine enforces balance; formal CPA/auditor review pending client appointment. |
| **Data Protection Officer (DPO) Gate** | Cyber and Data Protection Act [Chapter 12:07] compliance | **NOT_EVIDENCED — REVIEW_REQUIRED** | Data minimization & aggregate analytics proven; formal external DPO audit pending client appointment. |

---

## 6. Formal Disposition & Recommendation

```text
FINAL_DECISION = READY_FOR_FINAL_OWNER_UAT

RATIONALE:
1. SINGLE_RELEASABLE_HEAD_EXISTS=YES:
   Reader (PR #116) and Newsroom (PR #118) lines are fully unified on
   release/ht-mvp-rc02-final-unified-candidate (641b2026).
2. Zero active P0 defects remain. P0-REL-01 and P0-SEC-01 are fully resolved.
3. Automated test suite passes 100% (466 Newsroom unit tests + 74 Reader tests).
4. TypeScript compiles with 0 errors (npx tsc --noEmit).
5. Staging database verified at Migration 96 tip on gcdohgbmqhqwydgaxrcr.
6. OWNER_BOOTSTRAP_SECURITY=STAGING_RUNTIME_PROVEN.
7. OWNER_PHYSICAL_AUTH=OWNER_ACTION_REQUIRED:
   Owner activation available at /studio/activate.
8. External advisor gates truthfully classified as NOT_EVIDENCED — REVIEW_REQUIRED.

CONDITIONS FOR CLIENT MVP HANDOFF (24 OCTOBER 2026):
1. Owner executes physical authentication and walkthrough via /studio/activate.
2. Final Owner UAT sign-off recorded on candidate head 641b2026.
3. Client executes formal acknowledgment of external provider prerequisites (Meta, Brevo, Apple).
```
