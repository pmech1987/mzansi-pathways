"""OCR for scanned prospectus pages (pdftoppm + tesseract). Used only when a PDF has no usable text layer.
Nothing here decides what is true. Rows that depend on OCR text are capped at pending_review by run_pipeline.py,
because OCR can swap look-alike characters (0/O, 1/l, 5/S) and the second text engine cannot cross-check an image-only page.
CI installs the tools with: sudo apt-get install -y poppler-utils tesseract-ocr"""
import hashlib, json, os, re, shutil, subprocess, tempfile

import mz_common as C

MIN_TEXT = 40
MAX_PAGES = int(os.environ.get('MZ_OCR_MAX_PAGES', 80))
DPI = int(os.environ.get('MZ_OCR_DPI', 200))


_D_AFTER = re.compile(r'(?<=\d)[Oo](?=\d|\b)')
_D_BEFORE = re.compile(r'(?<![A-Za-z])[Oo](?=\d{1,2}\b)')
_ONE = re.compile(r'(?<=\d)[lI|](?=\d|\b)')


def fix_digits(text):
    """OCR often reads 0 as O and 1 as l or I when they touch other digits (3O -> 30, 2l -> 21). Fix only those cases, never inside words.
    Rows read this way stay pending_review anyway; this just stops a fixable swap from rejecting a real row."""
    return _ONE.sub('1', _D_BEFORE.sub('0', _D_AFTER.sub('0', text)))


def _lang():
    """English, plus Afrikaans when its tesseract language pack is installed (several prospectuses are bilingual)."""
    try:
        have = subprocess.run(['tesseract', '--list-langs'], capture_output=True, timeout=30).stdout.decode('utf-8', 'replace').split()
    except Exception:
        have = []
    return 'eng+afr' if 'afr' in have else 'eng'


def available():
    return bool(shutil.which('pdftoppm') and shutil.which('tesseract'))


def sparse_pages(pages):
    """1-based page numbers whose text layer is empty or too short to be real text."""
    return [i + 1 for i, t in enumerate(pages or []) if len((t or '').strip()) < MIN_TEXT]


def _cache_path(sha):
    return os.path.join(C.ROOT, '.cache', 'prospectus', 'ocr_%s.json' % sha[:20])


def _ocr_one(pdf, page, dpi):
    with tempfile.TemporaryDirectory() as td:
        stem = os.path.join(td, 'p')
        r = subprocess.run(['pdftoppm', '-r', str(dpi), '-f', str(page), '-l', str(page), '-gray', '-png', pdf, stem], capture_output=True, timeout=120)
        imgs = sorted(f for f in os.listdir(td) if f.endswith('.png'))
        if r.returncode != 0 or not imgs:
            return ''
        t = subprocess.run(['tesseract', os.path.join(td, imgs[0]), 'stdout', '-l', _lang(), '--psm', '6'], capture_output=True, timeout=180)
        return t.stdout.decode('utf-8', 'replace') if t.returncode == 0 else ''


def ocr_pages(pdf, wanted=None, dpi=None):
    """{page: text} for the wanted pages (default all, up to MZ_OCR_MAX_PAGES new pages per run). Cached by file hash."""
    if not available():
        return {}
    with open(pdf, 'rb') as fh:
        sha = hashlib.sha256(fh.read()).hexdigest()
    cp = _cache_path(sha)
    cache = {}
    if os.path.exists(cp):
        try:
            with open(cp, encoding='utf-8') as f:
                cache = {int(k): v for k, v in json.load(f).items()}
        except Exception:
            cache = {}
    if wanted is None:
        try:
            import pypdf
            wanted = range(1, len(pypdf.PdfReader(pdf).pages) + 1)
        except Exception:
            wanted = range(1, 2)
    out, done = {}, 0
    for p in wanted:
        if p in cache:
            out[p] = fix_digits(cache[p]); continue
        if done >= MAX_PAGES:
            break
        try:
            cache[p] = _ocr_one(pdf, p, dpi or DPI); out[p] = fix_digits(cache[p])
        except Exception:
            out[p] = ''
        done += 1
    if done:
        os.makedirs(os.path.dirname(cp), exist_ok=True)
        tmp = cp + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump({str(k): v for k, v in cache.items()}, f)
        os.replace(tmp, cp)
    return out


def fill_sparse(pdf, pages):
    """Hybrid read: keep the real text layer, OCR only the image-only pages. Returns (pages, ocr_page_numbers)."""
    need = sparse_pages(pages)
    if not need or not available():
        return pages, []
    got = ocr_pages(pdf, need)
    merged, used = list(pages), []
    for p, txt in got.items():
        if txt.strip() and 1 <= p <= len(merged):
            merged[p - 1] = txt; used.append(p)
    return merged, sorted(used)


def ocr_all(pdf):
    """For a fully scanned PDF: every page from OCR. Returns (pages, ocr_page_numbers)."""
    got = ocr_pages(pdf)
    if not got:
        return None, []
    n = max(got)
    return [got.get(i, '') for i in range(1, n + 1)], sorted(p for p, t in got.items() if t.strip())
