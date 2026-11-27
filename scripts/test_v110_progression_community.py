"""Tests for OCR fallback, progression evidence, community uploads, source comparison and learning. Run: python scripts/test_v110_progression_community.py"""
import hashlib, json, os, shutil, subprocess, sys, tempfile, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C
import make_sample_prospectus as M
import pipeline_ocr as O
import progression_extract as PX
import progression_ledger as PL
import community_submissions as CSUB
import compare_sources as CS
import learn_from_feedback as LF
import merge_progression as MP
import run_pipeline as R

REAL_DATA, REAL_ROOT = C.DATA, C.ROOT
HC = {'institutionId': 'up', 'year': 2027, 'name': 'Higher Certificate in Business Management', 'kind': 'credit',
      'text': 'Graduates who pass may apply for the Diploma in Business Management and receive credits for first-year modules.', 'page': 3}


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        C.ROOT = self.tmp; C.DATA = os.path.join(self.tmp, 'data')
        shutil.copytree(REAL_DATA, C.DATA, ignore=shutil.ignore_patterns('inbox'))
        os.environ['MZ_TODAY'] = '2026-11-26'

    def tearDown(self):
        C.DATA, C.ROOT = REAL_DATA, REAL_ROOT
        os.environ.pop('MZ_TODAY', None)
        shutil.rmtree(self.tmp, ignore_errors=True)


class Extract(unittest.TestCase):
    def test_wrapped_sentence_and_bridging(self):
        out = PX.extract(['Higher Certificate in Accounting', 'APS 20', 'Graduates who pass may apply for the Diploma in', 'Accounting and receive credits for the first-year modules.',
                          'This programme is a bridging route for students who do not meet diploma entry.', 'Fees are payable in February.'], page=7)
        self.assertEqual([o['kind'] for o in out], ['credit', 'bridging'])
        self.assertEqual(out[0]['to'], ['Diploma in Accounting'])

    def test_nothing_invented(self):
        self.assertEqual(PX.extract(['Fees are payable in February. Residence is limited.']), [])


class OcrDigits(unittest.TestCase):
    def test_fixes_only_digit_adjacent_letters(self):
        self.assertEqual(O.fix_digits('APS 3O Maths 7l% 2l'), 'APS 30 Maths 71% 21')
        self.assertEqual(O.fix_digits('OCR Ocean Office Level 5'), 'OCR Ocean Office Level 5')


class Subjects(unittest.TestCase):
    def test_more_subjects_and_afrikaans_are_read(self):
        got = lambda t: [(r['anyOf'][0], r['minMark']) for r in R.X.parse_marks(t)]
        self.assertEqual(got('Tourism: Level 4'), [('Tourism', 50)])
        self.assertEqual(got('Wiskunde: 60%'), [('Mathematics', 60)])
        self.assertEqual(got('Wiskundige Geletterdheid: Level 4'), [('Mathematical Literacy', 50)])

    def test_unreadable_requirement_blocks_auto_verification(self):
        page = 'BSc Example Science\nMinimum APS: 30\nEnglish Home Language: Level 5\nSkateboarding Theory: Level 5\nLife Orientation: Level 3\n'
        c = R.X.rules_extract([page])[0]
        self.assertEqual(c['unparsed'], ['Skateboarding Theory: Level 5'])      # LO is ignored on purpose, the unknown subject is not
        import pipeline_verify as V
        ok = [{'type': 'requirements_fully_read', 'ok': False}]
        self.assertEqual(V.verdict(ok)[0], 'pending_review')

    def test_browser_and_python_subject_lists_match(self):
        r = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build_subjects_js.py'), '--check'])
        self.assertEqual(r.returncode, 0, 'run python scripts/build_subjects_js.py')
        js = os.path.join(REAL_ROOT, 'js')
        out = subprocess.run(['node', '-e', "globalThis.MZ_SUBJECTS=JSON.parse(require('fs').readFileSync('%s/subjects_data.js','utf8').replace(/^[^=]*=/m,'').replace(/;\\s*$/,''));"
                              "const m={exports:{}};new Function('module','document','window',require('fs').readFileSync('%s/prospectus_check.js','utf8'))(m);"
                              "const r=m.exports.extract(['BSc Example Science\\nAPS: 30\\nTourism: Level 4\\nWiskunde: 60%%']);console.log(JSON.stringify(r.rows[0].subjects.map(s=>[s.anyOf[0],s.minMark])))" % (js, js)], capture_output=True)
        self.assertEqual(json.loads(out.stdout.decode() or '[]'), [['Tourism', 50], ['Mathematics', 60]], out.stderr.decode()[:300])


class Ledger(Base):
    def test_status_is_computed_and_verified_needs_two_reviewers(self):
        led = PL.load()
        self.assertEqual(PL.add(led, HC, {'type': 'pipeline', 'ref': 'pipeline:a'}), 'new')
        self.assertEqual(PL.add(led, HC, {'type': 'pipeline', 'ref': 'pipeline:a'}), 'seen')
        self.assertEqual(PL.add(led, HC, {'type': 'community', 'ref': 'community:b'}), 'corroborated')
        led['entries'][0]['reviewedBy'] = ['nobody', 'ghost']          # not enrolled: ignored
        PL.save(led)
        self.assertEqual(PL.load()['entries'][0]['status'], 'corroborated')

    def test_rejects_links_and_ids(self):
        for bad in ('Apply at www.example.com for the Diploma in Accounting and credits.', 'Call 0821234567 about the Diploma in Accounting credits.'):
            with self.assertRaises(ValueError): PL.clean_entry(dict(HC, text=bad))

    def test_drop_pipeline_keeps_community_evidence(self):
        led = PL.load(); PL.add(led, HC, {'type': 'pipeline', 'ref': 'p'}); PL.add(led, HC, {'type': 'community', 'ref': 'c'})
        PL.drop_pipeline(led, 'up', 2027)
        self.assertEqual([s['type'] for s in led['entries'][0]['sources']], ['community'])


def sub(sid, rows, sha='a' * 64, **kw):
    return dict({'schema': 'mz-community-v1', 'submitter': sid * 16, 'institutionId': 'up', 'year': 2027, 'doc': {'name': 'x.pdf', 'sha256': sha, 'via': 'text'}, 'rows': rows}, **kw)


ROW = {'name': 'BSc Computer Science', 'minAps': 34, 'subjects': [{'anyOf': ['Mathematics'], 'minMark': 70}], 'page': 2, 'quote': 'BSc Computer Science Minimum APS: 34'}
INSTS = {'up'}


class Community(Base):
    def test_rejects_bad_submissions(self):
        self.assertIsNone(CSUB.validate({'schema': 'x'}, INSTS)[0])
        self.assertIsNone(CSUB.validate(sub('zz', [ROW]), INSTS)[0])                               # submitter not hex
        self.assertIsNone(CSUB.validate(sub('a1', [ROW], sha='short'), INSTS)[0])
        s, prob = CSUB.validate(sub('a1', [dict(ROW, quote='BSc APS 34 call 0821234567')]), INSTS)
        self.assertIsNone(s)
        s, prob = CSUB.validate(sub('a1', [dict(ROW, quote='BSc Computer Science Minimum APS: 99')]), INSTS)   # quote lacks the claimed APS
        self.assertIsNone(s)

    def test_accepts_and_stages(self):
        s, _ = CSUB.validate(sub('a1', [ROW], progression=[HC]), INSTS)
        led = PL.load(); CSUB.stage(s, led); PL.save(led)
        self.assertTrue(os.path.exists(C.path('community', 'up_2027.json')))
        self.assertEqual(PL.load()['entries'][0]['status'], 'pending_review')


class Compare(Base):
    def setUp(self):
        super().setUp()
        doc = {'schemaVersion': 3, 'intakeYear': 2027, 'notice': '', 'programmes': [
            {'id': 'up_bsc_computer_science_2027', 'institutionId': 'up', 'intakeYear': 2027, 'name': 'BSc Computer Science', 'minAps': 34, 'verificationStatus': 'pending_review', 'autoChecks': [],
             'subjectRequirements': [{'anyOf': ['English Home Language'], 'minMark': 60}, {'anyOf': ['Mathematics'], 'minMark': 70}]},
            {'id': 'up_bcom_accounting_2027', 'institutionId': 'up', 'intakeYear': 2027, 'name': 'BCom Accounting', 'minAps': 32, 'verificationStatus': 'pending_review', 'autoChecks': [], 'subjectRequirements': []}]}
        C.save(C.path('programmes', '2027.json'), doc)

    def stage(self, sid, rows, **kw):
        s, _ = CSUB.validate(sub(sid, rows, **kw), INSTS); CSUB.stage(s)

    def test_fewer_subjects_is_agreement_but_other_mark_is_conflict(self):
        self.stage('a1', [ROW]); self.stage('b2', [dict(ROW, subjects=[{'anyOf': ['Mathematics'], 'minMark': 60}])])
        res = CS.compare()
        out = sorted(r['outcome'] for r in res['rows'] if r['name'] == 'BSc Computer Science')
        self.assertEqual(out, ['agree', 'conflict'])
        self.assertTrue(all(r.get('verificationStatus', 'pending_review') != 'verified' for r in CS.pipeline_rows()))   # comparing never verifies

    def test_alias_learned_from_two_people_then_matches(self):
        alias = dict(ROW, name='B.Sc. Comp Sci', quote='B.Sc. Comp Sci APS 34')
        self.stage('a1', [alias]); self.stage('b2', [alias])
        CS.write(CS.compare()); LF.learn()
        self.assertEqual(len(C.load(C.path('name_aliases.json'))['aliases']), 1)
        self.assertEqual([r['outcome'] for r in CS.compare()['rows'] if r['name'] == 'B.Sc. Comp Sci'], ['agree', 'agree'])

    def test_one_person_cannot_teach_an_alias(self):
        self.stage('a1', [dict(ROW, name='B.Sc. Comp Sci', quote='B.Sc. Comp Sci APS 34')])
        CS.write(CS.compare()); LF.learn()
        self.assertEqual(C.load(C.path('name_aliases.json'))['aliases'], [])

    def test_ready_for_reviewers_needs_two_people(self):
        self.stage('a1', [ROW]); self.stage('b2', [ROW])
        self.assertEqual([q['why'] for q in CS.compare()['reviewQueue']], ['ready_for_reviewers'])


@unittest.skipUnless(O.available(), 'tesseract/pdftoppm not installed')
class Ocr(Base):
    def test_scanned_pdf_is_read_and_never_auto_verified(self):
        pdf, scan = os.path.join(self.tmp, 't.pdf'), os.path.join(self.tmp, 'scan.pdf')
        M.build(pdf); subprocess.run(['pdftoppm', '-r', '150', '-png', pdf, os.path.join(self.tmp, 's')], check=True)
        from PIL import Image
        ims = [Image.open(os.path.join(self.tmp, 's-%d.png' % i)).convert('RGB') for i in (1, 2, 3)]
        ims[0].save(scan, save_all=True, append_images=ims[1:])
        pages, used = O.ocr_all(scan)
        self.assertEqual(used, [1, 2, 3])
        self.assertTrue(any(c['name'] == 'BSc Computer Science' and c['minAps'] == 34 for c in R.X.rules_extract(pages)))
        C.save(C.path('programmes', '2027.json'), {'schemaVersion': 3, 'intakeYear': 2027, 'notice': '', 'programmes': []})
        R.main(['--only', 'up', '--year', '2027', '--pdf', 'up=' + scan, '--no-download'])
        rows = C.load(C.path('programmes', '2027.json'))['programmes']
        self.assertTrue(rows and all(r['verificationStatus'] != 'auto_verified' and r['readVia'] == 'ocr' for r in rows))


class Freshness(Base):
    def test_other_edition_disagreement_is_not_a_conflict(self):
        C.save(C.path('programmes', '2027.json'), {'schemaVersion': 3, 'intakeYear': 2027, 'notice': '', 'programmes': [
            {'id': 'up_bcom_accounting_2027', 'institutionId': 'up', 'intakeYear': 2027, 'name': 'BCom Accounting', 'minAps': 32, 'verificationStatus': 'pending_review', 'autoChecks': [], 'docSha256': 'b' * 64, 'subjectRequirements': []}]})
        s1, _ = CSUB.validate(sub('a1', [dict(ROW, name='BCom Accounting', minAps=30, subjects=[], quote='BCom Accounting APS 30')], sha='c' * 64), INSTS); CSUB.stage(s1)
        res = CS.compare()
        self.assertEqual([r['outcome'] for r in res['rows'] if r['name'] == 'BCom Accounting'], ['conflict_other_document'])
        self.assertEqual(res['reviewQueue'], [])

    def test_old_aliases_and_stale_hints_are_forgotten(self):
        C.save(C.path('name_aliases.json'), {'schemaVersion': 1, 'aliases': [{'a': 'x one', 'b': 'x two', 'count': 2, 'lastSeen': '2024-01-01'}, {'a': 'y one', 'b': 'y two', 'count': 2, 'lastSeen': '2026-10-01'}]})
        LF.learn()
        self.assertEqual([a['a'] for a in C.load(C.path('name_aliases.json'))['aliases']], ['y one'])
        C.save(C.path('extraction_hints.json'), {'schemaVersion': 1, 'institutions': {'up': {'strategyOrder': list(reversed(range(len(R.STRATEGIES)))), 'updatedAt': '2025-01-01'}}})
        self.assertEqual(R.strategies_for('up'), R.STRATEGIES)

    def test_extended_programmes_count_as_bridges(self):
        for n in ('BSc (Extended Curriculum Programme) Biological Sciences', 'Higher Certificate in Accounting', 'Foundation Programme in Commerce'): self.assertTrue(PX.is_entry_level(n), n)
        self.assertFalse(PX.is_entry_level('BCom Accounting'))

    def test_filename_with_personal_data_is_refused(self):
        d = sub('a1', [ROW]); d['doc']['name'] = 'call 0821234567.pdf'
        self.assertIsNone(CSUB.validate(d, INSTS)[0])


class Merge(Base):
    def test_only_a_single_close_match_is_placed(self):
        led = PL.load()
        PL.add(led, dict(HC, institutionId='uj', name='Higher Certificate in Welding Wizardry', kind='access', text='Learners may apply for a degree in welding after this certificate.'), {'type': 'pipeline', 'ref': 'p'})
        PL.save(led)
        cat, placed, unmatched = MP.merge()
        self.assertEqual(placed, 0); self.assertEqual(len(unmatched), 1)
        self.assertFalse(any(p.get('progression') for i in cat['institutions'] for p in i['programmes']))


if __name__ == '__main__':
    unittest.main(verbosity=1)
