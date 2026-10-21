# HealthTimes Newsroom OS — Role-Based Operating System

**Document Reference:** `HT-NR-UI-01-ROLE-OPERATING-SYSTEM`  
**Programme:** HealthTimes Newsroom OS (HT-NR)  
**Status:** Certified Implementation Architecture  
**Release Target:** Wave UI-01 Pre-Launch Convergence  

---

## 1. Executive Summary

Prior to HT-NR-UI-01, the HealthTimes Newsroom interface presented 28 functional modules as a flat, unorganized collection of screens. An operator logging into the Newsroom could not immediately identify their operating persona, department ownership, access boundaries, or workflow handoffs.

HT-NR-UI-01 converges the entire Newsroom into an enterprise **Role-Based Newsroom Operating System** organized around **seven discrete operational domains** with a persistent staff identity header, server-enforced role boundary gates, and a dual-mode presentation architecture (Staging Runtime with strict AG-06 authorization and Owner Preview with interactive Persona Switching).

---

## 2. Seven Discrete Operational Domains

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             HEALTHTIMES NEWSROOM OS                              │
├─────────────────┬────────────────────────────────────────────────────────────────┤
│ DOMAIN          │ FUNCTION & MODULES INCLUDED                                    │
├─────────────────┼────────────────────────────────────────────────────────────────┤
│ 1. MY WORK      │ Personal workspace for assignments, story drafts, notifications│
│                 │ • My Assignments (/studio/assignments)                         │
│                 │ • Story Workspace / Create & Edit (/studio/create-edit)        │
│                 │ • My Inbox & Notices (/studio/inbox)                           │
│                 │ • My Expense Claims (/studio/my-expenses)                      │
├─────────────────┼────────────────────────────────────────────────────────────────┤
│ 2. EDITORIAL    │ Core newsroom journalism, editing, review, and multimedia      │
│                 │ • Review Queue & Fact-Checking (/studio/review-queue)          │
│                 │ • Story Hub (/studio/stories)                                  │
│                 │ • Planning Board & News Budget (/studio/planning)              │
│                 │ • Editorial Calendar (/studio/calendar)                        │
│                 │ • Live Desk (/studio/live-desk)                                │
│                 │ • Video Desk (/studio/video-desk)                              │
│                 │ • Media Library (/studio/media)                                │
│                 │ • Editorial Specialist Desks (/studio/desks)                   │
│                 │ • Breaking News Coordination (/studio/breaking)                │
│                 │ • Authors & Bylines Directory (/studio/authors)                │
│                 │ • AI Citations & Fact-Check Desk (/studio/ai-desk)             │
├─────────────────┼────────────────────────────────────────────────────────────────┤
│ 3. AUDIENCE &   │ Multi-channel audience distribution and growth campaigns       │
│    MARKETING    │ • Multi-Channel Campaigns (/studio/campaigns)                  │
│                 │ • Newsletter Desk (/studio/newsletters)                        │
│                 │ • Push Alerts Desk (/studio/push-alerts)                       │
│                 │ • WhatsApp Broadcast Desk (/studio/whatsapp)                   │
│                 │ • Social Media Desk (/studio/social)                           │
│                 │ • Audience Segmentation & Lists (/studio/audience)             │
├─────────────────┼────────────────────────────────────────────────────────────────┤
│ 4. COMMERCIAL   │ Revenue generation, advertising, sponsorship, and client CRM   │
│                 │ • Corporate Customers & CRM (/studio/customers)                │
│                 │ • Commercial Insertion Orders (/studio/orders)                 │
│                 │ • Advertising Campaigns (/studio/advertising)                  │
│                 │ • Ad Placements & Inventory (/studio/placements)               │
│                 │ • Ad Creatives & Asset Approval (/studio/creatives)            │
│                 │ • Rate Cards & Pricing Schedules (/studio/rates)               │
├─────────────────┼────────────────────────────────────────────────────────────────┤
│ 5. FINANCE &    │ Complete corporate financial operations and accounting         │
│    ACCOUNTING   │ • Invoices & Commercial Billing (/studio/finance-invoices)     │
│                 │ • Accounts Receivable (AR) Aging (/studio/finance-aging)       │
│                 │ • Payment Receipts Ledger (/studio/finance-payments)           │
│                 │ • Newsroom Expense Approvals & Payouts (/studio/finance-expenses)│
│                 │ • Financial Statements (/studio/finance-statements)            │
│                 │ • Corporate Billing Customers (/studio/finance-customers)      │
├─────────────────┼────────────────────────────────────────────────────────────────┤
│ 6. PUBLISHER /  │ Executive governance, homepage curation, and editorial policy  │
│    EXECUTIVE    │ • Executive Operations Dashboard (/studio/executive)           │
│                 │ • Homepage Curation & Placements (/studio/homepage)            │
│                 │ • Analytics & Intelligence Hub (/studio/analytics)             │
│                 │ • Staff Governance & Leadership (/studio/staff-roles)          │
│                 │ • Reader Comment Moderation (/studio/moderation)               │
├─────────────────┼────────────────────────────────────────────────────────────────┤
│ 7. ADMINISTRA-  │ Platform security, RBAC staff provisioning, and audit          │
│    TION         │ • Staff & Roles RBAC Directory (/studio/staff-roles)           │
│                 │ • Platform Settings (/studio/settings)                         │
│                 │ • Active Sessions & Security Audit (/studio/admin-sessions)    │
└─────────────────┴────────────────────────────────────────────────────────────────┘
```

---

## 3. Persistent Staff Identity Header

Every screen within the Newsroom Operating System renders a dedicated **Staff Identity Header** in the desktop sidebar and mobile navigation drawer:

1. **Avatar Circle:** Renders two-character initials derived from the authenticated staff member's display name or email (e.g. `KM` for Kudzi Musarurwa).
2. **Display Name & Handle:** Full authoritative staff name and optional handle (`@kudzi`) or assigned desk.
3. **Role Badge:** Distinctive colored badge displaying the server-assigned operational role (`OWNER`, `EDITOR`, `REPORTER`, `MARKETER`, `COMMERCIAL`, `FINANCE`, `ADMIN`).
4. **Session Status Dot:** 
   - Green (`#34A853`): Active server-verified AG-06 session.
   - Amber (`#FBBC04`): Staging unverified or guest session.
5. **Session ID & Sign Out:** Displays truncated session UUID and an explicit `Sign Out` button that safely terminates the session and redirects to the public Reader.

---

## 4. Separation of Environments & Authorization Gates

The Newsroom Operating System enforces an uncompromised boundary between runtime environments:

### 4.1 Staging Runtime (`/studio/*`)
- **Strict Server RBAC:** All routes are protected by `StudioAccessGate` and `StudioAuthorityGate`.
- **Zero Client Simulation:** Roles and capabilities are loaded strictly via `newsroom_current_context()` from the server JWT.
- **Fail-Closed Boundaries:** If a staff member attempts to open a domain or module outside their server-granted capabilities, the UI renders an informative lock card showing the required server capability and preventing any execution.

### 4.2 Owner Preview (`/owner-preview/studio/*`)
- **Safety Gate:** Accessible only when `EXPO_PUBLIC_HEALTHTIMES_OWNER_PREVIEW=1` and `NODE_ENV !== "production"`. Fails closed in production.
- **Persistent Watermarks:** Prominent yellow/black watermark banner explicitly marking the session as a preview.
- **Interactive Persona Switcher:** Allows the Owner to click between 7 staff personas to experience the Newsroom through the eyes of different team members and observe role boundaries live.
- **Local Isolation:** Never invokes write RPCs against Supabase; all mutations update local React state.

---

## 5. Architectural Non-Regressions

1. **Exact-Head Lineage:** Preserves all 21 commits of PR #106 (`d1b49126513fa288160db6e64c918b7a98ffbf16`).
2. **Reader Immutability:** Reader routes and shared presentation modules remain untouched.
3. **Database Security:** 100% of new financial and bootstrap RPCs run with `SECURITY DEFINER` and revoke direct table access from `anon`, `public`, and `authenticated`.
