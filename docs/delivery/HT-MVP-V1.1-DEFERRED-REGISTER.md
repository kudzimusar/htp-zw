# HealthTimes 2.0 — V1.1 Deferred Capabilities Register
## Formal Record of Post-MVP Features, Architectural Decisions & Operational Workarounds

- **Document ID:** `HT-MVP-V1.1-DEFERRED-REGISTER`
- **Release Candidate:** `release/ht-mvp-rc02-final-unified-candidate`
- **Controlling Base SHA:** `d5af42d6b7018dfd3451ac9d621482e0edf9664f`
- **Governing Standard:** 11-11 Tech UDPCS 1.0 Sections 49, 35, 36, 52, 53
- **Target Delivery Date:** 24 October 2026

---

## 1. Deferral Methodology & Governance

Under UDPCS 1.0 Section 49, deferring a capability to a subsequent release is a legitimate, governed engineering decision. Rather than rushing incomplete or unstable features into an MVP release, non-essential capabilities are formally documented with:
1. Clear technical and commercial rationale for deferral.
2. Verified manual or operational workaround active in MVP.
3. Target release milestone in the product roadmap.

---

## 2. Deferred Capabilities Inventory

### 2.1 Public API Gateway & Third-Party Developer Portal (Platform Plane - D23)
- **Deferred Item:** Public OAuth2 / API Key developer portal allowing external healthcare organizations, NGOs, and medical researchers to query the HealthTimes article archive programmatically.
- **Rationale for Deferral:** Primary MVP audience is human readers and staff. Exposing a public API introduces external rate-limiting, documentation, and API key management overhead that is not required for the 24 October client launch.
- **MVP Operational Workaround:** Reader surfaces consume the internal context RPC (`get_reader_context_discovery_v1`); custom editorial data requests are handled via manual database query export by the technical lead.
- **Target Delivery Milestone:** **V1.1 (Q1 2027)**

---

### 2.2 Model Context Protocol (MCP) & Autonomous AI Editorial Copilot (Platform Plane - D25)
- **Deferred Item:** Autonomous AI agent integration for automated medical fact-checking, automated headline generation, and Model Context Protocol (MCP) tool server integration for external LLMs.
- **Rationale for Deferral:** In healthcare and clinical journalism, editorial accuracy and liability are paramount. The client requires human journalist accountability and human editor sign-off for all published material.
- **MVP Operational Workaround:** Staff journalists draft articles directly; human desk editors perform peer review and fact verification in the Review Queue Desk.
- **Target Delivery Milestone:** **V1.2 (Q2 2027)**

---

### 2.3 Automated Online Payment & Self-Service Advertiser Portal (Control Plane - D13)
- **Deferred Item:** Self-service advertiser self-registration portal with credit card / Paynow online checkout.
- **Rationale for Deferral:** Zimbabwean advertising markets operate overwhelmingly on corporate credit accounts, formal purchase orders, and direct bank transfers rather than credit card micro-transactions.
- **MVP Operational Workaround:** Commercial Ad Ops Specialist creates advertiser accounts and schedules campaigns directly in the Newsroom Commercial Desk. Invoices are settled via bank transfer, and payments are posted directly into the General Ledger.
- **Target Delivery Milestone:** **V1.1 (Q1 2027)**

---

### 2.4 Real-Time Multi-Cursor Collaborative Article Editing (Control Plane - D09)
- **Deferred Item:** Real-time simultaneous multi-user cursor editing (similar to Google Docs or Figma) within the Editorial Draft Desk.
- **Rationale for Deferral:** Health journalism workflows follow a sequential baton-passing model (Reporter drafts → Submits → Editor reviews → Publishes) rather than simultaneous co-authoring. Implementing Operational Transformation (OT) or CRDTs would add substantial complexity without matching editorial practice.
- **MVP Operational Workaround:** The Editorial Desk utilizes optimistic locking, revision history logging, and clear review queue status transitions.
- **Target Delivery Milestone:** **V2.0 (H2 2027)**

---

### 2.5 Offline Audio Background Download Queue (Experience Plane - D04)
- **Deferred Item:** Background background daemon allowing users to download 10+ hours of podcast episodes automatically while connected to Wi-Fi for offline listening.
- **Rationale for Deferral:** Native background download services require complex native device permission management across diverse Android device manufacturers (battery optimization killers).
- **MVP Operational Workaround:** Podcasts and audio briefings stream smoothly over HTTPS with client-side buffer caching; article text and images are 100% offline-cached.
- **Target Delivery Milestone:** **V1.1 (Q1 2027)**

---

### 2.6 Corporate Human Resources & Automated Payroll (Control Plane / Governance - D33)
- **Deferred Item:** Internal HR leave management, staff performance reviews, and automated payroll tax deduction processing.
- **Rationale for Deferral:** HealthTimes currently operates with a focused editorial team of under 20 staff and freelance contributors. Dedicated HR software is unnecessary overhead for an MVP newsroom operating system.
- **MVP Operational Workaround:** Staff accounts and roles are administered in the Newsroom Staff Settings Desk; contributor payments are tracked as contractor expenses in the General Ledger.
- **Target Delivery Milestone:** **External System Integration (V1.2)**

---

### 2.7 Automated Electronic ZIMRA Tax Return Filing (Governance Plane - D34)
- **Deferred Item:** Direct API integration with the Zimbabwe Revenue Authority (ZIMRA) for automated XML tax return transmission.
- **Rationale for Deferral:** ZIMRA electronic filing APIs require complex physical fiscalisation device cryptographic integration.
- **MVP Operational Workaround:** The Finance Desk exports complete Balance Sheet, Income Statement, and VAT Payable ledger reports for the company accountant to submit via the ZIMRA e-tax portal.
- **Target Delivery Milestone:** **V1.1 (Q1 2027)**

---

## 3. Post-MVP Delivery Roadmap Summary

```text
================================================================
HEALTHTIMES 2.0 ROADMAP BEYOND MVP
================================================================
Release V1.0 (MVP) - 24 October 2026:
  - 12-Screen Reader + 7-Desk Newsroom OS + Double-Entry GL
  - Full Offline Text/Image Cache + Audio Streaming
  - Direct Ad Operations + WhatsApp Staging Queue
  - Migration 96 First-Owner Verified Authentication

Release V1.1 - Q1 2027:
  - Paynow / EcoCash Online Checkout
  - Offline Audio Background Download Queue
  - Public Developer Read-Only REST API
  - Automated ZIMRA Tax Ledger Export

Release V1.2 - Q2 2027:
  - AI Copy-Editing & Fact-Checking Assistant
  - Two-Way Interactive WhatsApp Health Inquiries
  - Advanced Multi-Currency Automated Exchange Rate Feed
================================================================
```
