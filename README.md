# Health Times Zimbabwe — Modern Frontend Demo

A responsive, editorial-first modernization concept for **Health Times Zimbabwe**.

This repository is intentionally frontend-only for the client demonstration. It uses current public Health Times headlines, categories, authors, dates, short excerpts, and source links as editorial demo content, while the presentation layer is fully rebuilt.

## Included

- Modern health-news homepage with strong editorial hierarchy
- Responsive desktop, tablet, and mobile layouts
- Mobile bottom navigation for Home, Latest, Search, Premium, and Ask AI
- Search overlay with instant filtering across demo editorial content
- Premium hub at `premium.html`
- 30-second Premium preview timer persisted in `localStorage`
- Premium subscription CTA at **US$5/month**
- Frontend-only demo subscriber activation flow (no real payment is processed)
- Article reading experience with reading-progress indicator, save/share affordances, and related stories
- HealthTimes AI demo assistant that answers from the bundled Health Times demo content only
- Informational/medical disclaimer for the AI assistant
- Responsive newsletter, trending, category, and Premium modules
- Accessibility-minded focus states, labels, keyboard support, reduced-motion handling, and high-contrast typography
- No build dependency: static HTML/CSS/JavaScript can be hosted on GitHub Pages, Vercel, Netlify, Cloudflare Pages, or any static host

## Run locally

Serve the repository with any static web server, for example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Premium demo behavior

The Premium page gives a non-subscribed browser **30 seconds of preview access**. The first visit stores a timestamp in `localStorage` under `htpPremiumPreviewStartedAt`. Refreshing does not reset the preview. When the time expires, the Premium reading area is locked and the US$5/month subscription panel is shown.

For client demonstrations, the subscription modal contains an **Activate demo subscription** control. It sets `htpDemoSubscribed=true` in `localStorage` and unlocks the demo. No card is charged and no payment details are collected.

To reset the client demo in a browser, clear the site's local storage.

### Important production note

This is **not a security boundary and not production rate limiting**. Client-side timers and `localStorage` can be bypassed. Production Premium must use real authentication, server-side subscription entitlements, a payment provider, server/API/edge enforcement of protected content, real rate limiting for protected endpoints, authenticated CMS delivery, and persistent billing state/webhooks.

The demo keeps Premium state separated so those services can replace the client-only mechanism later.

## AI demo behavior

The floating **Ask HealthTimes** assistant is deterministic and frontend-only. It searches/summarizes the bundled demo editorial dataset and answers a limited set of Health Times/navigation questions. It does **not** diagnose symptoms, recommend treatment, or contact a real AI model.

Production should move AI to a server-side retrieval pipeline connected to the Health Times CMS/search index, with citations, abuse controls, observability, and strict medical-safety behavior.

## Content provenance

Demo editorial metadata/excerpts were adapted from public Health Times pages during the September 2026 redesign exercise. Full article ownership remains with Health Times and the demo links back to the original publication URLs. A production migration should ingest content from the authoritative CMS/database rather than scrape the public website.

## Key files

- `index.html` — homepage shell and shared overlays
- `premium.html` — Premium hub and 30-second preview experience
- `article.html` — reusable article-reading route driven by `?id=...`
- `styles.css` — design system and responsive layouts
- `app.js` — content model, rendering, search, Premium gate, AI assistant, mobile interactions

## Production handoff priorities

- Connect WordPress/headless CMS or replacement CMS
- Add real identity and subscriber account journeys
- Add production payment + entitlement service
- Enforce Premium content server-side
- Replace demo AI with retrieval-grounded assistant
- Add analytics, consent, ad/sponsorship inventory, and newsletter provider
- Add automated visual, accessibility, unit, and end-to-end tests
- Add image optimization/CDN transformation rather than hot-linking current public images
