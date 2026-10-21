# HealthTimes 2.0 — Security, Privacy, Legal & Regulatory Register
## Comprehensive Governance Pack, Compliance Inventory & Advisory Gates

- **Document ID:** `HT-MVP-SECURITY-PRIVACY-LEGAL-REGISTER`
- **Release Candidate:** `release/ht-mvp-rc01-udpcs-launch-control`
- **Controlling Base SHA:** `d5af42d6b7018dfd3451ac9d621482e0edf9664f`
- **Governing Standard:** 11-11 Tech UDPCS 1.0 Sections 25–27, 38–40
- **Target Delivery Date:** 24 October 2026

---

## 1. Security Architecture & Evidence Pack

### 1.1 Row-Level Security (RLS) Policy Enforcement
Every table in the `public` schema has PostgreSQL Row-Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) activated. Access is strictly partitioned:
- **Public Tables (`articles`, `categories`, `authors`):** Public `SELECT` allowed only when `status = 'published'`. `INSERT`, `UPDATE`, `DELETE` require authenticated session with editor/publisher staff role.
- **Financial Tables (`gl_accounts`, `gl_journal_entries`, `gl_journal_lines`):** Restricted exclusively to authenticated users whose `id` exists in `newsroom_staff` with `role IN ('publisher', 'managing_editor', 'finance_officer')`. Direct anon access is strictly forbidden.
- **Staff Tables (`newsroom_staff`, `newsroom_audit_log`):** Read-only for active staff; mutations restricted to `publisher` role.

### 1.2 First-Owner Authentication & Escalation Hardening
- **Remediation Proven in Migration 96:**
  - `newsroom_bootstrap_owner()` strictly requires caller email in JWT to match `kudzimusar@gmail.com`.
  - Database checks `auth.users.email_confirmed_at IS NOT NULL`. Unconfirmed email accounts cannot claim staff profiles.
  - Test suite `supabase/tests/ht_nr_rc01_owner_auth_assurance_tests.sql` validates zero escalation across 6 attack vectors.

### 1.3 HTTPS Media Boundary
- Context discovery RPC (`get_reader_context_discovery_v1`) enforces HTTPS URL scheme for all featured public media assets. Plaintext HTTP URLs are blocked or rewritten at the database function level to eliminate mixed-content browser warnings.

### 1.4 Secret & Credential Hygiene
- **Zero Hardcoded Secrets:** Repository scan confirms zero API secrets or service-role keys committed to source control.
- **Environment Isolation:** Secrets are injected at runtime via environment variables (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`). Service-role secrets are restricted to secure server-side Edge Functions.

---

## 2. Privacy & Data Protection Stocktake

### 2.1 Governing Legislation
- **Zimbabwe Cyber and Data Protection Act [Chapter 12:07]**
- **General Data Protection Regulation (GDPR)** principles (for international readers)

### 2.2 Data Subject Inventory & PII Minimization
| Data Subject | PII Collected | Lawful Basis | Storage Location | Retention Period |
| :--- | :--- | :--- | :--- | :--- |
| **Public Reader** | None (Anonymous by default). Optional email for newsletter. | Legitimate Interest / Explicit Consent | Supabase `audience_subscribers` | Until unsubscription request. |
| **Registered User** | Email address, hashed password. | Contractual Performance | Supabase `auth.users` | Active account lifecycle. |
| **Newsroom Staff** | Full name, work email, role, audit logs. | Employment / Contract | `newsroom_staff`, `newsroom_audit_log` | Statutory employment duration + 5 years. |
| **Advertiser Contact**| Business name, billing email, phone number. | Commercial Contract | `advertisers` | 7 years for financial tax compliance. |

### 2.3 Reader Telemetry Privacy
- Article read analytics and impression counts are aggregate numbers; zero persistent tracking cookies, fingerprinting scripts, or third-party advertising data brokers (Google DoubleClick/Meta Pixel) are embedded in the Reader client.

---

## 3. Legal & Editorial Regulatory Register

### 3.1 Media Accreditation & Registration
- **Zimbabwe Media Commission (ZMC):** HealthTimes is registered as a mass media service in Zimbabwe under the Freedom of Information Act and ZMC regulations.
- **Accredited Journalists:** All staff bylines correspond to journalists holding valid ZMC accreditation cards.

### 3.2 Medical Advice & Liability Disclaimer
Every health and medical article rendered in the Reader includes the mandatory statutory disclaimer:
> *"Medical Disclaimer: HealthTimes provides journalism and public health information for educational purposes only. Content published herein does not constitute medical advice, clinical diagnosis, or treatment recommendations. Always consult a licensed healthcare professional for personal medical concerns."*

### 3.3 Defamation, Libel & Right of Reply
- Newsroom SOP requires that any investigative story alleging clinical malpractice, hospital negligence, or corruption must provide the subject at least 24 hours to respond before publication.
- A dedicated right-of-reply mechanism is managed via `corrections@healthtimes.co.zw`.

### 3.4 Copyright & Medical Imagery Permissions
- Clinical images (patient photography, surgical procedures) must have documented written patient consent or be sourced from open-access biomedical repositories (e.g., CDC Public Health Image Library, Wellcome Collection) with explicit attribution.

---

## 4. Tax & Financial Governance Register

### 4.1 ZIMRA (Zimbabwe Revenue Authority) Compliance
- **Value Added Tax (VAT):** Direct advertising revenue is subject to standard Zimbabwean VAT (15%). The General Ledger Chart of Accounts includes designated liability account `2020 - VAT Payable`.
- **Withholding Tax on Contracts:** Freelance journalist contributor payments are tracked under `2030 - Withholding Tax Payable` for statutory deduction where applicable.

### 4.2 Financial Ledger Auditability
- In accordance with standard corporate governance and tax auditing requirements, the HealthTimes double-entry general ledger is immutable.
- Posted journal entries cannot be edited or deleted; corrections require explicit reversing entries, preserving an unbroken historical audit trail.

---

## 5. Professional Advisory Sign-Off Gates

```text
================================================================
PROFESSIONAL ADVISORY SIGN-OFF GATES
================================================================

1. LEGAL COUNSEL GATE:
   - Scope: Defamation policy, ZMC compliance, medical disclaimers.
   - Status: APPROVED FOR MVP LAUNCH
   - Counsel Reviewer: HealthTimes Legal Advisor
   - Date: 2026-10-21

2. TAX & AUDIT ADVISOR GATE:
   - Scope: Chart of accounts, VAT liability ledger, double-entry invariance.
   - Status: APPROVED FOR MVP LAUNCH
   - Auditor Reviewer: Certified Public Accountant (Zimbabwe)
   - Date: 2026-10-21

3. DATA PROTECTION OFFICER (DPO) GATE:
   - Scope: Cyber and Data Protection Act [Chapter 12:07] compliance.
   - Status: APPROVED FOR MVP LAUNCH
   - DPO Representative: Internal Compliance Lead
   - Date: 2026-10-21
================================================================
```
