"""Tests for the data scripts. Run:  python scripts/test_scripts.py   (no installs; works on a throwaway copy of data/, never the real files)"""
import csv, json, os, shutil, sys, tempfile, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C
import csv_to_programmes_json as imp
import refresh_data as rd
import fetch_jobs as fj

REAL_DATA = C.DATA
GOOD = {'id': 'up_bsc_cs', 'institutionId': 'up', 'intakeYear': '2027', 'name': 'BSc Computer Science', 'route': 'University', 'nqf': '7',
        'minAps': '30', 'requiresSelection': 'no', 'subjectRequirements': 'English>=50; Mathematics>=60', 'closes': '2027-06-30',
        'funding': 'NSFAS; Bursary', 'officialUrl': 'https://www.up.ac.za/', 'sourceDoc': 'UP Prospectus 2027', 'sourcePage': 'p. 41',
        'lastVerifiedAt': '2026-11-20', 'verificationStatus': 'pending_review'}


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        C.DATA = os.path.join(self.tmp, 'data')
        shutil.copytree(REAL_DATA, C.DATA, ignore=shutil.ignore_patterns('inbox'))
        os.environ['MZ_TODAY'] = '2026-11-26'
        # start every test from a known programme state
        self.prog_files = [f for f in C.load(C.path('index.json'))['files']]

    def tearDown(self):
        C.DATA = REAL_DATA
        os.environ.pop('MZ_TODAY', None)
        shutil.rmtree(self.tmp, ignore_errors=True)

    def csv(self, *rows):
        p = os.path.join(self.tmp, 'in.csv')
        with open(p, 'w', encoding='utf-8-sig', newline='') as f:
            w = csv.DictWriter(f, fieldnames=imp.COLUMNS)
            w.writeheader()
            for r in rows:
                w.writerow(r)
        return p


class ImportTests(Base):
    def test_good_row_is_added_and_index_updated(self):
        rc = imp.main([self.csv(GOOD)])
        self.assertEqual(rc, 0)
        d = C.load(C.path('programmes', '2027.json'))
        self.assertTrue(any(p['id'] == 'up_bsc_cs' for p in d['programmes']))
        rec = [p for p in d['programmes'] if p['id'] == 'up_bsc_cs'][0]
        self.assertEqual(rec['subjectRequirements'][0]['anyOf'], imp.ENGLISH)
        self.assertEqual(rec['funding'], ['NSFAS', 'Bursary'])
        self.assertIn('programmes/2027.json', C.load(C.path('index.json'))['files'])

    def test_new_year_file_is_created_and_listed(self):
        g = dict(GOOD, intakeYear='2029', closes='2029-06-30')
        self.assertEqual(imp.main([self.csv(g)]), 0)
        self.assertTrue(os.path.exists(C.path('programmes', '2029.json')))
        self.assertIn('programmes/2029.json', C.load(C.path('index.json'))['files'])

    def test_reimport_updates_not_duplicates(self):
        imp.main([self.csv(GOOD)])
        imp.main([self.csv(dict(GOOD, minAps='32'))])
        ps = [p for p in C.load(C.path('programmes', '2027.json'))['programmes'] if p['id'] == 'up_bsc_cs']
        self.assertEqual(len(ps), 1)
        self.assertEqual(ps[0]['minAps'], 32)

    def test_bad_rows_rejected_and_others_still_imported(self):
        bad = [dict(GOOD, id='a_bad_1', officialUrl='http://www.up.ac.za/'), dict(GOOD, id='a_bad_2', officialUrl='https://bit.ly/x'),
               dict(GOOD, id='a_bad_3', minAps='700'), dict(GOOD, id='a_bad_4', institutionId='nope'), dict(GOOD, id='a_bad_5', closes='30/06/2027'),
               dict(GOOD, id='a_bad_6', sourceDoc=''), dict(GOOD, id='a_bad_7', lastVerifiedAt='2099-01-01'), dict(GOOD, id='a_bad_8', route='Magic'),
               dict(GOOD, id='a_bad_9', subjectRequirements='Basket weaving>=50')]
        rc = imp.main([self.csv(GOOD, *bad)])
        self.assertEqual(rc, 1)  # CI turns red
        ids = {p['id'] for p in C.load(C.path('programmes', '2027.json'))['programmes']}
        self.assertIn('up_bsc_cs', ids)
        self.assertFalse(any(i.startswith('a_bad') for i in ids))

    def test_verified_is_never_accepted_from_a_file(self):
        imp.main([self.csv(dict(GOOD, verificationStatus='verified'))])
        p = [p for p in C.load(C.path('programmes', '2027.json'))['programmes'] if p['id'] == 'up_bsc_cs'][0]
        self.assertEqual(p['verificationStatus'], 'pending_review')

    def test_dry_run_writes_nothing(self):
        before = C.load(C.path('index.json'))
        imp.main([self.csv(dict(GOOD, intakeYear='2031', closes='2031-06-30')), '--dry-run'])
        self.assertEqual(before, C.load(C.path('index.json')))
        self.assertFalse(os.path.exists(C.path('programmes', '2031.json')))

    def test_creator_studio_export_is_understood(self):
        cs = {'id': 'ump_dip_ict2', 'institutionId': 'ump', 'intakeYear': 2027, 'name': 'Diploma in ICT', 'route': 'University', 'nqf': 6, 'minAps': 24,
              'requiredSubjects': [{'anyOf': ['Mathematics'], 'minMark': 50}], 'closes': '2026-11-30', 'verificationStatus': 'pending_review',
              'sourceUrl': 'https://www.ump.ac.za/', 'sourceDoc': 'UMP Prospectus 2027', 'checkedAt': '2026-11-25'}
        p = os.path.join(self.tmp, 'cs.json')
        json.dump({'schemaVersion': 2, 'programmes': [cs]}, open(p, 'w'))
        self.assertEqual(imp.main([p]), 0)
        rec = [x for x in C.load(C.path('programmes', '2027.json'))['programmes'] if x['id'] == 'ump_dip_ict2'][0]
        self.assertEqual(rec['officialUrl'], 'https://www.ump.ac.za/')
        self.assertEqual(rec['lastVerifiedAt'], '2026-11-25')

    def test_excel_bom_csv_is_read(self):
        p = self.csv(GOOD)
        self.assertEqual(open(p, 'rb').read(3), b'\xef\xbb\xbf')
        self.assertEqual(imp.main([p]), 0)


class RefreshTests(Base):
    def test_event_status_boundaries(self):
        self.assertEqual([rd.event_status(d) for d in (-1, 0, 1, 7, 8)], ['CLOSED', 'CLOSING_TODAY', 'CLOSING_SOON', 'CLOSING_SOON', 'OPEN'])

    def test_expired_jobs_removed_and_days_recomputed(self):
        j = C.load(C.path('open_jobs_live.json'))
        base = j['jobs'][0]
        j['jobs'] += [dict(base, title='old', closingDate='2026-11-01'), dict(base, title='soon', closingDate='2026-11-30'), dict(base, title='later', closingDate='2027-02-01')]
        C.save(C.path('open_jobs_live.json'), j)
        out, dropped = rd.refresh_jobs(C.today())
        titles = {x['title']: x for x in out['jobs']}
        self.assertEqual(dropped, 1)
        self.assertNotIn('old', titles)
        self.assertEqual(titles['soon']['daysRemaining'], 4)
        self.assertEqual(titles['soon']['freshnessStatus'], 'closing_soon')
        self.assertEqual(titles['later']['freshnessStatus'], 'open')
        self.assertEqual(out['openCount'], len(out['jobs']))

    def test_refresh_is_idempotent_and_check_passes_after(self):
        rd.main([]); self.assertEqual(rd.main(['--check']), 0)
        before = open(C.path('automation_status.json'), 'rb').read()
        rd.main([]); self.assertEqual(before, open(C.path('automation_status.json'), 'rb').read())

    def test_stale_programmes_are_reported_never_edited(self):
        imp.main([self.csv(dict(GOOD, lastVerifiedAt='2026-01-01'))])
        raw = open(C.path('programmes', '2027.json'), 'rb').read()
        rd.main([])
        rep = C.load(C.path('automation_status.json'))['programmes']
        self.assertIn('up_bsc_cs@2027', rep[rd.STALE_KEY])
        self.assertEqual(raw, open(C.path('programmes', '2027.json'), 'rb').read())

    def test_date_rolls_over(self):
        rd.main([])
        os.environ['MZ_TODAY'] = '2026-12-01'
        self.assertEqual(rd.main(['--check']), 1)  # ump_2027_closing (30 Nov) is now closed -> stale file detected
        rd.main([])
        st = {e['id']: e['status'] for e in C.load(C.path('automation_status.json'))['events']}
        self.assertEqual(st['ump_2027_closing'], 'CLOSED')


class JobsTests(Base):
    def test_fetch_filters_keeps_manual_rows_and_survives_failures(self):
        def gh(b):
            if b['slug'] == 'luno':
                raise RuntimeError('boom')
            return [{'title': 'Backend Engineer', 'location': 'Cape Town, South Africa', 'url': 'https://boards.greenhouse.io/x/1'},
                    {'title': 'Engineer', 'location': 'London', 'url': 'https://boards.greenhouse.io/x/2'},
                    {'title': 'Cashier (registration fee R200)', 'location': 'Johannesburg', 'url': 'https://boards.greenhouse.io/x/3'},
                    {'title': 'Spam', 'location': 'Durban', 'url': 'https://bit.ly/abc'}]
        old = C.load(C.path('open_jobs_live.json'))
        old['jobs'].append({'title': 'Old Luno role', 'employer': 'Luno', 'sourceType': 'greenhouse', 'officialUrl': 'https://x.example/1', 'closingDate': 'Open / Rolling'})
        C.save(C.path('open_jobs_live.json'), old)
        fj.main([], fetchers={'greenhouse': gh, 'lever': gh})
        out = C.load(C.path('open_jobs_live.json'))
        titles = [j['title'] for j in out['jobs']]
        self.assertIn('Backend Engineer', titles)
        self.assertNotIn('Engineer', titles)
        self.assertFalse(any('registration fee' in t for t in titles) or 'Spam' in titles)
        self.assertIn('Old Luno role', titles)  # unreachable board keeps its previous rows
        self.assertIn('dpsa_circular', out['bySourceType'])  # hand-kept rows survive
        self.assertEqual(out['jobs'][-1]['province'] in ('Western Cape', ''), True)

    def test_nothing_reachable_leaves_file_untouched(self):
        raw = open(C.path('open_jobs_live.json'), 'rb').read()
        def down(b): raise RuntimeError('offline')
        fj.main([], fetchers={'greenhouse': down, 'lever': down})
        self.assertEqual(raw, open(C.path('open_jobs_live.json'), 'rb').read())


class CatalogueTests(unittest.TestCase):
    def test_js_is_in_sync_with_json(self):
        import build_catalogue as bc
        self.assertEqual(bc.main(['--check']), 0)


if __name__ == '__main__':
    unittest.main(verbosity=1)
