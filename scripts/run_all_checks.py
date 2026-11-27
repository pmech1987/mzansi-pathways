#!/usr/bin/env python3
"""One command to check everything before you publish or after you change a script:   python scripts/run_all_checks.py
Runs every test suite, the data validator, the v97 health auditor and the site tests. Prints a single PASS/FAIL line per step and exits 1 if any step fails."""
import os, shutil, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
STEPS = [('data files are valid and safe', ['scripts/validate_data.py']),
         ('system-wide security, SRI, SW & CI health audit', ['scripts/health_audit.py']),
         ('data scripts', ['scripts/test_scripts.py']),
         ('prospectus pipeline', ['scripts/test_pipeline.py']),
         ('automation', ['scripts/test_automation.py']),
         ('safety layer', ['scripts/test_hardening.py']),
         ('v93 autonomous ops & pathways', ['scripts/test_v93_ops.py']),
         ('v94 UI, CSP, SRI & workflow overhaul', ['scripts/test_v94_overhaul.py']),
         ('v95 screenshot visual & UX regression fixes', ['scripts/test_v95_visual_and_ux_fixes.py']),
         ('v96 unique brand icon, dark badges & live multi-uni APS', ['scripts/test_v96_icon_and_dark_contrast.py']),
         ('v97 full-stack resilience, a11y, SW timeout & CI overhaul', ['scripts/test_v97_full_overhaul.py']),
         ('v98 quick palette, 404/Creator Studio a11y & job POPIA/anti-scam shield', ['scripts/test_v98_hardening_and_ux.py']),
         ('v99 AES-256-GCM encrypted backup UI, print CSS & extended link/SRI monitoring', ['scripts/test_v99_crypto_and_print.py']),
         ('v100 PWA shortcuts, install & offline self-check, release verifier & runbook', ['scripts/test_v100_production_ready.py']),
         ('v101 accessibility comfort controls & defense-in-depth job sanitization', ['scripts/test_v101_a11y_and_defense.py']),
         ('v102 offline .ics calendar exporter, root guard/sw SRI signing & atomic ops', ['scripts/test_v102_ics_and_sri.py']),
         ('v103 study cost estimator, expanded blocklist & technical NSC aliases', ['scripts/test_v103_estimator_and_common.py']),
         ('v104 SA document checklist, atomic catalogue build & edu.za verification', ['scripts/test_v104_checklist_and_atomic.py']),
         ('v106 unified v104+v105 security, POPIA, hash routing & mobile UX', ['scripts/test_v106_unified_security_and_ux.py']),
         ('v110 OCR fallback, progression evidence, community uploads, comparison & learning', ['scripts/test_v110_progression_community.py']),
         ('v112 merged v107+v109+v111, full .github/ workflows & Dark Mode Courses/Fit/Marks', ['scripts/test_v112_merged_dark_and_ci.py']),
         ('v113 hardened learning engine, community anti-scam/XSS shield & workflow gate', ['scripts/test_v113_learning_and_hardening.py']),
         ('v114 POPIA privacy safeguards, OCR stash wipe & learner privacy notice', ['scripts/test_v114_popia_privacy.py']),
         ('v115 adversarial security (NFKC/zero-width bypasses & post-wipe pagehide guard)', ['scripts/test_v115_adversarial_security.py']),
         ('v117 performance & architecture (defer scripts, catalogue cache, i18n fast-path, rAF slider)', ['scripts/test_v117_perf_and_arch.py']),
         ('v118 accessibility & SA language coverage (WCAG labels/dialogs + zu/ss/ts home/nav i18n)', ['scripts/test_v118_a11y_and_i18n.py']),
         ('v119 CI safety, strict CSP zero inline styles & release hardening', ['scripts/test_v119_ci_csp_and_release.py']),
         ('v120 mobile numeric inputs, null-safe marks, subject aria-labels & WhatsApp OG preview', ['scripts/test_v120_ux_polish_and_convergence.py']),
         ('v121 Shared PC / Class Mode, marksSignature fix & 7 SA languages (Sesotho + isiXhosa)', ['scripts/test_v121_class_mode_and_languages.py']),
         ('v122 real-phone screenshot fixes (light-mode select contrast, real counts, auto SA job URLs, compact dock)', ['scripts/test_v122_real_phone_ux_fixes.py']),
         ('v123 live per-university qualifying course counts & match-sorted institutions', ['scripts/test_v123_uni_match_counts.py']),
         ('v124 all 11 written SA languages, Only-Where-I-Match filter & clean print CSS', ['scripts/test_v124_all_11_languages_and_match_filter.py']),
         ('v125 Turn 1 B4/B8/B9 fixes (explicit checkboxes, docked Jump/Help, 2-screen Top, stacked Plan cards)', ['scripts/test_v125_b4_b8_b9_quick_wins.py']),
         ('v126 Turn 2 single sources of truth (B5 counts/fees, B6 getTrust, B10 81-pair province matrix, B11 sample honesty)', ['scripts/test_v126_single_sources_of_truth.py']),
         ('v127 Turn 3 final convergence (B1/B3 deterministic data_manifest, B2 config/contract, B7 single mount, B12 tokens)', ['scripts/test_v127_final_b1_b2_b3_b7_b12.py']),
         ('v128 E5 local diagnostics & zero-PII copyable support report', ['scripts/test_v128_local_diagnostics.py']),
         ('v131 clean learner headings (no v103/v104 tags) & Plan-tab single home for Toolkit', ['scripts/test_v131_clean_headings_and_single_home.py']),
         ('v132 disambiguated Plan progress label & estimator official-source attribution', ['scripts/test_v132_plan_label_and_estimator_source.py'])]


def main():
    bad = 0
    for name, cmd in STEPS:
        r = subprocess.run([sys.executable] + cmd, cwd=ROOT, capture_output=True, text=True)
        print('%-4s %s' % ('PASS' if r.returncode == 0 else 'FAIL', name))
        if r.returncode:
            bad += 1; print((r.stdout + r.stderr)[-1500:])
    if shutil.which('node'):
        r = subprocess.run(['node', 'tests/run.mjs'], cwd=ROOT, capture_output=True, text=True)
        print('%-4s %s' % ('PASS' if r.returncode == 0 else 'FAIL', 'site tests (' + (r.stdout.strip().split('\n') or [''])[-1].strip() + ')'))
        bad += bool(r.returncode)
        r2 = subprocess.run(['node', '--test', 'tests/test_v93_evolved.mjs'], cwd=ROOT, capture_output=True, text=True)
        print('%-4s %s' % ('PASS' if r2.returncode == 0 else 'FAIL', 'v93 evolved JS engines (NCV L4, Reverse-APS, BM25, Trusted Types)'))
        bad += bool(r2.returncode)
        r3 = subprocess.run(['node', '--test', 'tests/test_core_logic_edge_cases.mjs'], cwd=ROOT, capture_output=True, text=True)
        print('%-4s %s' % ('PASS' if r3.returncode == 0 else 'FAIL', 'core logic edge cases (APS, Maths Lit vs Maths, UMP LO/2, NCV/TVET)'))
        bad += bool(r3.returncode)
        r4 = subprocess.run(['node', '--test', 'tests/test_eligibility_characterization_50plus.mjs'], cwd=ROOT, capture_output=True, text=True)
        print('%-4s %s' % ('PASS' if r4.returncode == 0 else 'FAIL', 'E2 eligibility characterization suite (55 mark sets)'))
        bad += bool(r4.returncode)
    else:
        print('SKIP site tests (node is not installed)')
    print('\nALL CHECKS PASSED' if not bad else '\n%d STEP(S) FAILED' % bad)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
