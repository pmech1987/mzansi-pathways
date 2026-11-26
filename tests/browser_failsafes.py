"""Browser test of the learner-side failsafes (Playwright): damaged saved profile, failed saves, encrypted backup round trip with a big
profile, wrong passphrase, undo restore, full wipe. Run: python tests/browser_failsafes.py"""
import functools, http.server, json, pathlib, socketserver, sys, tempfile, threading
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a, **k): pass
H = functools.partial(Quiet, directory=str(root))
srv = socketserver.TCPServer(("127.0.0.1", 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{port}/index.html"; KEY = "mzansi_pathways_v2_state"
errs = []
def stub(r): r.continue_() if r.request.url.startswith(f"http://127.0.0.1:{port}") else r.fulfill(status=200, body="", content_type="application/javascript")
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(accept_downloads=True); pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.route("**/*", stub)
    pg.goto(URL); pg.wait_for_timeout(800)

    # 1. a damaged saved profile is quarantined and the last good copy is used
    # (seeded by an init script so the page's own save-on-close cannot overwrite the damaged copy before the app starts)
    pg.close(); pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); pg.route("**/*", stub)
    pg.add_init_script("""if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1');
      localStorage.setItem('mzansi_pathways_v2_state_prev', JSON.stringify({ subjects: [{name: 'Mathematics', mark: 55}], cvName: 'Thandi' }));
      localStorage.setItem('mzansi_pathways_v2_state', '{"subjects": [oops'); }""")
    pg.goto(URL); pg.wait_for_timeout(800)
    assert pg.evaluate("() => state.cvName") == "Thandi", "did not recover from the last good copy"
    assert pg.evaluate("([k]) => localStorage.getItem(k + '_corrupt')", [KEY]), "damaged copy was not kept for inspection"
    assert "damaged" in pg.inner_text("#toast")

    # 2. a failed save is reported to the learner, not swallowed
    pg.evaluate("() => { window._orig = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError'); }; state.cvName = 'X'; saveState(); }")
    assert "Could not save" in pg.inner_text("#toast"), "save failure was silent"
    pg.evaluate("() => { Storage.prototype.setItem = window._orig; }")

    # 3. encrypted backup round trip with a LARGE profile (used to overflow the call stack), wrong passphrase, undo
    pg.evaluate("() => { state.cvName = 'Thandi'; state.evidenceVault = Array.from({length: 400}, (_, i) => ({skill: 'Skill ' + i, tools: 'Tool', story: 'x'.repeat(900), includeInCv: true})); saveState(); document.getElementById('auth-modal').classList.remove('hidden'); }")
    pg.fill("#enc-pass", "correct horse 42")
    with pg.expect_download() as d: pg.evaluate("() => document.getElementById('btn-export-enc').click()")
    f = pathlib.Path(tempfile.mkdtemp()) / "b.mzansi"; d.value.save_as(str(f))
    pkg = json.loads(f.read_text()); assert pkg["format"] == "mzansi-pathways-aes256-v1" and len(pkg["data"]) > 300000, "large backup failed"
    assert "Last backup downloaded" in pg.inner_text("#enc-last-backup")
    pg.evaluate("() => { state.cvName = 'Changed'; state.evidenceVault = []; saveState(); }")
    pg.fill("#enc-pass", "wrong passphrase 1"); pg.set_input_files("#in-import-enc", str(f)); pg.wait_for_timeout(1500)
    assert pg.evaluate("() => state.cvName") == "Changed", "wrong passphrase must not change the profile"
    bad = pathlib.Path(tempfile.mkdtemp()) / "notmine.mzansi"; bad.write_text('{"hello": 1}')
    pg.set_input_files("#in-import-enc", str(bad)); pg.wait_for_timeout(500)
    assert pg.evaluate("() => state.cvName") == "Changed" and "not a Mzansi" in pg.inner_text("#toast")
    pg.fill("#enc-pass", "correct horse 42"); pg.set_input_files("#in-import-enc", str(f)); pg.wait_for_timeout(1500)
    assert pg.evaluate("() => [state.cvName, state.evidenceVault.length]") == ["Thandi", 400], "restore failed"
    pg.evaluate("() => document.getElementById('auth-btn').click()"); pg.wait_for_timeout(200)  # reopen Sync & Backup like a learner would
    assert pg.locator("#btn-undo-restore").is_visible(), "undo button not offered after a restore"
    pg.click("#btn-undo-restore"); pg.wait_for_timeout(300)
    assert pg.evaluate("() => state.cvName") == "Changed", "undo restore did not bring the earlier profile back"

    # 4. wipe removes EVERY saved copy (shared-device privacy)
    pg.evaluate("([k]) => { localStorage.setItem(k + '_prev', '{}'); localStorage.setItem(k + '_corrupt', '{}'); localStorage.setItem(k + '_before_restore', '{}'); wipeLocalProfile(); }", [KEY])
    left = pg.evaluate("([k]) => ['_prev', '_corrupt', '_before_restore'].filter(s => localStorage.getItem(k + s))", [KEY])
    assert left == [], f"wipe left copies behind: {left}"
    assert pg.evaluate("() => state.cvName") == ""
    b.close()
real = [e for e in errs if "Failed to fetch" not in e]
assert not real, real
print("learner-side failsafes OK")
