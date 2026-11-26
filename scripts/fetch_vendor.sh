#!/usr/bin/env bash
# Run ONCE on your PC (needs internet + npm). Copies OCR libraries into ./vendor so the app works offline.
set -e
cd "$(dirname "$0")/.."
mkdir -p vendor/tesseract vendor/pdfjs vendor/mammoth /tmp/mzv && cd /tmp/mzv
npm pack tesseract.js@5.1.1 tesseract.js-core@5.1.0 pdfjs-dist@4.4.168 mammoth@1.8.0 >/dev/null
for f in *.tgz; do tar xzf "$f" --one-top-level="${f%.tgz}"; done
R="$OLDPWD"
cp tesseract.js-5.1.1/package/dist/tesseract.min.js tesseract.js-5.1.1/package/dist/worker.min.js "$R/vendor/tesseract/"
cp tesseract.js-core-5.1.0/package/tesseract-core*.js tesseract.js-core-5.1.0/package/tesseract-core*.wasm "$R/vendor/tesseract/" 2>/dev/null || true
cp pdfjs-dist-4.4.168/package/build/pdf.min.mjs pdfjs-dist-4.4.168/package/build/pdf.worker.min.mjs "$R/vendor/pdfjs/"
cp mammoth-1.8.0/package/mammoth.browser.min.js "$R/vendor/mammoth/"
echo "Now download eng.traineddata.gz (tessdata_fast) into vendor/tesseract/ and commit vendor/."
