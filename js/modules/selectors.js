/* Mzansi Pathways — Single Sources of Truth Selectors (v126: B5, B6, B10, B11).
 * Pure logic (no DOM). Runs in browser AND Node.js tests.
 */
(function (root) {
  'use strict';

  var SA_PROVINCES = [
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
    'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'
  ];

  function getHome(state) {
    var prov = (state && typeof state.province === 'string' && state.province.trim()) ? state.province.trim() : 'Mpumalanga';
    var canRelocate = !(state && state.nearHomeOnly);
    return { province: prov, canRelocate: canRelocate };
  }

  function computeDistanceLabel(itemProvince, home) {
    var h = home || getHome(null);
    var p = String(itemProvince || '').trim();
    if (!p || /national|all|online|remote/i.test(p)) {
      return { sameProvince: true, label: 'National / Remote (no relocation required)', short: 'No relocation' };
    }
    if (p.toLowerCase() === h.province.toLowerCase()) {
      return { sameProvince: true, label: 'Near home (' + h.province + ' — 0 relocation)', short: 'Near home' };
    }
    return {
      sameProvince: false,
      label: 'Relocation (' + p + ' — outside ' + h.province + ')',
      short: h.canRelocate ? ('Relocation (' + p + ')') : ('Outside ' + h.province + ' (cannot relocate)')
    };
  }

  function isSampleJob(record) {
    if (!record || typeof record !== 'object') return false;
    if (record.isSample === true) return true;
    var title = String(record.title || '');
    var id = String(record.id || '');
    return /\[(?:dpsa\s+)?sample\]/i.test(title) || /^wk_[12]$/.test(id);
  }

  function getTrust(record) {
    if (!record || typeof record !== 'object') {
      return { status: 'unverified', label: 'Not verified yet', source: 'No source recorded', scam: 'Not checked yet' };
    }
    if (isSampleJob(record)) {
      return {
        status: 'sample',
        label: 'Sample / Demo (not a live vacancy)',
        source: 'Illustrative sample only — use official SA portals below',
        scam: 'Sample record — always verify live adverts on .gov.za or employer site'
      };
    }
    var hasUrl = typeof record.url === 'string' && /^https:\/\//i.test(record.url);
    var checked = !!(record.checkedAt || record.verifiedAt || record.domainChecked);
    if (hasUrl && checked) {
      return {
        status: 'checked',
        label: 'Official HTTPS domain checked',
        source: String((record.trust && record.trust.source) || 'Verified feed'),
        scam: String((record.trust && record.trust.scam) || 'Zero-fee & domain check passed')
      };
    }
    return {
      status: 'unverified',
      label: 'Not verified yet',
      source: hasUrl ? 'External link — verify directly with employer' : 'No official source link',
      scam: 'Not checked yet — never pay application fees'
    };
  }

  function getCounts(state) {
    var docs = (state && state.docChecklist && typeof state.docChecklist === 'object') ? state.docChecklist : {};
    var docKeys = Object.keys(docs);
    var docsReady = docKeys.filter(function (k) { return !!docs[k]; }).length;
    var plan = (state && state.plan && typeof state.plan === 'object') ? state.plan : {};
    var planSize = ['A', 'B', 'C'].filter(function (k) { return !!plan[k]; }).length;
    var savedJobs = Array.isArray(state && state.savedJobs) ? state.savedJobs.length : 0;
    return { docsReady: docsReady, docsTotal: docKeys.length, planSize: planSize, savedJobs: savedJobs };
  }

  var api = {
    SA_PROVINCES: SA_PROVINCES,
    getHome: getHome,
    computeDistanceLabel: computeDistanceLabel,
    isSampleJob: isSampleJob,
    getTrust: getTrust,
    getCounts: getCounts
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MZSelectors = api;
})(typeof window !== 'undefined' ? window : globalThis);
