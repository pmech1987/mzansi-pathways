// Behaviour test: run with  node tests/test_parser.js
const e = require('../js/engine.js'); const assert = require('assert');
const r = e.parseStatementText('Mathernatics 6l%\nPhys Sci 58\nLife Orientation 82 %\nEnglish Home Language\nID 0301015800083');
const by = n => r.find(x => x.name === n);
assert.strictEqual(by('Mathematics').mark, 61);
assert.strictEqual(by('Physical Sciences').mark, 58);
assert.strictEqual(by('Life Orientation').mark, 82);
assert.strictEqual(by('English Home Language').mark, null, 'missing mark must stay null, never 50');
assert.ok(!JSON.stringify(r).includes('0301015800083'), 'ID number must never be stored');
assert.strictEqual(e.scanRowsReady(r).ok, false);
console.log('parser tests OK');
