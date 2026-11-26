/* Splits each long screen into a short row of tabs. No inline code (strict CSP). */
(function () {
  var main = document.getElementById('app-main');
  if (!main) return;
  var TABS = {
    results: ['Overview', 'My marks'],
    careers: ['Explore', 'Career path'],
    study: ['Fit', 'Institutions', 'Funding', 'Guide'],
    plan: ['Board', 'Costs & dates', 'Documents'],
    vault: ['CV builder', 'Skills gap'],
    work: ['Jobs', 'Qualify', 'My CV', 'Sources', 'Verify']
  };
  var RULES = {
    results: [['My marks', /academic record/i], ['Overview', /./]],
    careers: [['Explore', /career reality/i], ['Career path', /./]],
    study: [['Institutions', /^institutions|institutions \(/i], ['Funding', /funding & bursaries/i], ['Guide', /how to read|other route types/i], ['Fit', /./]],
    plan: [['Board', /decision board|funding pre-check|^plan\b/i], ['Costs & dates', /typical south african|can i afford/i], ['Documents', /./]],
    vault: [['CV builder', /evidence vault|cv builder/i], ['Skills gap', /./]],
    work: [['My CV', /ats friendly/i], ['Verify', /verify|scam/i], ['Qualify', /what have you completed|your aps/i], ['Jobs', /which jobs|automatic open-job|showing \d+ of \d+|active open job|no active open job|employer identity|official link|junior|sample|^free, legal/i], ['Sources', /./]]
  };
  var cur = {};
  function tabNow() { var a = document.querySelector('nav[aria-label="Primary navigation"] .tab-btn.active'); return a ? a.getAttribute('data-tab') : 'results'; }
  function panes() {
    var out = [];
    (function add(el) {
      while (el.children.length === 1 && el.children[0].tagName === 'DIV') el = el.children[0];
      var k = el.children;
      for (var i = 0; i < k.length; i++) {
        var c = k[i];
        if (c.classList.contains('mz-sub')) continue;
        if (c.tagName === 'DIV' && /space-y-4/.test(c.className) && c.children.length > 1) add(c); else out.push(c);
      }
    })(main);
    return out;
  }
  function label(tab, el, idx) {
    if (tab === 'careers') return idx === 0 ? 'Explore' : 'Career path';
    var t = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90), r = RULES[tab] || [];
    for (var i = 0; i < r.length; i++) if (r[i][1].test(t)) return r[i][0];
    return (TABS[tab] || [''])[0];
  }
  function show(tab) {
    var want = cur[tab], ps = main.querySelectorAll('[data-mzp]');
    for (var i = 0; i < ps.length; i++) ps[i].hidden = ps[i].getAttribute('data-mzp') !== want && ps[i].getAttribute('data-mzp-also') !== want;
    var bs = main.querySelectorAll('.mz-sub button');
    for (var j = 0; j < bs.length; j++) { var on = bs[j].getAttribute('data-sub') === want; bs[j].setAttribute('aria-selected', on ? 'true' : 'false'); bs[j].classList.toggle('on', on); }
  }
  function apply() {
    if (main.querySelector(':scope > .mz-sub')) return;
    var tab = tabNow(), order = TABS[tab]; if (!order) return;
    var ps = panes(), have = {};
    ps.forEach(function (p, i) { var l = label(tab, p, i); p.setAttribute('data-mzp', l); have[l] = 1; if (tab === 'study' && p.querySelector('#study-search')) p.setAttribute('data-mzp-also', 'Courses'); });
    var tabs = order.filter(function (l) { return have[l]; });
    if (!tabs.length) return;
    if (!have[cur[tab]]) cur[tab] = tabs[0];
    if (tabs.length > 1) {
      var bar = document.createElement('div'); bar.className = 'mz-sub'; bar.setAttribute('role', 'tablist');
      tabs.forEach(function (l) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('data-sub', l); b.textContent = l; bar.appendChild(b); });
      main.insertBefore(bar, main.firstChild);
    }
    show(tab);
  }
  new MutationObserver(function () { apply(); }).observe(main, { childList: true });
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-sub]');
    if (t && main.contains(t)) { cur[tabNow()] = t.getAttribute('data-sub'); show(tabNow()); window.scrollTo(0, 0); return; }
    var q = e.target.closest && e.target.closest('[data-k],[data-study-inst],[data-career-study],[data-career-jobs]');
    if (!q) return;
    if (q.hasAttribute('data-study-inst') || q.hasAttribute('data-career-study')) cur.study = 'Courses';
    else if (q.hasAttribute('data-career-jobs')) cur.work = 'Jobs';
    else { var k = q.getAttribute('data-k'); if (k === 'fund') cur.study = 'Funding'; else if (k === 'study') cur.study = 'Fit'; else if (k === 'marks') cur.results = 'My marks'; }
  }, true);
  window.MZScreens = { go: function (tab, l) { cur[tab] = l; } };
  apply();
})();
