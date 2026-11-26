/* js/core/tts_hardened.js — Android Chrome & iOS Safari Hardened Offline Speech Reader */
export const MZ_TTS = (() => {
  'use strict';
  const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  let cachedVoices = [];
  let speaking = false;
  const normalizeLang = (tag) => String(tag || '').replace(/_/g, '-').toLowerCase();
  function loadVoices() {
    if (!synth) return [];
    const list = synth.getVoices();
    if (list && list.length) cachedVoices = list;
    return cachedVoices;
  }
  if (synth) { loadVoices(); if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', loadVoices); }
  function pickBestOfflineVoice(preferredLang = 'en-ZA') {
    const voices = loadVoices();
    if (!voices.length) return null;
    const target = normalizeLang(preferredLang);
    const base = target.split('-')[0];
    const clean = voices.filter((v) => !/espeak/i.test(v.name || ''));
    return clean.find((v) => v.localService && normalizeLang(v.lang) === target) || clean.find((v) => normalizeLang(v.lang) === target) || clean.find((v) => v.localService && normalizeLang(v.lang).startsWith(base)) || clean.find((v) => normalizeLang(v.lang).startsWith(base)) || clean[0] || null;
  }
  const isSupported = () => Boolean(synth && typeof window.SpeechSynthesisUtterance === 'function');
  function stop() { if (!synth) return; speaking = false; synth.cancel(); }
  function speakText(rawText, lang = 'en-ZA', onStateChange) {
    if (!isSupported()) return false;
    stop();
    const chunks = String(rawText || '').replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]?/g) || [];
    if (!chunks.length) return false;
    const voice = pickBestOfflineVoice(lang);
    speaking = true; onStateChange?.('speaking');
    chunks.forEach((chunk, idx) => {
      const utt = new SpeechSynthesisUtterance(chunk.trim());
      utt.lang = voice ? voice.lang.replace(/_/g, '-') : lang;
      if (voice) utt.voice = voice;
      utt.rate = 0.95;
      if (idx === chunks.length - 1) utt.onend = () => { speaking = false; onStateChange?.('idle'); };
      utt.onerror = () => { speaking = false; onStateChange?.('idle'); };
      synth.speak(utt);
    });
    return true;
  }
  return { isSupported, speakText, stop, isSpeaking: () => speaking };
})();
