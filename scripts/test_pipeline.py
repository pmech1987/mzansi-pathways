"""Tests for the prospectus pipeline, on a generated fake PDF and a fake AI reader. Run: python scripts/test_pipeline.py"""
import json, os, shutil, sys, tempfile, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C
import make_sample_prospectus as M
import pipeline_extract as X
import pipeline_verify as V
import pipeline_sources as S
import run_pipeline as R

REAL_DATA, REAL_ROOT = C.DATA, C.ROOT
FILLER = ['General rules and notes for applicants: ' + 'please read the faculty pages carefully before you apply. ' * 3] * 6


def fake_llm(prompt):
    """A stand-in for the AI reader: parses the page the same way a careful reader would, but through a different code path (JSON)."""
    page = prompt.split('Page text:\n\n', 1)[1]
    progs = []
    for c in X.rules_extract([page]):
        progs.append({'name': c['name'], 'minAps': c['minAps'], 'quote': c['evidence'][0],
                      'subjects': [{'subject': (s['anyOf'][0] if s['anyOf'][0].startswith('English') else ' or '.join(s['anyOf'])), 'minMark': s['minMark']} for s in c['subjects']]})
    return json.dumps({'programmes': progs})


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        C.ROOT = self.tmp; C.DATA = os.path.join(self.tmp, 'data')
        shutil.copytree(REAL_DATA, C.DATA, ignore=shutil.ignore_patterns('inbox'))
        self.pdf = os.path.join(self.tmp, 'sample.pdf'); M.build(self.pdf)
        os.environ['MZ_TODAY'] = '2026-11-26'; os.environ['MZ_MIN_RUNS'] = '2'; os.environ.pop('ANTHROPIC_API_KEY', None)
        ins = C.load(C.path('institutions.json'))
        up = [i for i in ins['institutions'] if i['id'] == 'up'][0]
        self.official = up['officialUrl']

    def tearDown(self):
        C.DATA, C.ROOT = REAL_DATA, REAL_ROOT
        for k in ('MZ_TODAY', 'MZ_MIN_RUNS', 'ANTHROPIC_API_KEY'): os.environ.pop(k, None)
        shutil.rmtree(self.tmp, ignore_errors=True)

    def run_up(self, extra=()):
        # local PDF has no real URL, so use the institution's own domain for the domain check
        return R.main(['--only', 'up', '--year', '2027', '--pdf', 'up=' + self.pdf] + list(extra))

    def rows(self):
        return {r['name']: r for r in C.load(C.path('programmes', '2027.json'))['programmes']}


class ExtractTests(Base):
    def test_rules_read_numbers_levels_and_closing_date(self):
        p = X.pages_pdftotext(self.pdf); cs = {c['name']: c for c in X.rules_extract(p)}
        self.assertEqual(len(cs), 5)
        b = cs['BSc Computer Science']
        self.assertEqual(b['minAps'], 34); self.assertEqual(b['docNqf'], 7)
        self.assertIn(({'anyOf': ['Mathematics'], 'minMark': 70}), b['subjects'])  # Level 6 -> 70%
        self.assertEqual(X.parse_closing(' '.join(p)), '2026-09-30')
        d = cs['Diploma in Information Technology']
        self.assertIn({'anyOf': ['Mathematical Literacy', 'Mathematics'], 'minMark': 50}, d['subjects'])

    def test_two_engines_both_read_the_pdf(self):
        self.assertEqual(len(X.pages_pdftotext(self.pdf)), len(X.pages_pypdf(self.pdf)))


class PipelineTests(Base):
    def test_first_run_is_pending_second_run_is_auto_verified_with_ai_reader(self):
        X_llm = X.llm_extract
        X.llm_extract = lambda pages, wanted, call=None: X_llm(pages, wanted, call=fake_llm)
        try:
            self.run_up()
            self.assertTrue(all(r['verificationStatus'] == 'pending_review' for r in self.rows().values()))  # only seen once so far
            self.assertIn('seen_in_repeat_runs', [c['type'] for c in self.rows()['BSc Computer Science']['autoChecks'] if not c['ok']])
            os.environ['MZ_TODAY'] = '2026-11-27'
            self.run_up()
            rows = self.rows()
            self.assertEqual({r['verificationStatus'] for r in rows.values()}, {'auto_verified'})
            r = rows['BSc Computer Science']
            self.assertTrue(all(c['ok'] for c in r['autoChecks'])); self.assertGreaterEqual(len(r['autoChecks']), 14)
            self.assertEqual(r['closes'], '2026-09-30'); self.assertTrue(r['officialUrl'].endswith('#page=2'))
        finally:
            X.llm_extract = X_llm

    def test_without_ai_reader_nothing_is_auto_verified(self):
        self.run_up(); os.environ['MZ_TODAY'] = '2026-11-27'; self.run_up()
        self.assertNotIn('auto_verified', {r['verificationStatus'] for r in self.rows().values()})

    def test_same_day_rerun_does_not_count_as_a_second_run(self):
        self.run_up(); self.run_up(); self.run_up()
        self.assertTrue(all(v['seen'] == 1 for v in C.load(C.path('pipeline_state.json'))['rows'].values()))

    def test_value_that_is_not_in_the_document_is_rejected(self):
        p1 = X.pages_pdftotext(self.pdf); p2 = X.pages_pypdf(self.pdf)
        ctx = {'institutionId': 'up', 'year': 2027, 'url': self.official + 'p.pdf', 'officialUrl': self.official, 'sha256': 'ab' * 32, 'apsMethod': None,
               'closes': None, 'prior': {}, 'catalogue': [], 'min_runs': 1, 'seen': {}}
        cands, _ = R.process_document(ctx, p1, p2)
        c = cands[0]; c['minAps'] = 99.0; c['apsAll'] = [99.0]
        checks = V.run_checks(c, dict(ctx, llm_match=None)); verdict = V.verdict(checks)
        self.assertEqual(verdict[0], 'rejected'); self.assertIn('numbers_in_evidence', verdict[1])

    def test_wrong_domain_and_wrong_year_are_caught(self):
        p1 = X.pages_pdftotext(self.pdf)
        ctx = {'institutionId': 'up', 'year': 2031, 'url': 'https://evil.example.com/p.pdf', 'officialUrl': self.official, 'sha256': 'x', 'apsMethod': None,
               'closes': None, 'prior': {}, 'catalogue': [], 'min_runs': 1, 'seen': {}}
        cands, _ = R.process_document(ctx, p1, None)
        types = {t for c in cands for t in c['hardFail'] + c['softFail']}
        self.assertIn('official_domain', types); self.assertIn('year_match', types)
        self.assertTrue(all(c['verdict'] == 'rejected' for c in cands))

    def test_conflicting_values_in_one_document_are_rejected(self):
        pages = [["Example University Prospectus 2027"], ["BSc Physics", "Minimum APS: 30", "Mathematics: Level 5", "", "BSc Physics", "Minimum APS: 36", "Mathematics: Level 5"]]
        M.build(self.pdf, pages); self.run_up()
        self.assertNotIn('BSc Physics', self.rows())

    def test_retry_loop_stops_when_nothing_changes(self):
        p1 = X.pages_pdftotext(self.pdf)
        ctx = {'institutionId': 'up', 'year': 2027, 'url': self.official + 'p.pdf', 'officialUrl': self.official, 'sha256': 'x', 'apsMethod': None,
               'closes': None, 'prior': {}, 'catalogue': [], 'min_runs': 1, 'seen': {}}
        _, info = R.process_document(ctx, p1, None, max_rounds=10)
        self.assertLessEqual(info['rounds'], 3)  # unfixable soft failures (no 2nd engine / AI) must not spin 10 times

    def test_a_persons_verified_row_is_never_overwritten(self):
        d = C.load(C.path('programmes', '2027.json'))
        d['programmes'].append({'id': 'up_bsc_computer_science_2027', 'institutionId': 'up', 'intakeYear': 2027, 'name': 'BSc Computer Science', 'route': 'University',
                                'minAps': 99, 'verificationStatus': 'verified', 'closes': '2026-09-30'})
        C.save(C.path('programmes', '2027.json'), d); self.run_up()
        self.assertEqual(self.rows()['BSc Computer Science']['minAps'], 99)

    def test_removed_programme_disappears_on_next_run(self):
        self.run_up(); self.assertIn('BCom Accounting', self.rows())
        M.build(self.pdf, [M.PAGES[0], M.PAGES[1][:7], M.PAGES[2][:1] + FILLER]); os.environ['MZ_TODAY'] = '2026-11-27'; self.run_up()
        self.assertNotIn('BCom Accounting', self.rows())

    def test_prospectus_discovery_stays_on_the_official_site(self):
        html = lambda body: ('<html>' + body + '</html>').encode()
        pages = {'https://www.up.ac.za/': html('<a href="/study">Study</a><a href="https://evil.com/prospectus-2027.pdf">x</a>'),
                 'https://www.up.ac.za/study': html('<a href="/files/undergraduate-prospectus-2027.pdf">Undergraduate Prospectus 2027</a><a href="/files/postgrad-prospectus-2027.pdf">Postgrad</a><a href="/files/menu.pdf">Menu</a>')}
        fetch = lambda u, limit=0, timeout=0: (pages[u], 'text/html') if u in pages else (_ for _ in ()).throw(OSError('404'))
        found = S.discover('https://www.up.ac.za/', 2027, fetch=fetch)
        self.assertEqual(found[0][1], 'https://www.up.ac.za/files/undergraduate-prospectus-2027.pdf')
        self.assertTrue(all('evil.com' not in u and 'menu' not in u for _, u in found))

    def test_download_refuses_non_pdf(self):
        with self.assertRaises(ValueError): S.download('https://www.up.ac.za/x', 'k', fetch=lambda u: (b'<html>', 'text/html'))


class FreeTierAiReaderTests(Base):
    """The AI reader on a free tier: Gemini request shape, cache, pacing, daily cap, quota errors."""
    PAGES = ['BSc Computer Science\nMinimum APS: 34\nEnglish Home Language: Level 5\nMathematics: Level 6\n',
             'BCom Accounting\nAPS 32\nEnglish: Level 5\nMathematics: 60%\n']

    def setUp(self):
        super().setUp()
        for k in ('MZ_LLM_PROVIDER', 'MZ_LLM_RPM', 'MZ_LLM_MAX_CALLS', 'MZ_LLM_MODEL'): os.environ.pop(k, None)
        os.environ['GEMINI_API_KEY'] = 'test-key'; os.environ['MZ_LLM_RPM'] = '0'
        self.calls, self.sleeps = [], []
        self._post, self._sl = X._post_json, X._sleep
        X._sleep = self.sleeps.append
        def fake_post(url, headers, body, tries=5):
            self.calls.append((url, headers, body))
            return {'candidates': [{'content': {'parts': [{'text': fake_llm(body['contents'][0]['parts'][0]['text'])}]}}]}
        X._post_json = fake_post

    def tearDown(self):
        X._post_json, X._sleep = self._post, self._sl
        for k in ('GEMINI_API_KEY', 'MZ_LLM_PROVIDER', 'MZ_LLM_RPM', 'MZ_LLM_MAX_CALLS', 'MZ_LLM_MODEL'): os.environ.pop(k, None)
        super().tearDown()

    def test_gemini_request_shape_and_result(self):
        out = X.llm_extract(self.PAGES, {1, 2})
        self.assertEqual({o['name'] for o in out}, {'BSc Computer Science', 'BCom Accounting'})
        url, headers, body = self.calls[0]
        self.assertIn('generativelanguage.googleapis.com', url); self.assertEqual(headers['x-goog-api-key'], 'test-key')
        self.assertNotIn('test-key', url)                       # the key is never put in a URL (URLs get logged)
        self.assertEqual(body['generationConfig']['responseMimeType'], 'application/json')

    def test_no_key_means_no_ai_reader(self):
        os.environ.pop('GEMINI_API_KEY')
        self.assertIsNone(X.llm_extract(self.PAGES, {1, 2}))

    def test_answers_are_cached_so_a_repeat_run_costs_nothing(self):
        X.llm_extract(self.PAGES, {1, 2}); self.assertEqual(len(self.calls), 2)
        out = X.llm_extract(self.PAGES, {1, 2})
        self.assertEqual(len(self.calls), 2); self.assertEqual(X.LAST['cached'], 2); self.assertEqual(len(out), 2)

    def test_daily_cap_postpones_then_next_day_resumes(self):
        os.environ['MZ_LLM_MAX_CALLS'] = '1'
        out = X.llm_extract(self.PAGES, {1, 2})
        self.assertEqual((len(self.calls), X.LAST['postponed'], len(out)), (1, {2}, 1))
        os.environ['MZ_TODAY'] = '2026-11-27'
        out = X.llm_extract(self.PAGES, {1, 2})
        self.assertEqual((len(self.calls), X.LAST['postponed'], len(out)), (2, set(), 2))   # page 1 came from cache, page 2 used the new day's budget

    def test_quota_error_stops_calls_without_crashing(self):
        def boom(url, headers, body, tries=5): self.calls.append(1); raise X.QuotaExhausted('429')
        X._post_json = boom
        out = X.llm_extract(self.PAGES, {1, 2})
        self.assertEqual((out, len(self.calls), X.LAST['postponed']), ([], 1, {1, 2}))      # one failed call, then it stops asking

    def test_calls_are_paced_to_the_requests_per_minute_limit(self):
        os.environ['MZ_LLM_RPM'] = '4'
        X.llm_extract(self.PAGES, {1, 2})
        self.assertEqual(len(self.sleeps), 1); self.assertGreater(self.sleeps[0], 0)

    def test_postponed_page_is_explained_not_called_wrong(self):
        c = dict(X.rules_extract([self.PAGES[0]])[0], page=1, baseKey='x', id='x_2027', hardFail=[])
        checks = V.run_checks(c, dict(self._ctx(), llm_on=True, llm_match=None, llm_postponed={1}))
        self.assertIn('postponed', [k for k in checks if k['type'] == 'second_extractor_agrees'][0]['detail'])

    def _ctx(self):
        return {'institutionId': 'up', 'year': 2027, 'url': self.official + 'p.pdf', 'officialUrl': self.official, 'sha256': 'x', 'apsMethod': None, 'closes': '', 'prior': {},
                'catalogue': [], 'min_runs': 2, 'seen': {}, 'pages1': self.PAGES, 'pages2': self.PAGES, 'doc_head': ' '.join(self.PAGES)}


if __name__ == '__main__':
    unittest.main(verbosity=1)
