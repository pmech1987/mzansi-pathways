#!/usr/bin/env python3
"""Builds the Study Path catalogue: data/catalogue.json + js/catalogue_data.js

  python scripts/build_catalogue.py            # rebuild from the seed below + any data/prospectus/*.json overrides
  python scripts/build_catalogue.py --check    # validate only

HONESTY RULES (same spirit as engine.js):
  * Every row in the SEED is INDICATIVE: typical published ranges, NOT a copy of a specific year's prospectus.
    They are labelled "indicative" in the app and can never show a green "Meets minimums" result.
  * A real prospectus row (from scripts/prospectus_extract.py -> data/prospectus/<institution>.json) REPLACES the
    seed row with the same institution + name and carries the source document and page.
  * Institutions with no rows are not shown to learners at all (they only appear in a small "no course details loaded yet" note).
"""
import json, re, sys, glob, hashlib
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------- subject codes
E = ["English Home Language", "English First Additional Language"]
SUBJ = {
    "E": E, "M": ["Mathematics"], "ML": ["Mathematical Literacy"], "MML": ["Mathematics", "Mathematical Literacy"],
    "PS": ["Physical Sciences"], "LS": ["Life Sciences"], "ACC": ["Accounting"], "BUS": ["Business Studies"],
    "ECO": ["Economics"], "GEO": ["Geography"], "HIS": ["History"], "IT": ["Information Technology"],
    "CAT": ["Computer Applications Technology"], "EGD": ["Engineering Graphics and Design"],
    "TOU": ["Tourism"], "AGR": ["Agricultural Sciences"], "CON": ["Consumer Studies"],
}
def reqs(s):
    """'E50 M60 PS60' -> [{anyOf:[...], minMark:n}]. 'M/ML50' means Maths OR Maths Lit at 50."""
    out = []
    for tok in s.split():
        m = re.fullmatch(r"([A-Z/]+?)(\d{2})", tok)
        if not m: raise ValueError("bad req token " + tok)
        names = []
        for code in m.group(1).split("/"):
            names += SUBJ[code]
        out.append({"anyOf": names, "minMark": int(m.group(2))})
    return out

QUAL = {  # code: (label, NQF, minPassLevel)
    "HC": ("Higher Certificate", 5, "Higher Certificate Pass"),
    "DIP": ("Diploma", 6, "Diploma Pass"),
    "ADP": ("Advanced Diploma", 7, "Diploma Pass"),
    "BA3": ("Bachelor's degree", 7, "Bachelor's Pass"),
    "BA4": ("Professional bachelor's degree", 8, "Bachelor's Pass"),
    "BT": ("Bachelor of Technology / BEng Tech", 7, "Diploma Pass"),
}

# ---------------------------------------------------------------- templates
# key: (faculty, name, qual, years, baseAps, reqs, field, selection, note)
T = {
 # Health
 "mbchb": ("Health Sciences", "MBChB (Medicine)", "BA4", 6, 38, "E60 M60 PS60 LS60", "health", 1, "Very competitive; many institutions add an admission test or interview."),
 "bpharm": ("Health Sciences", "BPharm (Pharmacy)", "BA4", 4, 32, "E60 M60 PS60", "health", 1, ""),
 "physio": ("Health Sciences", "BSc Physiotherapy", "BA4", 4, 34, "E60 M60 PS60 LS60", "health", 1, ""),
 "ot": ("Health Sciences", "BSc Occupational Therapy", "BA4", 4, 32, "E60 M/ML60 LS60", "health", 1, ""),
 "dent": ("Health Sciences", "BChD (Dentistry)", "BA4", 5, 36, "E60 M60 PS60 LS60", "health", 1, ""),
 "diet": ("Health Sciences", "BSc Dietetics", "BA4", 4, 32, "E60 M60 PS60 LS60", "health", 1, ""),
 "nurse": ("Health Sciences", "Bachelor of Nursing Science (Nursing & Midwifery)", "BA4", 4, 28, "E50 M/ML50 LS50", "nursing", 1, "SANC-accredited nursing degree."),
 "medlab": ("Health Sciences", "BSc Medical Laboratory Science", "BA3", 4, 30, "E60 M60 PS60 LS60", "health", 1, ""),
 "psych": ("Humanities & Social Sciences", "BA Psychology", "BA3", 3, 28, "E60 M/ML50", "social", 0, "Becoming a registered psychologist needs further postgraduate study."),
 "socwork": ("Humanities & Social Sciences", "Bachelor of Social Work (BSW)", "BA4", 4, 26, "E50 M/ML40", "social", 1, ""),
 # Law
 "llb": ("Law", "LLB (4-year Bachelor of Laws)", "BA4", 4, 30, "E60 M/ML40", "law", 1, "Direct-entry LLB. Some institutions also offer a 3-year LLB after a first degree."),
 "bcomlaw": ("Law", "BCom Law", "BA3", 3, 30, "E60 M50", "law", 1, ""),
 # Education
 "bedfp": ("Education", "BEd Foundation Phase Teaching (Gr R-3)", "BA4", 4, 26, "E50 M/ML40", "teaching", 0, "Funza Lushaka bursary may apply. Home-language requirements are set by each campus."),
 "bedip": ("Education", "BEd Intermediate Phase Teaching (Gr 4-6)", "BA4", 4, 26, "E50 M/ML40", "teaching", 0, "Funza Lushaka bursary may apply."),
 "bedsp": ("Education", "BEd Senior Phase & FET Teaching (Gr 7-12)", "BA4", 4, 27, "E50 M/ML40", "teaching", 0, "You choose two teaching subjects; each needs a good mark at school."),
 "bedstem": ("Education", "BEd Senior Phase & FET (Maths, Science & Technology)", "BA4", 4, 28, "E50 M50 PS50", "teaching", 0, "Scarce-skills teaching route; Funza Lushaka bursary may apply."),
 # Engineering
 "beng_civ": ("Engineering & Built Environment", "BEng Civil Engineering", "BA4", 4, 34, "E60 M70 PS60", "engineering", 1, ""),
 "beng_mech": ("Engineering & Built Environment", "BEng Mechanical Engineering", "BA4", 4, 34, "E60 M70 PS60", "engineering", 1, ""),
 "beng_elec": ("Engineering & Built Environment", "BEng Electrical / Electronic Engineering", "BA4", 4, 34, "E60 M70 PS60", "engineering", 1, ""),
 "beng_chem": ("Engineering & Built Environment", "BEng Chemical Engineering", "BA4", 4, 35, "E60 M70 PS60", "engineering", 1, ""),
 "beng_ind": ("Engineering & Built Environment", "BEng Industrial Engineering", "BA4", 4, 34, "E60 M70 PS60", "engineering", 1, ""),
 "arch": ("Engineering & Built Environment", "BSc Architecture", "BA3", 3, 32, "E60 M60", "built", 1, "Usually needs a portfolio or aptitude test."),
 "qs": ("Engineering & Built Environment", "BSc Quantity Surveying", "BA3", 3, 30, "E60 M60", "built", 1, ""),
 # Science / IT
 "bsc_cs": ("Science & Technology", "BSc Computer Science", "BA3", 3, 30, "E50 M60", "it", 1, ""),
 "bsc_it": ("Science & Technology", "BSc Information Technology / Information Systems", "BA3", 3, 28, "E50 M50", "it", 0, ""),
 "bsc_gen": ("Science & Technology", "BSc (Mathematical / Physical / Life Sciences)", "BA3", 3, 28, "E50 M60 PS50", "science", 0, "Exact subject mix depends on the stream you choose."),
 "bsc_act": ("Science & Technology", "BSc Actuarial Science", "BA3", 3, 36, "E60 M80", "commerce", 1, "Very high Maths mark expected."),
 "bsc_agri": ("Agriculture & Environment", "BSc Agriculture", "BA3", 3, 26, "E50 M/ML50 PS50", "agriculture", 0, ""),
 "bsc_env": ("Agriculture & Environment", "BSc Environmental & Geographical Science", "BA3", 3, 26, "E50 M/ML50", "science", 0, ""),
 # Commerce
 "bcom_acc": ("Commerce & Management", "BCom Accounting (CA(SA) route)", "BA3", 3, 32, "E60 M60 ACC60", "accounting", 1, "Maths is required for the chartered accountant route."),
 "bcom_gen": ("Commerce & Management", "BCom General / Business Management", "BA3", 3, 28, "E50 M50", "commerce", 0, ""),
 "bcom_eco": ("Commerce & Management", "BCom Economics / Financial Management", "BA3", 3, 30, "E60 M60", "commerce", 1, ""),
 "bcom_hr": ("Commerce & Management", "BCom Human Resource Management", "BA3", 3, 26, "E50 M/ML50", "commerce", 0, ""),
 # Humanities
 "ba_gen": ("Humanities & Social Sciences", "BA General (Humanities)", "BA3", 3, 24, "E50", "social", 0, "Flexible entry; good if you are still deciding."),
 "ba_comm": ("Humanities & Social Sciences", "BA Communication / Media Studies", "BA3", 3, 26, "E60", "media", 0, ""),
 "ba_pol": ("Humanities & Social Sciences", "BA Politics / International Relations", "BA3", 3, 26, "E60", "social", 0, ""),
 "ba_lang": ("Humanities & Social Sciences", "BA Languages & Linguistics", "BA3", 3, 24, "E60", "social", 0, ""),
 "ba_crim": ("Humanities & Social Sciences", "BA Criminology / Policing Studies", "BA3", 3, 24, "E50", "safety", 0, ""),
 "ba_art": ("Arts & Design", "BA Fine Art / Visual Arts", "BA3", 3, 24, "E50", "arts", 1, "Usually needs a portfolio."),
}

# UoT / TUT-style qualifications (own entry rules): key -> same tuple layout
U = {
 "d_it": ("Information & Communication Technology", "Diploma in Information Technology / ICT", "DIP", 3, 24, "E50 M/ML40", "it", 1, "Software development, networks, or support streams depending on campus."),
 "hc_it": ("Information & Communication Technology", "Higher Certificate in Information Technology (bridging)", "HC", 1, 18, "E40 M/ML40", "it", 0, "Can lead into the Diploma."),
 "d_eng_civ": ("Engineering & Built Environment", "Diploma in Civil Engineering", "DIP", 3, 26, "E50 M60 PS50", "engineering", 1, ""),
 "d_eng_mech": ("Engineering & Built Environment", "Diploma in Mechanical Engineering", "DIP", 3, 26, "E50 M60 PS50", "engineering", 1, ""),
 "d_eng_elec": ("Engineering & Built Environment", "Diploma in Electrical Engineering", "DIP", 3, 26, "E50 M60 PS50", "engineering", 1, ""),
 "d_eng_ind": ("Engineering & Built Environment", "Diploma in Industrial Engineering", "DIP", 3, 25, "E50 M60 PS50", "engineering", 1, ""),
 "d_build": ("Engineering & Built Environment", "Diploma in Building / Construction Management", "DIP", 3, 24, "E50 M/ML50", "built", 0, ""),
 "d_acc": ("Commerce & Management", "Diploma in Accounting / Financial Information Systems", "DIP", 3, 24, "E50 M50 ACC50", "accounting", 0, ""),
 "d_mgmt": ("Commerce & Management", "Diploma in Business / Operations Management", "DIP", 3, 22, "E50 M/ML40", "commerce", 0, ""),
 "d_hr": ("Commerce & Management", "Diploma in Human Resource Management", "DIP", 3, 22, "E50 M/ML40", "commerce", 0, ""),
 "d_mkt": ("Commerce & Management", "Diploma in Marketing / Retail Business Management", "DIP", 3, 22, "E50 M/ML40", "commerce", 0, ""),
 "d_pubadm": ("Commerce & Management", "Diploma in Public Management / Administration", "DIP", 3, 22, "E50", "admin", 0, "Leads to Public Service and municipal work."),
 "d_hosp": ("Hospitality & Tourism", "Diploma in Hospitality Management", "DIP", 3, 22, "E50", "hospitality", 0, ""),
 "d_tour": ("Hospitality & Tourism", "Diploma in Tourism Management", "DIP", 3, 22, "E50", "hospitality", 0, ""),
 "d_police": ("Humanities & Social Sciences", "Diploma in Policing / Safety Management", "DIP", 3, 22, "E50", "safety", 0, ""),
 "d_agri": ("Agriculture & Environment", "Diploma in Agriculture (Crop / Animal Production)", "DIP", 3, 22, "E50 M/ML40", "agriculture", 0, ""),
 "d_nurse": ("Health Sciences", "Diploma in Emergency Medical Care / Clinical Associate-type health diploma", "DIP", 3, 26, "E50 M/ML50 LS50", "health", 1, ""),
 "d_design": ("Arts & Design", "Diploma in Graphic Design / Multimedia", "DIP", 3, 22, "E50", "arts", 1, "Usually needs a portfolio."),
 "d_ecd": ("Education", "Diploma in Grade R Teaching (Early Childhood)", "DIP", 3, 22, "E50 M/ML40", "teaching", 0, ""),
 "hc_acc": ("Commerce & Management", "Higher Certificate in Accounting / Bookkeeping", "HC", 1, 18, "E40 M/ML40", "accounting", 0, "Bridging into the Diploma."),
 "hc_mgmt": ("Commerce & Management", "Higher Certificate in Business Management / Office Administration", "HC", 1, 16, "E40", "admin", 0, ""),
 "hc_eng": ("Engineering & Built Environment", "Higher Certificate in Engineering (Foundation / Extended)", "HC", 1, 20, "E40 M50 PS40", "engineering", 0, "Bridging route into engineering diplomas."),
 "hc_ecd": ("Education", "Higher Certificate in Early Childhood Development", "HC", 1, 16, "E40", "teaching", 0, ""),
}

# ---------------------------------------------------------------- institutions
# (id, offsets): template -> aps adjustment (None = offer at base), plus extras
# tiers shift typical APS: a (+2), b (0), c (-3)
SHIFT = {"a": 2, "b": 0, "c": -3}

UNIV = {
 # id: (tier, apsMethod/loPolicy, offerings, extras)
 "up":   ("a", "excluded", "mbchb bpharm physio ot dent diet nurse llb bedfp bedip bedsp beng_civ beng_mech beng_elec beng_chem beng_ind arch qs bsc_cs bsc_it bsc_gen bsc_act bsc_agri bcom_acc bcom_gen bcom_eco bcom_hr ba_gen ba_comm ba_pol ba_lang psych socwork medlab", {}),
 "uj":   ("b", "excluded", "nurse llb bedfp bedip bedsp bedstem beng_civ beng_mech beng_elec beng_chem beng_ind arch qs bsc_cs bsc_it bsc_gen bsc_act bcom_acc bcom_gen bcom_eco bcom_hr ba_gen ba_comm ba_pol ba_crim ba_art psych socwork d_it d_eng_civ d_eng_mech d_eng_elec d_build d_acc d_mgmt d_hr d_mkt d_hosp d_tour d_police d_design hc_acc hc_mgmt", {}),
 "wits": ("a", "own_table", "mbchb dent physio ot nurse diet bpharm llb bedfp bedsp beng_civ beng_mech beng_elec beng_chem beng_ind arch bsc_cs bsc_gen bsc_act bcom_acc bcom_eco bcom_gen ba_gen ba_comm ba_pol ba_lang ba_art psych socwork medlab", {}),
 "uct":  ("a", "own_table", "mbchb physio ot diet llb beng_civ beng_mech beng_elec beng_chem arch bsc_cs bsc_gen bsc_act bcom_acc bcom_eco bcom_gen ba_gen ba_comm ba_pol ba_lang ba_art psych socwork medlab", {}),
 "su":   ("a", "check", "mbchb physio diet nurse llb bedfp bedip bedsp beng_civ beng_mech beng_elec beng_chem beng_ind bsc_cs bsc_gen bsc_act bsc_agri bsc_env bcom_acc bcom_gen bcom_eco ba_gen ba_comm ba_pol ba_lang ba_art psych socwork", {}),
 "ukzn": ("b", "check", "mbchb bpharm physio ot dent diet nurse llb bedfp bedip bedsp beng_civ beng_mech beng_elec beng_chem arch bsc_cs bsc_it bsc_gen bsc_agri bsc_env bcom_acc bcom_gen bcom_eco ba_gen ba_comm ba_pol ba_lang psych socwork medlab", {}),
 "nwu":  ("b", "check", "bpharm nurse physio llb bedfp bedip bedsp bedstem beng_civ beng_mech beng_elec beng_chem beng_ind bsc_cs bsc_it bsc_gen bsc_agri bcom_acc bcom_gen bcom_eco bcom_hr ba_gen ba_comm ba_pol ba_lang psych socwork ba_crim", {}),
 "ufs":  ("b", "own_table", "mbchb physio ot diet nurse llb bedfp bedip bedsp bedstem bsc_cs bsc_it bsc_gen bsc_agri bcom_acc bcom_gen bcom_eco ba_gen ba_comm ba_pol ba_lang ba_art psych socwork medlab", {}),
 "ru":   ("b", "check", "bpharm llb bedip bedsp bsc_cs bsc_gen bcom_acc bcom_gen bcom_eco ba_gen ba_comm ba_pol ba_lang ba_art psych", {}),
 "ufh":  ("c", "check", "nurse llb bedfp bedip bedsp bsc_cs bsc_gen bsc_agri bcom_acc bcom_gen ba_gen ba_pol ba_lang psych socwork", {}),
 "ul":   ("c", "check", "mbchb bpharm nurse llb bedfp bedip bedsp bsc_cs bsc_gen bsc_agri bsc_env bcom_acc bcom_gen ba_gen ba_comm ba_pol psych socwork medlab", {}),
 "univen": ("c", "check", "nurse llb bedfp bedip bedsp bsc_cs bsc_gen bsc_agri bsc_env bcom_acc bcom_gen ba_gen ba_pol psych socwork", {}),
 "uwc":  ("b", "check", "bpharm nurse diet llb bedfp bedip bedsp bsc_cs bsc_gen bcom_acc bcom_gen bcom_eco ba_gen ba_comm ba_pol ba_lang psych socwork", {}),
 "unisa": ("c", "none", "llb bedfp bedip bedsp bcom_acc bcom_gen bcom_hr ba_gen ba_comm ba_pol ba_lang ba_crim psych socwork bsc_gen bsc_it d_pubadm d_police hc_mgmt hc_acc", {
     "extra": [
       ("Law", "Higher Certificate in Law", "HC", 1, 0, "E40", "law", 0, "Open-distance route into law-related study. Can lead on to further study with credits."),
       ("Education", "Higher Certificate in Adult Basic Education & Training / Early Childhood", "HC", 1, 0, "E40", "teaching", 0, ""),
     ]}),
 "nmu":  ("b", "check", "nurse physio llb bedfp bedip bedsp bedstem beng_civ beng_mech beng_elec beng_ind arch bsc_cs bsc_it bsc_gen bsc_agri bsc_env bcom_acc bcom_gen bcom_eco ba_gen ba_comm ba_pol ba_lang ba_art psych socwork d_hosp d_tour d_acc d_mgmt d_pubadm", {}),
 "wsu":  ("c", "check", "mbchb nurse llb bedfp bedip bedsp bsc_cs bsc_it bsc_agri bcom_acc bcom_gen ba_gen psych socwork d_it d_acc d_mgmt d_pubadm d_agri d_tour hc_acc hc_mgmt hc_ecd", {}),
 "unizulu": ("c", "check", "nurse llb bedfp bedip bedsp bsc_cs bsc_gen bsc_agri bcom_acc bcom_gen ba_gen ba_comm ba_pol psych socwork", {}),
 "ump":  ("c", "half", "bedfp bedip bedsp bsc_it bsc_agri bsc_env bcom_gen bcom_acc ba_gen", {
     "extra": [("Science & Technology", "Diploma in ICT (Application Development)", "DIP", 3, 26, "E50 M/ML45", "it", 1, "")]}),
 "spu":  ("c", "check", "bedfp bedip bedsp bsc_cs bsc_gen bcom_acc bcom_gen ba_gen", {}),
 "smu":  ("c", "check", "mbchb dent bpharm nurse physio ot diet medlab", {}),
 "tut":  ("u", "check", "d_it hc_it d_eng_civ d_eng_mech d_eng_elec d_eng_ind d_build d_acc d_mgmt d_hr d_mkt d_pubadm d_hosp d_tour d_police d_agri d_nurse d_design d_ecd hc_acc hc_mgmt hc_eng hc_ecd nurse bedfp bedip bedsp bcom_acc ba_crim", {}),
 "cput": ("u", "check", "d_it d_eng_civ d_eng_mech d_eng_elec d_eng_ind d_build d_acc d_mgmt d_hr d_mkt d_pubadm d_hosp d_tour d_agri d_design d_ecd hc_acc hc_mgmt hc_eng nurse bedfp bedip bedsp", {}),
 "dut":  ("u", "check", "d_it d_eng_civ d_eng_mech d_eng_elec d_eng_ind d_build d_acc d_mgmt d_hr d_mkt d_pubadm d_hosp d_tour d_agri d_design d_ecd d_nurse hc_acc hc_mgmt hc_eng nurse", {}),
 "vut":  ("u", "check", "d_it d_eng_civ d_eng_mech d_eng_elec d_eng_ind d_acc d_mgmt d_hr d_mkt d_pubadm d_hosp d_tour d_police hc_acc hc_mgmt hc_eng", {}),
 "cut":  ("u", "check", "d_it d_eng_civ d_eng_mech d_eng_elec d_build d_acc d_mgmt d_hr d_mkt d_pubadm d_hosp d_tour d_agri d_design d_ecd hc_acc hc_mgmt hc_eng bedfp bedip bedsp", {}),
 "mut":  ("u", "check", "d_it d_eng_civ d_eng_mech d_eng_elec d_build d_acc d_mgmt d_hr d_mkt d_pubadm d_hosp d_tour d_agri d_nurse hc_acc hc_mgmt hc_eng", {}),
}
UOT_SHIFT = 0

# ---------------------------------------------------------------- TVET national programme catalogue (not per campus!)
# Offerings differ by college and campus, so these are listed once as national programme families. A college
# only appears with programmes after its own list is loaded from data/prospectus/<id>.json.
TVET = [
 # (faculty, name, qual label, NQF, years, entryBasis, minPass, reqs, field, note)
 ("Engineering & Related Design", "NC(V) Engineering & Related Design (L2-L4)", "NC(V)", "2-4", 3, "grade9", None, "", "engineering", "Entry from Grade 9 pass. College selection applies. NSFAS bursary-eligible."),
 ("Electrical Infrastructure Construction", "NC(V) Electrical Infrastructure Construction (L2-L4)", "NC(V)", "2-4", 3, "grade9", None, "", "engineering", "Entry from Grade 9. Pathway to electrician trade tests."),
 ("Civil Construction", "NC(V) Civil Construction (L2-L4)", "NC(V)", "2-4", 3, "grade9", None, "", "built", "Entry from Grade 9."),
 ("Information Technology", "NC(V) Information Technology & Computer Science (L2-L4)", "NC(V)", "2-4", 3, "grade9", None, "", "it", "Entry from Grade 9."),
 ("Finance & Business", "NC(V) Finance, Economics & Accounting (L2-L4)", "NC(V)", "2-4", 3, "grade9", None, "", "accounting", "Entry from Grade 9."),
 ("Finance & Business", "NC(V) Office Administration (L2-L4)", "NC(V)", "2-4", 3, "grade9", None, "", "admin", "Entry from Grade 9."),
 ("Finance & Business", "NC(V) Management / Marketing (L2-L4)", "NC(V)", "2-4", 3, "grade9", None, "", "commerce", "Entry from Grade 9."),
 ("Hospitality & Tourism", "NC(V) Hospitality / Tourism (L2-L4)", "NC(V)", "2-4", 3, "grade9", None, "", "hospitality", "Entry from Grade 9."),
 ("Agriculture", "NC(V) Primary Agriculture (L2-L4)", "NC(V)", "2-4", 3, "grade9", None, "", "agriculture", "Entry from Grade 9."),
 ("Safety & Society", "NC(V) Safety in Society (L2-L4)", "NC(V)", "2-4", 3, "grade9", None, "", "safety", "Entry from Grade 9."),
 ("Engineering Studies (N1-N6)", "NATED N1-N3 Engineering Studies (Electrical / Mechanical / Civil)", "NATED", "N1-N3", 1.5, "grade9", None, "", "engineering", "Report 191. Entry usually Grade 9 or 10; N3 is Grade 12 equivalent."),
 ("Engineering Studies (N1-N6)", "NATED N4-N6 Engineering Studies + 18 months work experience (National Diploma)", "NATED", "N4-N6", 1.5, "nsc", "Diploma Pass", "M50 PS50", "engineering", "Needs N3 or NSC with Maths and Science. Practical work experience completes the diploma."),
 ("Business Studies (N4-N6)", "NATED N4-N6 Business Management / Financial Management", "NATED", "N4-N6", 1.5, "nsc", "Higher Certificate Pass", "", "commerce", "Grade 12 (NSC) needed. Work experience completes the National Diploma."),
 ("Business Studies (N4-N6)", "NATED N4-N6 Public Management / Human Resource Management", "NATED", "N4-N6", 1.5, "nsc", "Higher Certificate Pass", "", "admin", "Grade 12 (NSC) needed. Common route into Public Service posts."),
 ("Business Studies (N4-N6)", "NATED N4-N6 Marketing / Tourism / Hospitality & Catering", "NATED", "N4-N6", 1.5, "nsc", "Higher Certificate Pass", "", "hospitality", "Grade 12 (NSC) needed."),
 ("Education & Social", "Higher Certificate / NATED Early Childhood Development (Educare)", "NATED", "N4-N6", 1.5, "nsc", "Higher Certificate Pass", "", "teaching", "Entry rules differ by college."),
]
TVET_ENTRY = {
    "grade9": "Open from Grade 9 (the college selects). No NSC marks needed.",
    "nsc": "Needs a Grade 12 (NSC) pass at the level shown.",
}

def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")

def make_prog(inst_id, inst, tpl, delta, extra_note=""):
    fac, name, q, yrs, base, rq, field, sel, note = tpl
    label, nqf, minpass = QUAL[q]
    aps = 0 if base == 0 else max(14, base + delta)
    return {
        "id": f"{inst_id}__{slug(name)}", "institutionId": inst_id, "faculty": fac, "name": name,
        "qualType": label, "nqf": nqf, "years": yrs, "minPassLevel": minpass, "minAps": aps,
        "subjects": reqs(rq) if rq else [], "req": rq, "requiresSelection": bool(sel), "field": field,
        "entryBasis": "nsc", "note": (note + " " + extra_note).strip(),
        "status": "indicative", "sourceDoc": "Indicative typical range (not a prospectus copy)", "sourcePage": "",
    }

def build():
    insts = {i["id"]: i for i in json.load(open(ROOT / "data/institutions.json", encoding="utf-8"))["institutions"]}
    out_inst, n = [], 0
    for iid, (tier, lo, offers, ex) in UNIV.items():
        if iid not in insts:
            print("WARN unknown institution", iid); continue
        base = insts[iid]
        delta = UOT_SHIFT if tier == "u" else SHIFT[tier]
        progs = []
        for key in offers.split():
            tpl = T.get(key) or U.get(key)
            if not tpl: raise SystemExit("unknown template " + key)
            d = delta
            if tier == "u" and key in T:      # a UoT's BEd/Nursing/BCom rows are not offered at the same level: skip degrees UoTs rarely run
                d = -2
            progs.append(make_prog(iid, base, tpl, d if tpl[4] else 0))
        for tpl in ex.get("extra", []):
            progs.append(make_prog(iid, base, tpl, 0))
        if iid == "unisa":   # UNISA admits on NSC pass type and subject needs, not on an APS score
            for p_ in progs:
                p_["minAps"] = 0
                p_["note"] = (p_["note"] + " UNISA does not use an APS score; admission depends on your NSC pass type and subject needs.").strip()
        # de-duplicate by name
        seen, uniq = set(), []
        for p in progs:
            if p["name"] in seen: continue
            seen.add(p["name"]); uniq.append(p)
        n += len(uniq)
        out_inst.append({"id": iid, "name": base["name"], "short": base.get("short", ""), "type": base["type"], "province": base["province"],
                         "url": base["officialUrl"], "loPolicy": lo, "apsMethod": base.get("apsMethod"), "programmes": uniq})
    # TVET national catalogue
    tv = []
    for fac, name, qual, nqf, yrs, entry, minpass, rq, field, note in TVET:
        tv.append({"id": "tvet__" + slug(name), "institutionId": "tvet_national", "faculty": fac, "name": name, "qualType": qual, "nqf": nqf,
                   "years": yrs, "minPassLevel": minpass, "minAps": 0, "subjects": reqs(rq) if rq else [], "req": rq, "requiresSelection": True,
                   "field": field, "entryBasis": entry, "entryNote": TVET_ENTRY[entry], "note": note, "status": "indicative",
                   "sourceDoc": "National NC(V) / NATED programme families (offerings differ per campus)", "sourcePage": ""})
    out_inst.append({"id": "tvet_national", "name": "Public TVET Colleges (national programme list)", "short": "TVET", "type": "TVET", "province": "All provinces",
                     "url": "https://www.dhet.gov.za/", "loPolicy": "none", "apsMethod": None, "programmes": tv,
                     "colleges": [{"id": i["id"], "name": i["name"], "province": i["province"]} for i in insts.values() if i["type"] == "TVET"]})
    n += len(tv)

    # real prospectus rows override seed rows
    over = 0
    for f in sorted(glob.glob(str(ROOT / "data/prospectus/*.json"))):
        try: d = json.load(open(f, encoding="utf-8"))
        except Exception as e: print("SKIP bad prospectus file", f, e); continue
        iid = d.get("institutionId")
        target = next((x for x in out_inst if x["id"] == iid), None)
        if not target:
            base = insts.get(iid)
            if not base: print("SKIP unknown institution in", f); continue
            target = {"id": iid, "name": base["name"], "short": base.get("short", ""), "type": base["type"], "province": base["province"], "url": base["officialUrl"],
                      "loPolicy": d.get("loPolicy", "check"), "apsMethod": base.get("apsMethod"), "programmes": []}
            out_inst.append(target)
        if d.get("loPolicy"): target["loPolicy"] = d["loPolicy"]
        have = {p["name"].lower(): i for i, p in enumerate(target["programmes"])}
        for p in d.get("programmes", []):
            p = dict(p); p["institutionId"] = iid; p.setdefault("id", f"{iid}__{slug(p['name'])}")
            p.setdefault("entryBasis", "nsc"); p.setdefault("subjects", []); p.setdefault("minAps", 0)
            k = p["name"].lower()
            if k in have: target["programmes"][have[k]] = p
            else: target["programmes"].append(p)
            over += 1
    stamp = hashlib.sha256(json.dumps(out_inst, sort_keys=True).encode()).hexdigest()[:12]
    cat = {"schemaVersion": 1, "build": stamp, "note": "Rows with status 'indicative' are typical ranges, never a promise of admission. Confirm in the official prospectus.",
           "institutions": out_inst}
    return cat, n, over

def main(argv):
    cat, n, over = build()
    bad = []
    for inst in cat["institutions"]:
        for p in inst["programmes"]:
            if p["minAps"] < 0 or p["minAps"] > 60: bad.append(p["id"])
            for r in p["subjects"]:
                if not (0 < r["minMark"] <= 100): bad.append(p["id"])
    if bad: print("INVALID", bad); return 1
    print(f"{len(cat['institutions'])} institutions, {n} seed programmes, {over} prospectus rows applied")
    if "--check" in argv: return 0
    (ROOT / "data/catalogue.json").write_text(json.dumps(cat, indent=1, ensure_ascii=False), encoding="utf-8")
    import copy
    slim = copy.deepcopy(cat)
    for inst in slim["institutions"]:
        for p_ in inst["programmes"]:
            if "req" in p_: p_.pop("subjects", None)   # runtime expands the compact code string
            p_.pop("sourceDoc", None) if p_.get("status") == "indicative" else None
            p_.pop("institutionId", None); p_.pop("id", None) if False else None
    slim["subjectCodes"] = SUBJ
    js = "/* Generated by scripts/build_catalogue.py - do not edit by hand. */\nwindow.MZ_CATALOGUE = " + json.dumps(slim, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (ROOT / "js/catalogue_data.js").write_text(js, encoding="utf-8")
    print("wrote data/catalogue.json and js/catalogue_data.js")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
