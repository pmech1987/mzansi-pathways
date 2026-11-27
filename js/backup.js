/* Mzansi Pathways — Resilience UX, Safe LocalStorage, Plaintext & AES-256-GCM Encrypted Backup (merged from v97_resilience_ux.js + v99_encrypted_backup_and_perf.js) */
/* Mzansi Pathways v97 Resilience, Offline/Update UX, Accessibility & Safe-Storage Engine.
   Strict-CSP & Trusted-Types compliant: zero raw HTML sinks, zero inline event handlers. */
(function () {
  'use strict';

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') node.className = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (text != null) node.textContent = String(text);
    return node;
  }

  /* 1. Polite ARIA live region for screen-reader announcements */
  function getAnnouncer() {
    var box = document.getElementById('mz-sr-announcer');
    if (!box) {
      box = el('div', {
        id: 'mz-sr-announcer',
        className: 'sr-only',
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true'
      }, '');
      (document.body || document.documentElement).appendChild(box);
    }
    return box;
  }

  function announce(msg) {
    var box = getAnnouncer();
    box.textContent = '';
    setTimeout(function () { box.textContent = String(msg || ''); }, 30);
  }
  window.mzAnnounce = announce;

  /* 2. Safe LocalStorage self-healing & emergency JSON backup/restore */
  var safeStorage = {
    auditAndHeal: function () {
      var healed = [];
      try {
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && /^(mz|mp|pathways)[_-]/i.test(k)) keys.push(k);
        }
        keys.forEach(function (k) {
          var raw = localStorage.getItem(k);
          if (!raw) return;
          var trimmed = raw.trim();
          if ((trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') && trimmed.length > 1) {
            try { JSON.parse(trimmed); } catch (e) {
              try { sessionStorage.setItem('quarantine_' + k, raw); } catch (_) {}
              localStorage.removeItem(k);
              healed.push(k);
            }
          }
        });
      } catch (e) {}
      return healed;
    },
    isAllowedKey: function (k) {
      if (typeof k !== 'string' || k.length > 80) return false;
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') return false;
      return k === 'mzansi_pathways_v2_state' || /^mz_[a-z0-9_]{1,64}$/i.test(k);
    },
    exportAll: function () {
      var payload = {
        app: 'Mzansi Pathways',
        version: 'v97',
        exportedAt: new Date().toISOString(),
        data: {}
      };
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && safeStorage.isAllowedKey(k)) {
            var val = String(localStorage.getItem(k) || '').replace(/\b\d{13}\b/g, '[SA-ID-REDACTED]');
            payload.data[k] = val;
          }
        }
      } catch (e) {}
      return JSON.stringify(payload, null, 2);
    },
    importAll: function (jsonText) {
      var raw = String(jsonText || '');
      if (raw.length > 262144) throw new Error('Backup file exceeds 256 KB safety limit.');
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
        throw new Error('Invalid Mzansi Pathways backup file.');
      }
      var count = 0;
      Object.keys(parsed.data).forEach(function (k) {
        if (safeStorage.isAllowedKey(k) && typeof parsed.data[k] === 'string' && parsed.data[k].length < 250000) {
          localStorage.setItem(k, parsed.data[k]);
          count++;
        }
      });
      return count;
    }
  };
  window.mzSafeStorage = safeStorage;

  /* 3. One-tap Service Worker update banner */
  function showUpdateToast(waitingWorker) {
    if (document.getElementById('v97-update-toast')) return;
    var toast = el('div', {
      id: 'v97-update-toast',
      className: 'v97-update-toast',
      role: 'status',
      'aria-live': 'polite'
    });
    var msg = el('span', { className: 'v97-toast-msg' }, 'New Mzansi Pathways update ready.');
    var actions = el('div', { className: 'v97-toast-actions' });
    var btnNow = el('button', { type: 'button', className: 'v97-toast-btn-primary' }, 'Update now');
    var btnLater = el('button', { type: 'button', className: 'v97-toast-btn-ghost', 'aria-label': 'Dismiss update notice' }, 'Later');

    btnNow.addEventListener('click', function () {
      btnNow.disabled = true;
      btnNow.textContent = 'Updating...';
      try {
        if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      } catch (e) {}
      setTimeout(function () { location.reload(); }, 600);
    });
    btnLater.addEventListener('click', function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    });

    actions.appendChild(btnNow);
    actions.appendChild(btnLater);
    toast.appendChild(msg);
    toast.appendChild(actions);
    (document.body || document.documentElement).appendChild(toast);
    announce('A new version of Mzansi Pathways is ready. Select Update now to refresh.');
  }

  function wireServiceWorkerUpdates() {
    if (!('serviceWorker' in navigator)) return;
    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloaded) return;
      reloaded = true;
      location.reload();
    });
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) return;
      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateToast(reg.waiting);
      }
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast(nw);
          }
        });
      });
    }).catch(function () {});
  }

  /* 4. Live Offline / Data-Saver Connectivity Pill */
  function wireConnectivityPill() {
    var pill = document.getElementById('v97-net-pill');
    if (!pill) {
      pill = el('div', {
        id: 'v97-net-pill',
        className: 'v97-net-pill',
        role: 'status',
        'aria-live': 'polite'
      }, '');
      (document.body || document.documentElement).appendChild(pill);
    }

    function refreshStatus(silent) {
      var online = navigator.onLine !== false;
      var saveData = !!(navigator.connection && navigator.connection.saveData);
      pill.classList.remove('is-offline', 'is-saver', 'is-hidden');
      if (!online) {
        pill.textContent = 'Offline mode · Saved data active';
        pill.classList.add('is-offline');
        if (!silent) announce('You are offline. Saved Mzansi Pathways data remains available.');
      } else if (saveData) {
        pill.textContent = 'Data-Saver active';
        pill.classList.add('is-saver');
      } else {
        pill.textContent = '';
        pill.classList.add('is-hidden');
        if (!silent) announce('Back online.');
      }
    }

    refreshStatus(true);
    window.addEventListener('online', function () { refreshStatus(false); });
    window.addEventListener('offline', function () { refreshStatus(false); });
  }

  /* 5. Accessible Back-to-Top Floating Button */
  function wireScrollTopButton() {
    if (document.getElementById('v97-scroll-top')) return;
    var btn = el('button', {
      id: 'v97-scroll-top',
      type: 'button',
      className: 'v97-scroll-top is-hidden',
      'aria-label': 'Back to top'
    }, '↑ Top');
    btn.addEventListener('click', function () {
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      var main = document.getElementById('app-main');
      if (main && typeof main.focus === 'function') {
        try { main.focus({ preventScroll: true }); } catch (e) {}
      }
    });
    (document.body || document.documentElement).appendChild(btn);

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        var y = window.scrollY || document.documentElement.scrollTop || 0;
        if (y > Math.max(700, (window.innerHeight || 640) * 1.8)) btn.classList.remove('is-hidden');
        else btn.classList.add('is-hidden');
        ticking = false;
      });
    }, { passive: true });
  }

  /* 6. WAI-ARIA Arrow-Key Tab Navigation & Alt+1..5 Quick-Jump Shortcuts */
  function wireKeyboardNavigation() {
    document.addEventListener('keydown', function (e) {
      /* Arrow-key roving across sub-tab bars and toolkit tabs */
      var target = e.target;
      if (target && target.tagName === 'BUTTON' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        var group = target.closest('.mz-sub, .v94-tab-row');
        if (group) {
          var btns = Array.prototype.slice.call(group.querySelectorAll('button:not([disabled])'));
          var idx = btns.indexOf(target);
          if (idx >= 0 && btns.length > 1) {
            e.preventDefault();
            var next = btns[(idx + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
            next.focus();
            next.click();
          }
        }
      }

      /* Alt+1..5 quick navigation to primary dock destinations */
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && /^[1-5]$/.test(e.key)) {
        var dockBtns = document.querySelectorAll('#mz-dock button, .mz-dock button, nav[aria-label] button');
        var i = parseInt(e.key, 10) - 1;
        if (dockBtns && dockBtns[i]) {
          e.preventDefault();
          dockBtns[i].click();
          announce('Switched section to ' + (dockBtns[i].textContent || '').trim());
        }
      }
    });
  }

  /* 7. Emergency Profile JSON Export/Restore inside Settings Modal */
  function wireEmergencyBackupControls() {
    var modal = document.getElementById('settings-modal');
    if (!modal || document.getElementById('v97-backup-box')) return;
    var host = modal.querySelector('.space-y-4, .space-y-3') || modal.firstElementChild || modal;

    var box = el('details', { id: 'v97-backup-box', className: 'v97-backup-box v105-settings-acc' });
    var title = el('summary', { className: 'v97-backup-title v105-acc-summary' }, 'Emergency Local Backup & Restore (v97)');
    var desc = el('p', { className: 'v97-backup-desc' }, 'Unencrypted JSON export (SA IDs redacted). On shared phones or school PCs, prefer the AES-256-GCM Encrypted Backup below.');
    var row = el('div', { className: 'v97-backup-row' });

    var btnExport = el('button', { type: 'button', id: 'v97-btn-export-json', className: 'v97-btn-primary' }, 'Download Backup (.json)');
    var btnImport = el('button', { type: 'button', id: 'v97-btn-import-json', className: 'v97-btn-secondary' }, 'Restore Backup');
    var fileInput = el('input', { type: 'file', id: 'v97-import-file', accept: 'application/json,.json', className: 'hidden', 'aria-label': 'Choose Mzansi Pathways backup JSON file' });
    var status = el('div', { id: 'v97-backup-status', className: 'v97-backup-status', role: 'status', 'aria-live': 'polite' }, '');

    btnExport.addEventListener('click', function () {
      try {
        var blob = new Blob([safeStorage.exportAll()], { type: 'application/json;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = el('a', { href: url, download: 'mzansi-pathways-backup-' + new Date().toISOString().slice(0, 10) + '.json' });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        status.textContent = 'Backup downloaded to your device.';
        announce('Backup JSON downloaded.');
      } catch (e) {
        status.textContent = 'Could not export backup on this browser.';
      }
    });

    btnImport.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var n = safeStorage.importAll(reader.result);
          status.textContent = 'Restored ' + n + ' saved item(s). Reloading...';
          announce('Backup restored. Reloading app.');
          setTimeout(function () { location.reload(); }, 900);
        } catch (err) {
          status.textContent = 'Restore failed: file is not a valid Mzansi Pathways JSON backup.';
        }
      };
      reader.readAsText(f);
    });

    row.appendChild(btnExport);
    row.appendChild(btnImport);
    row.appendChild(fileInput);
    box.appendChild(title);
    box.appendChild(desc);
    box.appendChild(row);
    box.appendChild(status);
    host.appendChild(box);
  }

  function boot() {
    var healed = safeStorage.auditAndHeal();
    if (healed.length) {
      announce('Recovered from ' + healed.length + ' corrupted local storage item.');
    }
    wireServiceWorkerUpdates();
    wireConnectivityPill();
    wireScrollTopButton();
    wireKeyboardNavigation();
    wireEmergencyBackupControls();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();


/* Mzansi Pathways v99 Zero-Knowledge AES-256-GCM Encrypted Backup & Runtime Diagnostics Panel.
   Uses native Web Crypto API (PBKDF2-HMAC-SHA256, 600,000 iterations, AES-256-GCM).
   Strict-CSP & Trusted-Types safe: zero raw HTML sinks, zero inline handlers. */
(function () {
  'use strict';

  var PBKDF2_ITERATIONS = 600000;
  var MAX_BACKUP_BYTES = 262144;

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

  function isAllowedMzKey(k) {
    if (typeof k !== 'string' || k.length > 80) return false;
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') return false;
    return k === 'mzansi_pathways_v2_state' || /^mz_[a-z0-9_]{1,64}$/i.test(k);
  }

  function bytesToB64(u8) {
    var bin = '';
    for (var i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
    return btoa(bin);
  }

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function deriveAesKey(passphrase, saltBytes) {
    var enc = new TextEncoder();
    var km = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      km,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptSnapshot(passphrase) {
    if (!passphrase || passphrase.length < 10) {
      throw new Error('Use a passphrase of at least 10 characters.');
    }
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API requires HTTPS or localhost.');
    }
    var payload = { app: 'Mzansi Pathways', version: 'v99', exportedAt: new Date().toISOString(), data: {} };
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (isAllowedMzKey(k)) payload.data[k] = localStorage.getItem(k);
    }
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var key = await deriveAesKey(passphrase, salt);
    var cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
    return JSON.stringify({
      format: 'mzansi-pathways-encrypted-v2',
      kdf: 'PBKDF2-HMAC-SHA256',
      iterations: PBKDF2_ITERATIONS,
      cipher: 'AES-256-GCM',
      saltB64: bytesToB64(salt),
      ivB64: bytesToB64(iv),
      dataB64: bytesToB64(new Uint8Array(cipher))
    }, null, 2);
  }

  async function decryptSnapshot(rawText, passphrase) {
    if (!rawText || rawText.length > MAX_BACKUP_BYTES) {
      throw new Error('Encrypted backup exceeds 256 KB safety limit.');
    }
    if (!passphrase || passphrase.length < 10) {
      throw new Error('Enter the 10+ character passphrase used to encrypt this file.');
    }
    var env = JSON.parse(rawText);
    if (env.format !== 'mzansi-pathways-encrypted-v2' || Number(env.iterations) < PBKDF2_ITERATIONS) {
      throw new Error('Unsupported or weak backup encryption format.');
    }
    var key = await deriveAesKey(passphrase, b64ToBytes(env.saltB64));
    var plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(env.ivB64) }, key, b64ToBytes(env.dataB64));
    var parsed = JSON.parse(new TextDecoder().decode(plainBuf));
    if (!parsed || typeof parsed.data !== 'object') throw new Error('Invalid decrypted backup payload.');
    var count = 0;
    Object.keys(parsed.data).forEach(function (k) {
      if (isAllowedMzKey(k) && typeof parsed.data[k] === 'string' && parsed.data[k].length < 250000) {
        localStorage.setItem(k, parsed.data[k]);
        count++;
      }
    });
    return count;
  }

  function storageUsageKb() {
    var total = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i) || '';
        total += k.length + (localStorage.getItem(k) || '').length;
      }
    } catch (e) {}
    return ((total * 2) / 1024).toFixed(1);
  }

  function mountSettingsCryptoAndDiag() {
    var modal = document.getElementById('settings-modal');
    if (!modal || document.getElementById('v99-crypto-box')) return;
    var host = modal.querySelector('.space-y-4, .space-y-3') || modal.firstElementChild || modal;

    var box = el('details', { id: 'v99-crypto-box', className: 'v97-backup-box v99-crypto-box v105-settings-acc' });
    box.appendChild(el('summary', { className: 'v97-backup-title v105-acc-summary' }, 'Encrypted Zero-Knowledge Backup (AES-256-GCM)'));
    box.appendChild(el('p', { className: 'v97-backup-desc' }, 'Protect your marks and CV with a 10+ character passphrase (PBKDF2-SHA256, 600,000 rounds) before sharing or storing on another device.'));

    var passInput = el('input', {
      type: 'password',
      id: 'v99-passphrase',
      className: 'v94-input v99-pass-input',
      placeholder: 'Passphrase (min 10 characters)',
      autocomplete: 'new-password',
      'aria-label': 'Backup encryption passphrase'
    });
    var row = el('div', { className: 'v97-backup-row' });
    var btnEnc = el('button', { type: 'button', id: 'v99-btn-enc-export', className: 'v97-btn-primary' }, 'Encrypt & Download (.mzenc.json)');
    var btnDec = el('button', { type: 'button', id: 'v99-btn-enc-import', className: 'v97-btn-secondary' }, 'Decrypt & Restore');
    var fileIn = el('input', { type: 'file', id: 'v99-enc-file', accept: 'application/json,.json', className: 'hidden', 'aria-label': 'Choose encrypted backup file' });
    var status = el('div', { id: 'v99-crypto-status', className: 'v97-backup-status', role: 'status', 'aria-live': 'polite' }, '');

    btnEnc.addEventListener('click', function () {
      status.textContent = 'Encrypting (600k PBKDF2 rounds)...';
      encryptSnapshot(passInput.value).then(function (jsonOut) {
        var blob = new Blob([jsonOut], { type: 'application/json;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = el('a', { href: url, download: 'mzansi-pathways-' + new Date().toISOString().slice(0, 10) + '.mzenc.json' });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        passInput.value = '';
        status.textContent = 'Encrypted backup downloaded safely.';
        if (typeof window.mzAnnounce === 'function') window.mzAnnounce('Encrypted backup downloaded.');
      }).catch(function (err) {
        status.textContent = err && err.message ? err.message : 'Encryption failed.';
      });
    });

    btnDec.addEventListener('click', function () { fileIn.click(); });
    fileIn.addEventListener('change', function () {
      var f = fileIn.files && fileIn.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        status.textContent = 'Decrypting...';
        decryptSnapshot(String(reader.result || ''), passInput.value).then(function (n) {
          passInput.value = '';
          status.textContent = 'Decrypted and restored ' + n + ' item(s). Reloading...';
          setTimeout(function () { location.reload(); }, 900);
        }).catch(function (err) {
          status.textContent = err && err.message ? err.message : 'Decryption failed (check passphrase).';
        });
      };
      reader.readAsText(f);
    });

    var diag = el('div', { id: 'v99-diag-line', className: 'v99-diag-line' },
      'Runtime: v99 · Local storage: ' + storageUsageKb() + ' KB · Offline PWA: ' + (('serviceWorker' in navigator) ? 'Supported' : 'Unavailable')
    );

    row.appendChild(btnEnc);
    row.appendChild(btnDec);
    row.appendChild(fileIn);
    box.appendChild(passInput);
    box.appendChild(row);
    box.appendChild(status);
    box.appendChild(diag);
    host.appendChild(box);
  }

  window.mzEncryptedBackup = { encryptSnapshot: encryptSnapshot, decryptSnapshot: decryptSnapshot };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountSettingsCryptoAndDiag);
  else mountSettingsCryptoAndDiag();
})();

/* Mzansi Pathways v114 Plain-Language POPIA Learner Privacy Notice & One-Tap Device Wipe */
(function () {
  'use strict';
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (k === 'className') n.className = attrs[k]; else n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = String(text);
    return n;
  }
  function mountPopiaNotice() {
    var modal = document.getElementById('settings-modal');
    if (!modal || document.getElementById('v114-popia-box')) return;
    var host = modal.querySelector('.space-y-4, .space-y-3') || modal.firstElementChild || modal;
    var box = el('details', { id: 'v114-popia-box', className: 'v97-backup-box v105-settings-acc' });
    box.appendChild(el('summary', { className: 'v97-backup-title v105-acc-summary' }, 'Your Privacy (POPIA) & One-Tap Delete'));
    var pts = [
      'Stays on your phone: Your marks, subjects, Plan A/B/C, checklist, and CV details are stored only in your browser on this device. Mzansi Pathways has no tracking cookies, no ads, and no analytics server.',
      'No SA ID numbers kept: Never type your 13-digit SA ID number. Any 13-digit number in scanned text, backups, or dossiers is automatically redacted.',
      'Encrypted backups: When moving to a new phone, use the AES-256-GCM Encrypted Backup (600,000 PBKDF2 rounds) with a 10+ character passphrase.',
      'Under 18: Ask a parent or guardian before saving personal contact details on a shared device.',
      'Leaving a shared PC or phone? Tap Delete Everything below to wipe all marks, CV details, checklists, session copies, and scanned photo caches in one tap.'
    ];
    var ul = el('ul', { className: 'v94-list' });
    pts.forEach(function (t) { ul.appendChild(el('li', null, t)); });
    var row = el('div', { className: 'v97-backup-row v101-mt8' });
    var btnWipe = el('button', { type: 'button', id: 'v114-one-tap-wipe', className: 'v97-btn-primary' }, 'Delete Everything From This Device');
    var status = el('div', { id: 'v114-wipe-status', className: 'v97-backup-status', role: 'status', 'aria-live': 'polite' }, '');
    btnWipe.addEventListener('click', function () {
      try {
        if (typeof window.mzWipeAllData === 'function') window.mzWipeAllData();
        else { localStorage.clear(); sessionStorage.clear(); }
        status.textContent = 'All personal marks, CV details, checklists, and cached scans have been deleted from this device.';
        if (typeof window.mzAnnounce === 'function') window.mzAnnounce(status.textContent);
      } catch (e) {
        status.textContent = 'Could not clear all browser storage automatically — clear site data in browser settings.';
      }
    });
    row.appendChild(btnWipe);
    box.appendChild(ul);
    box.appendChild(row);
    box.appendChild(status);
    host.appendChild(box);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountPopiaNotice);
  else mountPopiaNotice();
})();
