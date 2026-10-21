# HealthTimes 2.0 — Client Dry-Run Demonstration Script & Rehearsal Guide
## 30–45 Minute End-to-End Walkthrough of Reader, Newsroom OS, Commercial & Finance

- **Document ID:** `HT-MVP-CLIENT-DRY-RUN`
- **Release Candidate:** `release/ht-mvp-rc01-udpcs-launch-control`
- **Controlling Base SHA:** `d5af42d6b7018dfd3451ac9d621482e0edf9664f`
- **Governing Standard:** 11-11 Tech UDPCS 1.0 Sections 17–21, 61, 67
- **Target Delivery Date:** 24 October 2026

---

## 1. Demonstration Overview & Protocol

### 1.1 Objective
Demonstrate to the HealthTimes client and executive stakeholders that HealthTimes 2.0 is a complete, institutional-grade, multi-surface media operating system. The demonstration moves seamlessly from the public **Reader Experience** to the staff **Newsroom OS**, through **Commercial Operations**, **Audience Distribution**, and the **Financial General Ledger**, proving full operational readiness across all 5 UDPCS planes.

### 1.2 Target Timetable (Total: 40 Minutes)
- **Phase 0 (0:00–0:05):** Executive Context, Architecture & Security Assurance (5 min)
- **Phase 1 (0:05–0:15):** The Reader Journey — Mobile-First Healthcare Media (10 min)
- **Phase 2 (0:15–0:25):** The Editorial Journey — From Journalist Pitch to Published Lead (10 min)
- **Phase 3 (0:25–0:35):** The Business Journey — Ad Operations, Multi-Channel & General Ledger (10 min)
- **Phase 4 (0:35–0:40):** Role-Based Security Demonstration & Executive Sign-Off (5 min)

### 1.3 Technical Environment & Prerequisites
- **Reader Surface:** Web / Mobile viewport running on Expo web preview (`http://localhost:8099`) or physical device.
- **Newsroom Surface:** Staff shell running on `/studio` route with staff authentication.
- **Backend Database:** Supabase staging project `gcdohgbmqhqwydgaxrcr` (Migration 96 tip).
- **Network Mode:** Live connection with simulated offline transition during Phase 1.

---

## 2. Minute-by-Minute Demonstration Script

---

### Phase 0: Executive Context & Platform Architecture (00:00 – 05:00)

**Presenter Script:**
> *"Welcome, ladies and gentlemen. Today we are presenting HealthTimes 2.0 — not just as a news website or mobile app, but as a complete digital publishing operating system built according to the 11-11 Tech Universal Digital Platform Capability Standard (UDPCS 1.0).*
>
> *HealthTimes operates across five coordinated planes:*
> 1. **Experience Plane:** *A high-performance Reader delivering essential health intelligence, offline access, and audio journalism to the public and healthcare workers.*
> 2. **Control Plane:** *A 7-desk professional Newsroom OS orchestrating reporting, editing, commercial sponsorships, audience dispatch, and financial accounting.*
> 3. **Platform Plane:** *A rock-solid backend on Supabase PostgreSQL 17 with strict Row-Level Security, real-time messaging, and immutable audit logging.*
> 4. **Operations Plane:** *Standardized runbooks, monitoring, and automated disaster recovery.*
> 5. **Governance Plane:** *Full privacy compliance, data protection, and a mathematically enforced double-entry general ledger.*
>
> *Let us begin by stepping into the shoes of a healthcare professional in Harare opening the HealthTimes Reader."*

---

### Phase 1: The Reader Journey (05:00 – 15:00)

#### Step 1.1: Native Feed & Curated Hero (05:00 – 07:00)
- **Action:** Open Reader app on mobile viewport. Display the Home feed.
- **Talking Points:**
  - *"Notice the immediate load time. Even over constrained 2G/3G connections, the feed renders instantly because metadata and typography are optimized."*
  - *"The Top Story is dynamically curated by the Editorial Desk. Below it, readers can toggle between the curated feed and the algorithmic latest-news stream."*
  - Point out responsive images, category tags (e.g., 'Epidemiology', 'Public Health', 'Maternal Care'), and estimated reading times.

#### Step 1.2: Contextual Topic & Author Discovery (07:00 – 09:00)
- **Action:** Tap the 'Epidemiology' category pill, then tap an Author byline (e.g., 'Senior Health Correspondent').
- **Talking Points:**
  - *"Readers do not browse blindly; they follow specialized health topics and trusted journalists."*
  - *"Our context discovery engine resolves all related articles, author bios, and subtopics through a single secure HTTPS API endpoint, shielding the database while delivering lightning-fast navigation."*

#### Step 1.3: Audio Journalism & Listen Experience (09:00 – 12:00)
- **Action:** Tap the 'Listen' tab on the bottom navigation bar. Tap 'Play' on the daily Health Digest podcast.
- **Talking Points:**
  - *"For busy doctors, nurses, and commuters, HealthTimes provides integrated audio journalism."*
  - *"The custom audio player supports scrub forward/backward, speed control (1.0x, 1.25x, 1.5x), and seamless background audio playback."*
  - Show dark mode toggle: *"With one tap, the entire UI shifts to low-light dark mode, reducing eye fatigue during night hospital shifts."*

#### Step 1.4: Offline Caching & Rural Clinic Resilience (12:00 – 15:00)
- **Action:** Tap 'Bookmark' on two investigative articles. Open Chrome DevTools, check 'Offline' in Network panel, and refresh the screen.
- **Talking Points:**
  - *"In rural clinics across Zimbabwe, cellular coverage is frequently intermittent. Watch what happens when we disconnect completely from the internet."*
  - *"The app detects offline status immediately, displaying an offline indicator. The reader's bookmarked articles remain 100% readable with full text and cached graphics from local encrypted storage."*
  - Uncheck 'Offline' to demonstrate seamless background reconnection.

---

### Phase 2: The Editorial Journey (15:00 – 25:00)

**Presenter Script:**
> *"Now let us step behind the curtain into the HealthTimes Newsroom OS. In legacy media organizations, reporting, editing, advertising, and finance are fragmented across WhatsApp groups, spreadsheets, and third-party tools. HealthTimes unifies them into a single 7-desk control room."*

#### Step 2.1: Staff Authentication & First-Owner Bootstrap (15:00 – 17:00)
- **Action:** Navigate to the `/studio` URL. Display the Staff Authentication modal.
- **Talking Points:**
  - *"Security is fundamental. There are no backdoor admin passwords. Staff log in via cryptographic magic links verified against Supabase Auth."*
  - *"Our database enforces that only confirmed, verified email addresses can activate the Publisher persona. An unconfirmed account or unauthorized email is rejected at the engine level."*
  - Authenticate as Publisher (`kudzimusar@gmail.com`). Show the active staff status badge.

#### Step 2.2: Journalist Story Filing & Rich Drafting (17:00 – 20:00)
- **Action:** Select 'Editorial Desk' in the sidebar. Click 'New Story'.
- **Talking Points:**
  - *"Here is the Journalist's workbench. A reporter drafts an urgent dispatch: 'National Cholera Vaccination Campaign Exceeds Target in Manicaland'.*
  - Enter Headline, Subtitle, Category ('Public Health'), and article body.
  - Show character and word counter, auto-save status indicator, and attachment uploader.
  - *"Notice the reporter cannot publish directly to the live site. They can only save draft or submit for review. Let us submit this story to the editorial queue."*
  - Click 'Submit to Review Queue'.

#### Step 2.3: Peer Review & Managing Editor Approval (20:00 – 22:30)
- **Action:** Switch to 'Review Queue Desk'.
- **Talking Points:**
  - *"The Desk Editor sees the story arrive in real time. The editor opens the diff view, verifies facts, checks medical sources, and leaves editorial notes."*
  - *"As Managing Editor, I review the copy, verify the headline follows ethics guidelines, and click 'Approve & Publish'."*
  - Click 'Publish Story'. Show instant confirmation toast.

#### Step 2.4: Homepage Curation & Reader Live Reflection (22:30 – 25:00)
- **Action:** Switch to 'Homepage Curation Desk', pin the newly published story to the 'Hero Lead' position. Switch back to the Reader tab and pull to refresh.
- **Talking Points:**
  - *"Within five seconds of approval, the editorial team pins the story as the Hero Lead."*
  - Switch to Reader: *"And here it is live on the public Reader app — headline, lead paragraph, and hero image, live across thousands of reader devices instantly."*

---

### Phase 3: The Business Journey (25:00 – 35:00)

**Presenter Script:**
> *"Journalism cannot survive without a sustainable business model. HealthTimes 2.0 embeds commercial sponsorship, multi-channel distribution, and double-entry accounting directly into the staff workflow."*

#### Step 3.1: Commercial Desk & Ad Campaign Management (25:00 – 28:00)
- **Action:** Select 'Commercial Desk' in sidebar. Display active Campaigns table. Click 'Create Campaign'.
- **Talking Points:**
  - *"HealthTimes supports direct sponsorship from pharmaceutical companies, healthcare NGOs, and insurance providers."*
  - Enter Campaign Name: 'Cimas Wellness Month Sponsorship', select Flight Dates (Oct 24 – Nov 24), Budget ($3,500), and Placement Zone ('In-Article Leaderboard').
  - Upload banner creative and set destination URL.
  - *"The campaign is scheduled. Impression and click telemetry are tracked natively without relying on privacy-invasive third-party trackers."*

#### Step 3.2: Multi-Channel Audience Distribution (28:00 – 31:00)
- **Action:** Select 'Audience Desk'. Select the 'WhatsApp Broadcast' tab.
- **Talking Points:**
  - *"In Zimbabwe, WhatsApp is the primary internet gateway for millions of citizens. HealthTimes allows the audience team to push breaking health bulletins directly to verified WhatsApp subscriber channels."*
  - Select the Cholera vaccination story: *"The system auto-formats the WhatsApp payload with markdown formatting, emojis, and deep links."*
  - Show character count and message preview on simulated mobile screen.
  - Click 'Queue Broadcast': *"The broadcast is staged in our Supabase delivery queue, ready for the production Meta API dispatcher."*

#### Step 3.3: Double-Entry General Ledger & Financial Integrity (31:00 – 35:00)
- **Action:** Select 'Finance & Accounting Desk'. Display Chart of Accounts and Balance Sheet. Click 'New Journal Entry'.
- **Talking Points:**
  - *"This is one of the most powerful innovations in HealthTimes 2.0. Rather than using disconnected accounting software, HealthTimes includes a certified double-entry General Ledger (GL) built directly into PostgreSQL."*
  - *"Let us record the revenue from the $3,500 Cimas sponsorship campaign:"*
    - Line 1: `Account 1010 - Cash & Bank`: **Debit $3,500**
    - Line 2: `Account 4010 - Direct Advertising Revenue`: **Credit $3,500**
  - Show that if debits do not match credits, the 'Post Entry' button is disabled.
  - Click 'Post Journal Entry'.
  - Open the **Balance Sheet** and **Income Statement**: *"Notice that Assets increase by $3,500, Revenue reflects $3,500, and our net Trial Balance remains exactly zero. The database trigger guarantees mathematical invariance."*

---

### Phase 4: Role-Based Access Control & Executive Sign-Off (35:00 – 40:00)

#### Step 4.1: RBAC Security Demonstration (35:00 – 38:00)
- **Action:** Click 'Switch Persona' in the staff header. Switch from 'Publisher' to 'Staff Journalist'.
- **Talking Points:**
  - *"Watch what happens to the Newsroom interface when I switch to the Journalist persona."*
  - Point out that the 'Commercial Desk', 'Finance Desk', and 'Publishing Approval' controls vanish or become read-only.
  - Try to open `/studio#finance`: Show access denied banner: *"Unauthorized: Requires Finance Officer or Publisher role."*
  - Switch back to 'Publisher' to restore executive visibility.

#### Step 4.2: Client Handoff Summary & Q&A (38:00 – 40:00)
- **Action:** Display the `docs/delivery/HT-MVP-DELIVERY-CONTROL-CENTER.md` dashboard.
- **Closing Script:**
  - *"To summarize what we have demonstrated today:*
    - *A fully functional, low-data, offline-resilient Reader for healthcare professionals.*
    - *A 7-desk professional Newsroom OS covering the complete editorial lifecycle.*
    - *A built-in commercial sponsorship and ad serving platform.*
    - *Multi-channel distribution covering WhatsApp, email, and mobile push.*
    - *An institutional double-entry General Ledger ensuring financial transparency.*
    - *A verified, zero-vulnerability security model protecting staff and reader privacy.*
  - *We are proud to present HealthTimes 2.0 as fully certified and ready for client delivery."*

---

## 3. Fallback Contingency Procedures During Live Demonstration

| Potential Glitch | Fallback Action & Presenter Transition |
| :--- | :--- |
| **Wi-Fi / Internet Drop** | Switch immediately to offline reading demonstration; explain: *"This is the exact offline resilience healthcare workers rely on in low-connectivity areas."* |
| **Expo Web Server Hang** | Relaunch preview using command `./scripts/release/ht-mvp-preflight.mjs`; Expo restarts in < 5 seconds. |
| **Supabase Remote Latency** | Point out the client-side optimistic UI feedback while background promise resolves. |
| **Client Asks for Non-MVP Feature** | Refer immediately to the `HT-MVP-V1.1-DEFERRED-REGISTER.md`; state clearly: *"That capability is formally scheduled for V1.1 delivery on our roadmap."* |
