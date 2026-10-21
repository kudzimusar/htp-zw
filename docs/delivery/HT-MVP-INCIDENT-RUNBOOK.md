# HealthTimes 2.0 — Incident Management Runbook
## SEV-1/2/3 Classification, Containment Protocols, Escalation & Post-Mortem Standards

- **Document ID:** `HT-MVP-INCIDENT-RUNBOOK`
- **Release Candidate:** `release/ht-mvp-rc01-udpcs-launch-control`
- **Controlling Base SHA:** `d5af42d6b7018dfd3451ac9d621482e0edf9664f`
- **Governing Standard:** 11-11 Tech UDPCS 1.0 Section 30
- **Target Delivery Date:** 24 October 2026

---

## 1. Incident Severity Classification Matrix

| Severity Tier | Definition & Criteria | Target RTO (Recovery Time) | Target RPO (Data Loss) | Incident Commander | Notification SLA |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **SEV-1 (Critical)** | Complete platform outage; Supabase database unreachable; authentication bypass or privilege escalation; financial ledger data corruption; active cyber security intrusion. | **< 60 Minutes** | **< 15 Minutes** | Lead Architect / Tech Lead | Immediate (< 15 min) to Executive Owner & Client |
| **SEV-2 (Major)** | Core editorial publishing pipeline blocked; audience distribution service failing; media upload storage bucket offline; commercial ad serving degraded. | **< 4 Hours** | **0 Minutes** | Managing Editor / Senior Eng | < 30 Minutes to Newsroom Staff |
| **SEV-3 (Minor)** | Non-blocking UI cosmetic glitch; minor telemetry delay; localized styling issue on single mobile device model; non-critical admin filter bug. | **< 24 Hours** | **N/A** | Duty Engineer | Logged in backlog within 2 hours |

---

## 2. Emergency Incident Response Team (ERT)

During an active SEV-1 or SEV-2 incident, the following roles are immediately activated:

- **Incident Commander (IC):** Directs technical investigation, makes containment decisions, and authorizes rollbacks.
- **Operations / Database Lead:** Executes database diagnostics, connection pool recycling, and point-in-time recovery.
- **Communications Lead:** Manages internal staff notifications and drafts public reader status announcements.
- **Executive Liaison:** Informs the Executive Publisher (`kudzimusar@gmail.com`) and client leadership.

---

## 3. SEV-1 Containment & Recovery Workflows

### Scenario 1: Authentication Failure or Privilege Compromise
1. **Immediate Containment:**
   - Execute emergency revocation of active JWT sessions via Supabase Auth Admin API.
   - If unauthorized escalation is suspected, run SQL query to verify `newsroom_staff` table:
     ```sql
     SELECT id, user_id, email, role, is_active FROM public.newsroom_staff WHERE is_active = true;
     ```
   - Lock down any suspicious accounts by setting `is_active = false`.
2. **Investigation & Remediation:**
   - Inspect `newsroom_audit_log` for the exact identity, IP, and timestamp of the unauthorized action.
   - Re-verify Migration 96 preconditions: ensure no caller without verified `email_confirmed_at` has Publisher role.
3. **Restoration:**
   - Restore valid staff sessions; notify staff to re-authenticate via fresh magic link.

### Scenario 2: Supabase Staging Database Unreachable
1. **Immediate Containment:**
   - Check Supabase Platform Status (`status.supabase.com`).
   - Test connectivity from CLI:
     ```bash
     curl -s -o /dev/null -w "%{http_code}" https://gcdohgbmqhqwydgaxrcr.supabase.co/rest/v1/
     ```
   - Verify connection pool limits (pgBouncer / Supabase Pooler) have not been exhausted by excessive connections.
2. **Reader Experience During Outage:**
   - The Reader automatically serves cached articles from local AsyncStorage with an offline banner.
   - Readers continue reading existing content without white-screen crash.
3. **Restoration:**
   - If connection pool is locked, restart Supabase project services from dashboard.
   - Verify migration state: ensure all 96 migrations remain cleanly applied.

### Scenario 3: General Ledger Data Invariance Breach
1. **Immediate Containment:**
   - If an unbalanced transaction is suspected:
     ```sql
     SELECT entry_id, sum(debit) as total_debit, sum(credit) as total_credit
     FROM public.gl_journal_lines
     GROUP BY entry_id
     HAVING sum(debit) != sum(credit);
     ```
   - (Note: Database trigger `trg_enforce_gl_journal_entry_balance` mathematically blocks this condition at engine level).
2. **Investigation:**
   - If application UI shows unexpected balances, inspect `gl_fiscal_periods` and unposted drafts.
3. **Restoration:**
   - Correct accounting errors exclusively via offsetting adjusting journal entries (standard GAAP procedure).

---

## 4. Emergency Communications Protocol

### 4.1 Internal Staff Channel
- All active incident updates are communicated via the designated HealthTimes Operations WhatsApp group and `#ops-emergency` Slack channel.
- Status updates must be posted every **30 minutes** during SEV-1 events.

### 4.2 Reader & Public Facing Status
- If the Reader feed is disrupted for more than 15 minutes, a public status banner is triggered:
  > *"HealthTimes is currently experiencing a technical update. Our editorial team is actively restoring full service. Offline articles remain readable."*

---

## 5. Post-Incident Root Cause Analysis (RCA) Standard

Within **48 hours** of resolving any SEV-1 or SEV-2 incident, the Incident Commander must author a formal Root Cause Analysis document adhering to the following structure:

```markdown
# Incident Post-Mortem Report: [INC-YEAR-XXXX]
- **Date & Time:** [YYYY-MM-DD HH:MM CAT]
- **Severity Tier:** SEV-1 / SEV-2
- **Duration of Outage:** [XX Minutes]
- **Incident Commander:** [Name]

## 1. Executive Summary
Brief high-level summary of what occurred, user impact, and resolution.

## 2. Timeline of Events (All times CAT)
- HH:MM - First detection / alert triggered.
- HH:MM - ERT mobilized; Incident Commander assigned.
- HH:MM - Root cause identified.
- HH:MM - Containment action applied.
- HH:MM - Service fully restored and verified.

## 3. Root Cause Analysis (The 5 Whys)
Detailed technical explanation of the fundamental defect or system failure.

## 4. Corrective & Preventative Action Items
| Action Item | Owner | Target Completion | Verification Method |
| :--- | :--- | :--- | :--- |
| e.g. Add database index | DBA | 2026-10-25 | Query plan test |
```
