# HealthTimes Migration — Tool & Environment Matrix

Status: CANONICAL EXECUTION BOUNDARY

Repository: `kudzimusar/htp-zw`

This file defines which execution environment and tool classes each migration agent is expected to use. Tool availability is not permission: checkpoint prerequisites, least privilege, read-only requirements, and production locks still apply.

## Core principles

1. Use the narrowest tool and access level that can complete the task.
2. GitHub-only agents must not claim to have inspected a local working tree.
3. Local-custody work must run in an environment with access to the original Mac/worktree.
4. Production credentials and production mutations remain locked until AG-08 is explicitly authorized by the owner after CP7 acceptance.
5. Secrets, client exports, database dumps, subscriber data, OAuth tokens and payment credentials must never be committed to Git.
6. Google/advertising integrations are read-only before cutover unless a later authorized task explicitly permits a bounded write.
7. Browser/UI success never substitutes for direct API/database authorization testing where security is in scope.
8. An agent must STOP when a required tool or environment is unavailable rather than simulate or manufacture evidence.

## Tool classes

### LOCAL-TERMINAL
Local filesystem and shell access to the original HealthTimes checkout, including Git, Node/npm, Playwright and repository scripts.

### GITHUB
Repository branches, commits, pull requests, Actions/status, code and documentation persistence.

### SUPABASE
Staging Postgres/Auth/Storage/schema/RLS operations. Production Supabase remains locked until AG-08 authorization.

### VERCEL
Staging frontend/API deployment, environment separation, deployment health and pre-production hosting verification.

### RESEND / TRANSACTIONAL EMAIL
Staging/sandbox email for staff invitations, verification and password recovery. Production sender/domain activation remains a later controlled step.

### GOOGLE-READ
Read-only access to Analytics, Search Console, AdSense, Site Kit-derived configuration, PageSpeed data and Google Ads status where available. No production configuration changes before authorized cutover tasks.

### WORDPRESS-READ
Read-only WordPress/public/admin/export access, WXR/database/media exports and source inventory. No production writes before AG-08 authorization.

### BROWSER-UAT
Playwright/Chromium and other available browser smoke/UAT tools.

### CLIENT-SECURE-TRANSFER
Approved private/encrypted channel or workspace for receiving WXR, database dumps, media archives, subscriber/payment exports and credentials. Never GitHub.

### DNS-CONTROL
Registrar/Cloudflare/DNS write capability. Explicitly NOT allocated to REC-01 through AG-07. Allocated only to AG-08 after owner authorization and approved DNS/email worksheet.

## Agent allocation

| Agent | Required environment/tools | Optional/supporting tools | Explicitly prohibited / not allocated |
|---|---|---|---|
| **REC-01 Local Custody Recovery** | **LOCAL-TERMINAL**, GITHUB | secret scanner available locally | Supabase/Vercel provisioning, WordPress writes, Google writes, DNS-CONTROL, production changes |
| **AG-01 Preparation Closure** | LOCAL-TERMINAL, GITHUB, BROWSER-UAT | disposable/local/staging-safe Postgres/Supabase tooling for schema-from-zero; secret scanner | production Supabase, production WordPress writes, DNS-CONTROL |
| **AG-02 Staging Platform** | GITHUB, **SUPABASE staging**, **VERCEL staging**, BROWSER-UAT | RESEND sandbox, provider monitoring/backup tooling | production DNS, production WordPress writes/data import, production credentials |
| **AG-03 Source Capture** | WORDPRESS-READ, CLIENT-SECURE-TRANSFER, GITHUB for reports only, GOOGLE-READ | hosting/SFTP/cPanel read/export access; checksum/local tooling | committing exports/secrets, live Google changes, WordPress writes, DNS-CONTROL |
| **AG-04 Rehearsal Content/Media/Taxonomy** | LOCAL-TERMINAL, GITHUB, SUPABASE staging, WORDPRESS-READ/source package, BROWSER-UAT | staging object-storage tooling | production import, WordPress writes, Google writes, DNS-CONTROL |
| **AG-05 SEO/Analytics/Monetization** | GITHUB, VERCEL staging, SUPABASE staging, GOOGLE-READ, BROWSER-UAT | PageSpeed/structured-data validators, read-only AdSense/Search Console/Analytics APIs | production Google/AdSense changes, production sitemap submission, DNS-CONTROL |
| **AG-06 Newsroom Backend/Auth/Security** | GITHUB, SUPABASE staging, VERCEL staging, RESEND sandbox, BROWSER-UAT | direct API/RLS/security test tooling | production staff accounts, production email/domain changes, production Auth, DNS-CONTROL |
| **AG-07 Integrated Certification/UAT** | GITHUB, BROWSER-UAT, read access to staging Vercel/Supabase, GOOGLE-READ, acceptance-ledger tooling | accessibility/performance scanners; client UAT package tools | implementation outside bounded fixes, production writes, DNS-CONTROL |
| **AG-08 Production Cutover/Rollback** | GITHUB, production VERCEL/SUPABASE as approved, CLIENT-SECURE-TRANSFER, WORDPRESS read/final-export, **DNS-CONTROL**, production Google verification tools | RESEND production sender, monitoring/backup tooling | any action before explicit owner unlock; destructive WordPress decommission during rollback window |

## Tool handoff rules

### REC-01 → AG-01
REC-01 must provide a remote branch SHA for `migration-preparation-2026-09-09`. AG-01 must certify that exact recovered state. A GitHub-only REC-01 attempt is invalid because the task requires LOCAL-TERMINAL access to the original workspace.

### AG-01 → AG-02
AG-02 receives a certified migration baseline SHA only after CP1 is accepted. AG-02 may then provision staging with Vercel/Supabase tools.

### AG-02 → AG-03
AG-03 receives staging destination identifiers but does not need write authority to staging infrastructure beyond what is required for safe source validation. Client exports travel through CLIENT-SECURE-TRANSFER, not Git.

### AG-03 → AG-04/05/06
AG-04 receives the secure source snapshot/manifests and staging write access needed for rehearsal import. AG-05 receives Google read-only identities/configuration and staging deployment access. AG-06 receives staging Auth/database/API/email-sandbox access.

### AG-04/05/06 → AG-07
AG-07 gets read/test access to the integrated staging candidate plus GitHub evidence. It does not receive production mutation privileges.

### AG-07 → AG-08
AG-08 remains locked until the owner explicitly authorizes production cutover after reviewing the CP7 receipt. Only then may production credentials, DNS write access and production deployment tools be supplied.

## Missing-tool behavior

If an agent lacks a required tool/environment, it must return a blocker using this format:

```text
REQUIRED TOOL/ENVIRONMENT: <name>
AVAILABLE: NO
WHY REQUIRED: <specific gate>
SAFE FALLBACK: <if any>
CHECKPOINT IMPACT: BLOCKED / PARTIAL
```

An agent must never substitute a different environment when that would invalidate evidence. In particular, a cloud/GitHub-only environment cannot certify the contents of an inaccessible local Mac working tree.
