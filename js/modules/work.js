/* Mzansi Pathways — Work, Job Freshness, Flyer Scam Parser, CIPC Format & CV/STAR Module (Step 6 of app.js split).
   Strict-CSP & Trusted-Types safe: pure logic, zero DOM sinks, zero external dependencies. */
(function (root) {
  'use strict';

  function csvSafeCell(v) {
    var s = v == null ? '' : String(v);
    var safe = /^[=+\-@\t\r]/.test(s) ? ("'" + s) : s;
    return '"' + safe.replace(/"/g, '""') + '"';
  }

  function getCvFreshnessInfo(updatedIso) {
    var m = String(updatedIso || '').match(/^(\d{4}-\d{2}-\d{2})$/);
    if (!m) return { stale: true, days: 999, label: 'Not dated yet — review & mark current' };
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var d = new Date(m[1] + 'T00:00:00');
    var days = Math.max(0, Math.round((today.getTime() - d.getTime()) / 86400000));
    if (days >= 30) return { stale: true, days: days, label: 'Last updated ' + days + ' days ago — refresh with your latest details' };
    return { stale: false, days: days, label: days === 0 ? 'Updated today' : ('Updated ' + days + ' day' + (days === 1 ? '' : 's') + ' ago') };
  }

  function getJobFreshness(closingStr) {
    var raw = String(closingStr || '').trim();
    if (!raw || /rolling|open|ongoing/i.test(raw)) {
      return { expired: false, label: 'Open / Rolling', badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200' };
    }
    var m = raw.match(/(\d{4}-\d{2}-\d{2})/);
    if (!m) {
      return { expired: false, label: 'Still Open • Verified', badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200' };
    }
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var target = new Date(m[1] + 'T00:00:00');
    if (isNaN(target.getTime())) {
      return { expired: false, label: 'Still Open • Verified', badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200' };
    }
    var diff = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return { expired: true, label: 'Expired', badgeClass: 'bg-rose-50 text-rose-900 border-rose-200' };
    if (diff === 0) return { expired: false, label: 'Closing Today', badgeClass: 'bg-amber-50 text-amber-900 border-amber-200' };
    if (diff <= 3) return { expired: false, label: diff + ' day' + (diff === 1 ? '' : 's') + ' left', badgeClass: 'bg-amber-50 text-amber-900 border-amber-200' };
    return { expired: false, label: diff + ' days left · Still Open', badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200' };
  }

  function getPortalCheckStatus(lastChecked) {
    var raw = String(lastChecked || '').trim();
    var m = raw.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (!m) return { overdue: true, label: 'Due for Check', badgeClass: 'bg-amber-50 text-amber-900 border-amber-200' };
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var last = new Date(m[1] + 'T00:00:00');
    var days = Math.round((today.getTime() - last.getTime()) / 86400000);
    if (days >= 7) return { overdue: true, label: 'Due (' + days + 'd ago)', badgeClass: 'bg-amber-50 text-amber-900 border-amber-200' };
    return { overdue: false, label: 'Checked Recently', badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200' };
  }

  function parseJobFlyerText(rawText) {
    if (typeof rawText !== 'string' || !rawText.trim()) return null;
    rawText = rawText.normalize('NFKC').replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff\u00ad]/g, '');
    var lines = rawText.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 80);
    var emailM = rawText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
    var email = emailM ? emailM[0] : '';
    var isFreeMail = /@(gmail|yahoo|hotmail|outlook|icloud)\.com$/i.test(email);
    var domainTrust = !email ? 'No email detected — verify official apply method' : isFreeMail ? 'Caution: Free webmail detected — confirm on CIPC BizPortal before sending ID' : 'Positive Signal: Custom company/government email domain';
    var phoneM = rawText.match(/(?:\+27|0)\s?[1-8]\d[\s-]?\d{3}[\s-]?\d{4}\b/);
    var phone = phoneM ? phoneM[0].replace(/\s+/g, ' ').trim() : '';
    var closeM = rawText.match(/(?:closes?|closing\s*date)[:\s-]*([0-3]?\d\s+[A-Za-z]{3,9}\s+20\d{2}|20\d{2}-\d{2}-\d{2})/i);
    var closing = closeM ? closeM[1].trim() : 'Verify closing date on flyer';
    var roleLine = lines.find(function (l) { return /\b(?:technician|clerk|assistant|intern|apprentice|learnership|administrator|developer|mechanic|driver|officer|coordinator)\b/i.test(l); }) || lines[0] || 'Local Vacancy';
    var flags = [];
    if (/\b(?:registration|application|admin|uniform|medical|police clearance)\s+fee\b/i.test(rawText)) flags.push('Requests upfront fee (HIGH SCAM RISK)');
    if (/\b(?:ewallet|cashsend|pay\s*r\d+)\b/i.test(rawText)) flags.push('Requests mobile money / upfront deposit (HIGH SCAM RISK)');
    if (/\b(?:bit\.ly|tinyurl\.com|t\.co|wa\.me|cutt\.ly|shorturl\.at)\b/i.test(rawText)) flags.push('Contains shortened or messaging redirect link');
    return { role: roleLine.slice(0, 90), email: email, domainTrust: domainTrust, phone: phone, closing: closing, flags: flags, safeVerdict: flags.length === 0 ? 'No upfront-fee scam flags detected — still verify company on CIPC BizPortal.' : 'WARNING: ' + flags.join(' | ') };
  }

  function validateCipcFormat(regNo) {
    var cleaned = String(regNo || '').replace(/\s+/g, '').toUpperCase();
    var m = cleaned.match(/^(?:19|20)\d{2}\/\d{6}\/(06|07|08|10|21|23|30)$/);
    if (!m) return { valid: false, msg: 'Invalid CIPC format — real SA company numbers look like 2018/123456/07 ((Pty) Ltd), /08 (NPC), or /23 (CC).' };
    var map = { '06': 'Public Company (Ltd)', '07': 'Private Company ((Pty) Ltd)', '08': 'Non-Profit Company (NPC)', '10': 'External Company', '21': 'Personal Liability (Inc)', '23': 'Close Corporation (CC)', '30': 'State-Owned Company (SOC Ltd)' };
    return { valid: true, msg: 'Valid CIPC format: ' + map[m[1]] + '. Always confirm active status on bizportal.gov.za (format alone does not prove active registration).' };
  }

  function evaluateStarAnswer(ans) {
    var t = String(ans || '').trim();
    if (!t) return null;
    var hasContext = /\b(?:when|at|during|school|home|lab|work|project|customer|classmate)\b/i.test(t);
    var hasAction = /\b(?:installed|configured|fixed|tested|checked|built|repaired|helped|sorted|explained|created)\b/i.test(t);
    var hasResult = /\b(?:worked|fixed|resolved|completed|verified|connected|faster|saved|zero|successfully)\b/i.test(t);
    var words = t.split(/\s+/).length;
    return { words: words, hasContext: hasContext, hasAction: hasAction, hasResult: hasResult };
  }

  function jobKindOf(w) {
    var blob = ((w && w.employer) || '') + ' ' + ((w && w.url) || '') + ' ' + ((w && w.title) || '');
    blob = blob.toLowerCase();
    if (/learnership|internship|apprentic|trainee|\byouth\b|sayouth|\bintern\b/.test(blob)) return 'learn';
    if (/gov\.za|\.gov\.|dpsa|department|municipal|provincial|public service|dpme|saps/.test(blob)) return 'gov';
    return 'private';
  }

  root.MZWorkMod = {
    csvSafeCell: csvSafeCell,
    getCvFreshnessInfo: getCvFreshnessInfo,
    getJobFreshness: getJobFreshness,
    getPortalCheckStatus: getPortalCheckStatus,
    parseJobFlyerText: parseJobFlyerText,
    validateCipcFormat: validateCipcFormat,
    evaluateStarAnswer: evaluateStarAnswer,
    jobKindOf: jobKindOf
  };
})(typeof window !== 'undefined' ? window : globalThis);
