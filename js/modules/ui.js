/* Mzansi Pathways — Shared UI, Trusted Types, Toast, Greeting & Speech Module (Step 3 of app.js modular split).
   Strict-CSP & Trusted-Types safe: single shared mz-ui policy, zero inline handlers. */
(function (root) {
  'use strict';

  var _mzUiPolicy = (typeof root !== 'undefined' && root.trustedTypes && root.trustedTypes.createPolicy)
    ? root.trustedTypes.createPolicy('mz-ui', { createHTML: function (s) { return String(s); } })
    : null;

  function toTrustedHtml(s) {
    return _mzUiPolicy ? _mzUiPolicy.createHTML(s) : String(s);
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(msg, ms) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(root._pt2);
    root._pt2 = setTimeout(function () { t.classList.add('hidden'); }, ms || 2600);
  }

  function getGreeting(lang) {
    var hr = new Date(Date.now() + 2 * 60 * 60 * 1000).getUTCHours();
    if (lang === 'zu') return 'Sawubona';
    if (lang === 'af') return hr < 12 ? 'Goeie môre' : hr < 18 ? 'Goeie middag' : 'Goeie naand';
    return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  }

  var ttsVoices = [];
  function loadTtsVoices() {
    try {
      var v = root.speechSynthesis.getVoices();
      if (v && v.length) ttsVoices = v;
    } catch (e) {}
    return ttsVoices;
  }
  if (typeof root !== 'undefined' && 'speechSynthesis' in root) {
    loadTtsVoices();
    try { root.speechSynthesis.addEventListener('voiceschanged', loadTtsVoices); } catch (e) {}
  }

  function pickVoice(lang) {
    var target = String(lang || '').toLowerCase(), base = target.split('-')[0];
    var vs = loadTtsVoices().filter(function (v) { return !/espeak/i.test(v.name || ''); });
    var norm = function (v) { return String(v.lang || '').replace(/_/g, '-').toLowerCase(); };
    return vs.find(function (v) { return v.localService && norm(v) === target; }) ||
      vs.find(function (v) { return norm(v) === target; }) ||
      vs.find(function (v) { return v.localService && norm(v).startsWith(base); }) ||
      vs.find(function (v) { return norm(v).startsWith(base); }) || null;
  }

  function stopSpeech() {
    try { if ('speechSynthesis' in root) root.speechSynthesis.cancel(); } catch (e) {}
  }
  if (typeof root !== 'undefined' && root.addEventListener) {
    root.addEventListener('pagehide', stopSpeech);
  }

  function safeSpeech(msg, langCode) {
    if ('speechSynthesis' in root && typeof root.SpeechSynthesisUtterance === 'function') {
      try {
        stopSpeech();
        var chunks = String(msg || '').replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]?/g) || [];
        if (chunks.length) {
          var lang = langCode === 'af' ? 'af-ZA' : langCode === 'zu' ? 'zu-ZA' : 'en-ZA';
          var voice = pickVoice(lang) || (lang === 'en-ZA' ? pickVoice('en-GB') : null);
          chunks.forEach(function (c) {
            var u = new root.SpeechSynthesisUtterance(c.trim());
            u.lang = voice ? String(voice.lang).replace(/_/g, '-') : lang;
            if (voice) u.voice = voice;
            u.rate = 0.92;
            root.speechSynthesis.speak(u);
          });
          showToast('Reading aloud...');
          return true;
        }
      } catch (e) {}
    }
    showToast(String(msg || ''));
    return false;
  }

  function getHumanCheckIn(moodState) {
    if (moodState === 'stressed') {
      return {
        badge: 'Bridging & Alternative Pathways Active',
        note: 'Even if Maths or Science felt tough, South Africa has real Higher Certificate bridging, TVET NC(V), NATED, and QCTO trade routes that lead to strong careers. Check Plan B and Plan C first.'
      };
    }
    if (moodState === 'second_chance') {
      return {
        badge: 'Rewrite & Subject Upgrade Mode',
        note: 'Use the What-If Rewrite Simulator on the right to see what upgrading one subject unlocks, or filter All Routes for No University Required and TVET options near home.'
      };
    }
    return {
      badge: 'Standard Intake Assessment',
      note: 'Confirm your marks below (or scan your report card), check your biggest subject bottleneck, and lock in a backup route near home.'
    };
  }

  root.MZUI = {
    toTrustedHtml: toTrustedHtml,
    escapeHtml: escapeHtml,
    showToast: showToast,
    getGreeting: getGreeting,
    loadTtsVoices: loadTtsVoices,
    pickVoice: pickVoice,
    stopSpeech: stopSpeech,
    safeSpeech: safeSpeech,
    getHumanCheckIn: getHumanCheckIn
  };
})(typeof window !== 'undefined' ? window : globalThis);
