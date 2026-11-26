#!/usr/bin/env python3
"""Automatic backups, hands-free.
  python scripts/scheduled_backup.py              run one backup now (this is what the schedule runs)
  python scripts/scheduled_backup.py --install    Windows: ask Task Scheduler to run it every Sunday 12:00 (and at next login if the PC was off)
  python scripts/scheduled_backup.py --remove     take the schedule away
  python scripts/scheduled_backup.py --status     show the last result
One run: project backup zip (checksummed and re-read) + a verified copy of the whole git history + a copy to MZ_OFFSITE_DIR if set.
It NEVER changes your code or data files (no seals are refreshed, nothing is published) and it skips politely if a maintenance run is open.
The result is written to backups/last_scheduled_backup.json; python scripts/doctor.py warns when it is missing, failed or older than 10 days."""
import json, os, shutil, subprocess, sys, time
from datetime import datetime
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import safe_io
TASK_NAME = "MzansiPathways weekly backup"
STATUS = ROOT / "backups" / "last_scheduled_backup.json"

def schtasks_create_args(python_exe: str, script: str, name: str = TASK_NAME) -> list:
    """Pure function (unit tested): the exact schtasks command. Weekly on Sunday 12:00; /F replaces an older copy; runs as the current user only."""
    tr = f'"{python_exe}" "{script}"'
    return ["schtasks", "/Create", "/TN", name, "/TR", tr, "/SC", "WEEKLY", "/D", "SUN", "/ST", "12:00", "/RL", "LIMITED", "/F"]

def write_status(ok: bool, steps: list):
    try: safe_io.atomic_write(STATUS, json.dumps({"time": datetime.now().isoformat(timespec="seconds"), "epoch": int(time.time()), "ok": ok, "steps": steps}, indent=1))
    except OSError: pass

def read_status():
    try: return json.loads(STATUS.read_text(encoding="utf-8"))
    except (OSError, ValueError): return None

def run_backup() -> int:
    steps, ok = [], True
    def step(label, fn):
        nonlocal ok
        try:
            msg = fn(); steps.append(f"OK: {label}" + (f" ({msg})" if msg else "")); print(steps[-1])
        except SystemExit as e: ok = False; steps.append(f"FAILED: {label}: {e}"); print(steps[-1])
        except Exception as e: ok = False; steps.append(f"FAILED: {label}: {type(e).__name__}: {e}"); print(steps[-1])
    try:
        with safe_io.lock(ROOT, ".maintain.lock"):
            snap = {}
            def make_zip():
                snap["p"] = safe_io.snapshot(ROOT, "scheduled"); return snap["p"].name
            step("project backup zip", make_zip)
            def reread():
                good, msg = safe_io.verify_snapshot(snap["p"])
                if not good: raise RuntimeError(msg)
                return msg
            if "p" in snap: step("backup re-read and checksummed", reread)
            import github_publish as gp
            bundle = {}
            if (ROOT / ".git").exists() and gp.git("rev-parse", "HEAD")[0] == 0:
                def make_b():
                    bundle["b"] = gp.make_bundle("scheduled"); return bundle["b"].name
                step("git history bundle (verified)", make_b)
            else:
                steps.append("SKIPPED: git history bundle (no commits yet)"); print(steps[-1])
            off = os.environ.get("MZ_OFFSITE_DIR")
            if off:
                import maintain
                def off_zip():
                    if maintain.offsite_copy(Path(off)) != 0: raise RuntimeError("could not copy to " + off)
                    return "ok"
                def off_bundle():
                    if not gp.offsite_bundle(bundle["b"], off): raise RuntimeError("could not copy to " + off)
                    return "ok"
                step("off-site copy of the backup zip", off_zip)
                if bundle.get("b"): step("off-site copy of the git bundle", off_bundle)
            else:
                steps.append("WARNING: MZ_OFFSITE_DIR is not set, so every copy is on this PC only"); print(steps[-1])
    except SystemExit as e:
        steps.append("SKIPPED: " + str(e)); print(steps[-1]); write_status(True, steps); return 0   # a maintenance run is open: nothing wrong, try next time
    write_status(ok, steps)
    print("\nBACKUP " + ("DONE" if ok else "HAD PROBLEMS: run python scripts/doctor.py")); return 0 if ok else 1

def cmd_install() -> int:
    if os.name != "nt":
        print("This command is for Windows Task Scheduler. On Mac/Linux add this line with 'crontab -e':\n"
              f'0 12 * * 0 "{sys.executable}" "{Path(__file__).resolve()}"'); return 0
    exe = sys.executable
    if exe.lower().endswith("python.exe"):   # pythonw runs without a black window
        pw = exe[:-10] + "pythonw.exe"; exe = pw if Path(pw).exists() else exe
    r = subprocess.run(schtasks_create_args(exe, str(Path(__file__).resolve())), capture_output=True, text=True)
    if r.returncode != 0: print("Task Scheduler refused: " + (r.stdout + r.stderr).strip()[-300:] + "\nYou can still run backup_now.bat by hand every week."); return 1
    print(f'Scheduled: "{TASK_NAME}" every Sunday at 12:00. Check it in Task Scheduler. Remove it with: python scripts/scheduled_backup.py --remove')
    print("Tip: set MZ_OFFSITE_DIR so a copy also leaves this PC (see the guide, Part D)."); return 0

def cmd_remove() -> int:
    if os.name != "nt": print("Remove the line from 'crontab -e'."); return 0
    r = subprocess.run(["schtasks", "/Delete", "/TN", TASK_NAME, "/F"], capture_output=True, text=True)
    print("Schedule removed." if r.returncode == 0 else "Nothing to remove (" + (r.stdout + r.stderr).strip()[-120:] + ")"); return 0

def cmd_status() -> int:
    s = read_status()
    if not s: print("No scheduled backup has run yet. Install the schedule: python scripts/scheduled_backup.py --install"); return 1
    age = (time.time() - s.get("epoch", 0)) / 86400
    print(f"Last run: {s.get('time')} ({age:.1f} days ago), result: {'OK' if s.get('ok') else 'PROBLEMS'}")
    for l in s.get("steps", []): print("  " + l)
    return 0 if s.get("ok") and age <= 10 else 1

if __name__ == "__main__":
    a = sys.argv[1:]
    raise SystemExit(cmd_install() if "--install" in a else cmd_remove() if "--remove" in a else cmd_status() if "--status" in a else run_backup())
