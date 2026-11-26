/* js/core/trusted_dom.js — Baseline 2026 Trusted Types Gate + Safe DOM Helpers */
export const MZ_DOM = (() => {
  'use strict';
  const ALLOWED_LOCAL_SCRIPT_RE = /^\.\/(js|vendor)\/[a-z0-9_/\-.]+\.m?js$/i;
  const ttFactory = typeof window !== 'undefined' && window.trustedTypes ? window.trustedTypes : { createPolicy: (_n, r) => r };
  const workerPolicy = ttFactory.createPolicy('mz-worker', {
    createScriptURL: (url) => { if (!ALLOWED_LOCAL_SCRIPT_RE.test(String(url))) throw new Error(`Blocked untrusted script URL: ${url}`); return url; }
  });
  const uiPolicy = ttFactory.createPolicy('mz-ui', {
    createHTML: (markup) => { const s = String(markup); if (/<script|\son\w+\s*=|javascript:/i.test(s)) throw new Error('Blocked unsafe HTML sink write'); return s; }
  });
  return {
    setSafeSvg(container, svgMarkup) { if (container) container.innerHTML = uiPolicy.createHTML(svgMarkup); },
    validateScriptUrl(path) { return workerPolicy.createScriptURL(path); }
  };
})();
