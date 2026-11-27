/* Mzansi Pathways — Storage, State Integrity & PBKDF2/AES-GCM Crypto Module (Step 1 of app.js modular split).
   Strict-CSP & Trusted-Types safe: pure logic, zero DOM sinks, zero external dependencies. */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'mzansi_pathways_v2_state';
  var PREV_KEY = STORAGE_KEY + '_prev';
  var CORRUPT_KEY = STORAGE_KEY + '_corrupt';
  var UNDO_KEY = STORAGE_KEY + '_before_restore';
  var KDF_ITER_V1 = 120000;
  var KDF_ITER_V2 = 600000;

  function getClientHealthStatus(state) {
    var subCount = state && Array.isArray(state.subjects) ? state.subjects.length : 0;
    var plansSet = ['A', 'B', 'C'].filter(function (k) { return state && state.plans && state.plans[k]; }).length;
    var storageOk = true;
    try { localStorage.setItem('__mp_ping', '1'); localStorage.removeItem('__mp_ping'); } catch (e) { storageOk = false; }
    return 'Profile Verified: ' + subCount + ' subjects · ' + plansSet + '/3 plans linked · Local Storage ' + (storageOk ? 'OK' : 'Restricted');
  }

  function checkPassphraseStrength(pass) {
    var s = String(pass || '');
    if (!s) return { label: 'Enter at least 8 characters to lock/unlock backups', cls: 'text-slate-600' };
    if (s.length < 8) return { label: 'Too short (' + s.length + '/8 chars minimum)', cls: 'text-rose-700 font-bold' };
    var hasNum = /\d/.test(s);
    var hasSym = /[^A-Za-z0-9]/.test(s);
    if (s.length >= 12 && (hasNum || hasSym)) return { label: 'Strong passphrase (12+ chars with numbers/symbols)', cls: 'text-emerald-800 font-bold' };
    return { label: 'Fair passphrase — add numbers or make it 12+ chars for extra security', cls: 'text-amber-800 font-bold' };
  }

  function validateStateIntegrity(s, sampleProgrammes) {
    if (!s || typeof s !== 'object') return;
    if (Array.isArray(s.subjects)) {
      var seen = new Set();
      s.subjects = s.subjects.filter(function (sub) {
        var key = String((sub && sub.name) || '').trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    if (!Array.isArray(s.savedCvs)) s.savedCvs = [];
    else s.savedCvs = s.savedCvs.filter(function (x) { return x && typeof x === 'object' && x.label; }).slice(0, 8);
    if (!Array.isArray(s.cvQualifications)) s.cvQualifications = [];
    else s.cvQualifications = s.cvQualifications.map(function (x) { return String(x || '').trim(); }).filter(Boolean).slice(0, 8);
    if (!Array.isArray(s.govWatchlist) || !s.govWatchlist.length) {
      s.govWatchlist = [{ name: 'Friday DPSA Circulars (gov.za)', url: 'https://www.gov.za/about-government/government-jobs', cadence: 'Every Friday', lastChecked: 'Not checked yet' }];
    }
    if (s.plans && typeof s.plans === 'object' && Array.isArray(sampleProgrammes) && sampleProgrammes.length) {
      var validIds = new Set(sampleProgrammes.map(function (x) { return x.id; }));
      ['A', 'B', 'C'].forEach(function (k) {
        if (s.plans[k] && !validIds.has(s.plans[k])) s.plans[k] = sampleProgrammes[0].id;
      });
    }
  }

  function repairState(s, defaultSubjects, sampleProgrammes) {
    if (!s || typeof s !== 'object') return;
    if (['matric', 'cert', 'diploma', 'degree'].indexOf(s.qualLevel) < 0) s.qualLevel = '';
    s.qualField = String(s.qualField || '').slice(0, 60);
    if (['all', 'general', 'qualified', 'mine'].indexOf(s.workQual) < 0) s.workQual = 'all';
    validateStateIntegrity(s, sampleProgrammes);
    if (!Array.isArray(s.subjects) || s.subjects.length < 1) {
      s.subjects = (defaultSubjects || []).map(function (x) { return Object.assign({}, x); });
    }
    s.subjects = s.subjects.map(function (x) {
      return {
        name: String((x && x.name) || 'Subject').slice(0, 80),
        mark: Math.max(0, Math.min(100, Number(x && x.mark) || 0)),
        isHomeLanguage: !!(x && x.isHomeLanguage),
        isLifeOrientation: !!(x && x.isLifeOrientation)
      };
    });
    if (!Array.isArray(s.evidenceVault)) s.evidenceVault = [];
    if (!s.studyF || typeof s.studyF !== 'object' || Array.isArray(s.studyF)) s.studyF = {};
    if (!Array.isArray(s.studyCmp)) s.studyCmp = [];
    if (!Array.isArray(s.studyPlanPicks)) s.studyPlanPicks = [];
    if (!s.plans || typeof s.plans !== 'object') s.plans = { A: 'up_bsc_cs', B: 'ump_dip_ict', C: 'tut_hc_it' };
    if (!s.planStatus || typeof s.planStatus !== 'object') s.planStatus = { A: 'Not Started', B: 'Not Started', C: 'Not Started' };
    if (!s.affordA || typeof s.affordA !== 'object') s.affordA = { tuition: 58000, accomm: 45000, transport: 6000, funding: 0 };
    if (!s.affordC || typeof s.affordC !== 'object') s.affordC = { tuition: 12000, accomm: 0, transport: 7200, funding: 12000 };
    if (!s.docChecklist || typeof s.docChecklist !== 'object') s.docChecklist = { 'Matric / Grade 11 Statement': true };
    if (!Array.isArray(s.compareRouteIds)) s.compareRouteIds = ['up_bsc_cs', 'ump_dip_ict', 'tut_hc_it'];
  }

  async function deriveAesKey(passphrase, salt, iterations) {
    var enc = new TextEncoder();
    var baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: iterations || KDF_ITER_V2, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  root.MZStorage = {
    STORAGE_KEY: STORAGE_KEY,
    PREV_KEY: PREV_KEY,
    CORRUPT_KEY: CORRUPT_KEY,
    UNDO_KEY: UNDO_KEY,
    KDF_ITER_V1: KDF_ITER_V1,
    KDF_ITER_V2: KDF_ITER_V2,
    getClientHealthStatus: getClientHealthStatus,
    checkPassphraseStrength: checkPassphraseStrength,
    validateStateIntegrity: validateStateIntegrity,
    repairState: repairState,
    deriveAesKey: deriveAesKey
  };
})(typeof window !== 'undefined' ? window : globalThis);
