(() => {
  'use strict';

  const mobileQuery = window.matchMedia('(max-width: 900px)');

  function placeMobileAd() {
    if (document.body.dataset.page !== 'home') return;

    const ad = document.querySelector('.v21-ad-compact');
    if (!ad) return;

    if (!mobileQuery.matches) {
      ad.classList.remove('v21-mobile-flow-ad');
      return;
    }

    const feed = document.querySelector('.v21-mobile-home .v21-mobile-feed');
    if (!feed) return;

    ad.classList.add('v21-mobile-flow-ad');
    ad.setAttribute('aria-label', 'Sponsored content');

    const stories = feed.querySelectorAll('.v21-mobile-story');
    const anchor = stories[2] || stories[stories.length - 1];
    if (anchor && ad.previousElementSibling !== anchor) {
      anchor.insertAdjacentElement('afterend', ad);
    }
  }

  function ready() {
    placeMobileAd();
    window.setTimeout(placeMobileAd, 80);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }

  mobileQuery.addEventListener?.('change', placeMobileAd);
})();
