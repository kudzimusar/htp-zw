(() => {
  'use strict';

  if (document.body.dataset.page !== 'article') return;

  const RATE_KEY = 'htpNewsReaderRate';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const synth = speechSupported ? window.speechSynthesis : null;

  let segments = [];
  let index = 0;
  let state = 'idle';
  let currentUtterance = null;
  let premiumEnded = false;
  let remountTimer = null;

  const readRate = () => {
    const raw = Number(localStorage.getItem(RATE_KEY) || 1);
    return [0.75, 1, 1.25, 1.5].includes(raw) ? raw : 1;
  };

  const icon = (name) => {
    const common = 'viewBox="0 0 24 24" aria-hidden="true"';
    if (name === 'speaker') return `<svg ${common}><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4Zm11.5-.7v7.4a5 5 0 0 0 0-7.4Zm2.5-2.2v2.2a7.5 7.5 0 0 1 0 7.4v2.2a9.5 9.5 0 0 0 0-11.8Z"/></svg>`;
    if (name === 'play') return `<svg ${common}><path d="M8 5v14l11-7Z"/></svg>`;
    if (name === 'pause') return `<svg ${common}><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>`;
    if (name === 'stop') return `<svg ${common}><path d="M6 6h12v12H6z"/></svg>`;
    return '';
  };

  function isPremiumLocked() {
    return Boolean(
      $('.article-body.v21-premium-locked') ||
      $('.gated-blur.is-locked') ||
      $('[data-v21-paywall]:not([hidden])')
    );
  }

  function readableText() {
    const result = [];
    const title = $('.article-head h1')?.textContent.trim();
    const standfirst = $('.article-standfirst')?.textContent.trim();
    if (title) result.push(title);
    if (standfirst) result.push(standfirst);

    const sourceNote = $('.article-body > .source-note')?.textContent.trim();
    if (sourceNote) result.push(sourceNote);

    $$('.article-body > p').forEach((p) => {
      const value = p.textContent.trim();
      if (value) result.push(value);
    });

    if (!isPremiumLocked()) {
      $$('.article-body > .gated-blur:not(.is-locked) > p').forEach((p) => {
        const value = p.textContent.trim();
        if (value) result.push(value);
      });
    }

    return result;
  }

  function estimateMinutes(items = readableText()) {
    const words = items.join(' ').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 165));
  }

  function preferredVoice() {
    if (!speechSupported) return null;
    const voices = synth.getVoices();
    return voices.find(v => /^en-ZW/i.test(v.lang)) ||
      voices.find(v => /^en-GB/i.test(v.lang)) ||
      voices.find(v => /^en/i.test(v.lang)) || null;
  }

  function playerMarkup() {
    const estimate = estimateMinutes();
    const rate = readRate();
    return `<section class="ht-reader" data-news-reader aria-label="Listen to this story">
      <div class="ht-reader-mark">${icon('speaker')}</div>
      <div class="ht-reader-copy">
        <span class="ht-reader-kicker">Listen</span>
        <strong class="ht-reader-title">Listen to this story</strong>
        <span class="ht-reader-status" data-reader-status aria-live="polite">${speechSupported ? `About ${estimate} min · uses your device voice` : 'Audio reading is not available in this browser.'}</span>
      </div>
      <div class="ht-reader-controls">
        <button class="ht-reader-play" type="button" data-reader-toggle ${speechSupported ? '' : 'disabled'} aria-label="Play article narration">${icon('play')}<span>Listen</span></button>
        <label class="ht-reader-rate"><span>Speed</span><select data-reader-rate aria-label="Reading speed">
          <option value="0.75" ${rate === 0.75 ? 'selected' : ''}>0.75×</option>
          <option value="1" ${rate === 1 ? 'selected' : ''}>1×</option>
          <option value="1.25" ${rate === 1.25 ? 'selected' : ''}>1.25×</option>
          <option value="1.5" ${rate === 1.5 ? 'selected' : ''}>1.5×</option>
        </select></label>
        <button class="ht-reader-stop" type="button" data-reader-stop hidden aria-label="Stop article narration">${icon('stop')}</button>
      </div>
      <div class="ht-reader-progress" aria-hidden="true"><div class="ht-reader-progress-track"><div class="ht-reader-progress-fill" data-reader-progress></div></div><span class="ht-reader-progress-label" data-reader-progress-label>Ready</span></div>
      <button class="ht-reader-subscribe" type="button" data-sheet-open="subscribe" data-reader-subscribe hidden>Subscribe to continue listening →</button>
    </section>`;
  }

  function mount() {
    if ($('[data-news-reader]')) return;
    const head = $('.article-head');
    if (!head) return;
    head.insertAdjacentHTML('afterend', playerMarkup());

    const rail = $('.article-rail');
    if (rail && !$('.ht-reader-rail', rail)) {
      rail.insertAdjacentHTML('beforeend', `<button class="rail-action ht-reader-rail" type="button" data-reader-shortcut title="Listen to this story" aria-label="Listen to this story">${icon('speaker')}</button>`);
    }

    bindPlayer();
    updateUi();
  }

  function setStatus(message) {
    const el = $('[data-reader-status]');
    if (el) el.textContent = message;
  }

  function updateUi() {
    const player = $('[data-news-reader]');
    if (!player) return;
    const toggle = $('[data-reader-toggle]', player);
    const stop = $('[data-reader-stop]', player);
    const progress = $('[data-reader-progress]', player);
    const label = $('[data-reader-progress-label]', player);
    const subscribe = $('[data-reader-subscribe]', player);
    const rail = $('[data-reader-shortcut]');

    const active = state === 'playing' || state === 'paused';
    player.classList.toggle('is-speaking', state === 'playing');
    rail?.classList.toggle('is-speaking', state === 'playing');

    if (toggle && speechSupported) {
      toggle.innerHTML = state === 'playing' ? `${icon('pause')}<span>Pause</span>` : `${icon('play')}<span>${state === 'paused' ? 'Resume' : 'Listen'}</span>`;
      toggle.setAttribute('aria-label', state === 'playing' ? 'Pause article narration' : state === 'paused' ? 'Resume article narration' : 'Play article narration');
    }
    if (stop) stop.hidden = !active;

    const total = Math.max(segments.length, 1);
    const pct = state === 'finished' ? 100 : Math.min(100, (index / total) * 100);
    if (progress) progress.style.width = `${pct}%`;
    if (label) label.textContent = active ? `${Math.min(index + 1, total)} of ${total}` : state === 'finished' ? 'Complete' : 'Ready';
    if (subscribe) subscribe.hidden = !premiumEnded;
  }

  function cancelSpeech() {
    if (!speechSupported) return;
    synth.cancel();
    currentUtterance = null;
  }

  function stop(reason = '') {
    cancelSpeech();
    state = 'idle';
    index = 0;
    if (reason) setStatus(reason);
    else setStatus(`About ${estimateMinutes()} min · uses your device voice`);
    updateUi();
  }

  function finish() {
    cancelSpeech();
    state = 'finished';
    index = segments.length;
    setStatus('Finished listening.');
    updateUi();
  }

  function speakCurrent() {
    if (!speechSupported) return;
    if (isPremiumLocked()) {
      premiumEnded = true;
      stop('Premium preview ended — subscribe to continue listening.');
      updateUi();
      return;
    }
    if (index >= segments.length) {
      finish();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(segments[index]);
    utterance.rate = readRate();
    utterance.lang = preferredVoice()?.lang || 'en-GB';
    const voice = preferredVoice();
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (state !== 'playing') return;
      index += 1;
      updateUi();
      speakCurrent();
    };
    utterance.onerror = (event) => {
      if (event.error === 'canceled' || event.error === 'interrupted') return;
      state = 'idle';
      setStatus('Narration stopped. Tap Listen to try again.');
      updateUi();
    };
    currentUtterance = utterance;
    synth.speak(utterance);
    updateUi();
  }

  function play() {
    if (!speechSupported) return;
    if (isPremiumLocked()) {
      premiumEnded = true;
      setStatus('Premium preview ended — subscribe to continue listening.');
      updateUi();
      return;
    }

    if (state === 'playing') {
      synth.pause();
      state = 'paused';
      setStatus('Paused.');
      updateUi();
      return;
    }

    if (state === 'paused') {
      synth.resume();
      state = 'playing';
      setStatus('Listening…');
      updateUi();
      return;
    }

    premiumEnded = false;
    segments = readableText();
    index = 0;
    if (!segments.length) {
      setStatus('This story has no readable text yet.');
      return;
    }
    cancelSpeech();
    state = 'playing';
    setStatus('Listening…');
    updateUi();
    speakCurrent();
  }

  function restartCurrentAtNewRate() {
    if (!speechSupported || state !== 'playing') return;
    cancelSpeech();
    speakCurrent();
  }

  function bindPlayer() {
    $('[data-reader-toggle]')?.addEventListener('click', play);
    $('[data-reader-stop]')?.addEventListener('click', () => stop());
    $('[data-reader-rate]')?.addEventListener('change', (event) => {
      localStorage.setItem(RATE_KEY, String(Number(event.target.value)));
      restartCurrentAtNewRate();
    });
    $('[data-reader-shortcut]')?.addEventListener('click', () => {
      $('[data-news-reader]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => $('[data-reader-toggle]')?.focus(), 350);
    });
  }

  function watchPremiumBoundary() {
    const body = $('.article-body');
    if (!body) return;
    const observer = new MutationObserver(() => {
      if (isPremiumLocked() && (state === 'playing' || state === 'paused')) {
        premiumEnded = true;
        stop('Premium preview ended — subscribe to continue listening.');
        updateUi();
      }
    });
    observer.observe(body, { attributes: true, subtree: true, attributeFilter: ['class', 'hidden'] });

    const paywall = $('[data-v21-paywall]');
    if (paywall) observer.observe(paywall, { attributes: true, attributeFilter: ['hidden', 'class'] });
  }

  function watchArticleRemount() {
    const mountPoint = $('#article-mount');
    if (!mountPoint) return;
    const observer = new MutationObserver(() => {
      clearTimeout(remountTimer);
      remountTimer = setTimeout(() => {
        if (!$('[data-news-reader]')) {
          cancelSpeech();
          state = 'idle';
          index = 0;
          premiumEnded = false;
          mount();
          watchPremiumBoundary();
        }
      }, 50);
    });
    observer.observe(mountPoint, { childList: true, subtree: true });
  }

  function init() {
    mount();
    watchPremiumBoundary();
    watchArticleRemount();
    if (speechSupported) {
      synth.getVoices();
      if ('onvoiceschanged' in synth) synth.onvoiceschanged = () => synth.getVoices();
    }
    window.addEventListener('pagehide', cancelSpeech);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state === 'playing' && speechSupported) {
        synth.pause();
        state = 'paused';
        setStatus('Paused while the app is in the background.');
        updateUi();
      }
    });
  }

  init();
})();
