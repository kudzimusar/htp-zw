# HealthTimes Zimbabwe — 2.0 Frontend & Newsroom

HealthTimes is an independent health news publication covering Zimbabwe, Africa and global health developments. This repository contains the HealthTimes 2.0 client-facing frontend, Premium reader experience, HealthTimes Intelligence presentation, reader preference centre and Newsroom administration surface.

## Live site

- Publication: https://kudzimusar.github.io/htp-zw/
- Premium: https://kudzimusar.github.io/htp-zw/premium.html
- My HealthTimes: https://kudzimusar.github.io/htp-zw/preferences.html
- Editorial standards: https://kudzimusar.github.io/htp-zw/about.html
- Newsroom: https://kudzimusar.github.io/htp-zw/newsroom.html
- Operations manual: https://kudzimusar.github.io/htp-zw/manual.html

## HealthTimes 2.0 product areas

### Public publication

- premium editorial homepage hierarchy
- responsive article reader
- phone/tablet native-feeling top bar and bottom app navigation
- topic discovery
- saved stories
- reading progress
- corrections and reporting context
- WhatsApp-first sharing and direct publication comments
- Facebook, X, LinkedIn and native share
- custom 404, favicon and web-app manifest

### HealthTimes Premium

- US$5/month proposition
- 30-second introductory reading preview
- browser-persistent preview start
- dismissible membership sheet
- browser-persistent presentation entitlement
- member briefings and expanded intelligence positioning

The current entitlement mechanism is intentionally frontend-only. Production must protect paid content server-side.

### Ask HealthTimes / HealthTimes Intelligence

The current frontend provides bounded article/archive retrieval and explanations from the in-repository HealthTimes dataset. It supports summaries, significance, plain-language explanations, related reporting and topical discovery.

Health safety rules prevent diagnosis, prescribing and medication dosing. Production should replace the static matcher with server-side retrieval over the authoritative CMS, provenance, source citations, response logging and safety monitoring.

### My HealthTimes

Reader preferences cover:

- topics
- breaking/daily/weekly/Premium/monthly frequency
- email
- WhatsApp
- browser notification preference

Preferences persist in the browser for presentation. Production requires identity, consent storage, unsubscribe controls and actual messaging providers.

### HealthTimes Newsroom

`newsroom.html` demonstrates role-based newsroom operations across:

- Overview
- Stories
- Assignments
- Editorial Calendar
- Review Queue
- Media
- Authors
- Topics
- Breaking News
- Premium
- AI Desk
- Audience
- Newsletter
- WhatsApp
- Subscribers
- Analytics
- Staff & Roles
- Settings

Presentation roles include Publisher / Owner, Editor-in-Chief, Reporter / Journalist, Newsletter Editor and Commercial Manager accounts, while the role matrix also defines Managing Editor, Section Editor, News Editor, Health / Science Editor, Fact Checker, Copy Editor, Multimedia Editor, Social Editor, Subscriber Manager and Analyst.

The frontend demonstrates account-isolated sessions and permission-aware modules/actions. It does **not** provide production authentication or security. Replace with managed authentication, MFA and server-side RBAC before operational use.

## Editorial workflow

Target lifecycle:

`Idea → Assignment → Draft → Source verification → Fact check → Health/science review → Copy edit → Ready → Scheduled → Published → Correction/Update → Archived`

The presentation compresses some workflow states while preserving role authority and an account-level audit record.

## Repository structure

```text
.
├── index.html                         # public homepage
├── article.html                       # article reader
├── premium.html                       # Premium product
├── preferences.html                   # My HealthTimes
├── about.html                         # standards/team/contact
├── newsroom.html                      # staff administration
├── manual.html                        # browser-readable work manual
├── 404.html                           # Pages fallback
├── app.js                             # public data + interactions
├── newsroom.js                        # newsroom data + RBAC/workflows
├── styles.css                         # public design system
├── newsroom.css                       # newsroom design system
├── favicon.svg
├── site.webmanifest
├── docs/
│   ├── HEALTHTIMES_2_IMPLEMENTATION_PLAN.md
│   └── HEALTHTIMES_OPERATIONS_MANUAL.md
└── .github/workflows/
    ├── validate.yml
    └── pages.yml
```

## Documentation

- `docs/HEALTHTIMES_2_IMPLEMENTATION_PLAN.md` — implementation plan and client record.
- `docs/HEALTHTIMES_OPERATIONS_MANUAL.md` — operational/work manual.
- `manual.html` — browser-readable manual with downloadable source documents.

## Local preview

Because the product is static, it can be served by any simple local HTTP server. Avoid opening files directly with `file://` when testing browser behavior.

Example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

## Validation and deployment

GitHub Actions validates JavaScript syntax, required pages, local asset references and critical product contract markers. GitHub Pages deploys from `main` with the official Pages actions.

## Production replacement checklist

Before live operational use, add:

1. managed staff and reader authentication;
2. MFA for staff accounts;
3. server-side RBAC;
4. authoritative CMS/database and revision history;
5. server/edge Premium entitlement enforcement;
6. payment provider for US$5/month membership;
7. email delivery provider;
8. WhatsApp Business provider and approved templates;
9. channel consent/unsubscribe storage;
10. privacy-aware analytics;
11. server-side HealthTimes Intelligence retrieval and safety controls;
12. observability, backups and disaster recovery;
13. accessibility, security and editorial UAT.

## Public-source grounding

The product uses HealthTimes public reporting, contact details and published editorial-team information as the content/reference source. UI and product architecture are original to the HealthTimes 2.0 modernization.
