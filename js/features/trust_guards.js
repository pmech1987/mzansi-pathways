/* js/features/trust_guards.js — Offline DHET Register, QCTO/SAQA & Job-Flyer Scam Shield (classic script, sets window.MZ_TRUST) */
window.MZ_TRUST = (() => {
  'use strict';
  const DHET_REG_RE = /^(19|20)\d{2}\/(HE07|HE08|HE10|FE07)\/\d{3}$/i;
  const RETIRED_SAQA_IDS = {
    '24293': 'National Certificate: IT Technical Support (registration ended 2010)',
    '78964': 'FETC: IT Technical Support (registration ended 2023)'
  };
  const FLYER_RED_FLAGS = [
    { id: 'upfront_fee', severity: 'HIGH', re: /\b(pay|deposit|send)\b.{0,28}\b(registration|admin|uniform|application|medical)\s*fee\b/i, msg: 'Requests upfront payment — legitimate SA jobs and SETA learnerships never charge fees.' },
    { id: 'ewallet_cash', severity: 'HIGH', re: /\b(ewallet|cashsend|mukuru|pep\s*money|shoprite\s*money)\b/i, msg: 'Requests informal money transfer (eWallet/CashSend/Mukuru).' },
    { id: 'url_shortener', severity: 'HIGH', re: /\b(bit\.ly|tinyurl\.com|rb\.gy|cutt\.ly|shorturl\.at)\//i, msg: 'Hides true destination behind a URL shortener.' },
    { id: 'whatsapp_only', severity: 'MEDIUM', re: /\bwhatsapp\s*(only|your\s*cv|to\s*apply)\b/i, msg: 'WhatsApp-only application with no verifiable employer portal.' },
    { id: 'free_mail_corp', severity: 'MEDIUM', re: /@(gmail|yahoo|hotmail|outlook)\.com\b/i, msg: 'Uses a free webmail address rather than an official domain.' },
    { id: 'n1_n3_private', severity: 'HIGH', re: /\b(nated|report\s*191)?\s*n[1-3]\b/i, msg: 'NATED Report 191 N1–N3 was phased out from 1 Jan 2024 (Gazette 49518).' },
    { id: 'guaranteed_job', severity: 'MEDIUM', re: /\b100%\s*(guaranteed|assured)\s*(job|placement|employment)\b/i, msg: 'Promises a guaranteed job — reputable providers never guarantee employment.' }
  ];
  function checkPrivateCollegeReg(regNo, registerSnapshot = { active: [], cancelled: [] }) {
    const clean = String(regNo || '').trim().toUpperCase();
    if (!DHET_REG_RE.test(clean)) return { status: 'INVALID_FORMAT', tone: 'red', message: 'Does not match official DHET format (YYYY/HE07/NNN or YYYY/FE07/NNN). Call 0800 87 2222.' };
    if (registerSnapshot.cancelled?.includes(clean)) return { status: 'CANCELLED', tone: 'red', message: `DANGER: ${clean} appears in Section A (Cancelled Registrations) of the DHET Register.` };
    if (registerSnapshot.active?.includes(clean)) return { status: 'FORMAT_AND_REGISTER_MATCH', tone: 'amber', message: `${clean} appears on the cached DHET register. Confirm exact qualification and campus site on dhet.gov.za.` };
    return { status: 'UNVERIFIED_OFFLINE', tone: 'amber', message: 'Valid DHET format, not in local cache — confirm on dhet.gov.za or 0800 87 2222 before paying.' };
  }
  function checkSaqaQualification(saqaId) {
    const id = String(saqaId || '').replace(/\D/g, '');
    if (RETIRED_SAQA_IDS[id]) return { status: 'LEGACY_RETIRED', tone: 'red', message: `Retired SAQA ID ${id}: ${RETIRED_SAQA_IDS[id]}.` };
    return { status: 'VERIFY_ON_SAQA_QCTO', tone: 'amber', message: `Verify SAQA ID ${id || '(missing)'} at allqs.saqa.org.za and provider accreditation at qcto.org.za (012 003 1800).` };
  }
  function auditJobFlyerText(text) {
    const hits = FLYER_RED_FLAGS.filter((r) => r.re.test(String(text || '')));
    const hasHigh = hits.some((h) => h.severity === 'HIGH');
    return { riskLevel: hasHigh ? 'HIGH_RISK' : hits.length ? 'CAUTION' : 'NO_OBVIOUS_RED_FLAGS', tone: hasHigh ? 'red' : hits.length ? 'amber' : 'blue', flags: hits.map(({ id, severity, msg }) => ({ id, severity, msg })) };
  }
  return { checkPrivateCollegeReg, checkSaqaQualification, auditJobFlyerText };
})();
