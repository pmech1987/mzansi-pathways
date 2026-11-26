"""Behaviour test (Playwright): page loads with no JS errors, data loader runs, year filter works.
Run: python tests/browser_check.py   (needs: pip install playwright && playwright install chromium)"""
import http.server, socketserver, threading, functools, sys, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
H.log_message = lambda *a, **k: None
srv = socketserver.TCPServer(("127.0.0.1", 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.route("**/*", lambda r: r.continue_() if r.request.url.startswith(f"http://127.0.0.1:{port}") else r.fulfill(status=200, body="", content_type="application/javascript"))
    pg.goto(f"http://127.0.0.1:{port}/index.html"); pg.wait_for_timeout(1500)
    r = pg.evaluate("""() => ({yr: state.intakeYear, n: SAMPLE_PROGRAMMES.length, inst: MZDATA.state.institutions.length,
      st: SAMPLE_PROGRAMMES.map(p => evaluateProgramme(state.subjects, p).status),
      ocr: typeof MZOCR, parse: parseStatementText('Mathematics').map(x => x.mark)})""")
    print(r)
    assert r["yr"] >= 2026 and r["inst"] == 76 and r["ocr"] == "object"
    assert pg.evaluate("() => CAREERS.length") >= 40, "careers.json not loaded"
    assert r["parse"] == [None], "missing mark must stay null"
    assert "Meets Minimums" not in r["st"], "unverified sample data must never be green"
    pg.evaluate("() => { state.tab = 'study'; render(); }"); pg.wait_for_timeout(300)
    assert pg.locator("#intake-year").count() == 1 and pg.locator("#prov-filter").count() == 1
    pg.select_option("#intake-year", "2029"); pg.wait_for_timeout(300)
    assert pg.evaluate("() => state.intakeYear") == 2029 and "No checked rules" in pg.content()
    pg.evaluate("() => { state.tab = 'careers'; state.careerSector = 'health'; state.selectedCareerId = 'nurse'; render(); }"); pg.wait_for_timeout(300)
    assert "Professional / Enrolled Nurse" in pg.content(), "new career did not render"
    pg.evaluate("() => { state.tab = 'study'; render(); }"); pg.wait_for_timeout(300)
    assert pg.locator("#inst-panel > summary").inner_text().replace("\xa0", " ").strip() == "Institutions (76)"
    # Institution search and filters (panel stays open while filtering)
    pg.evaluate("() => { state.instOpen = true; render(); }"); pg.wait_for_timeout(200)
    pg.fill("#inst-search", "nkangala"); pg.wait_for_timeout(500)
    assert "Showing 1 of 76" in pg.content() and "Nkangala TVET College" in pg.content()
    assert pg.locator("#inst-panel").get_attribute("open") is not None, "panel closed while filtering"
    pg.evaluate("() => { state.instQ = ''; state.instType = 'TVET'; state.instProv = 'Gauteng'; render(); }"); pg.wait_for_timeout(300)
    assert "Showing 8 of 76" in pg.content() and "Central Johannesburg TVET College" in pg.content()
    assert "Draft list entry" in pg.content() and "Find on DHET site" in pg.content()
    pg.evaluate("() => { state.instType = ''; state.instProv = ''; render(); }"); pg.wait_for_timeout(300)
    # Same programme in two years must both be kept (ids are id@year); year buttons switch the year
    ids = pg.evaluate("""() => { const a = MZDATA.toAppShape({id:'x', institutionId:'up', name:'N', route:'University', intakeYear:2027, verificationStatus:'pending_review'});
      const b = MZDATA.toAppShape({id:'x', institutionId:'up', name:'N', route:'University', intakeYear:2028, verificationStatus:'pending_review'}); return [a.id, b.id, a.baseId]; }""")
    assert ids == ["x@2027", "x@2028", "x"], ids
    pg.click("[data-year-jump='2029']"); pg.wait_for_timeout(300)
    assert pg.evaluate("() => state.intakeYear") == 2029 and pg.locator(".mz-yr").first.inner_text() == "2029"
    # Languages
    pg.evaluate("() => MZI18N.setLang('zu')"); pg.wait_for_timeout(300)
    assert "Izikhungo" in pg.content(), "isiZulu heading not applied"
    pg.evaluate("() => MZI18N.setLang('en')"); pg.wait_for_timeout(300)
    assert "<span>Institutions</span>" in pg.content(), "English not restored"
    assert "Funding &amp; bursaries" in pg.content() or "Funding & bursaries" in pg.content()
    b.close()
assert not errs, errs
print("browser tests OK")
