/* js/ui/civic_badges.js — Zero-Copyright, Offline-Instant Civic Monogram SVG Generator */
export const MZ_BADGES = (() => {
  'use strict';
  const SECTOR_PALETTE = {
    university: { bg: '#1A4B8C', accent: '#E8F0FE', text: '#FFFFFF', label: 'Public University' },
    uot:        { bg: '#0F6B7A', accent: '#E0F7FA', text: '#FFFFFF', label: 'University of Technology' },
    tvet:       { bg: '#1E6B45', accent: '#E6F4EA', text: '#FFFFFF', label: 'Public TVET College' },
    cet:        { bg: '#6A4C93', accent: '#F3E8FD', text: '#FFFFFF', label: 'Public CET College' },
    seta:       { bg: '#9A5B13', accent: '#FEF3E2', text: '#FFFFFF', label: 'Official SETA' },
    gov:        { bg: '#2F3E46', accent: '#ECEFF1', text: '#FFFFFF', label: 'Public Portal' },
    private_ok: { bg: '#455A64', accent: '#ECEFF1', text: '#FFFFFF', label: 'DHET Registered Private' }
  };
  function safeText(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function createMonogramSvg({ acronym = 'SA', sector = 'university', provinceCode = '' }) {
    const theme = SECTOR_PALETTE[sector] || SECTOR_PALETTE.university;
    const code = safeText(acronym.toUpperCase().slice(0, 6));
    const prov = safeText(provinceCode.toUpperCase().slice(0, 3));
    const fontSize = code.length <= 3 ? 18 : code.length <= 4 ? 15 : 12;
    return `<svg viewBox="0 0 56 56" width="48" height="48" role="img" aria-label="${code} (${theme.label})" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="52" height="52" rx="12" fill="${theme.bg}" /><rect x="2" y="38" width="52" height="16" fill="#000000" fill-opacity="0.18" /><text x="28" y="29" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="800" font-size="${fontSize}" fill="${theme.text}">${code}</text><text x="28" y="49" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="700" font-size="9" letter-spacing="0.8" fill="${theme.accent}">${prov || sector.toUpperCase()}</text></svg>`;
  }
  return { createMonogramSvg, SECTOR_PALETTE };
})();
