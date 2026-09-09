(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let scheduled = false;

  const outline = body => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const brand = (viewBox, body) => `<svg viewBox="${viewBox}" aria-hidden="true" fill="currentColor">${body}</svg>`;

  const icons = {
    home: outline('<path d="m3 11 9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
    latest: outline('<path d="M4 5h16"/><path d="M4 10h16"/><path d="M4 15h11"/><path d="M4 20h8"/>'),
    ai: outline('<path d="m12 3 1.15 3.35L16.5 7.5l-3.35 1.15L12 12l-1.15-3.35L7.5 7.5l3.35-1.15L12 3Z"/><path d="m18 13 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13Z"/><path d="m5.5 14 .65 1.85L8 16.5l-1.85.65L5.5 19l-.65-1.85L3 16.5l1.85-.65L5.5 14Z"/>'),
    bookmark: outline('<path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z"/>'),
    more: outline('<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>'),
    share: outline('<circle cx="18" cy="5" r="2.25"/><circle cx="6" cy="12" r="2.25"/><circle cx="18" cy="19" r="2.25"/><path d="m8 11 7.8-4.6"/><path d="m8 13 7.8 4.6"/>'),
    copy: outline('<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
    whatsapp: brand('0 0 16 16','<path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>'),
    facebook: brand('0 0 16 16','<path d="M16 8.049C16 3.603 12.418 0 8 0S0 3.603 0 8.049C0 12.067 2.925 15.398 6.75 16v-5.624H4.719V8.049H6.75V6.275c0-2.017 1.194-3.132 3.022-3.132.875 0 1.791.157 1.791.157v1.98h-1.009c-.994 0-1.304.62-1.304 1.257v1.512h2.219l-.355 2.327H9.25V16C13.075 15.398 16 12.067 16 8.049Z"/>'),
    x: outline('<path d="M5 4 19 20"/><path d="M19 4 5 20"/>'),
    linkedin: brand('0 0 16 16','<path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146Zm4.943 12.248V6.169H2.542v7.225h2.401Zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.521-1.248-1.342-1.248-.821 0-1.358.54-1.358 1.248 0 .694.521 1.248 1.327 1.248h.015Zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4Z"/>')
  };

  function setButtonIcon(el, name, label) {
    if (!el || !icons[name]) return;
    if (el.dataset.qualityIcon !== name) {
      el.innerHTML = icons[name];
      el.dataset.qualityIcon = name;
    }
    if (label) {
      el.setAttribute('aria-label', label);
      el.setAttribute('title', label);
    }
  }

  function setNavItem(el, name, label, visibleText) {
    if (!el || !icons[name]) return;
    if (el.dataset.qualityNav === name) return;
    el.innerHTML = `${icons[name]}<span>${visibleText}</span>`;
    el.dataset.qualityNav = name;
    el.setAttribute('aria-label', label);
  }

  function polishBottomNav() {
    const nav = $('.mobile-bottom-nav');
    if (!nav) return;
    const items = [...nav.children];
    setNavItem(items[0], 'home', 'Home', 'Home');
    setNavItem(items[1], 'latest', 'Latest reporting', 'Latest');
    setNavItem(items[2], 'ai', 'Ask HealthTimes AI', 'Ask AI');
    setNavItem(items[3], 'bookmark', 'Saved stories', 'Saved');
    setNavItem(items[4], 'more', 'More', 'More');
  }

  function polishArticleRail() {
    const rail = $('.article-rail');
    if (!rail) return;
    setButtonIcon($('.rail-action[title="Save"]', rail), 'bookmark', 'Save story');
    setButtonIcon($('.rail-action[title="Share"]', rail), 'share', 'Share story');
    setButtonIcon($('[data-open-ai]', rail), 'ai', 'Ask HealthTimes AI');
    const whatsApp = $('.rail-action[title="Discuss on WhatsApp"]', rail);
    if (whatsApp) whatsApp.hidden = true;
  }

  function polishShareBar() {
    const bar = $('[data-social-bar]');
    if (!bar) return;
    const mapping = [
      ['[data-social="whatsapp"]','whatsapp','Share on WhatsApp'],
      ['[data-social="facebook"]','facebook','Share on Facebook'],
      ['[data-social="x"]','x','Share on X'],
      ['[data-social="linkedin"]','linkedin','Share on LinkedIn'],
      ['[data-share]','copy','Copy or share link']
    ];
    mapping.forEach(([selector, name, label]) => setButtonIcon($(selector, bar), name, label));
  }

  function placeAds() {
    const header = $('#app-header');
    if (!header) return;
    const mobile = window.matchMedia('(max-width: 900px)').matches;
    const page = document.body.dataset.page;
    const mast = $('.v21-ad-masthead');
    const compact = $('.v21-ad-compact');

    if (!mobile) {
      if (mast && mast.previousElementSibling !== header) header.insertAdjacentElement('afterend', mast);
      return;
    }

    if (!compact) return;
    if (page === 'home') {
      const feed = $('.v21-mobile-home .v21-mobile-feed');
      if (!feed) return;
      const stories = $$('.v21-mobile-story', feed);
      const anchor = stories[2] || stories[stories.length - 1];
      if (anchor && compact.previousElementSibling !== anchor) anchor.insertAdjacentElement('afterend', compact);
      compact.classList.add('v21-mobile-flow-ad');
      compact.classList.remove('v21-page-flow-ad');
      return;
    }

    if (compact.previousElementSibling !== header) header.insertAdjacentElement('afterend', compact);
    compact.classList.add('v21-page-flow-ad');
    compact.classList.remove('v21-mobile-flow-ad');
  }

  function compactPremiumStatus() {
    if (document.body.dataset.page !== 'article') return;
    const legacy = $('.preview-banner[data-premium-preview]');
    if (legacy) legacy.hidden = true;
    const status = $('[data-v21-premium-status]');
    if (!status) return;
    const copy = $('[data-v21-premium-copy]', status);
    const countdown = $('[data-v21-premium-countdown]', status);
    const locked = Boolean($('.article-body.v21-premium-locked') || $('[data-v21-paywall]:not([hidden])'));
    if (locked) {
      if (copy && copy.textContent !== 'Premium preview ended') copy.textContent = 'Premium preview ended';
      if (countdown && countdown.textContent !== '00:00') countdown.textContent = '00:00';
      status.dataset.previewEnded = 'true';
    } else if (status.dataset.previewEnded) {
      delete status.dataset.previewEnded;
    }
  }

  function removeDuplicateShareGroup() {
    $$('.v21-social-icons').forEach(el => el.remove());
  }

  function apply() {
    scheduled = false;
    polishBottomNav();
    polishArticleRail();
    polishShareBar();
    placeAds();
    compactPremiumStatus();
    removeDuplicateShareGroup();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['class','hidden'] });
  window.addEventListener('resize', schedule, { passive:true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once:true });
  else schedule();
  setTimeout(schedule, 120);
})();
