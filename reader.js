(() => {
  'use strict';

  if (document.body.dataset.page !== 'article') return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const synth = speechSupported ? window.speechSynthesis : null;

  let segments = [];
  let index = 0;
  let state = 'idle';
  let remountTimer = null;

  const speakerIcon = () => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6.5 9H3v6h3.5L11 19V5Z"/><path d="M15 8.5a5 5 0 0 1 0 7"/><path d="M17.8 5.8a9 9 0 0 1 0 12.4"/></svg>`;

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

    $$('.article-body > p').forEach(p => {
      const value = p.textContent.trim();
      if (value) result.push(value);
    });

    if (!isPremiumLocked()) {
      $$('.article-body > .gated-blur:not(.is-locked) > p').forEach(p => {
        const value = p.textContent.trim();
        if (value) result.push(value);
      });
    }
    return result;
  }

  function voiceScore(voice) {
    const lang = String(voice.lang || '');
    const name = String(voice.name || '');
    if (!/^en(?:-|$)/i.test(lang)) return -10000;

    let score = 0;
    if (/natural|enhanced|premium|neural|online/i.test(name)) score += 140;
    if (/google|microsoft|siri|samantha|daniel|serena|moira|karen|tessa|ava|allison|arthur/i.test(name)) score += 75;
    if (/^en-ZW/i.test(lang)) score += 65;
    else if (/^en-GB/i.test(lang)) score += 55;
    else if (/^en-US/i.test(lang)) score += 42;
    else if (/^en-AU|^en-IE|^en-ZA|^en-NZ/i.test(lang)) score += 34;
    if (voice.localService) score += 12;
    if (/espeak|robot|zarvox|trinoids|whisper|bad news|bells|boing/i.test(name)) score -= 220;
    return score;
  }

  function preferredVoice() {
    if (!speechSupported) return null;
    return [...synth.getVoices()].sort((a, b) => voiceScore(b) - voiceScore(a))[0] || null;
  }

  function setStatus(message) {
    const live = $('[data-reader-status]');
    if (live) live.textContent = message;
  }

  function updateButton() {
    const button = $('[data-reader-toggle]');
    if (!button) return;
    const locked = isPremiumLocked();
    button.classList.toggle('is-speaking', state === 'playing');
    button.classList.toggle('is-paused', state === 'paused');
    button.classList.toggle('is-locked', locked);
    button.setAttribute('aria-pressed', state === 'playing' ? 'true' : 'false');

    if (!speechSupported) {
      button.disabled = true;
      button.setAttribute('aria-label', 'Article audio is not available in this browser');
      button.setAttribute('title', 'Audio unavailable');
      return;
    }

    button.disabled = false;
    if (locked) {
      button.setAttribute('aria-label', 'Premium preview ended. Subscribe to listen');
      button.setAttribute('title', 'Premium preview ended');
    } else if (state === 'playing') {
      button.setAttribute('aria-label', 'Pause article audio');
      button.setAttribute('title', 'Pause article audio');
    } else if (state === 'paused') {
      button.setAttribute('aria-label', 'Resume article audio');
      button.setAttribute('title', 'Resume article audio');
    } else {
      button.setAttribute('aria-label', 'Listen to this story');
      button.setAttribute('title', 'Listen to this story');
    }
  }

  function mount() {
    const rail = $('.article-rail');
    if (!rail || $('[data-reader-toggle]', rail)) return;
    rail.insertAdjacentHTML('beforeend', `<button class="rail-action ht-listen-button" type="button" data-reader-toggle aria-pressed="false">${speakerIcon()}</button><span class="ht-reader-live" data-reader-status aria-live="polite"></span>`);
    $('[data-reader-toggle]', rail)?.addEventListener('click', togglePlayback);
    updateButton();
  }

  function cancelSpeech() {
    if (!speechSupported) return;
    synth.cancel();
  }

  function reset(message = '') {
    cancelSpeech();
    state = 'idle';
    index = 0;
    if (message) setStatus(message);
    updateButton();
  }

  function speakCurrent() {
    if (!speechSupported || state !== 'playing') return;
    if (isPremiumLocked()) {
      reset('Premium preview ended. Subscribe to continue listening.');
      return;
    }
    if (index >= segments.length) {
      state = 'idle';
      index = 0;
      setStatus('Finished listening.');
      updateButton();
      return;
    }

    const voice = preferredVoice();
    const utterance = new SpeechSynthesisUtterance(segments[index]);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'en-GB';
    }
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onend = () => {
      if (state !== 'playing') return;
      index += 1;
      speakCurrent();
    };
    utterance.onerror = event => {
      if (event.error === 'canceled' || event.error === 'interrupted') return;
      reset('Audio stopped. Tap the speaker to try again.');
    };
    synth.speak(utterance);
  }

  function startPlayback() {
    if (isPremiumLocked()) {
      setStatus('Premium preview ended. Subscribe to continue listening.');
      updateButton();
      $('[data-sheet-open="subscribe"]')?.click();
      return;
    }

    segments = readableText();
    index = 0;
    if (!segments.length) {
      setStatus('This story has no readable text yet.');
      return;
    }

    cancelSpeech();
    state = 'playing';
    setStatus('Playing article audio.');
    updateButton();
    speakCurrent();
  }

  function togglePlayback() {
    if (!speechSupported) return;
    if (isPremiumLocked()) {
      setStatus('Premium preview ended. Subscribe to continue listening.');
      updateButton();
      $('[data-sheet-open="subscribe"]')?.click();
      return;
    }

    if (state === 'playing') {
      synth.pause();
      state = 'paused';
      setStatus('Article audio paused.');
      updateButton();
      return;
    }

    if (state === 'paused') {
      synth.resume();
      state = 'playing';
      setStatus('Article audio resumed.');
      updateButton();
      return;
    }

    startPlayback();
  }

  function watchPremiumBoundary() {
    const body = $('.article-body');
    if (!body) return;
    const observer = new MutationObserver(() => {
      if (isPremiumLocked() && (state === 'playing' || state === 'paused')) {
        reset('Premium preview ended. Subscribe to continue listening.');
      } else {
        updateButton();
      }
    });
    observer.observe(body, { attributes:true, subtree:true, attributeFilter:['class','hidden'] });
    const paywall = $('[data-v21-paywall]');
    if (paywall) observer.observe(paywall, { attributes:true, attributeFilter:['hidden','class'] });
  }

  function watchArticleRemount() {
    const mountPoint = $('#article-mount');
    if (!mountPoint) return;
    const observer = new MutationObserver(() => {
      clearTimeout(remountTimer);
      remountTimer = setTimeout(() => {
        if (!$('[data-reader-toggle]')) {
          reset();
          mount();
          watchPremiumBoundary();
        }
      }, 50);
    });
    observer.observe(mountPoint, { childList:true, subtree:true });
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
  }

  init();
})();
