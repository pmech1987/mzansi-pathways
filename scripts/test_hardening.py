"""Tests for the safety layer: network safety, data validation, backups, the safe push script, the kill switch, alerts, and the pipeline circuit breaker.
Run:  python scripts/test_hardening.py   (no installs, no network; everything happens on throwaway copies)"""
from pathlib import Path
import io, json, os, shutil, subprocess, sys, tarfile, tempfile, unittest, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C
import validate_data as vd
import backup_data as bk
import make_digest as md
import test_automation as TA
import test_pipeline as TP

REAL_DATA, ROOT = C.DATA, C.ROOT


def wtxt(path, text, mode='w'):
    with open(path, mode, **({'encoding': 'utf-8'} if 'b' not in mode else {})) as f:
        f.write(text)


def rtxt(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def rjson(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


class NetworkSafetyTests(unittest.TestCase):
    def setUp(self):
        self._r = C._resolve

    def tearDown(self):
        C._resolve = self._r

    def bad(self, url, **kw):
        with self.assertRaises(C.UnsafeUrl, msg=url):
            C.check_public_https(url, **kw)

    def test_only_public_https_is_allowed(self):
        C._resolve = lambda h, p=443: ['93.184.216.34']
        self.assertEqual(C.check_public_https('https://www.up.ac.za/x.pdf'), 'https://www.up.ac.za/x.pdf')
        for u in ('http://www.up.ac.za/', 'ftp://x.org/a', 'file:///etc/passwd', 'https://user:pw@www.up.ac.za/', 'https:///nohost', 'javascript:alert(1)'):
            self.bad(u)

    def test_internal_addresses_are_refused_even_as_ip_literals_or_via_dns(self):
        for u in ('https://127.0.0.1/', 'https://10.1.2.3/', 'https://192.168.0.5/', 'https://169.254.169.254/latest/meta-data/', 'https://[::1]/', 'https://100.64.0.1/', 'https://0.0.0.0/'):
            self.bad(u)
        C._resolve = lambda h, p=443: ['10.0.0.8']                     # a public-looking name that points inside
        self.bad('https://innocent.example.org/')
        C._resolve = lambda h, p=443: ['93.184.216.34', '127.0.0.1']   # one bad address among good ones is enough
        self.bad('https://mixed.example.org/')

    def test_allow_list_for_secret_carrying_calls(self):
        C._resolve = lambda h, p=443: ['93.184.216.34']
        C.check_public_https('https://api.anthropic.com/v1/messages', allow_hosts=('api.anthropic.com',))
        self.bad('https://evil.example.org/v1/messages', allow_hosts=('api.anthropic.com',))

    def test_redirects_cannot_lead_somewhere_unsafe_and_api_calls_never_redirect(self):
        C._resolve = lambda h, p=443: ['93.184.216.34']
        h = C._SafeRedirect()
        req = urllib.request.Request('https://www.up.ac.za/a')
        for target in ('http://www.up.ac.za/b', 'https://127.0.0.1/admin', 'https://169.254.169.254/'):
            with self.assertRaises(C.UnsafeUrl):
                h.redirect_request(req, None, 302, 'Found', {}, target)
        self.assertIsNone(C._NoRedirect().redirect_request(req, None, 302, 'Found', {}, 'https://elsewhere.example.org/'))

    def test_every_fetcher_goes_through_the_safe_opener(self):
        for n in ('check_links.py', 'fetch_jobs.py', 'pipeline_sources.py', 'pipeline_extract.py'):
            t = rtxt(os.path.join(ROOT, 'scripts', n))
            self.assertNotIn('urllib.request.urlopen(', t, n)
            self.assertIn('safe_open(', t, n)

    def test_ai_secret_only_ever_goes_to_the_two_provider_hosts(self):
        import pipeline_extract as X
        self.assertEqual(set(X.AI_HOSTS), {'api.anthropic.com', 'generativelanguage.googleapis.com'})


class ValidateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.data = os.path.join(self.tmp, 'data')
        shutil.copytree(REAL_DATA, self.data)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def put(self, name, obj):
        wtxt(os.path.join(self.data, name), obj if isinstance(obj, str) else json.dumps(obj))

    def test_the_real_data_is_clean(self):
        self.assertEqual(vd.check_files(REAL_DATA), [])

    def test_each_kind_of_damage_is_caught(self):
        self.put('broken.json', '{"a": ')
        self.put('empty.json', '')
        self.put('http.json', {'items': [{'id': 'a', 'officialUrl': 'http://www.up.ac.za/'}]})
        self.put('social.json', {'items': [{'id': 'a', 'officialUrl': 'https://www.facebook.com/x'}]})
        self.put('private.json', {'items': [{'id': 'a', 'officialUrl': 'https://10.0.0.1/x'}]})
        self.put('xss.json', {'items': [{'id': 'a', 'name': 'Hi <script>alert(1)</script>'}, {'id': 'b', 'name': '<img src=x onerror=alert(1)>'}, {'id': 'c', 'name': 'ok\x07bell'}]})
        self.put('dup.json', {'items': [{'id': 'same'}, {'id': 'same'}]})
        msg = ' | '.join(vd.check_files(self.data))
        for part in ('broken.json: not valid JSON', 'empty.json: size', 'http.json', 'social.json', 'private.json', 'xss.json.items[0]', 'xss.json.items[1]', 'xss.json.items[2]', 'duplicate id'):
            self.assertIn(part, msg)

    def test_normal_text_is_not_flagged(self):
        self.put('fine.json', {'items': [{'id': 'a', 'name': 'Bachelor of Education (Online)', 'note': 'Apply on or before 30 Sept. Fee: R100 = deposit'}]})
        self.assertEqual(vd.check_files(self.data), [])

    def git(self, *a):
        return subprocess.run(['git', '-c', 'user.name=t', '-c', 'user.email=t@t'] + list(a), cwd=self.tmp, capture_output=True, text=True, check=True)

    def test_sudden_shrink_is_refused_and_can_be_overridden(self):
        self.git('init', '-q'); self.git('add', '-A'); self.git('commit', '-q', '-m', 'base')
        p = os.path.join(self.data, 'institutions.json')
        d = rjson(p)
        key = next(k for k, v in d.items() if isinstance(v, list) and len(v) >= 20)
        d[key] = d[key][:len(d[key]) // 3]
        wtxt(p, json.dumps(d))
        self.assertTrue(any('shrank' in x for x in vd.check_shrink(self.data, 'HEAD')))
        d2 = rjson(p); wtxt(p, json.dumps({**d2, key: d2[key] + [{'id': 'x_new_one'}]}))
        self.assertTrue(any('shrank' in x for x in vd.check_shrink(self.data, 'HEAD')))   # still far smaller than the committed version
        self.git('checkout', '--', 'data')
        self.assertEqual(vd.check_shrink(self.data, 'HEAD'), [])


class BackupTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        C.ROOT, C.DATA = self.tmp, os.path.join(self.tmp, 'data')
        shutil.copytree(REAL_DATA, C.DATA)

    def tearDown(self):
        C.ROOT, C.DATA = ROOT, REAL_DATA
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_backup_then_restore_brings_back_damaged_data(self):
        b = bk.make('20261126-000001')
        self.assertTrue(bk.verify(b))
        good = Path(C.path('bursaries.json')).read_bytes()
        wtxt(C.path('bursaries.json'), 'garbage'); os.unlink(C.path('events.json'))
        safety = bk.restore(b)
        self.assertEqual(Path(C.path('bursaries.json')).read_bytes(), good)
        self.assertTrue(os.path.exists(C.path('events.json')))
        self.assertTrue(os.path.exists(safety))                       # what we replaced was saved first
        self.assertEqual(vd.check_files(C.DATA), [])

    def test_a_tampered_backup_is_refused(self):
        b = bk.make('20261126-000002')
        wtxt(b, b'x', 'ab')
        with self.assertRaises(ValueError): bk.restore(b)

    def test_an_archive_with_escaping_paths_is_refused(self):
        evil = os.path.join(self.tmp, 'backups', 'data-evil.tar.gz'); os.makedirs(os.path.dirname(evil), exist_ok=True)
        with tarfile.open(evil, 'w:gz') as t:
            ti = tarfile.TarInfo('data/../../escape.txt'); ti.size = 1; t.addfile(ti, io.BytesIO(b'x'))
        wtxt(evil + '.sha256', '%s  data-evil.tar.gz\n' % bk.sha256_of(evil))
        with self.assertRaises(ValueError): bk.restore(evil)
        self.assertFalse(os.path.exists(os.path.join(self.tmp, '..', 'escape.txt')))

    def test_only_the_newest_backups_are_kept(self):
        for i in range(bk.KEEP + 3): bk.make('20261126-%06d' % i)
        self.assertEqual(len(bk.listing()), bk.KEEP)
        self.assertTrue(all(bk.verify(p) for p in bk.listing()))


@unittest.skipUnless(shutil.which('git') and shutil.which('bash'), 'needs git and bash')
class PushScriptTests(unittest.TestCase):
    """Runs the real scripts/push_data.sh against a throwaway repository with a bare 'remote'."""
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.remote, self.work = os.path.join(self.tmp, 'remote.git'), os.path.join(self.tmp, 'work')
        self.sh('git init -q --bare -b main ' + self.remote, self.tmp)
        os.makedirs(self.work)
        shutil.copytree(REAL_DATA, os.path.join(self.work, 'data'))
        shutil.copytree(os.path.join(ROOT, 'scripts'), os.path.join(self.work, 'scripts'), ignore=shutil.ignore_patterns('__pycache__'))
        wtxt(os.path.join(self.work, '.gitignore'), '__pycache__/\nbackups/\n')
        for c in ('git init -q -b main', 'git add -A', "git -c user.name=t -c user.email=t@t commit -q -m base", 'git remote add origin ' + self.remote, 'git push -q -u origin main'):
            self.sh(c, self.work)
        self.head0 = self.remote_head()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def sh(self, cmd, cwd):
        r = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, cmd + '\n' + r.stdout + r.stderr)

    def remote_head(self):
        return subprocess.run(['git', '--git-dir', self.remote, 'rev-parse', 'main'], capture_output=True, text=True).stdout.strip()

    def push(self, *paths, env=None, msg='test'):
        e = dict(os.environ, **(env or {}))
        return subprocess.run(['bash', os.path.join(self.work, 'scripts', 'push_data.sh'), msg] + list(paths or ['data']), cwd=self.work, capture_output=True, text=True, env=e)

    def write(self, rel, obj):
        p = os.path.join(self.work, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
        wtxt(p, obj if isinstance(obj, str) else json.dumps(obj))

    def test_a_good_change_is_pushed(self):
        self.write('data/new_ok.json', {'items': [{'id': 'a', 'name': 'fine'}]})
        r = self.push()
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr); self.assertNotEqual(self.remote_head(), self.head0)

    def test_nothing_to_commit_is_fine(self):
        r = self.push(); self.assertEqual(r.returncode, 0); self.assertIn('nothing to commit', r.stdout)

    def test_kill_switch_stops_publishing(self):
        self.write('data/new_ok.json', {'a': 1}); self.write('data/automation_pause.json', {'paused': True})
        r = self.push(); self.assertEqual(r.returncode, 0); self.assertIn('PAUSED', r.stdout); self.assertEqual(self.remote_head(), self.head0)

    def test_bad_data_is_never_published(self):
        self.write('data/bad.json', '{"broken": ')
        r = self.push(); self.assertEqual(r.returncode, 1); self.assertEqual(self.remote_head(), self.head0)
        os.unlink(os.path.join(self.work, 'data', 'bad.json'))
        self.write('data/inj.json', {'name': '<script>x</script>'})
        r = self.push(); self.assertEqual(r.returncode, 1); self.assertEqual(self.remote_head(), self.head0)

    def test_a_secret_in_the_change_is_blocked_and_never_echoed(self):
        fake = 'sk-ant-' + 'a1B2' * 8
        self.write('data/oops.json', {'note': 'key ' + fake})
        r = self.push()
        self.assertEqual(r.returncode, 1); self.assertEqual(self.remote_head(), self.head0)
        self.assertNotIn(fake, r.stdout + r.stderr)
        staged = subprocess.run(['git', 'diff', '--cached', '--name-only'], cwd=self.work, capture_output=True, text=True).stdout
        self.assertEqual(staged.strip(), '')                              # unstaged again

    def test_a_suspiciously_wide_change_is_refused(self):
        for i in range(4): self.write('data/w%d.json' % i, {'a': i})
        r = self.push(env={'MZ_MAX_FILES': '3'}); self.assertEqual(r.returncode, 1); self.assertEqual(self.remote_head(), self.head0)

    def test_sudden_shrink_is_refused(self):
        p = os.path.join(self.work, 'data', 'institutions.json'); d = rjson(p)
        key = next(k for k, v in d.items() if isinstance(v, list) and len(v) >= 20); d[key] = d[key][:5]
        wtxt(p, json.dumps(d))
        r = self.push(); self.assertEqual(r.returncode, 1); self.assertEqual(self.remote_head(), self.head0)
        r = self.push(env={'MZ_ALLOW_SHRINK': '1'}); self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_when_the_remote_moved_on_it_rebases_instead_of_forcing(self):
        other = os.path.join(self.tmp, 'other')
        self.sh('git clone -q %s %s' % (self.remote, other), self.tmp)
        wtxt(os.path.join(other, 'README_other.txt'), 'someone else')
        for c in ('git add -A', 'git -c user.name=o -c user.email=o@o commit -q -m other', 'git push -q origin main'):
            self.sh(c, other)
        theirs = self.remote_head()
        self.write('data/mine.json', {'a': 1})
        r = self.push(); self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        log = subprocess.run(['git', '--git-dir', self.remote, 'log', '--format=%s', 'main'], capture_output=True, text=True).stdout.split('\n')
        self.assertIn('other', log); self.assertIn('test', log)            # both commits survive: nothing was overwritten
        self.assertNotEqual(self.remote_head(), theirs)


class AlertAndSwitchTests(TA.Base):
    def titles(self):
        return [t for t, _ in md.sections(C.today())]

    def test_paused_automation_is_shown_in_the_digest(self):
        C.save(C.path('automation_pause.json'), {'paused': True})
        self.assertTrue(any('PAUSED' in t for t in self.titles()))
        C.save(C.path('automation_pause.json'), {'paused': False})
        self.assertFalse(any('PAUSED' in t for t in self.titles()))

    def test_a_silent_bot_is_noticed(self):
        TA.rd.main([])                                    # audit dated today
        self.assertFalse(any('has not published' in t for t in self.titles()))
        os.environ['MZ_TODAY'] = '2026-12-05'
        self.assertTrue(any('has not published for 9 days' in t for t in self.titles()))

    def test_missing_or_garbled_pause_file_never_blocks_by_accident_or_crashes(self):
        os.unlink(C.path('automation_pause.json')); self.assertFalse(C.paused())
        wtxt(C.path('automation_pause.json'), 'not json'); self.assertFalse(C.paused())


class PipelineCircuitBreakerTests(TP.Base):
    def test_a_far_smaller_read_cannot_wipe_good_rows(self):
        os.environ['MZ_SHRINK_MIN_ROWS'] = '3'
        try:
            self.run_up()
            before = self.rows(); self.assertEqual(len(before), 5)
            from reportlab.pdfgen import canvas
            small = os.path.join(self.tmp, 'small.pdf'); c = canvas.Canvas(small)
            c.drawString(72, 750, 'Example University Undergraduate Prospectus 2027'); c.drawString(72, 730, 'Applications close on 30 September 2026')
            for i, line in enumerate(TP.FILLER): c.drawString(72, 700 - 14 * i, line[:95])
            c.showPage()
            for i, line in enumerate(['BSc Computer Science', 'NQF Level 7', 'Minimum APS: 34', 'English Home Language: Level 5', 'Mathematics: Level 6']): c.drawString(72, 750 - 18 * i, line)
            c.showPage(); c.save()
            TP.R.main(['--only', 'up', '--year', '2027', '--pdf', 'up=' + small])
            self.assertEqual(set(self.rows()), set(before))              # all 5 survive
            self.assertIn('Kept previous rows', rtxt(os.path.join(C.ROOT, 'reports', 'pipeline_report.md')))
        finally:
            os.environ.pop('MZ_SHRINK_MIN_ROWS', None)


class WorkflowHardeningTests(unittest.TestCase):
    def wf(self, n):
        return rtxt(os.path.join(ROOT, '.github', 'workflows', n))

    def test_every_data_workflow_backs_up_first_and_tells_a_person_when_it_fails(self):
        for n in ('data-refresh.yml', 'prospectus-pipeline.yml', 'link-health.yml'):
            t = self.wf(n)
            self.assertLess(t.index('backup_data.py'), t.index('push_data.sh'), n)
            self.assertIn('upload-artifact', t, n); self.assertIn('retention-days', t, n)
            self.assertIn('ci_status.sh fail', t, n); self.assertIn('ci_status.sh ok', t, n); self.assertIn('issues: write', t, n)
            self.assertIn('timeout-minutes', t, n); self.assertIn('validate_data.py', t, n)

    def test_secrets_are_only_passed_as_env_never_printed(self):
        for n in os.listdir(os.path.join(ROOT, '.github', 'workflows')):
            t = self.wf(n)
            for line in t.split('\n'):
                if 'secrets.' in line:
                    self.assertRegex(line.strip(), r'^[A-Z_]+: \$\{\{ secrets\.[A-Z_]+ \}\}$', n + ': ' + line)
                self.assertNotRegex(line, r'echo .*(API_KEY|TOKEN)', n)

    def test_scripts_are_valid_shell_and_dependabot_watches_the_actions(self):
        for n in ('push_data.sh', 'ci_status.sh'):
            self.assertEqual(subprocess.run(['bash', '-n', os.path.join(ROOT, 'scripts', n)]).returncode, 0, n)
        self.assertIn('github-actions', rtxt(os.path.join(ROOT, '.github', 'dependabot.yml')))

    def test_secrets_and_backups_cannot_be_committed_by_accident(self):
        g = rtxt(os.path.join(ROOT, '.gitignore'))
        for x in ('.env', '*.key', '*.pem', 'backups/'):
            self.assertIn(x, g)


if __name__ == '__main__':
    unittest.main(verbosity=1)
