/* js/data/bm25_shard_search.js — Zero-Dependency Offline BM25 Prefix Search */
export const MZ_SEARCH = (() => {
  'use strict';
  const TOKEN_RE = /[a-z0-9]{2,}/g;
  let corpus = [], tokenizedDocs = [], docFreq = new Map(), avgDocLen = 1;
  const tokenize = (t) => String(t || '').toLowerCase().match(TOKEN_RE) || [];
  function indexDocuments(docs) {
    corpus = docs; tokenizedDocs = []; docFreq = new Map(); let totalLen = 0;
    for (const d of docs) {
      const tokens = tokenize(`${d.name} ${d.institutionName || ''} ${d.acronym || ''} ${d.province || ''} ${d.campus || ''} ${(d.tags || []).join(' ')}`);
      const tf = new Map();
      for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
      for (const u of tf.keys()) docFreq.set(u, (docFreq.get(u) || 0) + 1);
      tokenizedDocs.push({ tf, len: tokens.length });
      totalLen += tokens.length;
    }
    avgDocLen = Math.max(1, totalLen / Math.max(1, docs.length));
  }
  function query(rawQuery, { limit = 25, k1 = 1.2, b = 0.75 } = {}) {
    const qTerms = tokenize(rawQuery);
    if (!qTerms.length) return corpus.slice(0, limit);
    const N = corpus.length, scored = [];
    for (let i = 0; i < N; i++) {
      const { tf, len } = tokenizedDocs[i]; let score = 0;
      for (const q of qTerms) {
        for (const [term, freq] of tf.entries()) {
          const exact = term === q, prefix = !exact && q.length >= 3 && term.startsWith(q);
          if (!exact && !prefix) continue;
          const df = docFreq.get(term) || 1;
          const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
          score += (exact ? 1.0 : 0.7) * idf * ((freq * (k1 + 1)) / (freq + k1 * (1 - b + (b * len) / avgDocLen)));
        }
      }
      if (score > 0) scored.push({ score, item: corpus[i] });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.item);
  }
  return { indexDocuments, query };
})();
