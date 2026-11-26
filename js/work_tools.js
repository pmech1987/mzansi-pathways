/* Mzansi Pathways: work helpers (v79). Pure functions, no DOM, so they can be tested in Node.
   1) jobQual(job): does the job need a qualification, or is it a general entry job?
   2) fieldFit(field, job): does the job sit in the person's field of study?
   3) atsCheck(cv, ad): rule-based CV check. It is a checklist, not a real ATS and not a pass guarantee. */
(function (root) {
  'use strict';
  var LEVELS = [
    { key: 'matric', rank: 0, label: 'Matric (Grade 12)' },
    { key: 'cert', rank: 1, label: 'Certificate, N-level or NC(V)' },
    { key: 'diploma', rank: 2, label: 'Diploma' },
    { key: 'degree', rank: 3, label: 'Degree or higher' }
  ];
  var RANK = { matric: 0, cert: 1, diploma: 2, degree: 3 };
  var NEED = [
    'Matric or no qualification needed',
    'Certificate or higher usually asked',
    'Diploma or degree usually asked',
    'Degree usually asked'
  ];
  function rx(a) { return new RegExp('\\b(?:' + a.join('|') + ')\\b', 'i'); }
  var R3 = rx(['degree', 'bachelor', 'honours', 'b\\.?\\s?sc', 'b\\.?\\s?com', 'accountant', 'attorney', 'lecturer', 'pharmacist', 'psycholog\\w*', 'social worker', 'architect', 'scientist', 'actuar\\w*', 'engineer', 'teacher', 'educator']);
  var R2 = rx(['diploma', 'national diploma', 'b\\.?\\s?tech', 'graduate', 'developer', 'programmer', 'software', 'analyst', 'administrator', 'officer', 'coordinator', 'supervisor', 'bookkeeper', 'paralegal', 'nurse', 'nursing', 'designer', 'consultant']);
  var R1 = rx(['certificate', 'n[1-6]', 'nc\\(v\\)', 'a\\+', 'artisan', 'apprentice\\w*', 'technician', 'technologist', 'it support', 'help ?desk', 'electrician', 'plumber', 'fitter', 'welder', 'mechanic', 'receptionist', 'secretary']);
  var R0 = rx(['general worker', 'cleaner', 'packer', 'driver', 'cashier', 'clerk', 'assistant', 'attendant', 'waiter', 'waitress', 'labourer', 'merchandiser', 'call cent(?:re|er)', 'sales', 'data capturer', 'learnership', 'youth', 'entry[- ]level', 'trainee', 'security']);

  function jobQual(w) {
    w = w || {};
    var key = String(w.minQual || '').toLowerCase();
    if (key in RANK) return { rank: RANK[key], label: NEED[RANK[key]], inferred: false };
    var t = String(w.title || '');
    var rank = null;
    if (/graduate/i.test(t) && !/\bgeneral\b/i.test(t)) rank = 2;
    else if (R3.test(t)) rank = 3;
    else if (R2.test(t)) rank = 2;
    else if (R1.test(t)) rank = 1;
    else if (R0.test(t)) rank = 0;
    if (rank === null) return { rank: null, label: 'Check the advert for the qualification', inferred: true };
    return { rank: rank, label: NEED[rank], inferred: true };
  }

  var IT = ['it', 'ict', 'information technology', 'computer', 'software', 'network', 'support', 'help desk', 'helpdesk', 'systems', 'developer', 'programmer', 'database', 'web', 'cyber', 'technician', 'data', 'infrastructure', 'cloud'];
  var FIELDS = [
    [/\b(it|ict|information tech\w*|computer\w*|software|network\w*|cyber\w*|programming|web)\b/i, IT],
    [/\b(account\w*|financ\w*|bookkeep\w*|business|commerce|banking|audit\w*)\b/i, ['account', 'finance', 'financial', 'bookkeeper', 'payroll', 'audit', 'tax', 'credit', 'cashier', 'business', 'admin']],
    [/\b(engineer\w*|electr\w*|mechanic\w*|civil|industrial)\b/i, ['engineer', 'electrical', 'mechanical', 'technician', 'artisan', 'maintenance', 'plant', 'draughts']],
    [/\b(admin\w*|office|secretar\w*|management|public)\b/i, ['admin', 'clerk', 'office', 'secretary', 'receptionist', 'coordinator', 'officer', 'data capturer']],
    [/\b(educat\w*|teach\w*)\b/i, ['teacher', 'educator', 'tutor', 'lecturer', 'facilitator']],
    [/\b(health\w*|nurs\w*|care)\b/i, ['nurse', 'nursing', 'clinic', 'care', 'health', 'pharmacy']],
    [/\b(market\w*|sales|retail)\b/i, ['sales', 'marketing', 'retail', 'merchandiser', 'cashier', 'brand']]
  ];
  function fieldWords(field) {
    var f = String(field || '').trim();
    if (!f) return [];
    for (var i = 0; i < FIELDS.length; i++) if (FIELDS[i][0].test(f)) return FIELDS[i][1];
    return f.toLowerCase().split(/[^a-z0-9]+/).filter(function (x) { return x.length >= 4; });
  }
  function fieldFit(field, job) {
    var words = fieldWords(field); if (!words.length) return false;
    var blob = (' ' + String((job && job.title) || '') + ' ').toLowerCase();
    return words.some(function (w) { return new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(blob); });
  }
  function fits(level, job) {
    var q = jobQual(job);
    var mine = (level in RANK) ? RANK[level] : null;
    if (mine === null || q.rank === null) return null;
    return q.rank <= mine;
  }

  var STOP = 'and the for are you our all any can has its not but may use per etc need plus looking join apply send email cv with that this from have will your their they them been were about which would should could into than then also able must other more such only over some when what where well work working experience years year role position candidate applicant company team including required requirements responsibilities duties ability skills strong good excellent knowledge demonstrated'.split(' ');
  function keywords(ad) {
    var c = {}; String(ad || '').toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ').split(/\s+/).forEach(function (w) {
      w = w.replace(/^\.+|\.+$/g, '');
      if (w.length < 3 || STOP.indexOf(w) >= 0 || /^\d+$/.test(w)) return; c[w] = (c[w] || 0) + 1;
    });
    return Object.keys(c).sort(function (a, b) { return c[b] - c[a] || a.localeCompare(b); }).slice(0, 14);
  }

  function atsCheck(cv, ad) {
    var t = String(cv || ''), items = [], score = 0;
    function add(ok, pts, good, bad) { items.push({ ok: ok, text: ok ? good : bad }); if (ok) score += pts; }
    var words = (t.match(/\S+/g) || []).length;
    if (words < 40) return { score: 0, items: [{ ok: false, text: 'Paste your CV text first (at least a few lines).' }], missing: [], matched: [], words: words };
    add(/[\w.+-]+@[\w-]+\.[\w.-]+/.test(t), 12, 'Email address found.', 'No email address found. Employers and ATS systems need one.');
    add(/(?:\+27|\b0)[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/.test(t), 10, 'South African phone number found.', 'No phone number found (e.g. 082 555 0194).');
    add(/\b(education|qualifications?|academic)\b/i.test(t), 10, 'Has an Education / Qualifications heading.', 'Add a heading called "Education" or "Qualifications".');
    add(/\b(experience|employment|work history|work experience)\b/i.test(t), 10, 'Has an Experience / Work history heading.', 'Add a heading called "Work experience" (use Projects or Volunteering if you have no jobs yet).');
    add(/\bskills?\b/i.test(t), 10, 'Has a Skills section.', 'Add a "Skills" heading with the tools you really use.');
    add(/\b(diploma|degree|certificate|national certificate|nqf|n[3-6]|nc\(v\)|matric|nsc)\b/i.test(t), 10, 'Names your qualification.', 'Name your qualification in full, e.g. "National Diploma: Information Technology".');
    add(/\b(19|20)\d{2}\b/.test(t), 8, 'Has years/dates.', 'Add years for your studies and any work (e.g. 2022 to 2024).');
    add(words >= 150 && words <= 900, 8, 'Length is about right (' + words + ' words, 1 to 2 pages).', words < 150 ? 'Very short (' + words + ' words). Add projects, tools and achievements.' : 'Long (' + words + ' words). Aim for 2 pages; cut old or unrelated items.');
    var odd = (t.match(/[│┃┆┇┊┋█■□●○◆◇★☆✓✔✦➤➢]|[\u{1F300}-\u{1FAFF}]/gu) || []).length, pipes = (t.match(/\|/g) || []).length, tabs = (t.match(/\t/g) || []).length;
    add(odd === 0 && tabs < 6 && pipes < 12, 8, 'No odd symbols, emojis or table-like layout detected.', 'Odd symbols, emojis or table/column layout found. ATS software often scrambles these; use plain text and simple bullets.');
    var id = /\b\d{2}[01]\d[0-3]\d\d{4}[01]\d{2}\b/.test(t.replace(/\s/g, ' ').replace(/(\d)\s(?=\d)/g, '$1'));
    add(!id, 4, 'No ID number in the CV (good for your safety).', 'A 13-digit ID number looks present. Remove it; give it only when an employer asks.');
    var verbs = (t.match(/\b(installed|configured|built|developed|managed|supported|resolved|trained|designed|maintained|assisted|created|improved|led|set up|troubleshot|repaired)\b/gi) || []).length;
    add(verbs >= 3, 10, 'Uses action words (' + verbs + ' found).', 'Start bullets with action words: "Configured...", "Resolved...", "Supported...".');
    var matched = [], missing = [];
    if (String(ad || '').trim().length > 30) {
      var low = t.toLowerCase();
      keywords(ad).forEach(function (k) { (low.indexOf(k) >= 0 ? matched : missing).push(k); });
      var tot = matched.length + missing.length;
      if (tot) { var pts = Math.round(10 * matched.length / tot); score += pts; items.push({ ok: matched.length / tot >= 0.5, text: matched.length + ' of ' + tot + ' key words from the advert appear in your CV.' }); }
    } else { score += 10; }
    return { score: Math.min(100, score), items: items, matched: matched, missing: missing, words: words, adGiven: String(ad || '').trim().length > 30 };
  }
  root.MZWORK = { LEVELS: LEVELS, jobQual: jobQual, fieldFit: fieldFit, fits: fits, atsCheck: atsCheck, keywords: keywords };
  if (typeof module !== 'undefined') module.exports = root.MZWORK;
})(typeof window !== 'undefined' ? window : globalThis);
