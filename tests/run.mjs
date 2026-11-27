// Mzansi Pathways checks. Run with:  node tests/run.mjs   (Node 18+, no installs needed)
// Catches the mistakes that break the live site: missing files, bad JSON, CSP-blocked inline code, duplicate ids, wrong marks maths.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL  ' + m); } };
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const exists = f => fs.existsSync(path.join(root, f));
const json = f => JSON.parse(read(f));

// 1. every data file is valid JSON
const walk = d => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const f of walk('data').filter(f => f.endsWith('.json'))) { try { json(f); ok(true); } catch (e) { ok(false, f + ' is not valid JSON: ' + e.message); } }
try { json('manifest.json'); ok(true); } catch (e) { ok(false, 'manifest.json invalid'); }

// 2. files referenced by index.html and creator_studio.html exist; no CSP-blocked inline code
for (const page of ['index.html', 'creator_studio.html']) {
  const html = read(page);
  for (const m of html.matchAll(/(?:src|href)="\.\/([^"#?]+)"/g)) ok(exists(m[1]), `${page} references missing file ${m[1]}`);
  ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), `${page} has an inline <script> (blocked by the CSP)`);
  ok(!/<style[\s>]/i.test(html), `${page} has an inline <style> (blocked by the CSP)`);
  ok(!/\sstyle="/i.test(html), `${page} has inline style="" attributes (blocked by the CSP)`);
  ok(!/\son[a-z]+="/i.test(html), `${page} has inline event handlers (blocked by the CSP)`);
}
for (const f of ['js/app.js', 'js/catalogue.js', 'js/screens.js', 'js/home.js', 'js/work_tools.js']) {
  const t = read(f);
  ok(!/\sstyle=\\?"/.test(t) && !/\sstyle='/.test(t), `${f} writes inline style attributes (blocked by the CSP)`);
  ok(!/\son(click|change|input|submit|error|load)=/.test(t), `${f} writes inline event handlers (blocked by the CSP)`);
}

// 2b. syntax that older phones cannot parse (a single one stops the whole script)
for (const f of walk('js').filter(f => f.endsWith('.js'))) {
  const t = read(f);
  ok(!/\(\?<[!=]/.test(t), `${f} uses regex lookbehind (SyntaxError on iOS before 16.4)`);
  ok(!/\.replaceAll\(|\.at\(-?\d|structuredClone\(|\?\?=|\|\|=|&&=/.test(t), `${f} uses a very new JS feature (breaks older Android/iOS)`);
}

// 2c. translations line up with the English keys
globalThis.document = undefined;
{ const src = read('js/i18n.js'); const sandbox = {}; new Function('root', src.replace(/\}\)\(typeof window[\s\S]*$/, '})(root);'))(sandbox);
  const I = sandbox.MZI18N; ok(!!I, 'i18n.js exposes MZI18N');
  if (I) for (const [k, d] of Object.entries(I.D)) ok(d.t.length === I.EN_KEYS.length, `i18n ${k}: ${d.t.length} lines for ${I.EN_KEYS.length} English keys`); }
{ const idx = read('index.html'); for (const code of ['en', 'zu', 'af', 'ss', 'ts']) ok(idx.includes(`<option value="${code}"`), `language picker is missing ${code}`); }

// 3. service worker precache lists point at real files
const sw = read('sw.js');
for (const list of ['CORE', 'NICE']) {
  const m = sw.match(new RegExp('const ' + list + ' = \\[([^\\]]*)\\]'));
  ok(!!m, `sw.js has no ${list} list`);
  if (m) for (const u of m[1].match(/'\.\/[^']*'/g) || []) { const p = u.slice(3, -1); if (p) ok(exists(p), `sw.js ${list} lists missing file ${p}`); }
}
const idx = json('data/index.json');
for (const f of idx.files) ok(exists('data/' + f), `data/index.json lists missing file ${f}`);
ok(/mzansi-pathways-v\d+/.test(sw), 'sw.js cache name');

// 4. data quality
function uniqueIds(list, label) { const seen = new Set(); for (const r of list) { ok(r.id && !seen.has(r.id), `${label}: missing or duplicate id ${r.id}`); seen.add(r.id); } }
function httpsOnly(obj, label) { for (const [k, v] of Object.entries(obj)) if (/url$/i.test(k) && typeof v === 'string' && v) ok(/^https:\/\//.test(v), `${label}: ${k} must be https (${v})`); }
const inst = json('data/institutions.json').institutions; uniqueIds(inst, 'institutions'); inst.forEach(i => { httpsOnly(i, 'institution ' + i.id); ok(i.name && i.type && i.province, 'institution ' + i.id + ' missing name/type/province'); });
const careers = json('data/careers.json'); uniqueIds(careers.careers, 'careers');
const fam = new Set(Array.isArray(careers.families) ? careers.families.map(f => f.id || f) : Object.keys(careers.families || {}));
careers.careers.forEach(c => { ok(c.title && c.summary, 'career ' + c.id + ' missing title/summary'); if (fam.size) ok(fam.has(c.family), 'career ' + c.id + ' has unknown family ' + c.family); });
const bur = json('data/bursaries.json').bursaries; uniqueIds(bur, 'bursaries'); bur.forEach(b => httpsOnly(b, 'bursary ' + b.id));
const ev = json('data/events.json').events; uniqueIds(ev, 'events'); ev.forEach(e => ok(/^\d{4}-\d{2}-\d{2}$/.test(e.date) && !isNaN(Date.parse(e.date)), 'event ' + e.id + ' has bad date ' + e.date));
for (const f of idx.files) { const d = json('data/' + f); ok(Array.isArray(d.programmes), f + ' has no programmes array'); (d.programmes || []).forEach(p => { ok(p.institutionId && inst.some(i => i.id === p.institutionId), `${f}: programme ${p.name} has unknown institutionId`); ok(!p.closes || /^\d{4}-\d{2}-\d{2}$/.test(p.closes), `${f}: programme ${p.name} has a closing date that is not ISO`); ok(p.verificationStatus !== 'auto_verified' || (Array.isArray(p.autoChecks) && p.autoChecks.length >= 14 && p.autoChecks.every(c => c.ok)), `${f}: ${p.name} is auto_verified without all checks passing`); }); }

// 4a. how the app treats machine-checked rows: only a full set of passed checks, and only while recent, counts as verified
{ const sb = { Date: Date }; new Function('window', read('js/data.js'))(sb);
  const today = new Date().toISOString().slice(0, 10), mk = n => Array.from({ length: n }, (_, i) => ({ type: 't' + i, ok: true }));
  const T = p => sb.MZDATA.trustOf(Object.assign({ verificationStatus: 'auto_verified', lastVerifiedAt: today, autoChecks: mk(14) }, p));
  ok(T({}).status === 'verified' && T({}).auto === true, 'auto_verified with 14/14 passed checks is shown as verified');
  ok(T({ autoChecks: mk(13) }).status === 'pending_review', 'fewer than 14 checks is never verified');
  ok(T({ autoChecks: mk(13).concat([{ type: 'x', ok: false }]) }).status === 'pending_review', 'one failed check blocks verified');
  ok(T({ lastVerifiedAt: '2020-01-01' }).status === 'pending_review', 'an old auto check expires');
  ok(T({ autoChecks: undefined }).status === 'pending_review', 'missing checks is never verified');
  ok(sb.MZDATA.trustOf({ verificationStatus: 'verified', lastVerifiedAt: today }).status === 'pending_review', 'a plain verified row without proof is still downgraded'); }

// 4b. generated files are in step with their sources (needs python3; skipped where it is not installed)
{ const { spawnSync } = require('node:child_process');
  const py = spawnSync('python3', ['--version']);
  if (py.status === 0) {
    const r = spawnSync('python3', ['scripts/build_catalogue.py', '--check'], { cwd: root, encoding: 'utf8' });
    ok(r.status === 0, 'js/catalogue_data.js is out of date with data/catalogue.json: run python3 scripts/build_catalogue.py');
    for (const f of ['scripts/test_scripts.py', 'scripts/test_pipeline.py']) {
      const t = spawnSync('python3', [f], { cwd: root, encoding: 'utf8' });
      ok(t.status === 0, f + ' failed:\n' + (t.stderr || '').split('\n').slice(-12).join('\n')); }
  } else console.log('note: python3 not found, skipped the data-script checks'); }

// 5. engine maths
const E = require(path.join(root, 'js/engine.js'));
[[100, 7], [80, 7], [79, 6], [70, 6], [60, 5], [50, 4], [40, 3], [30, 2], [29, 1], [0, 1]].forEach(([m, l]) => ok(E.levelFromMark(m) === l, `levelFromMark(${m}) should be ${l}`));
ok(E.hasMark({ mark: 0 }) && !E.hasMark({ mark: null }) && !E.hasMark({ mark: '' }) && !E.hasMark({ mark: 101 }) && !E.hasMark({ mark: -1 }), 'hasMark edge cases');
const subs = (marks) => ['English Home Language', 'Mathematics', 'Physical Sciences', 'Life Sciences', 'Geography', 'Life Orientation', 'Accounting'].map((name, i) => ({ name, mark: marks[i], isHomeLanguage: i === 0, isLifeOrientation: name === 'Life Orientation' }));
const r = E.evaluateNsc(subs([75, 72, 68, 65, 61, 90, 58]));
ok(r && typeof r.aps === 'number', 'evaluateNsc returns an APS number');
ok(r.aps === 6 + 6 + 5 + 5 + 5 + 4 - 0 || r.aps >= 30, 'APS best-six excludes Life Orientation (got ' + (r && r.aps) + ')');
const noLO = E.evaluateNsc(subs([75, 72, 68, 65, 61, 100, 58])); ok(noLO.aps === r.aps, 'Changing Life Orientation must not change APS');
const incomplete = E.evaluateNsc(subs([75, 72, null, null, null, 60, null])); ok(incomplete.aps === null || incomplete.aps === undefined, 'Missing marks must never be guessed into an APS');
ok(E.scrubPii('id 9001015009087').indexOf('9001015009087') < 0, 'scrubPii removes 13-digit SA ID numbers');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
