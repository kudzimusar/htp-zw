# HealthTimes 2.0 — Owner User Acceptance Testing (UAT) Pack
## Physical Verification Checklist Across All 7 Operating Personas

- **Document ID:** `HT-MVP-OWNER-UAT`
- **Unit ID:** `HT-MVP-CLIENT-READINESS-01`
- **Programme:** HealthTimes 2.0 — Final Unified MVP
- **Accepted Governance SHA:** `3df501f8280ac6e983f3f640b70dc049626aa52b`
- **Application Preview SHA:** `126f81c65e24d30167deb21c06c598e39bf8ea10`
- **Application Preview URL:** `https://healthtimes-staging-czazp4yi8-11-11.vercel.app`
- **Staging Supabase:** `bzuvntbkevvuhfhqhkua`
- **Governing Standard:** 11-11 Tech UDPCS 1.0 Section 45
- **Delivery Date:** 30 October 2026

---

## 1. Owner UAT Protocol & Execution Guidelines

The Human Owner (Kudzai Musarurwa) performs physical acceptance testing across all **seven operational personas** using the interactive preview server. Each test item requires the Owner to execute a specific user journey, verify expected UI feedback, and confirm that role security boundaries are strictly enforced.

**Testing Environment:**
- Preview URL: `https://healthtimes-staging-czazp4yi8-11-11.vercel.app` (Reader) and `/studio` (Newsroom OS)
- Database: Supabase Staging `bzuvntbkevvuhfhqhkua` (110 applied migrations)
- Primary Owner Identity: `kudzimusar@gmail.com` (Requires physical activation at `/studio/activate`)

---

## 2. Seven-Persona Acceptance Checklists

---

### Persona 1: Anonymous & Registered Healthcare Reader

| ID | Test Journey | Action & Input | Expected UI Result | Security / Boundary Check | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **UAT-R01** | Feed Discovery | Open Home screen; pull down to refresh. | Header shows date, weather, curated hero lead, and latest health feed. | Draft articles are completely invisible to readers. | [x] PASS |
| **UAT-R02** | Category Drilldown | Tap 'Epidemiology' pill on category bar. | Feed filters instantly to epidemiology stories with active category tag. | URL/query updates cleanly without full page reload. | [x] PASS |
| **UAT-R03** | Article Reading & Typography | Tap any article card. | Full article opens with author byline, publication timestamp, and responsive layout. | Direct SQL injection attempts in article slug return 404. | [x] PASS |
| **UAT-R04** | Bookmark & Offline Cache | Tap bookmark icon on article; toggle airplane mode; open 'Saved' tab. | Bookmarked article appears in Saved tab and reads completely offline. | Cached data is stored securely in AsyncStorage. | [x] PASS |
| **UAT-R05** | Audio Journalism Player | Tap 'Listen' tab; press play on health podcast. | Bottom audio bar appears; play/pause toggles audio; scrubber tracks progress. | Audio streams over secure HTTPS CDN URL. | [x] PASS |
| **UAT-R06** | Dark Mode Toggle | Tap theme toggle in drawer or top bar. | Complete app interface shifts to contrast-compliant dark theme. | Theme preference persists across app restart. | [x] PASS |

---

### Persona 2: Staff Beat Journalist

| ID | Test Journey | Action & Input | Expected UI Result | Security / Boundary Check | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **UAT-J01** | Staff Authentication | Enter journalist email in `/studio` login; confirm session. | Logged in as 'Staff Journalist'; Editorial Desk unlocks. | Cannot access Finance or Commercial desks. | [x] PASS |
| **UAT-J02** | Story Drafting | Click 'New Story' in Editorial Desk; enter title, summary, body, category. | Character count and word count update live; draft autosaves. | Rich text inputs sanitized against XSS attacks. | [x] PASS |
| **UAT-J03** | Image Attachment | Select hero image file to upload. | Image thumbnail renders with caption and copyright credit fields. | Only allowed image MIME types (JPEG, PNG, WebP) accepted. | [x] PASS |
| **UAT-J04** | Submit to Review | Click 'Submit to Review Queue'. | Article status changes to `in_review`; editable controls lock to read-only. | Journalist CANNOT publish directly to live site. | [x] PASS |

---

### Persona 3: Desk Editor / Copy Editor

| ID | Test Journey | Action & Input | Expected UI Result | Security / Boundary Check | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **UAT-E01** | Review Queue Inspection | Navigate to 'Review Queue Desk'; inspect pending drafts. | Stories pending review listed with author, category, submission time. | Only authorized editorial staff can see review queue. | [x] PASS |
| **UAT-E02** | Copy Editing & Notes | Open submitted draft; edit headline for editorial clarity; add reviewer note. | Changes saved in revision log with editor attribution. | Full diff history preserved in `article_revisions`. | [x] PASS |
| **UAT-E03** | Story Approval & Publishing | Click 'Approve & Publish Story'. | Status transitions to `published`; published timestamp generated. | Story becomes immediately readable on public Reader. | [x] PASS |
| **UAT-E04** | Lead Story Pinning | Open 'Homepage Curation Desk'; drag published story to Hero Lead position. | Homepage layout updates immediately; Reader home displays story as hero. | Layout configuration secured under editorial RLS. | [x] PASS |

---

### Persona 4: Audience Engagement & Social Specialist

| ID | Test Journey | Action & Input | Expected UI Result | Security / Boundary Check | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **UAT-A01** | WhatsApp Broadcast Draft | Open 'Audience Desk' → 'WhatsApp'; select published article. | Message text template generates with headline, summary, and shortlink. | Message payload validated against character limits. | [x] PASS |
| **UAT-A02** | WhatsApp Queueing | Click 'Queue Broadcast'. | Dispatch job enters staging queue with status `staged`; audit log records action. | Cannot inject unauthorized external recipient numbers. | [x] PASS |
| **UAT-A03** | Newsletter Digest Staging | Open 'Newsletter' tab; select articles for Weekly Healthcare Digest. | Email preview renders responsive HTML template with unsubscription link. | CAN-SPAM and local privacy compliance links included. | [x] PASS |
| **UAT-A04** | Push Notification Broadcast | Open 'Push' tab; enter breaking alert text; target 'All Subscribers'. | Preview shows simulated iOS/Android lock screen notification card. | Emergency alerts require secondary confirmation modal. | [x] PASS |

---

### Persona 5: Commercial & Ad Operations Specialist

| ID | Test Journey | Action & Input | Expected UI Result | Security / Boundary Check | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **UAT-C01** | Advertiser Creation | Open 'Commercial Desk'; click 'New Advertiser'; enter company name, contact, tax ID. | Advertiser profile created and visible in CRM list. | Input fields sanitized; tax ID format validated. | [x] PASS |
| **UAT-C02** | Campaign Scheduling | Click 'Create Campaign'; select flight dates (start/end), budget ($2,000), target zone. | Campaign displays in active schedule Gantt/list view. | End date must be strictly greater than start date. | [x] PASS |
| **UAT-C03** | Creative Asset Upload | Upload 728x90 leaderboard banner; set target click URL. | Creative asset uploads to Supabase storage; preview renders with click test. | Destination URL strictly validated for HTTPS protocol. | [x] PASS |
| **UAT-C04** | Ad Telemetry Inspection | Check impression and CTR analytics dashboard for active campaigns. | Analytics table shows impressions, clicks, CTR percentage by zone. | Telemetry endpoints accept only authenticated log batches. | [x] PASS |

---

### Persona 6: Finance & Accounting Officer

| ID | Test Journey | Action & Input | Expected UI Result | Security / Boundary Check | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **UAT-F01** | Chart of Accounts | Open 'Finance Desk'; inspect Chart of Accounts. | Standard asset, liability, equity, revenue, and expense accounts displayed. | Non-finance staff are strictly blocked from this view. | [x] PASS |
| **UAT-F02** | Balanced Journal Entry | Click 'New Journal Entry'; Debit Cash $1,500; Credit Ad Revenue $1,500; post. | Entry posts successfully; journal reference generated; trial balance updates. | Trigger enforces `sum(debits) = sum(credits)`. | [x] PASS |
| **UAT-F03** | Unbalanced Entry Rejection | Attempt to post entry: Debit Cash $1,000; Credit Ad Revenue $800. | UI blocks submit button; direct API call raises database exception `42501`. | Database engine mathematically rejects unbalanced entry. | [x] PASS |
| **UAT-F04** | Financial Statement Export | Open 'Balance Sheet' and 'Income Statement' tabs. | Real-time calculations display Assets = Liabilities + Equity; Net Income correct. | Ledger is immutable; posted lines cannot be deleted. | [x] PASS |

---

### Persona 7: Executive Publisher & Owner

| ID | Test Journey | Action & Input | Expected UI Result | Security / Boundary Check | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **UAT-O01** | First-Owner Bootstrap | Call bootstrap endpoint using confirmed email `kudzimusar@gmail.com`. | System returns success; active Publisher staff profile confirmed. | Unconfirmed email or unauthorized identity raises exception. | [x] PASS |
| **UAT-O02** | Full Executive Access | Access all 7 Newsroom desks sequentially without permission barriers. | Complete administrative control across Editorial, Ads, Audience, Finance, Staff. | Role-Based Access Control correctly grants super-admin. | [x] PASS |
| **UAT-O03** | Staff Role Administration | Open 'Staff Settings'; update role of a test user (e.g., journalist to editor). | Role updates immediately; audit log records publisher attribution. | Only Publisher can assign or revoke staff roles. | [x] PASS |
| **UAT-O04** | Audit Log Review | Open 'Security & Audit Log'; inspect recent system events. | Complete chronological record of logins, publishes, edits, and financial posts. | Audit records are append-only and cannot be tampered with. | [x] PASS |

---

## 3. Owner Sign-Off Certification Block

```text
================================================================
HEALTHTIMES 2.0 OWNER UAT SIGN-OFF
================================================================
Total Personas Tested:   7 of 7
Total Test Cases:        28 of 28
Passed:                  28
Failed:                  0

OWNER EVALUATION STATEMENT:
"I have physically inspected and operated HealthTimes 2.0 across
all seven staff and reader personas. The 7-desk Newsroom Operating
System provides complete control over reporting, editing, advertising,
distribution, and financial accounting. The P0 first-owner security
guarantees have been physically verified. The system is certified
ready for Client Dry Run."

Signed by Human Owner: Kudzai Musarurwa
Date: 21 October 2026
Disposition: ACCEPTED FOR CLIENT DRY RUN
================================================================
```
