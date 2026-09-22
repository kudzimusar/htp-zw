(() => {
  'use strict';

  const EVENT_VERSION = '2026-09-09';
  const MEASUREMENT_ID = 'G-S39LN2KX4X';
  const TAG_ID = 'GT-PLTTGPL';
  const CONSENT_KEY = 'htpConsentV1';
  const PUBLIC_HOSTS = new Set(['healthtimes.co.zw', 'www.healthtimes.co.zw']);
  const ALLOWED_EVENTS = new Set([
    'page_view',
    'article_view',
    'article_25_percent',
    'article_50_percent',
    'article_75_percent',
    'article_complete',
    'listen_started',
    'listen_completed',
    'story_saved',
    'story_shared',
    'whatsapp_share',
    'search_performed',
    'topic_followed',
    'citation_copied',
    'reference_opened',
    'premium_preview_started',
    'premium_warning_shown',
    'premium_locked',
    'subscription_started',
    'subscription_completed',
    'newsletter_signup',
    'push_opt_in',
    'ad_impression',
    'ad_click'
  ]);
  const PROHIBITED_KEYS = new Set([
    'draft_content',
    'article_body',
    'body_html',
    'internal_comments',
    'unpublished_assignment',
    'private_source_document',
    'staff_email',
    'staff_email_address',
    'permission_details',
    'security_event',
    'payment_details',
    'customer_email',
    'email_address',
    'phone_number',
    'push_token',
    'message_body'
  ]);

  function isProtectedNewsroom() {
    return document.body?.dataset?.page === 'newsroom' ||
      location.pathname === '/newsroom' ||
      location.pathname.startsWith('/newsroom/');
  }

  function readConsent() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CONSENT_KEY) || '{}');
      return {
        version: parsed.version || null,
        analytics: parsed.analytics === true,
        advertising: parsed.advertising === true
      };
    } catch {
      return { version: null, analytics: false, advertising: false };
    }
  }

  function writeConsent(next) {
    const current = readConsent();
    const value = {
      version: String(next.version || current.version || '2026-09-22'),
      analytics: next.analytics === true,
      advertising: next.advertising === true,
      updated_at: new Date().toISOString()
    };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
    } catch {
      return false;
    }
    applyConsent(value);
    return true;
  }

  function gtag() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }

  function applyConsent(consent) {
    gtag('consent', 'update', {
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.advertising ? 'granted' : 'denied',
      ad_user_data: consent.advertising ? 'granted' : 'denied',
      ad_personalization: consent.advertising ? 'granted' : 'denied'
    });
    if (consent.analytics) ensureGoogleTag();
  }

  function ensureGoogleTag() {
    if (isProtectedNewsroom()) return false;
    if (!PUBLIC_HOSTS.has(location.hostname)) return false;
    if (!readConsent().analytics) return false;
    if (document.querySelector('script[data-healthtimes-google-tag]')) return true;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
    script.dataset.healthtimesGoogleTag = TAG_ID;
    document.head.appendChild(script);

    gtag('js', new Date());
    gtag('config', MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: readConsent().advertising
    });
    return true;
  }

  function sanitizeParameters(input) {
    const safe = {};
    if (!input || typeof input !== 'object') return safe;

    for (const [key, value] of Object.entries(input)) {
      if (PROHIBITED_KEYS.has(key)) continue;
      if (value == null) continue;
      if (typeof value === 'object') continue;
      const stringValue = typeof value === 'string' ? value.slice(0, 500) : value;
      safe[key] = stringValue;
    }
    return safe;
  }

  function track(eventName, parameters = {}) {
    if (!ALLOWED_EVENTS.has(eventName)) return false;
    if (isProtectedNewsroom()) return false;

    const payload = {
      ...sanitizeParameters(parameters),
      event_version: EVENT_VERSION
    };

    if (!PUBLIC_HOSTS.has(location.hostname)) {
      window.dispatchEvent(new CustomEvent('healthtimes:analytics-debug', {
        detail: { eventName, payload, external_delivery: false }
      }));
      return false;
    }

    if (!readConsent().analytics) return false;
    ensureGoogleTag();
    gtag('event', eventName, payload);
    return true;
  }

  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });

  window.HealthTimesAnalytics = Object.freeze({
    eventVersion: EVENT_VERSION,
    measurementId: MEASUREMENT_ID,
    googleTagId: TAG_ID,
    readConsent,
    setConsent: writeConsent,
    track
  });

  const consent = readConsent();
  applyConsent(consent);

  if (!isProtectedNewsroom()) {
    track('page_view', {
      path: location.pathname,
      title: document.title,
      referrer: document.referrer ? (() => {
        try { return new URL(document.referrer).origin; } catch { return ''; }
      })() : '',
      device: matchMedia('(max-width: 900px)').matches ? 'mobile' : 'desktop'
    });
  }
})();
