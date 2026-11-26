"""Tests for the v92 automation: link health, year rollover, sheet imports, attention digest, workflow safety.
Run:  python scripts/test_automation.py   (no installs, no network; works on a throwaway copy of data/, never the real files)"""
import csv, json, os, re, shutil, subprocess, sys, tempfile, unittest, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C
import check_links as cl
import roll_year as ry
import import_sheet as sh
import make_digest as md
import refresh_data as rd
import csv_to_programmes_json as imp

REAL_DATA, ROOT = C.DATA, C.ROOT


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        C.DATA = os.path.join(self.tmp, 'data')
        shutil.copytree(REAL_DATA, C.DATA, ignore=shutil.ignore_patterns('inbox'))
        os.environ['MZ_TODAY'] = '2026-11-26'
        md.OUT = os.path.join(self.tmp, 'reports', 'attention.md')
        md.REPORT = os.path.join(self.tmp, 'reports', 'pipeline_report.md')

    def tearDown(self):
        C.DATA = REAL_DATA
        os.environ.pop('MZ_TODAY', None)
        shutil.rmtree(self.tmp, ignore_errors=True)

    def sheet(self, name, cols, *rows):
        p = os.path.join(self.tmp, name)
        with open(p, 'w', encoding='utf-8-sig', newline='') as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            for r in rows:
                w.writerow(r)
        return p


class LinkTests(Base):
    def test_classification_never_calls_a_blocked_robot_a_dead_link(self):
        self.assertEqual(cl.classify(200, None), 'ok')
        self.assertEqual(cl.classify(301, None), 'ok')
        self.assertEqual(cl.classify(404, None), 'down')
        self.assertEqual(cl.classify(410, None), 'down')
        for code in (401, 403, 429, 500, 503):
            self.assertEqual(cl.classify(code, None), 'blocked', code)
        self.assertEqual(cl.classify(None, OSError()), 'down')

    def test_retries_then_gives_up_and_recovers_on_a_later_try(self):
        calls = []
        def flaky(u):
            calls.append(u)
            if len(calls) < 3: raise urllib.error.URLError('slow')
            return 200, u
        r = cl.check_one('https://a.example/', flaky, sleep=lambda s: None)
        self.assertEqual((r['kind'], len(calls)), ('ok', 3))
        calls.clear()
        def dead(u):
            calls.append(u); raise urllib.error.URLError('dns')
        r = cl.check_one('https://a.example/', dead, sleep=lambda s: None)
        self.assertEqual((r['kind'], len(calls)), ('down', cl.TRIES))

    def test_two_failed_runs_make_a_link_failing_and_a_good_run_resets_it(self):
        urls = {'https://ok.example/': ['x'], 'https://gone.example/': ['y'], 'https://robot.example/': ['z'],
                'https://new.example/': ['m'], 'http://plain.example/': ['p']}
        def fetch(u):
            if 'gone' in u: return 404, u
            if 'robot' in u: return 403, u
            if 'new' in u: return 200, 'https://other-site.example/home'
            return 200, u
        d1 = cl.build(urls, {}, '2026-11-25', fetch, lambda s: None)
        L = d1['links']
        self.assertEqual(L['https://ok.example/']['status'], 'ok')
        self.assertEqual(L['https://gone.example/']['status'], 'suspect')
        self.assertEqual(L['https://robot.example/']['status'], 'unknown')
        self.assertEqual(L['https://new.example/']['status'], 'moved')
        self.assertEqual(L['https://new.example/']['finalUrl'], 'https://other-site.example/home')
        self.assertEqual(L['http://plain.example/']['status'], 'skipped')
        d2 = cl.build(urls, d1, '2026-12-02', fetch, lambda s: None)
        self.assertEqual(d2['links']['https://gone.example/']['status'], 'failing')
        self.assertEqual(d2['summary']['failing'], 1)
        d3 = cl.build(urls, d2, '2026-12-09', lambda u: (200, u), lambda s: None)
        self.assertEqual(d3['links']['https://gone.example/']['status'], 'ok')
        self.assertEqual(d3['links']['https://gone.example/']['failStreak'], 0)

    def test_collects_links_from_every_data_file_and_writes_quietly(self):
        urls = cl.collect()
        self.assertIn('institution:up', urls['https://www.up.ac.za/'])
        self.assertTrue(any(w.startswith('event:') for v in urls.values() for w in v))
        self.assertTrue(any(w.startswith('portal:') for v in urls.values() for w in v))
        self.assertEqual(cl.main([], fetch=lambda u: (200, u), sleep=lambda s: None), 0)
        with open(C.path('link_health.json'), 'rb') as f: raw = f.read()
        os.environ['MZ_TODAY'] = '2026-12-03'
        cl.main([], fetch=lambda u: (200, u), sleep=lambda s: None)
        self.assertEqual(raw, open(C.path('link_health.json'), 'rb').read(), 'a quiet week must not rewrite the file (no commit noise)')

    def test_strict_mode_and_dry_run(self):
        down = lambda u: (404, u)
        cl.main([], fetch=down, sleep=lambda s: None)
        os.environ['MZ_TODAY'] = '2026-12-03'
        self.assertEqual(cl.main(['--strict'], fetch=down, sleep=lambda s: None), 1)
        before = open(C.path('link_health.json'), 'rb').read()
        os.environ['MZ_TODAY'] = '2026-12-10'
        cl.main(['--dry-run'], fetch=lambda u: (200, u), sleep=lambda s: None)
        self.assertEqual(before, open(C.path('link_health.json'), 'rb').read())

    def test_checker_never_edits_a_fact(self):
        facts = {n: open(C.path(n), 'rb').read() for n in ('institutions.json', 'events.json', 'bursaries.json')}
        cl.main([], fetch=lambda u: (404, u), sleep=lambda s: None)
        for n, raw in facts.items():
            self.assertEqual(raw, open(C.path(n), 'rb').read(), n)


class RollYearTests(Base):
    def test_nothing_to_do_today(self):
        raw = open(C.path('sources.json'), 'rb').read()
        self.assertEqual(ry.main(['--check']), 0)
        self.assertEqual(ry.main([]), 0)
        self.assertEqual(raw, open(C.path('sources.json'), 'rb').read())

    def test_next_year_is_added_from_june_and_is_idempotent(self):
        os.environ['MZ_TODAY'] = '2027-06-02'
        self.assertEqual(ry.main(['--check']), 1)
        n_inst = len({r['institutionId'] for r in C.load(C.path('sources.json'))['sources']})
        ry.main([])
        rows = C.load(C.path('sources.json'))['sources']
        self.assertEqual(sum(r['intakeYear'] == 2028 for r in rows), n_inst)
        self.assertEqual(sum(r['intakeYear'] == 2027 and r.get('active') is not False for r in rows), n_inst)
        self.assertIn('programmes/2028.json', C.load(C.path('index.json'))['files'])
        raw = open(C.path('sources.json'), 'rb').read()
        ry.main([])
        self.assertEqual(raw, open(C.path('sources.json'), 'rb').read())
        self.assertEqual(ry.main(['--check']), 0)

    def test_old_year_is_switched_off_and_new_files_are_created(self):
        os.environ['MZ_TODAY'] = '2028-06-15'
        ry.main([])
        rows = C.load(C.path('sources.json'))['sources']
        self.assertTrue(all(r.get('active') is False for r in rows if r['intakeYear'] == 2027))
        self.assertTrue(all(r.get('active') is not False for r in rows if r['intakeYear'] == 2028))
        self.assertTrue(any(r['intakeYear'] == 2029 for r in rows))
        doc = C.load(C.path('programmes', '2029.json'))
        self.assertEqual((doc['intakeYear'], doc['programmes']), (2029, []))
        self.assertIn('programmes/2029.json', C.load(C.path('index.json'))['files'])

    def test_a_rollover_never_deletes_anything(self):
        before = C.load(C.path('sources.json'))['sources']
        os.environ['MZ_TODAY'] = '2029-09-01'
        ry.main([])
        after = C.load(C.path('sources.json'))['sources']
        keys = lambda rows: {(r['institutionId'], r['intakeYear']) for r in rows}
        self.assertTrue(keys(before) <= keys(after))

    def test_pipeline_skips_inactive_years(self):
        self.assertIn("src.get('active') is False", open(os.path.join(ROOT, 'scripts', 'run_pipeline.py'), encoding='utf-8').read())


class SheetTests(Base):
    BUR = dict(id='funza_lushaka_2027', name='Funza Lushaka 2027', type='Government', summary='Bursary for people training to become teachers.',
               note='Service obligation applies.', officialUrl='https://www.funzalushaka.doe.gov.za/', opens='2027-01-04', closes='2027-05-31',
               amountNote='See the funder page', lastVerifiedAt='2026-11-20')
    EV = dict(id='uct_2027_closing', title='UCT 2027 undergraduate applications close', date='2027-07-31', scope='UCT', confidence='secondary_verify',
              source='UCT admissions', sourceUrl='https://www.uct.ac.za/', checkedAt='2026-11-20')

    def run_sheet(self, kind, cols, *rows):
        p = self.sheet(kind + '_t.csv', cols, *rows)
        return sh.main([p])

    def test_good_bursary_is_added_as_pending_review_and_reimport_replaces(self):
        self.assertEqual(self.run_sheet('bursaries', sh.COLUMNS['bursaries'], self.BUR), 0)
        rows = {b['id']: b for b in C.load(C.path('bursaries.json'))['bursaries']}
        b = rows['funza_lushaka_2027']
        self.assertEqual((b['verificationStatus'], b['closes'], b['officialUrl']), ('pending_review', '2027-05-31', 'https://www.funzalushaka.doe.gov.za/'))
        n = len(rows)
        self.run_sheet('bursaries', sh.COLUMNS['bursaries'], dict(self.BUR, closes='2027-06-15'))
        rows2 = C.load(C.path('bursaries.json'))['bursaries']
        self.assertEqual(len(rows2), n)
        self.assertEqual(next(x for x in rows2 if x['id'] == 'funza_lushaka_2027')['closes'], '2027-06-15')

    def test_bad_bursary_rows_are_rejected_without_stopping_good_ones(self):
        bad = [dict(self.BUR, id='b_no_url', officialUrl=''),
               dict(self.BUR, id='b_social', officialUrl='https://facebook.com/x'),
               dict(self.BUR, id='b_type', type='Magic'),
               dict(self.BUR, id='b_order', opens='2027-06-01', closes='2027-01-01'),
               dict(self.BUR, id='b_nodate', lastVerifiedAt=''),
               dict(self.BUR, id='b_future', lastVerifiedAt='2030-01-01'),
               dict(self.BUR, id='B'),
               dict(self.BUR, id='b_good_one')]
        self.assertEqual(self.run_sheet('bursaries', sh.COLUMNS['bursaries'], *bad), 1)
        ids = {b['id'] for b in C.load(C.path('bursaries.json'))['bursaries']}
        self.assertIn('b_good_one', ids)
        self.assertFalse(ids & {'b_no_url', 'b_social', 'b_type', 'b_order', 'b_nodate', 'b_future', 'B'})

    def test_a_verified_bursary_is_never_overwritten_by_a_file(self):
        d = C.load(C.path('bursaries.json'))
        d['bursaries'][0]['verificationStatus'] = 'verified'
        C.save(C.path('bursaries.json'), d)
        rid = d['bursaries'][0]['id']
        self.assertEqual(self.run_sheet('bursaries', sh.COLUMNS['bursaries'], dict(self.BUR, id=rid)), 1)
        self.assertEqual(C.load(C.path('bursaries.json'))['bursaries'][0]['verificationStatus'], 'verified')

    def test_note_only_bursary_needs_no_link(self):
        r = dict(id='plain_fund', name='Plain fund', type='Employer', summary='Companies fund study in scarce skills.', note='Check careers pages.')
        self.assertEqual(self.run_sheet('bursaries', sh.COLUMNS['bursaries'], r), 0)

    def test_events_added_sorted_and_validated(self):
        self.assertEqual(self.run_sheet('events', sh.COLUMNS['events'], self.EV, dict(self.EV, id='early', date='2026-01-05', title='Something early in January')), 0)
        ev = C.load(C.path('events.json'))['events']
        self.assertEqual([e['date'] for e in ev], sorted(e['date'] for e in ev))
        self.assertIn('uct_2027_closing', {e['id'] for e in ev})
        for bad in (dict(self.EV, id='e1', confidence='trust_me'), dict(self.EV, id='e2', sourceUrl='http://www.uct.ac.za/'),
                    dict(self.EV, id='e3', checkedAt=''), dict(self.EV, id='e4', date='2027-02-30'), dict(self.EV, id='e5', sourceUrl='https://bit.ly/abc')):
            self.assertEqual(self.run_sheet('events', sh.COLUMNS['events'], bad), 1, bad['id'])
        self.assertFalse({'e1', 'e2', 'e3', 'e4', 'e5'} & {e['id'] for e in C.load(C.path('events.json'))['events']})

    def test_institution_links_only_change_the_link_and_the_checked_flag(self):
        insts = C.load(C.path('institutions.json'))['institutions']
        tv = next(i for i in insts if i['type'] == 'TVET')
        self.assertIsNone(tv.get('officialUrl'))
        r = dict(id=tv['id'], officialUrl='https://www.example-college.edu.za/', lastVerifiedAt='2026-11-20', checkedAgainstDhet='yes')
        self.assertEqual(self.run_sheet('institutions', sh.COLUMNS['institutions'], r), 0)
        new = next(i for i in C.load(C.path('institutions.json'))['institutions'] if i['id'] == tv['id'])
        self.assertEqual((new['officialUrl'], new['listStatus']), ('https://www.example-college.edu.za/', 'checked'))
        self.assertEqual({k: v for k, v in new.items() if k not in ('officialUrl', 'listStatus')}, {k: v for k, v in tv.items() if k not in ('officialUrl', 'listStatus')})
        self.assertEqual(self.run_sheet('institutions', sh.COLUMNS['institutions'], dict(r, id='nope_college')), 1)
        self.assertEqual(self.run_sheet('institutions', sh.COLUMNS['institutions'], dict(r, officialUrl='https://t.co/x')), 1)

    def test_file_name_picks_the_kind_and_dry_run_writes_nothing(self):
        self.assertEqual((sh.kind_of('inbox/bursaries_2027.csv'), sh.kind_of('inbox/Events-x.json'), sh.kind_of('inbox/up.csv')), ('bursaries', 'events', None))
        raw = open(C.path('events.json'), 'rb').read()
        p = self.sheet('events_dry.csv', sh.COLUMNS['events'], self.EV)
        self.assertEqual(sh.main([p, '--dry-run']), 0)
        self.assertEqual(raw, open(C.path('events.json'), 'rb').read())
        self.assertEqual(sh.main([self.sheet('mystery.csv', ['a'], {'a': '1'})]), 1)

    def test_data_still_passes_the_app_rules_after_an_import(self):
        self.run_sheet('bursaries', sh.COLUMNS['bursaries'], self.BUR)
        for b in C.load(C.path('bursaries.json'))['bursaries']:
            for k, v in b.items():
                if k.lower().endswith('url'):
                    self.assertTrue(C.https_ok(v), (b['id'], k))


class DigestTests(Base):
    def titles(self):
        return [t for t, _ in md.sections(C.today())]

    def test_pipeline_never_run_is_the_first_thing_reported(self):
        rd.main([])
        t = self.titles()
        self.assertTrue(t and 'has not produced any 2027 rows' in t[0])

    def test_all_clear_when_every_institution_has_rows_and_nothing_is_stale(self):
        d = C.load(C.path('institutions.json'))
        d['institutions'] = [i for i in d['institutions'] if i['id'] == 'up']
        C.save(C.path('institutions.json'), d)
        row = {'id': 'up_bsc_cs', 'institutionId': 'up', 'intakeYear': '2027', 'name': 'BSc Computer Science', 'route': 'University', 'nqf': '7', 'minAps': '30',
               'requiresSelection': 'no', 'subjectRequirements': 'English>=50; Mathematics>=60', 'closes': '2027-06-30', 'funding': 'NSFAS', 'officialUrl': 'https://www.up.ac.za/',
               'sourceDoc': 'UP Prospectus 2027', 'sourcePage': 'p. 41', 'lastVerifiedAt': '2026-11-20', 'verificationStatus': 'pending_review'}
        p = self.sheet('up.csv', imp.COLUMNS, row)
        self.assertEqual(imp.main([p]), 0)
        rd.main([])
        self.assertEqual(self.titles(), [])
        self.assertEqual(md.main(['--check']), 0)
        md.main([])
        self.assertNotIn('\n## ', open(md.OUT, encoding='utf-8').read())

    def test_reports_missing_institutions_stale_dates_and_bad_links(self):
        row = {'id': 'up_bsc_cs', 'institutionId': 'up', 'intakeYear': '2027', 'name': 'BSc Computer Science', 'route': 'University', 'nqf': '7', 'minAps': '30',
               'requiresSelection': 'no', 'subjectRequirements': 'English>=50', 'closes': '2027-06-30', 'funding': 'NSFAS', 'officialUrl': 'https://www.up.ac.za/',
               'sourceDoc': 'UP Prospectus 2027', 'sourcePage': 'p. 41', 'lastVerifiedAt': '2026-11-20', 'verificationStatus': 'pending_review'}
        imp.main([self.sheet('up.csv', imp.COLUMNS, row)])
        os.environ['MZ_TODAY'] = '2027-04-10'      # events are now >30 days old and the row is >120 days old
        rd.main([])
        cl.main([], fetch=lambda u: (404, u), sleep=lambda s: None)
        os.environ['MZ_TODAY'] = '2027-04-17'
        cl.main([], fetch=lambda u: (404, u), sleep=lambda s: None)
        os.makedirs(os.path.dirname(md.REPORT), exist_ok=True)
        open(md.REPORT, 'w', encoding='utf-8').write('# r\n\n## Not processed\n- wits 2027: no prospectus PDF found on https://www.wits.ac.za/\n\n## Rows\n')
        joined = ' | '.join(self.titles())
        for part in ('no 2027 rows yet', 'older than 120 days', 'not re-checked', 'failed 2 weeks in a row', '1 document(s) not processed'):
            self.assertIn(part, joined)
        self.assertEqual(md.main(['--check']), 1)


class WorkflowSafetyTests(unittest.TestCase):
    def wf(self, name):
        with open(os.path.join(ROOT, '.github', 'workflows', name), encoding='utf-8') as f:
            return f.read()

    def test_every_workflow_that_writes_data_shares_one_lock_and_the_safe_push(self):
        for n in ('data-refresh.yml', 'prospectus-pipeline.yml', 'link-health.yml'):
            t = self.wf(n)
            self.assertIn('group: mz-data-writes', t, n)
            self.assertIn('scripts/push_data.sh', t, n)
            self.assertNotIn('git push', t, n + ' must push only through scripts/push_data.sh')

    def test_checks_run_before_anything_is_committed(self):
        for n in ('data-refresh.yml', 'prospectus-pipeline.yml', 'link-health.yml'):
            t = self.wf(n)
            self.assertLess(t.index('node tests/run.mjs'), t.index('push_data.sh'), n)

    def test_user_typed_inputs_never_go_straight_into_a_shell_line(self):
        t = self.wf('prospectus-pipeline.yml')
        self.assertIn('ONLY: ${{ github.event.inputs.only }}', t)
        for line in t.split('\n'):
            if '${{ github.event.inputs' in line:
                self.assertRegex(line.strip(), r'^(ONLY|YEAR): ', line)

    def test_digest_can_open_issues_but_cannot_write_code(self):
        t = self.wf('data-digest.yml')
        self.assertIn('issues: write', t)
        self.assertIn('contents: read', t)
        self.assertNotIn('contents: write', t)

    def test_push_script_is_valid_shell_and_never_forces(self):
        p = os.path.join(ROOT, 'scripts', 'push_data.sh')
        self.assertEqual(subprocess.run(['bash', '-n', p]).returncode, 0)
        with open(p) as f:
            sh_text = f.read()
        self.assertNotIn('--force', sh_text)
        self.assertNotIn('-f ', sh_text.replace('set -euo', ''))


if __name__ == '__main__':
    unittest.main(verbosity=1)
