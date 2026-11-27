/* Mzansi Pathways - prospectus_check.js
 * Reads a prospectus on the person's own device and builds an "mz-community-v1" file (see scripts/community_submissions.py).
 * Nothing is uploaded. The rules mirror scripts/pipeline_extract.py closely enough to compare; they decide nothing about what is true. */
(function () {
  'use strict';
  var LEVEL_PCT = { 7: 80, 6: 70, 5: 60, 4: 50, 3: 40, 2: 30, 1: 0 };
  // Subject patterns come from js/subjects_data.js (generated from the Python reader, so both always match).
  var SUBJECTS = ((typeof globalThis !== 'undefined' && globalThis.MZ_SUBJECTS) || []).map(function (x) { return [new RegExp(x[0], 'i'), x[1]]; });
  var ANY = SUBJECTS.length ? SUBJECTS.map(function (s) { return '(?:' + s[0].source + ')'; }).join('|') : '(?!x)x';
  var REQ = new RegExp('((?:' + ANY + ')(?:\\s*(?:/|,|or)\\s*(?:' + ANY + '))*)\\s*(?:\\([^)]{0,40}\\))?\\s*[:\\-\\u2013=]?\\s*(?:(?:level|lvl)\\s*(\\d)|(\\d{2,3})\\s*%|([1-7])(?![\\d%.]))', 'gi');
  var HEAD = /^(?:(?:BSc|BA|BCom|BEng|BEngTech|BTech|BEd|BSocSci|BAdmin|BCompt|BPharm|BNurs|BHSc|LLB|MBChB|BDS|BVSc|BArch|BPsych|BMus|BTh|BSW|BIS|BPrimEd|BTRP|BCur|BRad|BOptom|BSportSc|BMedSc|BAgric|BEngSc|BAcc|BFin)\b|(?:Bachelor|Diploma|Higher Certificate|Advanced Diploma|National Diploma|NC\(V\)|NATED|N[1-6])\b)[^\n]{3,110}$/;
  var APS = /(?:\bAPS\b|admission\s+point(?:\s+score)?s?|\bAP\b)[^\d\n]{0,25}(\d{2,3}(?:\.\d)?)/i;
  var APS_G = new RegExp(APS.source, 'gi');
  var TARGET = /\b(?:diploma|degree|bachelor|b\.?\s?sc|b\.?\s?com|b\.?\s?ed|b\.?\s?tech|b\.?\s?eng)\b/i;
  var CREDIT = /\b(?:credits?|exemptions?|recognition\s+of\s+prior)\b/i;
  var ACCESS = /\b(?:progress(?:ion)?|articulat\w*|access\s+to|gain\s+entry|admission\s+to|may\s+apply|can\s+apply|eligible\s+(?:for|to)|leads?\s+(?:on\s+)?to|pathway|move\s+on\s+to)\b/i;
  var BRIDGE = /\b(?:bridg\w+|foundation|extended\s+(?:curriculum|programme))\b/i;
  var NAME = /\b((?:Advanced\s+Diploma|National\s+Diploma|Diploma|Bachelor|BSc|BCom|BEd|BTech|BEngTech|BEng)\s+(?:of|in)?\s*[A-Z][A-Za-z&\/,\- ]{3,70})/g;
  var BAD = /https?:\/\/|www\.|@|\b(?:wa\.me|t\.me|bit\.ly|tinyurl\.com|cutt\.ly|shorturl\.at)\b|<\s*\/?\s*script\b|javascript:|\b\d{13}\b|(?:^|\D)0\d{2}[\s-]?\d{3}[\s-]?\d{4}(?!\d)|\+27[\s-]?\d{9}/i;

  function $(id) { return document.getElementById(id); }
  function cleanName(l) { return l.replace(/\s*\.{3,}.*$|\s+\d{1,4}$/, '').trim().replace(/^[ :\-\u2013]+|[ :\-\u2013]+$/g, ''); }
  function parseMarks(line) {
    var out = [], m; REQ.lastIndex = 0;
    while ((m = REQ.exec(line))) {
      var mark = m[3] ? parseInt(m[3], 10) : LEVEL_PCT[parseInt(m[2] || m[4], 10)];
      if (mark == null || mark < 0 || mark > 100) continue;
      var any = [];
      SUBJECTS.forEach(function (s) { if (s[0].test(m[1])) s[1].forEach(function (n) { if (any.indexOf(n) < 0) any.push(n); }); });
      if (any.length) out.push({ anyOf: any, minMark: mark });
    }
    return out;
  }
  function sentences(lines) {
    var units = [], cur = [];
    lines.forEach(function (raw) {
      var l = raw.replace(/[\u2022\u00b7]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!l) { if (cur.length) { units.push(cur.join(' ')); cur = []; } return; }
      if (l.split(' ').length <= 6 && !/[.;!?:]$/.test(l)) { if (cur.length) { units.push(cur.join(' ')); cur = []; } units.push(l); return; }
      cur.push(l); if (/[.!?]$/.test(l)) { units.push(cur.join(' ')); cur = []; }
    });
    if (cur.length) units.push(cur.join(' '));
    var out = []; units.forEach(function (u) { u.replace(/([.;!?])\s+(?=[A-Z(])/g, '$1\u0001').split('\u0001').forEach(function (x) { if (x.trim()) out.push(x.trim()); }); });
    return out;
  }
  function progression(block, page, name) {
    var out = [], seen = {};
    sentences(block).forEach(function (s) {
      if (s.length < 25 || out.length >= 3) return;
      var kind = null, t = TARGET.test(s);
      if (CREDIT.test(s) && t) kind = 'credit'; else if (ACCESS.test(s) && t) kind = 'access'; else if (BRIDGE.test(s)) kind = 'bridging';
      if (!kind) return;
      var q = s.slice(0, 300), k = q.toLowerCase().replace(/[^a-z0-9]+/g, '');
      var qNorm = q.normalize('NFKC').replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff\u00ad]/g, ''); if (seen[k] || BAD.test(qNorm)) return; seen[k] = 1;
      var to = [], m; NAME.lastIndex = 0;
      while ((m = NAME.exec(s))) { var n = m[1].split(/\s+(?:and|with|for|to|who|or|where|after|once|on|from|which)\s+/)[0].replace(/\s+/g, ' ').trim(); if (n && to.indexOf(n) < 0) to.push(n.slice(0, 80)); }
      out.push({ name: name, kind: kind, text: q, to: to.slice(0, 3), page: page });
    });
    return out;
  }
  function extract(pages) {
    var rows = [], prog = [];
    pages.forEach(function (text, pi) {
      var lines = text.split('\n').map(function (l) { return l.replace(/\s+$/, ''); });
      var heads = [];
      lines.forEach(function (l, i) { var t = l.trim(); if (HEAD.test(t) && !APS.test(l) && t.length <= 120) heads.push(i); });
      heads.forEach(function (i, k) {
        var end = k + 1 < heads.length ? heads[k + 1] : lines.length, block = lines.slice(i + 1, Math.min(end, i + 41)), apss = [];
        block.forEach(function (l) { var m; APS_G.lastIndex = 0; while ((m = APS_G.exec(l))) apss.push(parseFloat(m[1])); });
        if (!apss.length) return;
        apss.sort(function (a, b) { return a - b; });
        var subj = [], seen = {};
        block.forEach(function (l) { parseMarks(l).forEach(function (r) { var key = r.anyOf.join('|') + r.minMark; if (!seen[key]) { seen[key] = 1; subj.push(r); } }); });
        var name = cleanName(lines[i]);
        var ev = block.filter(function (l) { return APS.test(l) || parseMarks(l).length; });
        var quote = [lines[i].trim()].concat(ev).join(' ').replace(/\s+/g, ' ').slice(0, 300);
        if (BAD.test(quote + name)) return;
        rows.push({ name: name.slice(0, 120), minAps: apss[0], subjects: subj.slice(0, 12), page: pi + 1, quote: quote, keep: true });
        if (/^(higher certificate|certificate)|extended\s+(curriculum|programme|degree)|foundation\s+(programme|year)|\becp\b/i.test(name)) progression(block, pi + 1, name).forEach(function (p) { prog.push(p); });
      });
    });
    return { rows: rows, progression: prog };
  }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function submitterId() {
    try { var v = localStorage.getItem('mz_submitter'); if (/^[a-f0-9]{32}$/.test(v || '')) return v; } catch (e) { /* storage may be blocked */ }
    var a = new Uint8Array(16); crypto.getRandomValues(a); var id = hex(a.buffer);
    try { localStorage.setItem('mz_submitter', id); } catch (e) { /* fine: id lasts for this visit only */ }
    return id;
  }

  var state = null;
  function cell(tr, text) { var td = document.createElement('td'); td.textContent = text; tr.appendChild(td); return td; }
  function render(res, via) {
    state = { res: res, via: via };
    $('result').hidden = false;
    $('summary').textContent = res.rows.length + ' course(s) and ' + res.progression.length + ' next-step statement(s) found' + (via === 'pdf-ocr' ? ' (scanned pages are read less reliably: check the numbers)' : '') + '. Untick any row that looks wrong.';
    var tb = $('rows'); while (tb.firstChild) tb.removeChild(tb.firstChild);
    res.rows.forEach(function (r) {
      var tr = document.createElement('tr');
      cell(tr, r.name); cell(tr, String(r.minAps));
      cell(tr, r.subjects.map(function (s) { return s.anyOf[0].replace(' Home Language', '') + ' ' + s.minMark + '%'; }).join(', ') || '-'); cell(tr, String(r.page));
      var td = document.createElement('td'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = true;
      cb.setAttribute('aria-label', 'Keep ' + r.name); cb.addEventListener('change', function () { r.keep = cb.checked; }); td.appendChild(cb); tr.appendChild(td);
      tb.appendChild(tr);
    });
    var ul = $('prog'); while (ul.firstChild) ul.removeChild(ul.firstChild);
    if (!res.progression.length) { var li0 = document.createElement('li'); li0.textContent = 'None found. That is normal: many prospectuses say nothing about this.'; ul.appendChild(li0); }
    res.progression.forEach(function (p) { var li = document.createElement('li'); li.textContent = p.name + ' (' + p.kind + ', p. ' + p.page + '): "' + p.text + '"'; ul.appendChild(li); });
  }
  async function readIt() {
    var f = $('file').files[0], paste = $('paste').value, text = '', via = 'paste', sha;
    $('status').textContent = 'Reading...'; $('read').disabled = true;
    try {
      if (f) {
        if (!root().MZOCR) throw new Error('The file reader is not available here. Paste the text instead.');
        var r = await root().MZOCR.readAnyFile(f, { canvas: null }); text = r.text || ''; via = r.via || 'file';
        sha = hex(await crypto.subtle.digest('SHA-256', await f.arrayBuffer()));
      } else if (paste.trim().length > 80) {
        text = paste; sha = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(paste)));
      } else throw new Error('Choose a file or paste some text first.');
      var pages = text.indexOf('\f') > -1 ? text.split('\f') : [text];
      var res = extract(pages);
      state = null; render(res, via); state.sha = sha; state.name = f ? f.name : 'pasted text';
      $('status').textContent = '';
    } catch (e) { $('status').textContent = String(e && e.message || e).slice(0, 160); }
    $('read').disabled = false;
  }
  function root() { return typeof window !== 'undefined' ? window : globalThis; }
  function download() {
    if (!state) return;
    var fb = [], issue = $('fbissue').value, pid = $('fbid').value.trim(), note = $('fbnote').value.trim();
    if (issue && /^[A-Za-z0-9_\-.]{3,80}$/.test(pid) && !BAD.test(note)) fb.push({ programmeId: pid, issue: issue, note: note.slice(0, 140) });
    else if (issue) { $('status').textContent = 'Feedback needs a course id (letters, numbers, _ - .) and no links, emails or phone numbers in the note.'; return; }
    var doc = {
      schema: 'mz-community-v1', submitter: submitterId(), institutionId: $('inst').value, year: parseInt($('year').value, 10),
      doc: { name: String(state.name || '').replace(/[^\w .\-]/g, '').slice(0, 120), sha256: state.sha, via: state.via === 'pdf-ocr' || state.via === 'image-ocr' ? 'ocr' : 'text' },
      rows: state.res.rows.filter(function (r) { return r.keep; }).map(function (r) { return { name: r.name, minAps: r.minAps, subjects: r.subjects, page: r.page, quote: r.quote }; }),
      progression: state.res.progression, feedback: fb
    };
    var blob = new Blob([JSON.stringify(doc, null, 1)], { type: 'application/json;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'prospectus-check-' + doc.institutionId + '-' + doc.year + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    $('status').textContent = 'File downloaded.';
  }
  function init() {
    var sel = $('inst'), cat = root().MZ_CATALOGUE;
    ((cat && cat.institutions) || []).forEach(function (i) { var o = document.createElement('option'); o.value = i.id; o.textContent = i.name || i.id; sel.appendChild(o); });
    $('read').addEventListener('click', readIt); $('dl').addEventListener('click', download);
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init(); }
  if (typeof module !== 'undefined') module.exports = { extract: extract };
})();
