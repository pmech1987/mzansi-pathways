/* Mzansi Pathways — PWA Install Manager & Offline Cache Self-Check (renamed from v100_pwa_install_and_telemetry.js) */
/* Mzansi Pathways v100 PWA Install Manager, Offline Cache Self-Check & Unhandled-Rejection Failsafe.
   Strict-CSP & Trusted-Types safe: zero raw HTML sinks, zero inline handlers, zero outbound telemetry. */
(function () {
  'use strict';

  var deferredInstallPrompt = null;

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

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true;
  }

  async function runOfflineSelfCheck() {
    var report = { swActive: false, cacheName: 'none', cachedFiles: 0, storageKeys: 0 };
    try {
      report.storageKeys = localStorage.length;
    } catch (e) {}
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        report.swActive = true;
      }
      if ('caches' in window) {
        var keys = await caches.keys();
        var mp = keys.filter(function (k) { return k.indexOf('mzansi-pathways-') === 0; }).sort();
        if (mp.length) {
          report.cacheName = mp[mp.length - 1];
          var cache = await caches.open(report.cacheName);
          var reqs = await cache.keys();
          report.cachedFiles = reqs.length;
        }
      }
    } catch (e) {}
    return report;
  }

  function mountPwaControls() {
    var modal = document.getElementById('settings-modal');
    if (!modal || document.getElementById('v100-pwa-box')) return;
    var host = modal.querySelector('.space-y-4, .space-y-3') || modal.firstElementChild || modal;

    var box = el('details', { id: 'v100-pwa-box', className: 'v97-backup-box v105-settings-acc' });
    box.appendChild(el('summary', { className: 'v97-backup-title v105-acc-summary' }, 'App Install & Offline Self-Check (v100)'));
    box.appendChild(el('p', { className: 'v97-backup-desc' }, 'Install Mzansi Pathways on your home screen for instant offline access, or verify that your offline cache is healthy.'));

    var row = el('div', { className: 'v97-backup-row' });
    var btnInstall = el('button', { type: 'button', id: 'v100-btn-install', className: 'v97-btn-primary' }, isStandalone() ? 'Installed on Device' : 'Install App');
    if (isStandalone() || !deferredInstallPrompt) btnInstall.disabled = true;

    var btnCheck = el('button', { type: 'button', id: 'v100-btn-selfcheck', className: 'v97-btn-secondary' }, 'Verify Offline Cache');
    var status = el('div', { id: 'v100-pwa-status', className: 'v97-backup-status', role: 'status', 'aria-live': 'polite' }, '');

    btnInstall.addEventListener('click', function () {
      if (!deferredInstallPrompt) return;
      btnInstall.disabled = true;
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(function (choice) {
        status.textContent = choice && choice.outcome === 'accepted'
          ? 'Mzansi Pathways is being added to your home screen.'
          : 'Install dismissed. You can install anytime from Settings or your browser menu.';
        deferredInstallPrompt = null;
      }).catch(function () {});
    });

    btnCheck.addEventListener('click', function () {
      status.textContent = 'Checking offline cache and local storage...';
      runOfflineSelfCheck().then(function (r) {
        status.textContent = (r.swActive ? 'Offline Ready' : 'Online Only (reload once to activate offline cache)') +
          ' · Cache: ' + r.cacheName + ' (' + r.cachedFiles + ' files) · Saved keys: ' + r.storageKeys;
        if (typeof window.mzAnnounce === 'function') window.mzAnnounce(status.textContent);
      }).catch(function () {
        status.textContent = 'Self-check could not read cache storage in this browser mode.';
      });
    });

    row.appendChild(btnInstall);
    row.appendChild(btnCheck);
    box.appendChild(row);
    box.appendChild(status);
    host.appendChild(box);

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredInstallPrompt = e;
      btnInstall.disabled = false;
      btnInstall.textContent = 'Install App';
    });

    window.addEventListener('appinstalled', function () {
      deferredInstallPrompt = null;
      btnInstall.disabled = true;
      btnInstall.textContent = 'Installed on Device';
      status.textContent = 'Mzansi Pathways installed on your device.';
    });
  }

  /* Calm unhandledrejection failsafe so offline promise failures never crash silently */
  window.addEventListener('unhandledrejection', function (e) {
    var msg = e && e.reason && (e.reason.message || String(e.reason)) || '';
    if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
      if (typeof window.mzAnnounce === 'function') {
        window.mzAnnounce('Network request paused offline. Showing saved data.');
      }
    }
  });

  window.mzPwaHealth = { runOfflineSelfCheck: runOfflineSelfCheck };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountPwaControls);
  else mountPwaControls();
})();
