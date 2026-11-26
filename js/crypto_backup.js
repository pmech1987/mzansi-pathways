/* js/crypto_backup.js — OWASP PBKDF2-SHA256 (600k) + AES-256-GCM Backup & CSV Injection Guard */
export const MZ_SECURITY = (() => {
  'use strict';
  const PBKDF2_ITERATIONS = 600000;
  const MAX_BACKUP_BYTES = 262144;
  async function deriveAesKey(passphrase, saltBytes) {
    const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encryptPlanObject(planObj, passphrase) {
    if (!passphrase || passphrase.length < 10) throw new Error('Use a backup passphrase of at least 10 characters.');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveAesKey(passphrase, salt);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(planObj)));
    return JSON.stringify({ format: 'mzansi-pathways-encrypted-v2', kdf: 'PBKDF2-HMAC-SHA256', iterations: PBKDF2_ITERATIONS, cipher: 'AES-256-GCM', saltB64: btoa(String.fromCharCode(...salt)), ivB64: btoa(String.fromCharCode(...iv)), dataB64: btoa(String.fromCharCode(...new Uint8Array(ciphertext))) });
  }
  async function decryptPlanFile(file, passphrase) {
    if (!file || file.size > MAX_BACKUP_BYTES) throw new Error('Backup file exceeds 256 KB safety limit.');
    const env = JSON.parse(await file.text());
    if (env.format !== 'mzansi-pathways-encrypted-v2' || env.iterations < PBKDF2_ITERATIONS) throw new Error('Unsupported or weak backup encryption format.');
    const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const key = await deriveAesKey(passphrase, b64ToBytes(env.saltB64));
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(env.ivB64) }, key, b64ToBytes(env.dataB64));
    return JSON.parse(new TextDecoder().decode(plainBuf));
  }
  function sanitizeCsvCell(raw) {
    let s = String(raw ?? '').replace(/\r?\n/g, ' ').trim();
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  }
  function toSafeCsv(headers, rows) {
    return [headers.map(sanitizeCsvCell).join(','), ...rows.map((row) => headers.map((h) => sanitizeCsvCell(row[h])).join(','))].join('\r\n');
  }
  return { encryptPlanObject, decryptPlanFile, sanitizeCsvCell, toSafeCsv };
})();
