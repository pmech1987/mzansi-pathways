/* Mzansi Pathways — Offline SA Deadline Countdown & RFC 5545 .ics Calendar Exporter (renamed from v102_deadline_ics.js) */
/* Mzansi Pathways v102 Offline SA Deadline Countdown & RFC 5545 Calendar (.ics) Reminder Exporter.
   Strict-CSP & Trusted-Types safe: zero raw HTML sinks, zero inline handlers, 100% offline capable. */
(function () {
  'use strict';

  var DEFAULT_DEADLINES = [
    { id: 'funza-returning-2027', title: 'Funza Lushaka 2027 Bursary (Returning)', date: '2026-11-30', notes: 'Verify on https://www.eservices.gov.za/' },
    { id: 'funza-new-2027', title: 'Funza Lushaka 2027 Bursary (New Applicants)', date: '2027-01-31', notes: 'Verify on https://www.eservices.gov.za/ (age <=30 by 31 Mar 2027, 4-yr BEd)' },
    { id: 'cas-check-2027', title: 'CAS (Central Application Service) Placement Check', date: '2027-01-20', notes: 'CAS WhatsApp 081 308 4196 (replaced discontinued CACH)' }
  ];

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') n.className = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    if (text != null) n.textContent = String(text);
    return n;
  }

  function icsEscape(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  function daysUntil(isoDate, nowDate) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ''));
    if (!m) return null;
    var target = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    var ref = nowDate || new Date();
    var today = Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());
    return Math.round((target - today) / 86400000);
  }

  function buildIcs(events) {
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Mzansi Pathways//SA Opportunity Deadlines v102//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];
    (events || []).forEach(function (ev) {
      var d = String(ev.date || '').replace(/-/g, '');
      if (!/^\d{8}$/.test(d)) return;
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + icsEscape(ev.id || d) + '@mzansi-pathways.local');
      lines.push('DTSTAMP:' + stamp);
      lines.push('DTSTART;VALUE=DATE:' + d);
      lines.push('SUMMARY:' + icsEscape(ev.title || 'Mzansi Pathways Deadline'));
      lines.push('DESCRIPTION:' + icsEscape(ev.notes || 'Confirm official closing date directly with the institution.'));
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push('TRIGGER:-P7D');
      lines.push('DESCRIPTION:7 days left: ' + icsEscape(ev.title || 'Deadline'));
      lines.push('END:VALARM');
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push('TRIGGER:-P2D');
      lines.push('DESCRIPTION:2 days left: ' + icsEscape(ev.title || 'Deadline'));
      lines.push('END:VALARM');
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }

  function downloadIcs(events, filename) {
    var blob = new Blob([buildIcs(events)], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: filename || 'mzansi-pathways-deadlines.ics' });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function mountDeadlineReminders() {
    var modal = document.getElementById('settings-modal');
    if (!modal || document.getElementById('v102-ics-box')) return;
    var host = modal.querySelector('.space-y-4, .space-y-3') || modal.firstElementChild || modal;

    var box = el('details', { id: 'v102-ics-box', className: 'v97-backup-box v105-settings-acc' });
    box.appendChild(el('summary', { className: 'v97-backup-title v105-acc-summary' }, 'Offline SA Deadline Reminders (.ics Calendar)'));
    box.appendChild(el('p', { className: 'v97-backup-desc' }, 'Export key verified South African closing dates with 7-day and 2-day alerts straight to your phone calendar.'));

    var list = el('div', { className: 'v102-ics-list' });
    var activeEvents = DEFAULT_DEADLINES.slice();

    function renderRows(items) {
      while (list.firstChild) list.removeChild(list.firstChild);
      items.forEach(function (ev) {
        var d = daysUntil(ev.date);
        var badgeText = d == null ? ev.date : (d < 0 ? 'Closed' : d === 0 ? 'Closes today' : d + 'd left');
        var row = el('div', { className: 'v102-ics-row' });
        row.appendChild(el('span', { className: 'v102-ics-name' }, ev.title + ' (' + ev.date + ')'));
        row.appendChild(el('span', { className: 'v102-ics-badge' }, badgeText));
        list.appendChild(row);
      });
    }

    var btnRow = el('div', { className: 'v97-backup-row v101-mt8' });
    var btnDl = el('button', { type: 'button', id: 'v102-btn-ics', className: 'v97-btn-primary' }, 'Add Deadlines to Calendar (.ics)');
    var status = el('div', { id: 'v102-ics-status', className: 'v97-backup-status', role: 'status', 'aria-live': 'polite' }, '');

    btnDl.addEventListener('click', function () {
      try {
        downloadIcs(activeEvents, 'mzansi-pathways-sa-deadlines.ics');
        status.textContent = 'Calendar file downloaded. Tap it to add 7-day and 2-day reminders.';
        if (typeof window.mzAnnounce === 'function') window.mzAnnounce('Calendar reminders file downloaded.');
      } catch (e) {
        status.textContent = 'Could not generate calendar file on this browser.';
      }
    });

    btnRow.appendChild(btnDl);
    box.appendChild(list);
    box.appendChild(btnRow);
    box.appendChild(status);
    host.appendChild(box);
    renderRows(activeEvents);

    /* Enrich with live data/events.json when available */
    fetch('./data/events.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (doc) {
      if (!doc || !Array.isArray(doc.events)) return;
      var upcoming = doc.events.filter(function (e) {
        var cd = e.closingDate || e.date;
        var d = daysUntil(cd);
        return d != null && d >= 0;
      }).slice(0, 6).map(function (e) {
        return {
          id: e.id || 'event',
          title: e.title || e.name || 'SA Opportunity Deadline',
          date: e.closingDate || e.date,
          notes: (e.sourceUrl ? 'Official link: ' + e.sourceUrl : 'Verify directly with the institution.')
        };
      });
      if (upcoming.length) {
        activeEvents = upcoming;
        renderRows(activeEvents);
      }
    }).catch(function () {});
  }

  window.mzDeadlineIcs = { buildIcs: buildIcs, daysUntil: daysUntil };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountDeadlineReminders);
  else mountDeadlineReminders();
})();
