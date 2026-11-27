/* Mzansi Pathways v57 - ocr.js  (browser only)
 *
 * Real on-device text reading:
 *   photo / screenshot -> canvas (EXIF-rotated, <=2000px) -> clean-up -> Tesseract.js OCR
 *   PDF  -> pdf.js text layer (fast, exact); scanned PDF -> render page -> OCR
 *   DOCX -> mammoth.js
 *
 * Libraries load LAZILY and LOCAL-FIRST from ./vendor/ (run scripts/fetch_vendor.sh once
 * to download them). If a local file is missing we fall back to a version-pinned CDN copy
 * so the feature still works online. Offline use needs the ./vendor/ files.
 *
 * Nothing is uploaded: images stay in memory. We keep only text and clear the canvas.
 */
(function (root) {
  'use strict';

  const LOCAL = {
    tess: './vendor/tesseract/',
    pdf: './vendor/pdfjs/',
    mammoth: './vendor/mammoth/mammoth.browser.min.js'
  };
  // Exact pinned versions (never floating tags). Local copies should match these.
  const CDN = {
    tess: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
    pdfMod: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs',
    pdfWorker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs',
    mammoth: 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js'
  };
  const MAX_SIDE = 2000;           // px, longest side after scaling
  const MAX_FILE_MB = 25;          // protects cheap phones
  const MAX_PDF_PAGES = 5;

  const stash = {};                // kind -> offscreen canvas that survives re-render
  let progressCb = null;

  // ------------------------------------------------------------------ utils
  function loadScript(src, asModule) {
    return new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      if (asModule) s.type = 'module';
      s.src = src; s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { s.remove(); reject(new Error('load failed: ' + src)); };
      document.head.appendChild(s);
    });
  }
  function setProgress(label, frac) {
    if (typeof progressCb === 'function') progressCb(label, frac);
    const el = document.getElementById('ocr-progress');
    if (el) el.textContent = label + (frac != null ? ' ' + Math.round(frac * 100) + '%' : '');
  }
  function fileTooBig(file) { return file && file.size > MAX_FILE_MB * 1024 * 1024; }

  // --------------------------------------------------------- image handling
  async function fileToCanvas(file, canvas, maxSide) {
    maxSide = maxSide || MAX_SIDE;
    if (!file) throw new Error('No file');
    if (fileTooBig(file)) throw new Error('That file is bigger than ' + MAX_FILE_MB + ' MB. Take a smaller photo.');
    let src, w, h, release = function () {};
    try {
      if (root.createImageBitmap) {
        // imageOrientation applies the phone's EXIF rotation so sideways photos stand up
        src = await createImageBitmap(file, { imageOrientation: 'from-image' });
        w = src.width; h = src.height; release = function () { if (src.close) src.close(); };
      }
    } catch (e) { src = null; }
    if (!src) {
      const url = URL.createObjectURL(file);
      src = await new Promise(function (res, rej) {
        const img = new Image();
        img.onload = function () { res(img); };
        img.onerror = function () { rej(new Error('Could not open this image. Use a JPG or PNG (iPhone HEIC photos: choose "Most Compatible" or screenshot it).')); };
        img.src = url;
      }).finally(function () { URL.revokeObjectURL(url); });
      w = src.naturalWidth || src.width; h = src.naturalHeight || src.height;
    }
    const r = Math.min(1, maxSide / Math.max(w, h));
    canvas.width = Math.max(1, Math.round(w * r));
    canvas.height = Math.max(1, Math.round(h * r));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    release();
    saveStash(canvas);
    return { width: canvas.width, height: canvas.height };
  }

  function cloneCanvas(c) {
    const n = document.createElement('canvas');
    n.width = c.width; n.height = c.height;
    n.getContext('2d').drawImage(c, 0, 0);
    return n;
  }
  function kindOf(canvas) { return canvas && canvas.id ? canvas.id : 'canvas'; }
  function saveStash(canvas) { if (canvas && canvas.width) stash[kindOf(canvas)] = cloneCanvas(canvas); }
  // The app re-renders whole tabs; re-draw photos that were loaded before the render.
  function restoreAll() {
    ['scan-canvas', 'cv-canvas', 'flyer-canvas'].forEach(function (id) {
      const live = document.getElementById(id), saved = stash[id];
      if (live && saved && saved.width && !live.width) {
        live.width = saved.width; live.height = saved.height;
        live.getContext('2d').drawImage(saved, 0, 0);
      }
    });
  }
  function clearStash(id) {
    if (id) { delete stash[id]; return; }
    Object.keys(stash).forEach(function (k) { delete stash[k]; });
    ['scan-canvas', 'cv-canvas', 'flyer-canvas'].forEach(function (i) {
      const c = document.getElementById(i);
      if (c) { c.getContext('2d').clearRect(0, 0, c.width, c.height); c.width = 0; c.height = 0; }
    });
  }

  function rotate90(canvas) {
    const tmp = document.createElement('canvas');
    tmp.width = canvas.height; tmp.height = canvas.width;
    const t = tmp.getContext('2d');
    t.translate(tmp.width / 2, tmp.height / 2); t.rotate(Math.PI / 2);
    t.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    canvas.width = tmp.width; canvas.height = tmp.height;
    canvas.getContext('2d').drawImage(tmp, 0, 0);
    saveStash(canvas);
  }

  // grayscale + stretch between the 2nd and 98th brightness percentile
  function toGrayContrast(src) {
    const out = document.createElement('canvas');
    out.width = src.width; out.height = src.height;
    const ctx = out.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, out.width, out.height), d = img.data;
    const hist = new Uint32Array(256);
    for (let i = 0; i < d.length; i += 4) {
      const g = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0;
      d[i] = d[i + 1] = d[i + 2] = g; hist[g]++;
    }
    const total = out.width * out.height;
    let acc = 0, lo = 0, hi = 255;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * 0.02) { lo = v; break; } }
    acc = 0;
    for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= total * 0.02) { hi = v; break; } }
    const span = Math.max(1, hi - lo);
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.max(0, Math.min(255, ((d[i] - lo) * 255) / span));
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
    return out;
  }

  // Adaptive (local-mean) threshold using an integral image: O(pixels).
  // Pixel becomes black if darker than ratio * mean of its surrounding block.
  function adaptiveThreshold(src, block, ratio) {
    block = block || 32; ratio = ratio || 0.85;
    const w = src.width, h = src.height;
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const ctx = out.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    const integral = new Float64Array((w + 1) * (h + 1));
    for (let y = 1; y <= h; y++) {
      let rowSum = 0;
      for (let x = 1; x <= w; x++) {
        rowSum += d[((y - 1) * w + (x - 1)) * 4];
        integral[y * (w + 1) + x] = integral[(y - 1) * (w + 1) + x] + rowSum;
      }
    }
    const half = block >> 1;
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - half), y1 = Math.min(h - 1, y + half);
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - half), x1 = Math.min(w - 1, x + half);
        const area = (x1 - x0 + 1) * (y1 - y0 + 1);
        const sum = integral[(y1 + 1) * (w + 1) + (x1 + 1)] - integral[y0 * (w + 1) + (x1 + 1)] -
          integral[(y1 + 1) * (w + 1) + x0] + integral[y0 * (w + 1) + x0];
        const i = (y * w + x) * 4;
        const v = d[i] * area < sum * ratio ? 0 : 255;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
    }
    ctx.putImageData(img, 0, 0);
    return out;
  }

  function addBorder(src, px) {
    px = px || 10;
    const out = document.createElement('canvas');
    out.width = src.width + px * 2; out.height = src.height + px * 2;
    const c = out.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, out.width, out.height);
    c.drawImage(src, px, px);
    return out;
  }

  // ---------------------------------------------------------- Tesseract OCR
  let workerPromise = null, workerLocal = false;

  async function ensureTesseractScript() {
    if (root.Tesseract) return;
    try { await loadScript(LOCAL.tess + 'tesseract.min.js'); workerLocal = true; }
    catch (e) { throw new Error('Offline OCR files (./vendor/tesseract/) are not installed on this deployment.'); }
  }
  async function buildWorker(local) {
    const logger = function (m) {
      if (m && m.status) setProgress(String(m.status).replace(/_/g, ' '), typeof m.progress === 'number' ? m.progress : null);
    };
    const opts = local
      ? { workerPath: LOCAL.tess + 'worker.min.js', corePath: LOCAL.tess, langPath: LOCAL.tess, logger: logger }
      : { logger: logger };
    return root.Tesseract.createWorker('eng', 1, opts);
  }
  async function getWorker() {
    if (workerPromise) return workerPromise;
    workerPromise = (async function () {
      await ensureTesseractScript();
      try { return await buildWorker(workerLocal); }
      catch (e) {
        if (!workerLocal) throw e;
        // local files incomplete (e.g. language data missing): retry with the pinned CDN worker
        return await buildWorker(false);
      }
    })();
    workerPromise.catch(function () { workerPromise = null; });
    return workerPromise;
  }
  async function terminateWorker() {
    if (!workerPromise) return;
    try { const w = await workerPromise; await w.terminate(); } catch (e) { /* ignore */ }
    workerPromise = null;
  }

  // psm: '6' block of text (results table), '4' single column, '11' sparse (flyers)
  // A stalled reader (slow download, frozen worker) must never leave the learner on "Reading..." forever.
  function withTimeout(promise, ms, what) {
    let t;
    const timeout = new Promise(function (_, reject) { t = setTimeout(function () { reject(new Error('TIMEOUT: ' + what)); }, ms); });
    return Promise.race([promise, timeout]).finally(function () { clearTimeout(t); });
  }
  async function recognize(canvas, psm) {
    try {
      const worker = await withTimeout(getWorker(), 120000, 'loading the reading tool');
      await worker.setParameters({ tessedit_pageseg_mode: String(psm || '6'), preserve_interword_spaces: '1', user_defined_dpi: '300' });
      const out = await withTimeout(worker.recognize(canvas), 90000, 'reading the photo');
      return { text: (out && out.data && out.data.text) || '', confidence: (out && out.data && out.data.confidence) || 0 };
    } catch (e) {
      if (/^TIMEOUT/.test(String(e && e.message))) { try { await terminateWorker(); } catch (e2) {} }  // throw the stuck worker away so the next try starts clean
      throw e;
    }
  }
  // Multi-pass for statements: raw+contrast (PSM 6), then adaptive threshold (PSM 4)
  // if too few rows were parsed. Keeps the row with a mark / better confidence per subject.
  async function readStatementCanvas(canvas, parseFn, opts) {
    opts = opts || {};
    const minRows = opts.minRows || 5;
    setProgress('Preparing image', null);
    const p1 = addBorder(toGrayContrast(canvas));
    const r1 = await recognize(p1, '6');
    let rows = parseFn(r1.text), text = r1.text, conf = r1.confidence, pass = 1;
    if (rows.length < minRows) {
      setProgress('Second pass', null);
      const p2 = addBorder(adaptiveThreshold(toGrayContrast(canvas), 32, 0.85));
      const r2 = await recognize(p2, '4');
      const rows2 = parseFn(r2.text);
      const byName = {};
      rows.concat(rows2).forEach(function (r) {
        const k = r.name || ('x' + Math.random());
        const prev = byName[k];
        if (!prev || (prev.mark === null && r.mark !== null)) byName[k] = r;
      });
      rows = Object.keys(byName).map(function (k) { return byName[k]; });
      text = r1.text + '\n' + r2.text; conf = Math.max(conf, r2.confidence); pass = 2;
    }
    rows.forEach(function (r) { r.source = 'ocr'; });
    return { text: text, rows: rows, confidence: conf, passes: pass };
  }

  async function readTextCanvas(canvas, psm) {
    setProgress('Preparing image', null);
    const p = addBorder(toGrayContrast(canvas));
    return recognize(p, psm || '4');
  }

  // ------------------------------------------------------------ PDF / DOCX
  let pdfLib = null;
  async function ensurePdfJs() {
    if (pdfLib) return pdfLib;
    try {
      pdfLib = await import(LOCAL.pdf + 'pdf.min.mjs');
      pdfLib.GlobalWorkerOptions.workerSrc = LOCAL.pdf + 'pdf.worker.min.mjs';
    } catch (e) {
      throw new Error('Offline PDF reader (./vendor/pdfjs/) is not installed on this deployment.');
    }
    return pdfLib;
  }
  async function pdfText(file) {
    if (fileTooBig(file)) throw new Error('PDF is bigger than ' + MAX_FILE_MB + ' MB.');
    const lib = await ensurePdfJs();
    const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    let out = '';
    const n = Math.min(pdf.numPages, MAX_PDF_PAGES);
    for (let p = 1; p <= n; p++) {
      setProgress('Reading PDF page ' + p + '/' + n, p / n);
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      // keep line breaks: new line when the y position changes
      let lastY = null, line = '';
      content.items.forEach(function (it) {
        const y = it.transform ? Math.round(it.transform[5]) : 0;
        if (lastY !== null && Math.abs(y - lastY) > 2) { out += line.trim() + '\n'; line = ''; }
        line += it.str + ' '; lastY = y;
      });
      out += line.trim() + '\n';
    }
    return { text: out, pdf: pdf, pages: n };
  }
  async function pdfPageToCanvas(pdf, pageNo, scale) {
    const page = await pdf.getPage(pageNo);
    const vp = page.getViewport({ scale: scale || 2 });
    const c = document.createElement('canvas');
    c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    return c;
  }
  // text layer first; scanned PDFs (almost no text) fall back to OCR of the first pages
  async function readPdf(file, mode, parseFn) {
    const t = await pdfText(file);
    const usable = t.text.replace(/\s+/g, '').length >= 60;
    if (usable) return { text: t.text, via: 'pdf-text' };
    let acc = '';
    const n = Math.min(t.pages, 3);
    for (let p = 1; p <= n; p++) {
      setProgress('Scanned PDF: reading page ' + p + '/' + n, p / n);
      const c = await pdfPageToCanvas(t.pdf, p, 2.5);
      if (mode === 'statement' && parseFn) acc += (await readStatementCanvas(c, parseFn)).text + '\n';
      else acc += (await readTextCanvas(c, '4')).text + '\n';
    }
    return { text: acc, via: 'pdf-ocr' };
  }

  let mammothLoaded = false;
  async function ensureMammoth() {
    if (root.mammoth || mammothLoaded) return;
    try { await loadScript(LOCAL.mammoth); } catch (e) { throw new Error('Offline DOCX reader (./vendor/mammoth/) is not installed on this deployment.'); }
    mammothLoaded = true;
  }
  async function docxText(file) {
    if (fileTooBig(file)) throw new Error('Word file is bigger than ' + MAX_FILE_MB + ' MB.');
    await ensureMammoth();
    const r = await root.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return r.value || '';
  }

  function stripHtml(html) {
    try { const d = new DOMParser().parseFromString(html, 'text/html'); return d.body ? d.body.textContent || '' : ''; }
    catch (e) { return html.replace(/<[^>]+>/g, ' '); }
  }
  function stripRtf(rtf) {
    return rtf.replace(/\\par[d]?/g, '\n').replace(/\{\\\*[^}]*\}/g, '').replace(/\\'[0-9a-f]{2}/gi, ' ')
      .replace(/\\[a-z]+-?\d* ?/gi, '').replace(/[{}]/g, '');
  }

  // Dispatcher used by the CV importer and the report-card file picker.
  // canvas = the on-screen canvas to show images on (optional for non-images).
  function scrubSaId(s) {
    var clean = String(s || '').normalize('NFKC').replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff\u00ad]/g, '');
    return clean.replace(/\b\d{13}\b/g, '[SA-ID-REDACTED]');
  }

  async function readAnyFile(file, opts) {
    opts = opts || {};
    const name = (file.name || '').toLowerCase();
    const ext = name.indexOf('.') > -1 ? name.split('.').pop() : '';
    const type = file.type || '';
    if (type.indexOf('image/') === 0) {
      if (!opts.canvas) throw new Error('No canvas to draw the image on');
      await fileToCanvas(file, opts.canvas);
      const res = (opts.mode === 'statement' && opts.parseFn)
        ? await readStatementCanvas(opts.canvas, opts.parseFn)
        : await readTextCanvas(opts.canvas, opts.psm || '4');
      return { text: scrubSaId(res.text), rows: res.rows, via: 'image-ocr', confidence: res.confidence };
    }
    if (ext === 'pdf' || type === 'application/pdf') {
      const r = await readPdf(file, opts.mode, opts.parseFn); return { text: scrubSaId(r.text), via: r.via };
    }
    if (ext === 'docx') return { text: scrubSaId(await docxText(file)), via: 'docx' };
    if (ext === 'doc') throw new Error('Old .doc files cannot be read. In Word use Save As > .docx or PDF, then upload again.');
    if (ext === 'html' || ext === 'htm') return { text: scrubSaId(stripHtml(await file.text())), via: 'html' };
    if (ext === 'rtf') return { text: scrubSaId(stripRtf(await file.text())), via: 'rtf' };
    if (ext === 'txt' || ext === 'md' || type.indexOf('text/') === 0) return { text: scrubSaId(await file.text()), via: 'text' };
    throw new Error('Unsupported file type. Use PDF, DOCX, TXT or a photo.');
  }

  var _vendorCached = null;
  async function checkOfflineVendor() {
    if (_vendorCached !== null) return _vendorCached;
    try {
      const r = await fetch(LOCAL.tess + 'tesseract.min.js', { method: 'HEAD', cache: 'no-store' });
      _vendorCached = !!(r && r.ok);
    } catch (e) { _vendorCached = false; }
    return _vendorCached;
  }

  function friendlyError(e) {
    const m = String((e && e.message) || e || '');
    if (/^TIMEOUT/.test(m)) return 'Reading the photo took too long. Try a smaller, clearer photo, or type the marks yourself.';
    if (/not installed|vendor\/|load failed|Failed to fetch|NetworkError|dynamically imported/i.test(m)) {
      return 'On-device photo auto-read is not bundled on this deployment yet. Paste your Google Lens or SMS statement text on the right, or enter your marks manually — both work 100% offline.';
    }
    return m || 'Could not read that file. Try a clearer photo or type the marks.';
  }

  root.MZOCR = {
    fileToCanvas: fileToCanvas, rotate90: rotate90, toGrayContrast: toGrayContrast,
    adaptiveThreshold: adaptiveThreshold, readStatementCanvas: readStatementCanvas,
    readTextCanvas: readTextCanvas, readAnyFile: readAnyFile, restoreAll: restoreAll,
    saveStash: saveStash, clearStash: clearStash, terminateWorker: terminateWorker,
    friendlyError: friendlyError, checkOfflineVendor: checkOfflineVendor, setProgressHandler: function (f) { progressCb = f; },
    LIMITS: { MAX_SIDE: MAX_SIDE, MAX_FILE_MB: MAX_FILE_MB, MAX_PDF_PAGES: MAX_PDF_PAGES }
  };
})(typeof window !== 'undefined' ? window : globalThis);
