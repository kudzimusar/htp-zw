# HealthTimes Source Parity & Migration Register

**Programme:** HealthTimes 2.1 client-review hardening  
**Source publication:** https://healthtimes.co.zw/  
**Modern preview:** https://kudzimusar.github.io/htp-zw/  
**Date:** 2026-09-09

## Purpose

This register prevents modernization from becoming accidental deletion. Every visible source-site product, section, revenue surface and editorial function is either represented in the client-review build or explicitly tracked for production migration.

Status meanings:

- **REPRESENTED** — available in the modern client-review build.
- **LINKED** — retained through a modern directory/product route while the original source remains authoritative.
- **MIGRATION** — requires authoritative CMS/data migration after client approval.
- **PRODUCTION SERVICE** — UI/model exists, but the real backend/provider must be connected before launch.

## Publication and section parity

| Source product / section | Modern destination | Status | Notes |
| --- | --- | --- | --- |
| Home | `index.html` | REPRESENTED | Separate desktop editorial and mobile native-news presentations. |
| Breaking News | `archive.html`, homepage/latest | REPRESENTED | Directory preserved; migration will bring full archive. |
| LIVE BLOG | parity register / future developing-story template | MIGRATION | Existing story type supports Live / Developing in Newsroom. |
| Health News | homepage/latest/archive | REPRESENTED | Core public inventory. |
| Feature | `archive.html`, Newsroom story type | REPRESENTED | Source section preserved. |
| Epidemics | `archive.html` | LINKED | Full historical corpus migrates after approval. |
| Policy | homepage topic / archive | REPRESENTED | Mapped to Health Policy. |
| Public Health | homepage topic / archive | REPRESENTED | Source section preserved. |
| Research & Findings | archive / Premium / Newsroom | REPRESENTED | Research-heavy stories also receive citation tooling. |
| Health Financing | homepage topic / Premium | REPRESENTED | Core Premium/value proposition. |
| Opinion & Analysis | homepage / archive | REPRESENTED | Dedicated editorial presentation. |
| Diseases & Conditions | archive directory | LINKED | Taxonomy preserved for migration. |
| Communicable Diseases | archive directory | LINKED | Taxonomy preserved. |
| HIV/AIDS | homepage topic / archive | REPRESENTED | Public and Premium stories included. |
| Noncommunicable Diseases | archive directory | LINKED | Source route preserved. |
| Global Health | archive directory | REPRESENTED | Current source catalogue contains global-health stories. |
| Climate and Health | migration register | MIGRATION | Add as taxonomy during CMS import if active in source corpus. |
| Community Development | archive directory | LINKED | Source section preserved. |
| Opportunities | archive directory | REPRESENTED | Jobs, grants, training/research retained as product family. |
| Jobs | archive directory | LINKED | Production migration imports current listings. |
| Fellowships & Grants | archive directory | LINKED | Product preserved. |
| Training & Courses | register/archive | LINKED | Source taxonomy recorded. |
| Academic & Research | archive directory | REPRESENTED | Product preserved. |
| Abortion Compendium | archive link to official PDF | REPRESENTED | Safe Abortion in Zimbabwe compendium remains available. |
| BARAZA E-PAPER | archive directory | LINKED | Product retained for migration. |
| HealthTimes Premium | `premium.html` + Premium stories | REPRESENTED | Per-story sub-30-second access gate and subscriber model. |
| Videos / YouTube | `archive.html#videos` | REPRESENTED | Video product remains first-class; playlist/source migration follows. |
| About Us | `about.html` | REPRESENTED | Editorial identity and standards. |
| Contact Us | `about.html#contact` | REPRESENTED | WhatsApp, email, landline and address retained. |
| Corrections | article + `about.html#corrections` | REPRESENTED | Reader correction path retained. |

## Current editorial content represented

The modern catalogue includes or maps the following current/recent source stories and source imagery for client-review continuity:

- Parliament Probes NatPharm Over Zimbabwe’s Medicine Supply Chain
- Harare STI Cases Fall Below 2,000 Per Quarter, NAC Says
- Healthathon 3.0: What Zimbabwe’s Health Innovation Challenge Is Telling Us
- Zimbabwe Creates New Medical Services Directorate to Strengthen Specialist and Emergency Care
- HIPH Graduates Challenged to Turn Qualifications Into Health Solutions
- Vapes Double Smokers’ Chance Of Quitting, Major New Study Finds
- Ebola Cases Plateau in DRC, But Africa CDC Warns Outbreak Remains Far From Under Control
- PHIZ Trains UZ Students to Bridge Research-Policy Gap
- New UK Visa Rules Allow Exploited Care Workers to Leave Abusive Employers Without Losing Status
- HOSPAZ Sets September AGM to Shape Zimbabwe’s Next Chapter in Hospice and Palliative Care
- Health Minister Warns of Cartels, Corruption in Health Sector
- Drug Harm Reduction Expert Raises Red Flag Over Zimbabwe’s Militarised Rehabilitation Centres
- Journalists Urged to Verify Disaster Information Before Publication
- ZCLDN Challenges Lenacapavir Rollout Over Exclusion of People Who Inject Drugs
- The Avenues Clinic Invests US$500,000 to Modernise Critical Care Unit
- “It Can Only Be God,” Says CUT Graduate As SilicaGuard Wins Cimas Healthathon
- HIPH Upgrades Computer Lab to Drive AI-Based Learning
- Pregnancy After Rape in Zimbabwe: What We Get Wrong About the Law and Survivors
- Africa CDC Assures Delegates Ahead of CPHIA as DRC Ebola Outbreak Surges
- Battle Lines Drawn as 10 Teams Vie for Cimas Healthathon 3.0 Crown in Next 24 Hours
- Zimbabwe Commissions Japan-Funded Incinerator at Parirenyatwa Hospital
- FDA Approves Drug to Treat HIV Infection in Newborns
- For Some Zimbabwean Children, a School Meal Can Mean More Than Food
- Zimbabwe Faces Funding Cliff as U.S. Ends Support for HIV, TB and Malaria Programmes
- Zimbabwe Drops National Health Insurance Name, Unveils Tax-Funded Healthcare Provision Programme

The client-review build is not the authoritative archive. The approved production migration must import the full CMS archive, taxonomy, authors, media, redirects, publication dates, revisions and SEO metadata.

## Branding and assets

| Asset | Client-review handling | Production migration |
| --- | --- | --- |
| HealthTimes established logo/identity | Recognizable HealthTimes name and publication identity retained; source visual asset recorded for brand handoff | Import original high-resolution/vector brand files from publisher rather than relying on screenshot-derived or web-compressed media. |
| Article photography | Official public HealthTimes media URLs are used in the client-review catalogue | Copy to authoritative media/CDN with credits and attachment metadata. |
| Favicon/app mark | Modern HealthTimes app mark retained for installable experience | Client may approve it as app mark while retaining established publication masthead. |
| HOSPAZ AGM creative | Used as the initial real advertising campaign | Migrate original creative and commercial destination from the publisher’s campaign records. |

## Commercial parity

| Source capability | Modern destination | Status |
| --- | --- | --- |
| Top paid banner | Public masthead advertising slot | REPRESENTED |
| Responsive ad inventory | Masthead, home in-feed, article, briefing map | REPRESENTED |
| Campaign management | Newsroom → Advertising | REPRESENTED |
| Editorial/commercial separation | RBAC + advertising standard | REPRESENTED |
| Real ad billing / verified impression analytics | production ad stack | PRODUCTION SERVICE |
| Premium membership | Premium product + per-story access state | REPRESENTED |
| Real US$5 billing | payment provider + server entitlement | PRODUCTION SERVICE |

## Audience and identity parity

| Capability | Modern destination | Status |
| --- | --- | --- |
| Anonymous reading | public publication | REPRESENTED |
| Reader sign in / create account | profile icon / My HealthTimes sheet | REPRESENTED |
| Premium reader state | reader profile | REPRESENTED |
| Saved stories | reader mobile sheet/profile state | REPRESENTED |
| Reading history | reader state | REPRESENTED |
| Email preferences | `preferences.html` | REPRESENTED |
| WhatsApp preferences/comments | preferences/article/WhatsApp desk | REPRESENTED |
| Social sharing | article actions | REPRESENTED |
| Real authentication/MFA | identity provider | PRODUCTION SERVICE |
| Real messaging delivery | verified email/WhatsApp providers | PRODUCTION SERVICE |

## Newsroom parity and extension

The modernization intentionally adds operating-system capabilities beyond the old public site:

- role-based staff accounts;
- story assignments and workflow;
- fact-check/review states;
- Premium access control;
- Advertising Manager;
- audience/newsletter/WhatsApp operations;
- subscribers;
- analytics presentation;
- staff roles;
- migration parity module.

These additions are designed to make the client approval discussion about migration and production integration rather than rebuilding basic publishing operations from scratch.

## Migration acceptance criteria

Production migration is complete only when:

1. all original canonical URLs are inventoried;
2. every published article is imported with author/date/category/media relationships;
3. every active taxonomy route is mapped or intentionally redirected;
4. source images are copied to controlled storage with credits/alt text;
5. existing advertising commitments are reconciled;
6. Premium labels/access are migrated;
7. jobs/grants/training/e-paper/document products are migrated;
8. author pages, About, Contact and policy pages are preserved;
9. SEO metadata, redirects and sitemap are validated;
10. a crawl comparison finds no unexplained content loss.
