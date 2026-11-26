# Mzansi Pathways — Human-First Experience, Family Talk & Speech Failsafes (v13)

## 1. Human-First Emotional Check-In & Pathway Kit Ring
- **Mood & Stress-Aware Guidance (`getHumanCheckIn`):** Learners can tap `Ready`, `Stressed`, or `Second Chance` right in the hero banner (`data-mood`) to receive grounded, non-judgmental guidance tailored to their situation—never toxic positivity, always real South African bridging, TVET, and rewrite options.
- **Pathway Kit Readiness (`getReadinessRing`):** Displays a live percentage (`0%–100%`) across confirmed subjects, Plan A/B/C selection, application documents, and saved evidence.

## 2. Family Talk Script & Safe Speech Failsafe
- **Family Talk Script (`buildFamilyTalkScript`):** One tap copies a calm, plain-language summary of Plan A/B/C, annual cost estimates, and funding options for learners to share with parents or guardians.
- **Safe Speech Synthesis (`safeSpeech`):** Wraps `window.speechSynthesis` in `try/catch` with overlap cancellation (`cancel()`), South African locale hints (`en-ZA` / `af-ZA`), and toast fallback on browsers without speech output.

## 3. Image-to-Result Zoom & Symbol-Grade Fallback
- **Photo Zoom (`#scan-zoom-btn`):** Expands the local report-card canvas preview for easier reading on small phone screens.
- **Symbol & Level Fallback:** Both `parseStatementText` in `index.html` and `scripts/statement_parser.py` convert NSC levels (`Level 1`–`7`) or letter symbols (`A`–`F`) when percentage marks are absent, flagging them for user confirmation.

## 4. Skippable 7-Step Interactive Onboarding Tutorial & Live Demos
- First-time visitors see a calm, skippable 4-step walkthrough (`#tutorial-modal`) covering marks/photo scanning, Careers & All Routes, Plan A/B/C & Family Talk, and Scam Shield / Sync.
- Tapping **Skip Tutorial** (`#tut-skip-btn`) or **Finish & Plan** persists `tutorialSeen: true` locally so returning users go straight to their marks, and anyone can replay the tour anytime via `?` (`#help-btn`).

## 5. Clean Header & Settings Modal
- Secondary display and region controls (`Home Province`, `Language`, `Parent / Guardian View`, `Easy View`, `Large Text (A+)`, `High Contrast (HC)`, and `Dark Mode`) live inside `#settings-modal`, leaving only `Sync`, `Tour`, and `Settings` in the top navigation bar.
- Covers all 7 pillars (Statement Scan, APS/What-If, Careers & Non-University Routes, Plan A/B/C & Family Talk, Evidence/Scam Shield, Settings/Modes/Accessibility, and Cross-Device Sync/Privacy Wipe) with worked South African examples and 1-tap `runTutorialDemo()` live actions.
