
    const STORAGE_KEY = 'mzansi_pathways_v2_state';
    const PREV_KEY = STORAGE_KEY + '_prev', CORRUPT_KEY = STORAGE_KEY + '_corrupt', UNDO_KEY = STORAGE_KEY + '_before_restore';
    let saveFailed = false, lastPrevAt = 0;

    const CAREERS = [
      {
        id: 'network_eng', family: 'tech', title: 'Network Engineer / IT Technician',
        summary: 'Designs, configures, secures, and troubleshoots office networks, switches, routers, Wi-Fi, and cloud connectivity.',
        skills: ['TCP/IP Networking', 'Routing & Switching (VLANs)', 'Windows / Linux Troubleshooting', 'Active Directory / Microsoft 365', 'Security & Documentation'],
        entryRoles: ['IT Support Technician', 'Help Desk Technician', 'Junior Network Technician', 'Infrastructure Support'],
        ladder: ['School / NSC', 'Higher Cert / TVET / Diploma / Degree', 'Learnership / Junior IT Support', 'Network Technician', 'Network Engineer', 'Senior / Network Architect'],
        reality: 'Employers expect practical hands-on lab or troubleshooting proof beyond a certificate — build a Packet Tracer or Windows home lab in the Evidence Vault.'
      },
      {
        id: 'software_dev', family: 'tech', title: 'Software / App Developer',
        summary: 'Builds and maintains web applications, mobile apps, databases, and business software systems.',
        skills: ['Python / JavaScript / C#', 'SQL Databases', 'Git Version Control', 'Problem Solving & Debugging', 'Testing & Clean Code'],
        entryRoles: ['Junior Developer', 'Software Testing Intern', 'Application Support Analyst', 'Web Developer'],
        ladder: ['School / NSC', 'TVET / Higher Cert / Diploma / BSc', 'Coding Learnership / Internship', 'Junior Developer', 'Mid-Level Engineer', 'Senior / Tech Lead'],
        reality: 'University is not the only entry route — strong Diploma, QCTO Occupational, and portfolio-backed learnership graduates enter software teams across SA.'
      },
      {
        id: 'diesel_artisan', family: 'artisan', title: 'Diesel Mechanic / Red Seal Artisan',
        summary: 'Inspects, diagnoses, repairs, and maintains heavy mining machinery, trucks, yellow metal, and hydraulic systems.',
        skills: ['Diesel Engine Diagnostics', 'Hydraulics & Pneumatics', 'OHS & Mine Safety (Lockout)', 'Job Cards & Preventative Maintenance', 'Trade Test Preparation'],
        entryRoles: ['Apprentice Mechanic', 'Workshop Assistant', 'Trade Test Candidate', 'Qualified Diesel Artisan'],
        ladder: ['Grade 12 / N2 Engineering', 'TVET N2–N6 + Practical', 'Employer / merSETA Apprenticeship', 'NAMB Red Seal Trade Test', 'Qualified Artisan', 'Foreman / Maintenance Planner'],
        reality: 'High demand in Mpumalanga mining & logistics — requires N2 trade subjects plus practical workplace hours to qualify for the Red Seal Trade Test.'
      },
      {
        id: 'public_admin', family: 'admin', title: 'Public Service / Office Administrator',
        summary: 'Manages records, client enquiries, budgets, procurement support, and compliance in government departments or private companies.',
        skills: ['Microsoft Excel & Word', 'Record Keeping & POPIA', 'Formal Minutes & Reports', 'Z83 & Public Service Procedures', 'Client Communication'],
        entryRoles: ['Administration Clerk (Level 5)', 'Data Capturer', 'Reception / Registry Clerk', 'HR / Finance Admin Intern'],
        ladder: ['Grade 12 / TVET / Diploma', 'Public Service Internship / Level 5 Clerk', 'Senior Admin Officer', 'Assistant Director'],
        reality: 'Government posts require exact Z83 completion and reference numbers from Friday DPSA circulars; never pay anyone claiming to sell a government job.'
      }
    ];

    const SAMPLE_PROGRAMMES = [
      {
        id: 'up_bsc_cs', careerFamily: 'tech', institution: 'University of Pretoria (UP)', campus: 'Hatfield, Pretoria (Gauteng)', province: 'Gauteng', distanceKmFromMp: 135,
        route: 'University', isUniversity: true, name: 'BSc Computer Science', nqf: 'NQF 7', duration: '3 Years Full-Time',
        estAnnualCost: 'Est. R55k–R70k tuition + R45k+ accomm. (Verify 2027 UP fees)', costLevel: 'High (Relocation)',
        funding: ['NSFAS (Subject to Criteria)', 'Corporate Tech Bursaries'], deadline: '2026-06-30',
        verifiedRules: false, verificationStatus: 'pending_review', apsMethod: 'nsc_best6_noLO', sourceTier: 'Verify 2027 UP Prospectus (Maths L6 = 70%)', legitStatus: 'Public University (DHET)',
        minPassLevel: "Bachelor's Pass", minAps: 30, requiresSelection: true,
        subjectRequirements: [{ anyOf: ['English Home Language', 'English First Additional Language'], minMark: 60 }, { anyOf: ['Mathematics'], minMark: 70 }],
        officialUrl: 'https://www.up.ac.za/'
      },
      {
        id: 'ump_dip_ict', careerFamily: 'tech', institution: 'University of Mpumalanga (UMP)', campus: 'Mbombela, Mpumalanga', province: 'Mpumalanga', distanceKmFromMp: 0,
        route: 'University', isUniversity: true, name: 'Diploma in ICT (Application Development)', nqf: 'NQF 6', duration: '3 Years Full-Time',
        estAnnualCost: 'Est. R35k–R48k tuition (Verify 2027 UMP fees)', costLevel: 'Moderate (In-Province)',
        funding: ['NSFAS (Subject to Criteria)', 'MICT SETA'], deadline: '2026-11-30',
        verifiedRules: false, verificationStatus: 'conflict', apsMethod: 'ump_lo_half', sourceTier: 'Conflict (APS 24 vs 26 — Verify on ump.ac.za)', legitStatus: 'Public University (DHET)',
        minPassLevel: 'Diploma Pass', minAps: 24, requiresSelection: true,
        subjectRequirements: [{ anyOf: ['English Home Language', 'English First Additional Language'], minMark: 50 }, { anyOf: ['Mathematics'], minMark: 50 }],
        officialUrl: 'https://www.ump.ac.za/'
      },
      {
        id: 'tut_hc_it', careerFamily: 'tech', institution: 'Tshwane University of Technology (TUT)', campus: 'eMalahleni Campus, Mpumalanga', province: 'Mpumalanga', distanceKmFromMp: 0,
        route: 'Diploma / UoT (Extended)', isUniversity: false, name: 'Diploma in Computer Science (Extended) — eMalahleni', nqf: 'NQF 6', duration: '4 Years Full-Time',
        estAnnualCost: 'Verify 2027 TUT fee schedule (Near home)', costLevel: 'Lower (Near Home)',
        funding: ['NSFAS (Subject to Criteria)'], deadline: '2026-09-30',
        verifiedRules: false, verificationStatus: 'pending_review', apsMethod: 'nsc_best6_noLO', sourceTier: 'Verify 2027 TUT eMalahleni Prospectus', legitStatus: 'Public UoT (DHET)',
        minPassLevel: 'Diploma Pass', minAps: 23, requiresSelection: true,
        subjectRequirements: [{ anyOf: ['English Home Language', 'English First Additional Language'], minMark: 40 }, { anyOf: ['Mathematics', 'Mathematical Literacy'], minMark: 40 }],
        officialUrl: 'https://www.tut.ac.za/'
      },
      {
        id: 'nkangala_tvet_eng', careerFamily: 'artisan', institution: 'Nkangala TVET College', campus: 'Witbank / Middelburg, Mpumalanga', province: 'Mpumalanga', distanceKmFromMp: 0,
        route: 'Public TVET College', isUniversity: false, name: 'NC(V) / Report 191 Engineering & Diesel Studies', nqf: 'NQF 4–6', duration: '1–3 Years',
        estAnnualCost: 'Public TVET Fees (NSFAS Bursary Eligible)', costLevel: 'Low (Near Home)',
        funding: ['NSFAS TVET Bursary', 'merSETA'], deadline: 'Nov / Jan Trimester Intake',
        verifiedRules: true, sourceTier: 'Sample — Verify Campus Offering', legitStatus: 'Public TVET (DHET)',
        minPassLevel: 'Higher Certificate Pass', minAps: 16, requiresSelection: false,
        subjectRequirements: [{ anyOf: ['English Home Language', 'English First Additional Language'], minMark: 40 }],
        officialUrl: 'https://www.nkangalafet.edu.za/'
      },
      {
        id: 'qcto_occ_tech', careerFamily: 'tech', institution: 'QCTO-Accredited SDP (Verify Site)', campus: 'eMalahleni / Online Hybrid', province: 'Mpumalanga', distanceKmFromMp: 0,
        route: 'QCTO Occupational', isUniversity: false, name: 'Occupational Certificate: Software / IT Technician', nqf: 'NQF 5', duration: '12–18 Months',
        estAnnualCost: 'Varies by SDP (Check SETA / DHET Occupational NSFAS)', costLevel: 'Verify with SDP',
        funding: ['MICT SETA', 'NSFAS Occupational (Approved Only)'], deadline: 'Rolling Intakes (Verify SDP)',
        verifiedRules: false, sourceTier: 'Needs QCTO SDP Verification', legitStatus: 'Verify Provider on QCTO Register',
        minPassLevel: 'Higher Certificate Pass', minAps: 0, requiresSelection: false, subjectRequirements: [],
        officialUrl: 'https://www.qcto.org.za/'
      },
      {
        id: 'work_apprentice', careerFamily: 'artisan', institution: 'SA Youth / merSETA Workplace Route', campus: 'Mpumalanga Mines & Contractors', province: 'Mpumalanga', distanceKmFromMp: 0,
        route: 'Workplace Learning', isUniversity: false, name: 'Diesel / Electrical Apprenticeship (Earn Stipend)', nqf: 'NQF 4–5', duration: '12–36 Months',
        estAnnualCost: 'R0 Tuition (Monthly Stipend Paid)', costLevel: 'Earn While Learning',
        funding: ['Employer Stipend', 'merSETA'], deadline: 'Check SA Youth Live Intakes',
        verifiedRules: true, sourceTier: 'Sample — Check SA Youth', legitStatus: 'Employer / SETA Route',
        minPassLevel: 'Higher Certificate Pass', minAps: 15, requiresSelection: true,
        subjectRequirements: [{ anyOf: ['Mathematics', 'Mathematical Literacy'], minMark: 40 }],
        officialUrl: 'https://sayouth.mobi/'
      },
      {
        id: 'tvet_admin', careerFamily: 'admin', institution: 'Ehlanzeni / Nkangala TVET College', campus: 'Mpumalanga Campuses', province: 'Mpumalanga', distanceKmFromMp: 0,
        route: 'Public TVET College', isUniversity: false, name: 'National Diploma / N4–N6 Public Management & Office Admin', nqf: 'NQF 4–6', duration: '18 Months + 18 Months WIL',
        estAnnualCost: 'Public TVET Fees (NSFAS TVET Bursary)', costLevel: 'Low (Near Home)',
        funding: ['NSFAS TVET Bursary', 'PSETA'], deadline: 'Nov / Jan Intake',
        verifiedRules: true, sourceTier: 'Sample — Verify Campus Offering', legitStatus: 'Public TVET (DHET)',
        minPassLevel: 'Higher Certificate Pass', minAps: 16, requiresSelection: false,
        subjectRequirements: [{ anyOf: ['English Home Language', 'English First Additional Language'], minMark: 40 }],
        officialUrl: 'https://www.dhet.gov.za/'
      }
    ];

    const STARTER_PROJECTS = [
      { title: 'Windows Troubleshooting & Backup Lab', tools: 'Windows 11, Event Viewer, File History', prompt: 'Document 3 real PC problems you diagnosed (slow boot, printer spooler, Wi-Fi DNS) and how you verified the fix.' },
      { title: 'Small Office Network Simulation (Packet Tracer)', tools: 'Cisco Packet Tracer, VLANs, DHCP, Ping', prompt: 'Design a 2-department office network (Admin + Guest Wi-Fi), test connectivity, and record what failed first and how you solved it.' },
      { title: 'Monthly Household / Tuckshop Excel Tracker', tools: 'Microsoft Excel, SUM/IF Formulas, Charts', prompt: 'Build a real budget or stock sheet with formulas and record how it reduced manual counting mistakes.' }
    ];

    const SAMPLE_WORK = [
      { id: 'wk_1', title: 'Junior IT Support Technician [Sample]', employer: 'Highveld Systems (Pty) Ltd', province: 'Mpumalanga', town: 'Middelburg', salary: 'R14,500 – R18,000 pm', closing: '2026-12-12', url: 'https://www.gov.za/about-government/government-jobs', reqSkills: ['Windows', 'Microsoft 365', 'Networking', 'Active Directory'], trust: { id: 'Unverified (Demo)', source: 'Sample Fixture', scam: 'Passed (No Fee)' } },
      { id: 'wk_2', title: 'Admin Clerk — Level 5 [DPSA Sample]', employer: 'Provincial Department (DPSA Circular)', province: 'Mpumalanga', town: 'Mbombela', salary: 'R216,417 pa', closing: '2026-12-04', url: 'https://www.labour.gov.za/vacancies', reqSkills: ['Excel', 'Filing', 'Z83', 'Client Support'], trust: { id: 'Official Dept. Ref Required', source: 'Sample Fixture', scam: 'Passed (No Fee)' } }
    ];

    let state = {
      tab: 'results',
      lang: 'en',
      province: 'Mpumalanga',
      prospectusText: 'BSc Computer Science requires minimum APS 30, Mathematics 60% and English 60%. Applications close 30 September 2027.',
      parentMode: false,
      easyMode: false,
      darkMode: false,
      highContrast: false,
      largeText: false,
      whatIfSubject: 'Mathematics',
      routeSort: 'eligibility',
      gradeStage: 'Grade 12 / Matric',
      subjects: [
        { name: 'English Home Language', mark: 64, isHomeLanguage: true, isLifeOrientation: false },
        { name: 'isiZulu First Additional Language', mark: 70, isHomeLanguage: false, isLifeOrientation: false },
        { name: 'Mathematics', mark: 48, isHomeLanguage: false, isLifeOrientation: false },
        { name: 'Physical Sciences', mark: 51, isHomeLanguage: false, isLifeOrientation: false },
        { name: 'Information Technology', mark: 68, isHomeLanguage: false, isLifeOrientation: false },
        { name: 'Geography', mark: 59, isHomeLanguage: false, isLifeOrientation: false },
        { name: 'Life Orientation', mark: 80, isHomeLanguage: false, isLifeOrientation: true }
      ],
      whatIfActive: false,
      whatIfMaths: 60,
      whatIfSubject: 'Mathematics',
      grade9Goal: 'eng',
      scannerOpen: false,
      scanRawText: '',
      scanParsed: [],
      moodState: 'ready',
      scanZoom: false,
      tutorialSeen: false,
      tutorialStep: 0,
      selectedCareerId: 'network_eng',
      careerSector: 'all',
      noUniOnly: false,
      nearHomeOnly: false,
      routeFilter: 'All',
      routeSearch: '',
      instQ: '', instProv: '', instType: '', instOpen: false,
      compareRouteIds: ['up_bsc_cs', 'ump_dip_ict', 'tut_hc_it'],
      starDraft: '',
      docChecklist: {
        'Matric / Grade 11 Statement': true,
        'Certified SA ID (when required)': false,
        'Proof of Residence': false,
        'Parent / Guardian Income Proof (NSFAS)': false,
        'Editable Z83 Form (Gov Posts)': false,
        'Single-Column Evidence CV': false
      },
      plans: { A: 'up_bsc_cs', B: 'ump_dip_ict', C: 'tut_hc_it' },
      planStatus: { A: 'Not Started', B: 'Not Started', C: 'Not Started' },
      incomeBand: 250000,
      affordA: { tuition: 58000, accomm: 45000, transport: 6000, funding: 0 },
      affordC: { tuition: 12000, accomm: 0, transport: 7200, funding: 12000 },
      evidenceVault: [
        { id: 'ev1', skill: 'Windows Troubleshooting', context: 'School / Home PCs', tools: 'Windows 11, Control Panel', story: 'Reinstalled Windows and fixed printer drivers for family and classmates without losing their files.' }
      ],
      cvName: '',
      cvPhone: '',
      cvEmail: '',
      cvTargetRole: 'Junior IT Support Technician',
      cvImportOpen: false,
      cvRawText: '',
      cvParsed: null,
      savedCvs: [],
      cvZoom: false,
      cvQualifications: [],
      cvUpdatedAt: new Date().toISOString().slice(0, 10),
      govWatchlist: [
        { name: 'Friday DPSA Circulars (gov.za)', url: 'https://www.gov.za/about-government/government-jobs', cadence: 'Every Friday', lastChecked: 'Not checked yet' },
        { name: 'Dept. of Employment & Labour', url: 'https://www.labour.gov.za/vacancies', cadence: 'Weekly', lastChecked: 'Not checked yet' },
        { name: 'SA Youth (Data-Free)', url: 'https://sayouth.mobi/', cadence: 'Weekly', lastChecked: 'Not checked yet' }
      ],
      flyerRawText: '',
      flyerParsed: null,
      localTown: 'eMalahleni',
      savedOpenJobs: [],
      jobSearchQuery: '',
      autoMatchJobsOnly: false,
      savedJobsOnly: false,
      jobProvinceFilter: 'ALL',
      jobSortBy: 'match',
      closingSoonOnly: false,
      scanDocType: 'final_nsc',
      scanConfirmed: false,
      studyF: {}, studyCmp: [], studyPlanPicks: [], marksVerified: false, marksSig: '', workKind: 'all', workQual: 'all', qualLevel: '', qualField: ''
    };
    let scamResult = null;
    const subjectHistory = [];
    function pushSubjectUndo() {
      try {
        subjectHistory.push(state.subjects.map(s => ({ ...s })));
        if (subjectHistory.length > 10) subjectHistory.shift();
      } catch (e) {}
    }
    function undoLastSubjects() {
      if (!subjectHistory.length) { showToast('Nothing to undo yet'); return; }
      state.subjects = subjectHistory.pop();
      saveState(); render();
      showToast('Restored your previous subject list!');
    }

    let interviewIdx = 0;

    try {
      // Failsafe load: a damaged saved profile is quarantined (never silently overwritten) and the last good copy is used instead.
      const raw = localStorage.getItem(STORAGE_KEY);
      let saved = null;
      if (raw) {
        try { saved = JSON.parse(raw); } catch (e) { saved = null; }
        if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
          saved = null;
          try { localStorage.setItem(CORRUPT_KEY, raw); } catch (e) {}
          try { const prev = JSON.parse(localStorage.getItem(PREV_KEY) || 'null'); if (prev && typeof prev === 'object' && !Array.isArray(prev)) { saved = prev; window._mzRecovered = true; } } catch (e) {}
        }
      }
      if (saved && typeof saved === 'object') state = { ...state, ...saved, plans: { ...state.plans, ...(saved.plans || {}) } };
    } catch (e) {}

    const DEFAULT_SUBJECTS = [
      { name: 'English Home Language', mark: 64, isHomeLanguage: true, isLifeOrientation: false },
      { name: 'isiZulu First Additional Language', mark: 70, isHomeLanguage: false, isLifeOrientation: false },
      { name: 'Mathematics', mark: 48, isHomeLanguage: false, isLifeOrientation: false },
      { name: 'Physical Sciences', mark: 51, isHomeLanguage: false, isLifeOrientation: false },
      { name: 'Information Technology', mark: 68, isHomeLanguage: false, isLifeOrientation: false },
      { name: 'Geography', mark: 59, isHomeLanguage: false, isLifeOrientation: false },
      { name: 'Life Orientation', mark: 80, isHomeLanguage: false, isLifeOrientation: true }
    ];

    const SA_SUBJECT_ALIASES = [
      ['English Home Language', ['english home language', 'english hl', 'eng hl', 'eng home']],
      ['English First Additional Language', ['english first additional', 'english fal', 'eng fal']],
      ['isiZulu Home Language', ['isizulu home language', 'isizulu hl', 'zulu hl']],
      ['isiZulu First Additional Language', ['isizulu first additional', 'isizulu fal', 'zulu fal']],
      ['Afrikaans Home Language', ['afrikaans home language', 'afrikaans hl', 'afr hl']],
      ['Afrikaans First Additional Language', ['afrikaans first additional', 'afrikaans fal', 'afr fal']],
      ['Sepedi Home Language', ['sepedi home language', 'sepedi hl']],
      ['Sesotho Home Language', ['sesotho home language', 'sesotho hl']],
      ['Setswana Home Language', ['setswana home language', 'setswana hl']],
      ['isiXhosa Home Language', ['isixhosa home language', 'isixhosa hl']],
      ['Mathematical Literacy', ['mathematical literacy', 'maths lit', 'math lit', 'mlit']],
      ['Mathematics', ['mathematics', 'pure maths', 'maths']],
      ['Physical Sciences', ['physical sciences', 'physical science', 'physics']],
      ['Life Sciences', ['life sciences', 'life science', 'biology']],
      ['Life Orientation', ['life orientation', 'life orient', 'lo']],
      ['Accounting', ['accounting', 'acc']],
      ['Business Studies', ['business studies', 'business']],
      ['Economics', ['economics', 'econ']],
      ['Geography', ['geography', 'geog']],
      ['History', ['history', 'hist']],
      ['Computer Applications Technology', ['computer applications technology', 'cat']],
      ['Information Technology', ['information technology', 'it']],
      ['Engineering Graphics and Design', ['engineering graphics and design', 'egd']],
      ['Tourism', ['tourism']],
      ['Agricultural Sciences', ['agricultural sciences', 'agric']],
      ['Consumer Studies', ['consumer studies']]
    ];

    function legacyParseStatementText(rawText) {
      if (typeof rawText !== 'string' || !rawText.trim()) return [];
      const lines = rawText.split(/\r?\n/).map(l =>l.trim()).filter(Boolean).slice(0, 80);
      const found = {};
      for (const line of lines) {
        const low = line.toLowerCase().replace(/\s+/g, ' ');
        let matched = null;
        for (const [canonical, aliases] of SA_SUBJECT_ALIASES) {
          for (const al of aliases) {
            const re = new RegExp('\\b' + al.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
            if (re.test(low)) { matched = canonical; break; }
          }
          if (matched) break;
        }
        if (!matched) continue;
        const pcts = [...line.matchAll(/\b(100|[1-9]?\d)\s*%/g)].map(m =>Number(m[1]));
        const nums = [...line.matchAll(/\b(100|[1-9]?\d)\b/g)].map(m =>Number(m[1])).filter(n =>n >= 10 && n <= 100);
        let mark = null;
        let confidence = 'high';
        if (pcts.length >= 1) {
          mark = pcts[0];
          if (pcts.length >1) confidence = 'review';
        } else if (nums.length >= 1) {
          mark = nums[nums.length - 1];
          if (nums.length >1) confidence = 'review';
        } else {
          const symMap = { A: 85, B: 75, C: 65, D: 55, E: 45, F: 35 };
          const lvlMid = { 1: 20, 2: 35, 3: 45, 4: 55, 5: 65, 6: 75, 7: 85 };
          const lvlM = low.match(/\b(?:level|lvl)\s*([1-7])\b/);
          const symM = line.match(/\b([A-F])\b/);
          if (lvlM) { mark = lvlMid[Number(lvlM[1])]; confidence = 'review'; }
          else if (symM) { mark = symMap[symM[1]]; confidence = 'review'; }
          else { confidence = 'review'; }
        }
        mark = Math.max(0, Math.min(100, Math.round(Number.isFinite(mark) ? mark : 50)));
        const isHL = matched.toLowerCase().includes('home language') || /\bhl\b/i.test(low);
        const isLO = matched === 'Life Orientation';
        found[matched] = { name: matched, mark, isHomeLanguage: isHL, isLifeOrientation: isLO, confidence, include: true };
      }
      return Object.values(found);
    }

    function parseStatementText(rawText) {
      const safeText = String(rawText || "").replace(/\b\d{13}\b/g, "[redacted-id]");
      return (typeof window.__ENGINE_PARSE === "function") ? window.__ENGINE_PARSE(safeText) : legacyParseStatementText(safeText);
    }

    function getDeadlineBadge(deadlineStr) {
      const s = String(deadlineStr || '').toLowerCase();
      if (s.includes('rolling') || s.includes('open') || s.includes('jan') || s.includes('nov')) {
        return { label: ' Open / Rolling', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      }
      if (s.includes('sep') || s.includes('oct')) {
        return { label: ' Closing Window', cls: 'bg-amber-50 text-amber-900 border-amber-200' };
      }
      return { label: ' Verify Intake', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    }

    function validateImportedProgrammes(payload) {
      const list = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.programmes) ? payload.programmes : null);
      if (!list || !list.length) return { ok: false, error: 'JSON must contain a non-empty programmes array.' };
      const valid = [];
      for (const item of list) {
        if (!item || typeof item !== 'object') continue;
        const aps = Number(item.minAps);
        const urlOk = typeof item.officialUrl === 'string' && item.officialUrl.startsWith('https://');
        if (item.id && item.name && item.institution && Number.isFinite(aps) && aps >= 0 && aps <= 60 && item.sourceTier && urlOk) {
          valid.push(item);
        }
      }
      if (!valid.length) return { ok: false, error: 'No valid programmes passed schema & HTTPS source-tier checks.' };
      return { ok: true, items: valid };
    }

    function getPlanSubmissionProgress() {
      const st = state.planStatus || {};
      const done = ['A', 'B', 'C'].filter(k => st[k] === 'Submitted' || st[k] === 'Accepted').length;
      const ready = ['A', 'B', 'C'].filter(k => st[k] === 'Docs Ready').length;
      return { done, ready, summary: `${done}/3 Submitted/Accepted · ${ready} Docs Ready` };
    }

    function getNsfasPreCheck(incomeBand) {
      const inc = Number(incomeBand) || 0;
      if (inc <= 350000) {
        return {
          band: 'Within Standard NSFAS Income Threshold (<= R350,000/yr)',
          detail: 'Household income falls within the published NSFAS bursary threshold for public universities and TVET colleges (subject to official academic and SASSA/SARS verification).',
          cls: 'border-l-emerald-700'
        };
      }
      if (inc <= 600000) {
        return {
          band: 'Missing Middle Zone (R350,001 – R600,000/yr)',
          detail: 'Typically above the standard NSFAS bursary threshold; check the NSFAS Missing Middle Loan Scheme, SETA bursaries, Funza Lushaka, and institutional merit awards.',
          cls: 'border-l-amber-600'
        };
      }
      return {
        band: 'Above Standard NSFAS & Missing Middle Thresholds (> R600,000/yr)',
        detail: 'Focus on corporate/industry bursaries, SETA learnerships (paid workplace routes), merit scholarships, or lower-cost near-home TVET/UoT pathways.',
        cls: 'border-l-slate-700'
      };
    }

    function csvSafeCell(v) {
      const s = v == null ? '' : String(v);
      const safe = /^[=+\-@\t\r]/.test(s) ? ("'" + s) : s;
      return '"' + safe.replace(/"/g, '""') + '"';
    }

    function getCvFreshnessInfo(updatedIso) {
      const m = String(updatedIso || '').match(/^(\d{4}-\d{2}-\d{2})$/);
      if (!m) return { stale: true, days: 999, label: 'Not dated yet — review & mark current' };
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const d = new Date(m[1] + 'T00:00:00');
      const days = Math.max(0, Math.round((today.getTime() - d.getTime()) / 86400000));
      if (days >= 30) return { stale: true, days, label: `Last updated ${days} days ago — refresh with your latest details` };
      return { stale: false, days, label: days === 0 ? 'Updated today' : `Updated ${days} day${days === 1 ? '' : 's'} ago` };
    }
    function renderMultiUniApsComparison(subs) {
      const eng = window.MzansiEngine;
      const best6 = eng && eng.apsBestSixNoLO ? eng.apsBestSixNoLO(subs) : { aps: null, reason: 'Enter 6 non-LO subjects' };
      const ump = eng && eng.apsUMP ? eng.apsUMP(subs) : { aps: null, reason: 'Enter HL, FAL, Maths/Lit, LO + 3 electives' };
      return `
        <section id="aps-compare-universities" class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2.5 text-xs">
          <div>
            <h3 class="text-sm font-extrabold text-slate-900">Your APS Across South African Universities</h3>
            <p class="text-slate-600 mt-0.5">South African universities calculate APS differently—never rely on one single score across all institutions.</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div class="text-[11px] font-bold text-slate-600">UP / UJ / TUT (Best 6, Excl. LO)</div>
              <div class="text-lg font-extrabold text-slate-900 mt-0.5">${best6.aps !== null ? `${best6.aps} / 42` : 'Incomplete'}</div>
              <div class="text-[11px] text-slate-500">${best6.aps !== null ? 'Standard NSC levels 1–7' : escapeHtml(best6.reason || '')}</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div class="text-[11px] font-bold text-slate-600">UMP (7 Subjects, LO ÷ 2)</div>
              <div class="text-lg font-extrabold text-slate-900 mt-0.5">${ump.aps !== null ? `${ump.aps} / 45.5` : 'Incomplete'}</div>
              <div class="text-[11px] text-slate-500">${ump.aps !== null ? (ump.usedMathLit ? 'Includes Maths Lit (check higher UMP APS rule)' : 'Official UMP undergraduate PDF method') : escapeHtml(ump.reason || '')}</div>
            </div>
            <div class="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div class="text-[11px] font-bold text-amber-900">Wits / UCT / UFS (Custom Scales)</div>
              <div class="text-sm font-extrabold text-amber-900 mt-1">Use Official Calculator</div>
              <div class="text-[11px] text-amber-800">Weighted/faculty scales (e.g. Wits Maths/Eng bonus, UCT FPS, UFS LO 1pt at 60%+).</div>
            </div>
          </div>
        </section>`;
    }
    const NEXT_90_DAYS_EVENTS = [
      { id: 'ump_2027_closing', title: 'UMP 2027 Undergraduate Closing (Verify ump.ac.za)', date: '2026-11-30', url: 'https://www.ump.ac.za/' },
      { id: 'nsc_results_2027', title: '2026 NSC Matric Results Release (Verify DBE date)', date: '2027-01-12', url: 'https://www.education.gov.za/' },
      { id: 'nsc_remark_closing_2027', title: 'NSC Re-Mark / Re-Check Closing Date', date: '2027-01-25', url: 'https://www.education.gov.za/' },
      { id: 'nsc_may_june_2027_reg', title: 'May/June 2027 Second-Chance Rewrite Registration Closes', date: '2027-02-05', url: 'https://www.education.gov.za/' }
    ];
    function getDaysUntilIso(iso) {
      const m = String(iso || '').match(/^(\d{4}-\d{2}-\d{2})$/);
      if (!m) return null;
      const t = new Date(); t.setHours(0, 0, 0, 0);
      return Math.round((new Date(m[1] + 'T00:00:00').getTime() - t.getTime()) / 86400000);
    }
    function copyPlainTextCv() {
      const nEl = document.getElementById('cv-name'); if (nEl) state.cvName = nEl.value.trim();
      const pEl = document.getElementById('cv-phone'); if (pEl) state.cvPhone = pEl.value.trim();
      const eEl = document.getElementById('cv-email'); if (eEl) state.cvEmail = eEl.value.trim();
      const trEl = document.getElementById('cv-target-role'); if (trEl) state.cvTargetRole = trEl.value.trim();
      const lines = [
        (state.cvName || 'CANDIDATE NAME').toUpperCase(),
        state.cvTargetRole ? `Target Role: ${state.cvTargetRole}` : '',
        [state.province + ', South Africa', state.cvPhone, state.cvEmail].filter(Boolean).join(' | '),
        '',
        'DEMONSTRATED SKILLS & REAL EVIDENCE',
        ...(state.evidenceVault || []).filter(e => e.includeInCv !== false).map(e => `- ${e.skill} (${e.tools}): ${e.result}`),
        ...(state.cvQualifications && state.cvQualifications.length ? ['', 'QUALIFICATIONS & CERTIFICATES', ...state.cvQualifications.map(q => `- ${q}`)] : []),
        '',
        `CV Last Reviewed: ${state.cvUpdatedAt || new Date().toISOString().slice(0, 10)}`
      ].filter(x => x !== undefined).join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lines).then(() => showToast('Copied clean ATS plain-text CV to clipboard!'));
      } else {
        showToast('Clipboard unavailable — use Export Plain-Text ATS CV (.txt).');
      }
    }
    function copyScamChecklist() {
      const text = [
        'MZANSI PATHWAYS — SA JOB & COMPANY VERIFICATION CHECKLIST',
        '1. Never pay any registration, uniform, admin, or eWallet/CashSend fee.',
        '2. Verify company registration free on CIPC BizPortal: https://www.bizportal.gov.za/',
        '3. Verify private recruitment agencies on Dept. of Employment & Labour PEA/TES: https://www.labour.gov.za/DocumentCenter/Pages/Private-Employment-Agencies-(PEA)-and-Temporary-Employment-Services-(TES).aspx',
        '4. Check POPIA Information Officer listing: https://inforegulator.bizportal.gov.za/Search/Default.aspx',
        '5. Confirm government posts on Friday DPSA Circulars: https://www.gov.za/about-government/government-jobs'
      ].join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showToast('Copied 5-point SA scam verification checklist!'));
      } else {
        showToast('Clipboard unavailable — use the official register links on screen.');
      }
    }
    function exportOpenJobsCsv() {
      const savedSet = new Set(state.savedOpenJobs || []);
      let rows = SAMPLE_WORK.map(w => ({ ...w, jobKey: `${w.title}|${w.employer}|${w.url}`, freshness: getJobFreshness(w.closing) })).filter(w => !w.freshness.expired);
      if (savedSet.size > 0) {
        const savedRows = rows.filter(w => savedSet.has(w.jobKey));
        if (savedRows.length) rows = savedRows;
      }
      const headers = ['Job Title', 'Employer', 'Town', 'Province', 'Closing Date', 'Status', 'Official URL'];
      const csvLines = [headers.map(csvSafeCell).join(',')].concat(
        rows.map(w => [w.title, w.employer, w.town, w.province, w.closing, w.freshness.label, w.url].map(csvSafeCell).join(','))
      );
      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `mzansi_open_jobs_shortlist_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      showToast(`Exported ${rows.length} open job${rows.length === 1 ? '' : 's'} safely to CSV!`);
    }
    function exportMatchedRoutesCsv() {
      const subs = getActiveSubjects();
      const headers = ['Programme', 'Institution', 'Route', 'Province', 'NQF', 'Eligibility', 'Estimated Cost', 'Deadline', 'Official URL'];
      const rows = [headers.map(csvSafeCell).join(',')];
      for (const prog of SAMPLE_PROGRAMMES) {
        const ev = evaluateProgramme(subs, prog);
        rows.push([prog.name, prog.institution, prog.route, prog.province, prog.nqf, ev.status, prog.estAnnualCost, prog.deadline, prog.officialUrl].map(csvSafeCell).join(','));
      }
      const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a'); a.href = url; a.download = 'Mzansi_Pathways_Matched_Routes.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Exported matched routes safely to CSV!');
    }

    function getJobFreshness(closingStr) {
      const raw = String(closingStr || '').trim();
      if (!raw || /rolling|open|ongoing/i.test(raw)) {
        return { expired: false, label: 'Open / Rolling', badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200' };
      }
      const m = raw.match(/(\d{4}-\d{2}-\d{2})/);
      if (!m) {
        return { expired: false, label: 'Still Open • Verified', badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200' };
      }
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const target = new Date(m[1] + 'T00:00:00');
      if (isNaN(target.getTime())) {
        return { expired: false, label: 'Still Open • Verified', badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200' };
      }
      const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
      if (diff < 0) return { expired: true, label: 'Expired', badgeClass: 'bg-rose-50 text-rose-900 border-rose-200' };
      if (diff === 0) return { expired: false, label: 'Closing Today', badgeClass: 'bg-amber-50 text-amber-900 border-amber-200' };
      if (diff <= 3) return { expired: false, label: `${diff} day${diff === 1 ? '' : 's'} left`, badgeClass: 'bg-amber-50 text-amber-900 border-amber-200' };
      return { expired: false, label: `${diff} days left · Still Open`, badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200' };
    }
    function getPortalCheckStatus(lastChecked) {
      const raw = String(lastChecked || '').trim();
      const m = raw.match(/^(\d{4}-\d{2}-\d{2})$/);
      if (!m) return { overdue: true, label: 'Due for Check', badgeClass: 'bg-amber-50 text-amber-900 border-amber-200' };
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const last = new Date(m[1] + 'T00:00:00');
      const days = Math.round((today.getTime() - last.getTime()) / 86400000);
      if (days >= 7) return { overdue: true, label: `Due (${days}d ago)`, badgeClass: 'bg-amber-50 text-amber-900 border-amber-200' };
      return { overdue: false, label: 'Checked Recently', badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200' };
    }
    let liveFeedLoadedCount = 0;
    function scoreJobMatch(job) {
      let score = 0;
      const blob = `${job.title || ''} ${job.employer || ''} ${job.town || ''} ${job.province || ''}`.toLowerCase();
      if (state.province && blob.includes(state.province.toLowerCase())) score += 35;
      if (state.localTown && blob.includes(state.localTown.toLowerCase())) score += 25;
      if (state.cvTargetRole) {
        const words = state.cvTargetRole.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
        if (words.some(w => blob.includes(w))) score += 25;
      }
      const evSkills = (state.evidenceVault || []).map(e => `${e.skill} ${e.tools}`).join(' ').toLowerCase().split(/[\s,/]+/).filter(w => w.length >= 4);
      if (evSkills.some(w => blob.includes(w))) score += 15;
      if (window.MZWORK && state.qualField && MZWORK.fieldFit(state.qualField, job)) score += 30;
      return Math.min(100, score);
    }

    function exportSavedFlyerJobsJson() {
      const list = Array.isArray(state.savedOpenJobs) ? state.savedOpenJobs : [];
      if (!list.length) { showToast('Save at least one scanned job flyer first'); return; }
      const payload = {
        notice: 'Copyright-safe factual job metadata exported from Mzansi Pathways (zero copied advert prose).',
        jobs: list.map(j => ({ title: j.role, closingDate: j.closing, contact: j.email || j.phone || '', sourceType: 'direct_employer' }))
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'Mzansi_Pathways_Saved_Open_Jobs.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`Exported ${list.length} saved open job(s) as copyright-safe JSON!`);
    }

    async function loadLiveOpenJobs() {
      try {
        if (window.location.protocol !== 'https:' && window.location.protocol !== 'http:') return;
        const ctl = typeof AbortController === 'function' ? new AbortController() : null;
        const tm = ctl ? setTimeout(() => ctl.abort(), 10000) : null;
        let resp; try { resp = await fetch('./data/open_jobs_live.json', { cache: 'no-store', signal: ctl ? ctl.signal : undefined }); } finally { if (tm) clearTimeout(tm); }
        if (!resp.ok) return;
        const payload = await resp.json();
        const valid = filterLegalOpenJobs(payload && payload.jobs ? payload.jobs : []);
        let added = 0;
        for (const j of valid) {
          if (!SAMPLE_WORK.some(w => w.title === j.title && w.employer === j.employer)) {
            SAMPLE_WORK.unshift(j);
            added++;
          }
        }
        if (added > 0) {
          liveFeedLoadedCount = added;
          if (state.tab === 'work') render();
        }
      } catch (e) {}
    }

    function parseJobFlyerText(rawText) {
      if (typeof rawText !== 'string' || !rawText.trim()) return null;
      const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 80);
      const emailM = rawText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
      const email = emailM ? emailM[0] : '';
      const isFreeMail = /@(gmail|yahoo|hotmail|outlook|icloud)\.com$/i.test(email);
      const domainTrust = !email ? 'No email detected — verify official apply method' : isFreeMail ? 'Caution: Free webmail detected — confirm on CIPC BizPortal before sending ID' : 'Positive Signal: Custom company/government email domain';
      const phoneM = rawText.match(/(?:\+27|0)\s?[1-8]\d[\s-]?\d{3}[\s-]?\d{4}\b/);
      const phone = phoneM ? phoneM[0].replace(/\s+/g, ' ').trim() : '';
      const closeM = rawText.match(/(?:closes?|closing\s*date)[:\s-]*([0-3]?\d\s+[A-Za-z]{3,9}\s+20\d{2}|20\d{2}-\d{2}-\d{2})/i);
      const closing = closeM ? closeM[1].trim() : 'Verify closing date on flyer';
      const roleLine = lines.find(l => /\b(?:technician|clerk|assistant|intern|apprentice|learnership|administrator|developer|mechanic|driver|officer|coordinator)\b/i.test(l)) || lines[0] || 'Local Vacancy';
      const flags = [];
      if (/\b(?:registration|application|admin|uniform|medical|police clearance)\s+fee\b/i.test(rawText)) flags.push('Requests upfront fee (HIGH SCAM RISK)');
      if (/\b(?:ewallet|cashsend|pay\s*r\d+)\b/i.test(rawText)) flags.push('Requests mobile money / upfront deposit (HIGH SCAM RISK)');
      if (/\b(?:bit\.ly|tinyurl\.com|t\.co)\b/i.test(rawText)) flags.push('Contains shortened link');
      return { role: roleLine.slice(0, 90), email, domainTrust, phone, closing, flags, safeVerdict: flags.length === 0 ? 'No upfront-fee scam flags detected — still verify company on CIPC BizPortal.' : 'WARNING: ' + flags.join(' | ') };
    }

    function validateCipcFormat(regNo) {
      const cleaned = String(regNo || '').replace(/\s+/g, '').toUpperCase();
      const m = cleaned.match(/^(?:19|20)\d{2}\/\d{6}\/(06|07|08|10|21|23|30)$/);
      if (!m) return { valid: false, msg: 'Invalid CIPC format — real SA company numbers look like 2018/123456/07 ((Pty) Ltd), /08 (NPC), or /23 (CC).' };
      const map = { '06': 'Public Company (Ltd)', '07': 'Private Company ((Pty) Ltd)', '08': 'Non-Profit Company (NPC)', '10': 'External Company', '21': 'Personal Liability (Inc)', '23': 'Close Corporation (CC)', '30': 'State-Owned Company (SOC Ltd)' };
      return { valid: true, msg: `Valid CIPC format: ${map[m[1]]}. Always confirm active status on bizportal.gov.za (format alone does not prove active registration).` };
    }

    function exportPlainTextCv() {
      const nameEl = document.getElementById('cv-name'); if (nameEl) state.cvName = nameEl.value.trim();
      const phEl = document.getElementById('cv-phone'); if (phEl) state.cvPhone = phEl.value.trim();
      const emEl = document.getElementById('cv-email'); if (emEl) state.cvEmail = emEl.value.trim();
      const trEl = document.getElementById('cv-target-role'); if (trEl) state.cvTargetRole = trEl.value.trim();
      state.cvUpdatedAt = new Date().toISOString().slice(0, 10);
      saveState();
      const lines = [
        (state.cvName || 'CANDIDATE NAME').toUpperCase(),
        state.cvTargetRole ? `Target Role: ${state.cvTargetRole}` : '',
        [state.province + ', South Africa', state.cvPhone, state.cvEmail].filter(Boolean).join(' | '),
        '',
        'DEMONSTRATED SKILLS & REAL EVIDENCE',
        ...(state.evidenceVault || []).filter(e => e.includeInCv !== false).map(e => `- ${e.skill} (${e.tools}): ${e.story}`),
        ''
      ];
      if (state.cvQualifications && state.cvQualifications.length) {
        lines.push('QUALIFICATIONS & CERTIFICATES', ...state.cvQualifications.map(q => `- ${q}`), '');
      }
      lines.push(`ACADEMIC RESULTS (${state.gradeStage})`, ...state.subjects.map(s => `- ${s.name}: ${s.mark}%`));
      const txt = lines.filter(l => l !== '').join('\n');
      const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
      const a = document.createElement('a'); a.href = url; a.download = 'Mzansi_Pathways_ATS_CV.txt';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Exported lightweight plain-text ATS CV (.txt)!');
    }

    function getCvReadinessScore() {
      let score = 0;
      if (state.cvName && (state.cvPhone || state.cvEmail)) score++;
      if (Array.isArray(state.subjects) && state.subjects.length >= 6) score++;
      if ((state.cvQualifications && state.cvQualifications.length) || state.gradeStage) score++;
      if (Array.isArray(state.evidenceVault) && state.evidenceVault.some(e => e.includeInCv !== false)) score++;
      return { score, total: 4, label: `${score}/4 CV Sections Ready` };
    }

    function getCvFreshnessStatus() {
      const missing = [];
      if (!state.cvName) missing.push('Full Name');
      if (!state.cvPhone && !state.cvEmail) missing.push('Phone or Email');
      const hasEv = Array.isArray(state.evidenceVault) && state.evidenceVault.length > 0;
      const updated = state.cvUpdatedAt || new Date().toISOString().slice(0, 10);
      const ageDays = Math.max(0, Math.floor((Date.now() - new Date(updated + 'T00:00:00Z').getTime()) / 86400000));
      const stale = Number.isFinite(ageDays) && ageDays > 90;
      return {
        updated,
        stale,
        missing,
        hasEv,
        summary: stale ? `Last updated ${updated} (${ageDays}d ago — review phone & skills)` : `Current (Updated ${updated})`
      };
    }

    function filterLegalOpenJobs(jobs) {
      const blocked = ['graduates24.com', 'pnet.co.za', 'careerjunction.co.za', 'indeed.com', 'linkedin.com', 'careers24.com'];
      const feeRe = /\b(?:registration|application|admin|uniform|processing)\s+fee\b|\b(?:ewallet|cashsend|pay\s*r\d+)\b/i;
      const todayIso = new Date().toISOString().slice(0, 10);
      const out = [];
      for (const j of (Array.isArray(jobs) ? jobs : [])) {
        if (!j || typeof j !== 'object') continue;
        const url = String(j.officialUrl || j.url || '').trim();
        if (!j.title || !j.employer || !url.startsWith('https://')) continue;
        const host = url.toLowerCase().split('://')[1].split('/')[0];
        if (blocked.some(b => host === b || host.endsWith('.' + b))) continue;
        if (feeRe.test(`${j.title} ${j.description || ''}`)) continue;
        const cl = String(j.closingDate || j.closing || '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(cl) && cl < todayIso) continue;
        out.push({
          title: String(j.title).trim(),
          employer: String(j.employer).trim(),
          town: String(j.town || 'South Africa').trim(),
          province: String(j.province || state.province).trim(),
          salary: String(j.salary || 'Verify on official advert').trim(),
          closing: cl || 'Open / Rolling',
          url,
          trust: { id: 'Verified Employer / Public Feed', source: 'Imported Legal Open Feed', scam: 'Passed zero-fee & domain checks' }
        });
      }
      return out;
    }

    const CV_KNOWN_SKILLS = [
      'Windows', 'Linux', 'Microsoft Excel', 'Excel', 'Microsoft Word', 'Microsoft 365',
      'Active Directory', 'Networking', 'TCP/IP', 'VLAN', 'Packet Tracer', 'Python',
      'JavaScript', 'SQL', 'Git', 'HTML', 'CSS', 'Troubleshooting', 'Help Desk',
      'Diesel', 'Hydraulics', 'Pneumatics', 'Welding', 'AutoCAD', 'OHS', 'Lockout',
      'Accounting', 'Bookkeeping', 'Z83', 'POPIA', 'Customer Service', 'Data Capturing',
      'Forklift', 'First Aid', 'Driving Licence', 'Code 10', 'Code 8'
    ];

    function parsePreviousCvText(rawText) {
      if (typeof rawText !== 'string' || !rawText.trim()) return null;
      const cleaned = rawText.replace(/<[^>]+>/g, '\n');
      const lines = cleaned.split(/\r?\n/).map(l => l.replace(/^[\s\u2022\-*]+/, '').trim()).filter(Boolean).slice(0, 120);
      const emailM = cleaned.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
      const phoneM = cleaned.match(/(?:\+27|0)\s?[6-8]\d[\s-]?\d{3}[\s-]?\d{4}\b/);
      const email = emailM ? emailM[0] : '';
      const phone = phoneM ? phoneM[0].replace(/\s+/g, ' ').trim() : '';
      let name = '';
      const skipW = ['curriculum vitae', 'resume', 'cv', 'contact', 'profile', 'summary', 'personal details'];
      for (const ln of lines.slice(0, 8)) {
        const low = ln.toLowerCase();
        if (skipW.some(w => low.includes(w)) || ln.includes('@') || /\d{4,}/.test(ln)) continue;
        const wc = ln.split(/\s+/).length;
        if (wc >= 2 && wc <= 4 && ln.length <= 48) { name = ln; break; }
      }
      const lowAll = cleaned.toLowerCase();
      const skills = [];
      for (const sk of CV_KNOWN_SKILLS) {
        const re = new RegExp('\\b' + sk.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        if (re.test(lowAll) && !skills.includes(sk)) skills.push(sk);
      }
      const actRe = /\b(?:installed|configured|repaired|maintained|managed|assisted|supported|built|developed|captured|prepared|diagnosed|wired|tested|operated|trained)\b/i;
      const snippets = [];
      for (const ln of lines) {
        if (ln.length >= 24 && ln.length <= 220 && actRe.test(ln) && !snippets.includes(ln)) snippets.push(ln);
        if (snippets.length >= 6) break;
      }
      const eduRe = /\b(?:nsc|matric|nqf|tvet|diploma|degree|bsc|bcom|beng|higher certificate|n2|n3|n4|n5|n6|national senior certificate)\b/i;
      const qualifications = [];
      for (const ln of lines) {
        if (ln.length >= 8 && ln.length <= 160 && eduRe.test(ln) && !qualifications.includes(ln)) qualifications.push(ln);
        if (qualifications.length >= 4) break;
      }
      return { name, email, phone, skills: skills.slice(0, 12), qualifications, evidenceSnippets: snippets };
    }

    function getWhatIfDelta() {
      const realMatches = SAMPLE_PROGRAMMES.filter(p => { const st = evaluateProgramme(state.subjects, p).status; return st === 'Meets Minimums' || st === 'Conditional'; }).length;
      const simSubs = state.subjects.map(s => s.name === (state.whatIfSubject || 'Mathematics') ? { ...s, mark: Number(state.whatIfMaths) || 0 } : s);
      const simMatches = SAMPLE_PROGRAMMES.filter(p => { const st = evaluateProgramme(simSubs, p).status; return st === 'Meets Minimums' || st === 'Conditional'; }).length;
      const diff = simMatches - realMatches;
      return { realMatches, simMatches, diff };
    }

    function getClientHealthStatus() {
      const subCount = Array.isArray(state.subjects) ? state.subjects.length : 0;
      const plansSet = ['A', 'B', 'C'].filter(k => state.plans && state.plans[k]).length;
      let storageOk = true;
      try { localStorage.setItem('__mp_ping', '1'); localStorage.removeItem('__mp_ping'); } catch (e) { storageOk = false; }
      return `Profile Verified: ${subCount} subjects · ${plansSet}/3 plans linked · Local Storage ${storageOk ? 'OK' : 'Restricted'}`;
    }

    function checkPassphraseStrength(pass) {
      const s = String(pass || '');
      if (!s) return { label: 'Enter at least 8 characters to lock/unlock backups', cls: 'text-slate-600' };
      if (s.length < 8) return { label: `Too short (${s.length}/8 chars minimum)`, cls: 'text-rose-700 font-bold' };
      const hasNum = /\d/.test(s);
      const hasSym = /[^A-Za-z0-9]/.test(s);
      if (s.length >= 12 && (hasNum || hasSym)) return { label: 'Strong passphrase (12+ chars with numbers/symbols)', cls: 'text-emerald-800 font-bold' };
      return { label: 'Fair passphrase — add numbers or make it 12+ chars for extra security', cls: 'text-amber-800 font-bold' };
    }

    function validateStateIntegrity(s) {
      if (!s || typeof s !== 'object') return;
      if (Array.isArray(s.subjects)) {
        const seen = new Set();
        s.subjects = s.subjects.filter(sub => {
          const key = String((sub && sub.name) || '').trim().toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      if (!Array.isArray(s.savedCvs)) s.savedCvs = [];
      else s.savedCvs = s.savedCvs.filter(x => x && typeof x === 'object' && x.label).slice(0, 8);
      if (!Array.isArray(s.cvQualifications)) s.cvQualifications = [];
      else s.cvQualifications = s.cvQualifications.map(x => String(x || '').trim()).filter(Boolean).slice(0, 8);
            if (!Array.isArray(s.govWatchlist) || !s.govWatchlist.length) s.govWatchlist = [{ name: 'Friday DPSA Circulars (gov.za)', url: 'https://www.gov.za/about-government/government-jobs', cadence: 'Every Friday', lastChecked: 'Not checked yet' }];
            if (s.plans && typeof s.plans === 'object') {
        const validIds = new Set(SAMPLE_PROGRAMMES.map(x => x.id));
        ['A', 'B', 'C'].forEach(k => {
          if (s.plans[k] && !validIds.has(s.plans[k])) s.plans[k] = SAMPLE_PROGRAMMES[0].id;
        });
      }
    }

    function repairState(s) {
      if (!s || typeof s !== 'object') return;
      if (['matric', 'cert', 'diploma', 'degree'].indexOf(s.qualLevel) < 0) s.qualLevel = '';
      s.qualField = String(s.qualField || '').slice(0, 60);
      if (['all', 'general', 'qualified', 'mine'].indexOf(s.workQual) < 0) s.workQual = 'all';
      validateStateIntegrity(s);
      if (!Array.isArray(s.subjects) || s.subjects.length < 1) s.subjects = DEFAULT_SUBJECTS.map(x =>({ ...x }));
      s.subjects = s.subjects.map(x =>({
        name: String((x && x.name) || 'Subject').slice(0, 80),
        mark: Math.max(0, Math.min(100, Number(x && x.mark) || 0)),
        isHomeLanguage: !!(x && x.isHomeLanguage),
        isLifeOrientation: !!(x && x.isLifeOrientation)
      }));
      if (!Array.isArray(s.evidenceVault)) s.evidenceVault = [];
      if (!s.studyF || typeof s.studyF !== 'object' || Array.isArray(s.studyF)) s.studyF = {};
      if (!Array.isArray(s.studyCmp)) s.studyCmp = [];
      if (!Array.isArray(s.studyPlanPicks)) s.studyPlanPicks = [];
      if (!s.plans || typeof s.plans !== 'object') s.plans = { A: 'up_bsc_cs', B: 'ump_dip_ict', C: 'tut_hc_it' };
      if (!s.planStatus || typeof s.planStatus !== 'object') s.planStatus = { A: 'Not Started', B: 'Not Started', C: 'Not Started' };
      if (!s.affordA || typeof s.affordA !== 'object') s.affordA = { tuition: 58000, accomm: 45000, transport: 6000, funding: 0 };
      if (!s.affordC || typeof s.affordC !== 'object') s.affordC = { tuition: 12000, accomm: 0, transport: 7200, funding: 12000 };
      if (!s.docChecklist || typeof s.docChecklist !== 'object') s.docChecklist = { 'Matric / Grade 11 Statement': true };
      if (!Array.isArray(s.compareRouteIds)) s.compareRouteIds = ['up_bsc_cs', 'ump_dip_ict', 'tut_hc_it'];
    }
    repairState(state);

    function syncYearLabels() { try { document.querySelectorAll('.mz-yr').forEach(e => { e.textContent = String(state.intakeYear || MZDATA.defaultYear()); }); } catch (e) {} }
    // Failsafe save: keeps the last good copy (at most every 30 s), retries once after freeing the extra copies, and TELLS the learner if saving fails.
    function saveState() {
      try {
        repairState(state);
        const json = JSON.stringify(state);
        const write = () => {
          const old = localStorage.getItem(STORAGE_KEY);
          if (old && old !== json && Date.now() - lastPrevAt > 30000) {
            try { JSON.parse(old); localStorage.setItem(PREV_KEY, old); lastPrevAt = Date.now(); } catch (e) {}
          }
          localStorage.setItem(STORAGE_KEY, json);
        };
        try { write(); }
        catch (e) { localStorage.removeItem(PREV_KEY); localStorage.removeItem(CORRUPT_KEY); write(); }
        saveFailed = false;
      } catch (e) {
        if (!saveFailed) { saveFailed = true; showToast('Could not save on this phone (storage full or blocked). Open Sync & Backup and download a backup so you do not lose your work.', 7000); }
      }
    }
    ['pagehide', 'visibilitychange'].forEach(ev => window.addEventListener(ev, () => { if (ev === 'pagehide' || document.visibilityState === 'hidden') saveState(); }));
    function escapeHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function showToast(msg, ms) {
      const t = document.getElementById('toast');
      if (!t) return;
      t.textContent = msg; t.classList.remove('hidden');
      clearTimeout(window._pt2); window._pt2 = setTimeout(() =>t.classList.add('hidden'), ms || 2600);
    }

    function markToLevel(m) {
      const n = Number(m) || 0;
      if (n >= 80) return 7; if (n >= 70) return 6; if (n >= 60) return 5;
      if (n >= 50) return 4; if (n >= 40) return 3; if (n >= 30) return 2; return 1;
    }

    // v68: "Have you checked your marks?" gate. A verification only counts for the exact marks that were confirmed;
    // change any mark and it resets, so results are never built on marks the learner has not looked at.
    function marksSignature() { return JSON.stringify((state.subjects || []).map(x => [x.name, Number(x.mark)])); }
    function marksAreVerified() { return !!state.marksVerified && state.marksSig === marksSignature(); }
    function openVerifyModal(next) {
      let m = document.getElementById('verify-marks-modal');
      if (m) m.remove();
      m = document.createElement('div');
      m.id = 'verify-marks-modal';
      m.className = 'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-3';
      m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Check your marks');
      const rows = (state.subjects || []).map(x => '<div class="flex justify-between gap-3 py-1 border-b border-slate-100"><span class="font-semibold text-slate-800">' + escapeHtml(x.name) + '</span><span class="font-extrabold text-slate-900">' + escapeHtml(String(x.mark)) + '%</span></div>').join('');
      m.innerHTML = '<div class="w-full max-w-md bg-white rounded-3xl p-5 space-y-3 shadow-xl max-h-[90vh] overflow-y-auto">' +
        '<h2 class="text-base font-extrabold text-slate-900">Have you checked your marks?</h2>' +
        '<p class="text-xs text-slate-600">Your results below are only as good as these numbers. Compare each line with your report card or statement (photos can be misread).</p>' +
        '<div class="text-xs">' + rows + '</div>' +
        '<div class="flex flex-col sm:flex-row gap-2 pt-1">' +
        '<button type="button" id="vm-yes" class="flex-1 py-3 rounded-xl bg-emerald-700 text-white text-sm font-extrabold">Yes, these are correct</button>' +
        '<button type="button" id="vm-edit" class="flex-1 py-3 rounded-xl bg-white text-slate-900 border border-slate-300 text-sm font-extrabold">No, let me fix them</button></div></div>';
      document.body.appendChild(m);
      const close = () => { const e = document.getElementById('verify-marks-modal'); if (e) e.remove(); };
      document.getElementById('vm-yes').addEventListener('click', () => { state.marksVerified = true; state.marksSig = marksSignature(); saveState(); close(); next(); });
      document.getElementById('vm-edit').addEventListener('click', () => { close(); state.tab = 'results'; saveState(); render(); window.scrollTo(0, 0); showToast('Fix any mark, then try again.'); });
      m.addEventListener('click', e => { if (e.target === m) close(); });
      const y = document.getElementById('vm-yes'); if (y) y.focus();
    }
    function goPath(tab) {
      const go = () => { state.tab = tab; saveState(); render(); window.scrollTo(0, 0); };
      if (marksAreVerified()) go(); else openVerifyModal(go);
    }

    function getActiveSubjects() {
      if (!state.whatIfActive) return state.subjects;
      const targetName = state.whatIfSubject || 'Mathematics';
      return state.subjects.map(s =>s.name === targetName ? { ...s, mark: Number(state.whatIfMaths) || 0 } : s);
    }

    function legacyEvaluateNsc(subs) {
      const hl = subs.filter(s =>s.isHomeLanguage);
      const nonLo = subs.filter(s =>!s.isLifeOrientation);
      const aps = nonLo.slice(0, 6).reduce((a, s) =>a + markToLevel(s.mark), 0);
      const hlMark = Math.max(0, ...hl.map(s =>Number(s.mark) || 0));
      const o50 = nonLo.filter(s =>Number(s.mark) >= 50).length;
      const o40 = nonLo.filter(s =>Number(s.mark) >= 40).length;
      const o30 = nonLo.filter(s =>Number(s.mark) >= 30).length;
      let passLevel = 'Did Not Meet Minimum NSC Pass';
      if (hlMark >= 40 && o50 >= 4 && o30 >= 6) passLevel = "Bachelor's Pass";
      else if (hlMark >= 40 && o40 >= 4 && o30 >= 6) passLevel = 'Diploma Pass';
      else if (hlMark >= 40 && o40 >= 3 && o30 >= 6) passLevel = 'Higher Certificate Pass';
      return { passLevel, aps };
    }

    function evaluateNsc(subs) { return window.__ENG.evaluateNsc(subs); }
    function evaluateProgramme(subs, prog) {
      // Rules from another intake year can never show green: treated as unverified for the chosen year.
      if (prog.intakeYear && state.intakeYear && prog.intakeYear !== state.intakeYear) {
        prog = Object.assign({}, prog, { verificationStatus: 'pending_review' });
        const r = window.__ENG.evaluateProgramme(subs, prog);
        r.reasons = (r.reasons || []).concat(['These rules are for ' + prog.intakeYear + ', not ' + state.intakeYear + '. Rules change every year.']);
        return r;
      }
      return window.__ENG.evaluateProgramme(subs, prog);
    }
    const PASS_RANK = { 'Did Not Meet Minimum NSC Pass': 0, 'Higher Certificate Pass': 1, 'Diploma Pass': 2, "Bachelor's Pass": 3 };

    function legacyEvaluateProgramme(subs, prog) {
      if (!prog.verifiedRules) return { status: 'Needs Verification', badge: 'bg-slate-100 text-slate-700 border-slate-300', reasons: ['Requirements must be confirmed directly with the accredited provider.'], missing: [] };
      const nsc = evaluateNsc(subs);
      const byName = {};
      subs.forEach(s =>{ byName[s.name.toLowerCase()] = Number(s.mark) || 0; });
      const missing = [], reasons = [];
      let nearGap = true;

      if ((PASS_RANK[nsc.passLevel] || 0) < (PASS_RANK[prog.minPassLevel] || 0)) {
        missing.push(`Needs ${prog.minPassLevel} (currently ${nsc.passLevel})`);
        if ((PASS_RANK[prog.minPassLevel] || 0) - (PASS_RANK[nsc.passLevel] || 0) >1) nearGap = false;
      }
      if (prog.minAps >0) {
        if (nsc.aps >= prog.minAps) reasons.push(`APS ${nsc.aps ?? 'n/a'} ≥ minimum ${prog.minAps}`);
        else { const g = prog.minAps - nsc.aps; missing.push(`APS ${nsc.aps ?? 'n/a'} is ${g} pt(s) below minimum ${prog.minAps}`); if (g >4) nearGap = false; }
      }
      (prog.subjectRequirements || []).forEach(req =>{
        let best = null;
        req.anyOf.forEach(o =>{ const v = byName[o.toLowerCase()]; if (v !== undefined) best = best === null ? v : Math.max(best, v); });
        const lbl = req.anyOf.join(' or ');
        if (best === null) { missing.push(`Missing subject: ${lbl} (${req.minMark}%+)`); nearGap = false; }
        else if (best < req.minMark) { const d = Math.round(req.minMark - best); missing.push(`${lbl}: ${best}% (need ${req.minMark}%, short by ${d}%)`); if (d >15) nearGap = false; }
        else reasons.push(`${lbl}: ${best}% ≥ ${req.minMark}%`);
      });

      if (!missing.length) {
        if (prog.requiresSelection) return { status: 'Conditional', badge: 'bg-sky-100 text-sky-900 border-sky-300', reasons: [...reasons, 'Subject to institutional selection & space'], missing: [] };
        return { status: 'Meets Minimums', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300', reasons, missing: [] };
      }
      if (nearGap && missing.length <= 2) return { status: 'Near Match', badge: 'bg-amber-100 text-amber-950 border-amber-300', reasons, missing };
      return { status: 'Not Currently Eligible', badge: 'bg-rose-100 text-rose-900 border-rose-300', reasons, missing };
    }

    function findBottlenecks(subs) {
      const okSet = new Set(['Meets Minimums', 'Conditional']);
      const base = SAMPLE_PROGRAMMES.filter(p =>okSet.has(evaluateProgramme(subs, p).status)).length;
      const out = [];
      subs.forEach((s, idx) =>{
        if (s.isLifeOrientation || s.mark >= 90) return;
        const target = Math.min(100, Number(s.mark) + 12);
        const sim = subs.map((x, i) =>i === idx ? { ...x, mark: target } : x);
        const nowOk = SAMPLE_PROGRAMMES.filter(p =>okSet.has(evaluateProgramme(sim, p).status)).length;
        if (nowOk >base) out.push({ subject: s.name, from: s.mark, to: target, unlocked: nowOk - base });
      });
      return out.sort((a, b) =>b.unlocked - a.unlocked);
    }

    function openWhyModal(progId) {
      const p = SAMPLE_PROGRAMMES.find(x =>x.id === progId);
      if (!p) return;
      const subs = getActiveSubjects();
      const ev = evaluateProgramme(subs, p);
      const alts = SAMPLE_PROGRAMMES.filter(x =>x.id !== p.id && x.careerFamily === p.careerFamily)
        .map(x =>({ x, e: evaluateProgramme(subs, x) }))
        .filter(o =>o.e.status === 'Meets Minimums' || o.e.status === 'Conditional' || o.e.status === 'Near Match');
      document.getElementById('why-title').textContent = `${p.name} — ${p.institution}`;
      document.getElementById('why-body').innerHTML = `
        <div class="flex flex-wrap gap-1.5">
          <span class="px-2.5 py-0.5 rounded-full font-extrabold border ${ev.badge}">${escapeHtml(ev.status)}</span>
          <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">${escapeHtml(p.legitStatus)}</span>
        </div>
        <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
          <div class="font-extrabold text-slate-900">Deterministic Rule Breakdown:</div>
          ${ev.reasons.map(r =>`<div class="text-emerald-800 font-semibold">✓ ${escapeHtml(r)}</div>`).join('')}
          ${ev.missing.map(m =>`<div class="text-rose-800 font-semibold">✗ ${escapeHtml(m)}</div>`).join('')}
          ${prevYearNote(p)}
          <div class="text-[11px] text-slate-500 pt-1"><strong>Source:</strong>${escapeHtml(p.sourceTier)} · <strong>Est. Cost:</strong>${escapeHtml(p.estAnnualCost)}</div>
        </div>
        ${ev.missing.length ? `
          <div class="space-y-1.5">
            <div class="font-extrabold text-slate-900">Closest Realistic Alternatives (Same Career Family):</div>
            ${alts.map(o =>`<div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2"><div><strong>${escapeHtml(o.x.name)}</strong><div class="text-[11px] text-slate-600">${escapeHtml(o.x.institution)} · ${escapeHtml(o.x.route)}</div></div><span class="px-2 py-0.5 rounded-full bg-white text-emerald-900 font-extrabold text-[10px]">${escapeHtml(o.e.status)}</span></div>`).join('') || '<div class="text-slate-500">Try enabling "No University Required" to view TVET &amp; Workplace routes.</div>'}
          </div>
        ` : ''}
        <div class="flex flex-wrap gap-2 pt-1">
          <button data-set-plan="A|${escapeHtml(p.id)}" class="px-3 py-2 rounded-xl bg-blue-700 text-white font-extrabold">Set Plan A</button>
          <button data-set-plan="B|${escapeHtml(p.id)}" class="px-3 py-2 rounded-xl bg-teal-700 text-white font-extrabold">Set Plan B</button>
          <button data-set-plan="C|${escapeHtml(p.id)}" class="px-3 py-2 rounded-xl bg-emerald-700 text-white font-extrabold">Set Plan C</button>
          <button data-flag-prog="${escapeHtml(p.name)} (${escapeHtml(p.institution)})" class="px-3 py-2 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 font-bold">Report Outdated Info</button>
          <a href="${escapeHtml(p.officialUrl)}" target="_blank" rel="noopener noreferrer" class="ml-auto px-3 py-2 rounded-xl bg-slate-900 text-white font-bold">Official Site ↗</a>
        </div>
      `;
      const wb = document.getElementById('why-body');
      if (wb) wb.insertAdjacentHTML('beforeend', '<div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1"><div class="font-extrabold text-slate-900">Pre-Application Verification Checklist</div><ul class="list-disc pl-4 text-slate-700 space-y-0.5"><li>Confirm ' + (p.intakeYear || state.intakeYear) + ' prospectus APS &amp; subject minimums on the official institution site.</li><li>Verify campus/site accreditation on DHET, QCTO, or SAQA before paying any registration fee.</li><li>Check NSFAS / SETA funding and application closing dates early.</li></ul></div>');
            document.getElementById('why-modal').classList.remove('hidden');
    }

    // Compares a record with the same programme in the previous intake year. Information only: never changes eligibility.
    function prevYearNote(p) {
      if (!p.baseId || !p.intakeYear) return '';
      const q = SAMPLE_PROGRAMMES.find(x => x.baseId === p.baseId && x.intakeYear === p.intakeYear - 1);
      if (!q) return '';
      const same = q.minAps === p.minAps && JSON.stringify(q.subjectRequirements) === JSON.stringify(p.subjectRequirements);
      const note = q.verificationStatus === 'verified' ? '' : ' (that record was not fully verified)';
      return `<div class="text-[11px] text-slate-700 pt-1"><strong>Compared with ${q.intakeYear}:</strong> ${same ? 'APS and subject minimums are the same' : 'APS or subject minimums changed (minimum APS was ' + escapeHtml(q.minAps) + ', now ' + escapeHtml(p.minAps) + ')'}${note}. Always confirm on the official prospectus.</div>`;
    }

    function getGreeting() {
      const hr = new Date(Date.now() + 2 * 60 * 60 * 1000).getUTCHours();
      if (state.lang === 'zu') return 'Sawubona';
      if (state.lang === 'af') return hr < 12 ? 'Goeie môre' : hr < 18 ? 'Goeie middag' : 'Goeie naand';
      return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    }

    let ttsVoices = [];
    function loadTtsVoices() { try { const v = window.speechSynthesis.getVoices(); if (v && v.length) ttsVoices = v; } catch (e) {} return ttsVoices; }
    if ('speechSynthesis' in window) { loadTtsVoices(); try { window.speechSynthesis.addEventListener('voiceschanged', loadTtsVoices); } catch (e) {} }
    function pickVoice(lang) {
      const target = lang.toLowerCase(), base = target.split('-')[0];
      const vs = loadTtsVoices().filter(v => !/espeak/i.test(v.name || ''));
      const norm = v => String(v.lang || '').replace(/_/g, '-').toLowerCase();
      return vs.find(v => v.localService && norm(v) === target) || vs.find(v => norm(v) === target) || vs.find(v => v.localService && norm(v).startsWith(base)) || vs.find(v => norm(v).startsWith(base)) || null;
    }
    function stopSpeech() { try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) {} }
    window.addEventListener('pagehide', stopSpeech);
    function safeSpeech(msg) {
      if ('speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function') {
        try {
          stopSpeech();
          // Short chunks: long single utterances silently stop after ~15s on Android Chrome.
          const chunks = String(msg || '').replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]?/g) || [];
          if (chunks.length) {
            const lang = state.lang === 'af' ? 'af-ZA' : state.lang === 'zu' ? 'zu-ZA' : 'en-ZA';
            const voice = pickVoice(lang) || (lang === 'en-ZA' ? pickVoice('en-GB') : null);
            chunks.forEach(c => {
              const u = new SpeechSynthesisUtterance(c.trim());
              u.lang = voice ? String(voice.lang).replace(/_/g, '-') : lang;
              if (voice) u.voice = voice;
              u.rate = 0.92;
              window.speechSynthesis.speak(u);
            });
            showToast('Reading aloud...');
            return true;
          }
        } catch (e) {}
      }
      showToast(String(msg || ''));
      return false;
    }

    function speakPathwaysSummary() {
      const nsc = evaluateNsc(getActiveSubjects());
      safeSpeech(`${getGreeting()}! Your current summary is ${nsc.passLevel} with an APS of ${nsc.aps ?? 'n/a'} excluding Life Orientation. Open Careers or All Routes to compare University, TVET, and Workplace options.`);
    }

    function getHumanCheckIn() {
      if (state.moodState === 'stressed') {
        return {
          badge: 'Bridging & Alternative Pathways Active',
          note: 'Even if Maths or Science felt tough, South Africa has real Higher Certificate bridging, TVET NC(V), NATED, and QCTO trade routes that lead to strong careers. Check Plan B and Plan C first.'
        };
      }
      if (state.moodState === 'second_chance') {
        return {
          badge: 'Rewrite & Subject Upgrade Mode',
          note: 'Use the What-If Rewrite Simulator on the right to see what upgrading one subject unlocks, or filter All Routes for No University Required and TVET options near home.'
        };
      }
      return {
        badge: 'Standard Intake Assessment',
        note: 'Confirm your marks below (or scan your report card), check your biggest subject bottleneck, and lock in a backup route near home.'
      };
    }

    function getReadinessRing() {
      let score = 0;
      if (Array.isArray(state.subjects) && state.subjects.length >= 6) score += 25;
      if (state.plans && state.plans.A && state.plans.B && state.plans.C) score += 25;
      const docsDone = Object.values(state.docChecklist || {}).filter(Boolean).length;
      if (docsDone >= 3) score += 25;
      if (Array.isArray(state.evidenceVault) && state.evidenceVault.length >= 1) score += 25;
      return score;
    }

    function buildFamilyTalkScript() {
      const nsc = evaluateNsc(getActiveSubjects());
      const pA = SAMPLE_PROGRAMMES.find(x =>x.id === state.plans.A);
      const pB = SAMPLE_PROGRAMMES.find(x =>x.id === state.plans.B);
      const pC = SAMPLE_PROGRAMMES.find(x =>x.id === state.plans.C);
      return [
        `Hi family — here is my realistic post-school plan based on my ${nsc.passLevel} (APS ${nsc.aps ?? 'n/a'}, excl. LO):`,
        pA ? `• Plan A (Reach): ${pA.name} at ${pA.institution} (${pA.estAnnualCost}).` : '',
        pB ? `• Plan B (Safe In-Province): ${pB.name} at ${pB.institution} (${pB.estAnnualCost}).` : '',
        pC ? `• Plan C (Near-Home / TVET Backup): ${pC.name} at ${pC.institution} (${pC.estAnnualCost}).` : '',
        'I am applying to all three so we are never stuck waiting on one university, and we can check NSFAS / SETA funding together.'
      ].filter(Boolean).join('\n');
    }

    function evaluateStarAnswer(ans) {
      const t = String(ans || '').trim();
      if (!t) return null;
      const hasContext = /\b(?:when|at|during|school|home|lab|work|project|customer|classmate)\b/i.test(t);
      const hasAction = /\b(?:installed|configured|fixed|tested|checked|built|repaired|helped|sorted|explained|created)\b/i.test(t);
      const hasResult = /\b(?:worked|fixed|resolved|completed|verified|connected|faster|saved|zero|successfully)\b/i.test(t);
      const words = t.split(/\s+/).length;
      return { words, hasContext, hasAction, hasResult };
    }

    function buildHonestMotivationLetter() {
      const nsc = evaluateNsc(state.subjects);
      const evs = (state.evidenceVault || []).filter(e =>e.includeInCv !== false);
      const evLines = evs.length
        ? evs.map(e =>`- ${e.skill} (${e.tools}): ${e.story}`).join('\n')
        : '- [Add 1–2 real projects or tasks in your Evidence Vault above]';
      return `Dear Hiring / Admissions Team,\n\nI am writing to apply for the ${state.cvTargetRole || 'opportunity'} in ${state.province}. I hold ${nsc.passLevel} (${state.gradeStage}) and have practical experience demonstrated through:\n${evLines}\n\nThank you for considering my application. My contact details are ${state.cvName || '[Your Name]'} (${state.cvPhone || state.cvEmail || '[Phone / Email]'}).\n\nKind regards,\n${state.cvName || '[Your Name]'}`;
    }

    function wipeLocalProfile() {
      try { [STORAGE_KEY, PREV_KEY, CORRUPT_KEY, UNDO_KEY].forEach(k => localStorage.removeItem(k)); } catch (e) {}  // every saved copy goes, not just the main one
      state.lastBackupAt = '';
      state.subjects = DEFAULT_SUBJECTS.map(x =>({ ...x }));
      state.evidenceVault = [];
      state.cvName = ''; state.cvPhone = ''; state.cvEmail = ''; state.starDraft = '';
      state.whatIfActive = false;
      saveState();
      const am = document.getElementById('auth-modal');
      if (am) am.classList.add('hidden');
      render();
      showToast('All personal data wiped from this device safely');
    }

    function getNextBestAction(subs) {
      const nsc = evaluateNsc(subs);
      const hlLow = subs.some(s =>s.isHomeLanguage && Number(s.mark) < 40);
      if (hlLow) return { title: 'Home Language is below 40%', desc: 'In South Africa, Home Language under 40% blocks NSC pass levels — check TVET/QCTO options or use the What-If simulator.', tab: 'study', btn: 'See Alternative Routes →' };
      if ((state.evidenceVault || []).length === 0) return { title: 'Your Evidence Vault is empty', desc: 'Add 1 real task, school project, or practical skill so your CV and Interview Coach have real proof.', tab: 'vault', btn: 'Open Evidence Vault →' };
      const docsDone = Object.values(state.docChecklist || {}).filter(Boolean).length;
      const docsTot = Object.keys(state.docChecklist || {}).length;
      if (docsDone < docsTot) return { title: `Application documents ${docsDone}/${docsTot} ready`, desc: 'Check off your Statement of Results, Proof of Residence, and Z83/CV before deadlines close.', tab: 'plan', btn: 'Open Plan A/B/C & Docs →' };
      return { title: `Your ${nsc.passLevel} (APS ${nsc.aps ?? 'n/a'}) is ready`, desc: 'Compare your Plan A, Plan B, and Plan C side-by-side and test affordability.', tab: 'plan', btn: 'Review Plan A/B/C →' };
    }

    function buildFamilyDossier() {
      const nsc = evaluateNsc(getActiveSubjects());
      const a = state.affordA || {}; const c = state.affordC || {};
      const netA = Math.max(0, (Number(a.tuition)||0) + (Number(a.accomm)||0) + (Number(a.transport)||0) - (Number(a.funding)||0));
      const netC = Math.max(0, (Number(c.tuition)||0) + (Number(c.accomm)||0) + (Number(c.transport)||0) - (Number(c.funding)||0));
      const plansTxt = ['A', 'B', 'C'].map(k =>{
        const p = SAMPLE_PROGRAMMES.find(x =>x.id === state.plans[k]);
        const st = (state.planStatus && state.planStatus[k]) || 'Not Started';
        return p ? `Plan ${k} [${st}]: ${p.name} @ ${p.institution} (${p.route}) | ${p.estAnnualCost}` : `Plan ${k}: Not selected`;
      }).join('\n');
      const docsTxt = Object.entries(state.docChecklist || {}).map(([k, v]) =>`${v ? '[x]' : '[ ]'} ${k}`).join('\n');
      return `MZANSI PATHWAYS — FAMILY STUDY & CAREER DOSSIER\nProvince: ${state.province} | Stage: ${state.gradeStage}\nNSC Summary: ${nsc.passLevel} (APS ${nsc.aps ?? 'n/a'}, excl. LO)\n\nPLAN A / B / C\n${plansTxt}\n\nAFFORDABILITY ESTIMATE\nOption A Net/yr: R${netA.toLocaleString()}\nOption C Net/yr: R${netC.toLocaleString()}\n\nDOCUMENT READINESS\n${docsTxt}\n\nOfficial CAS WhatsApp (Gov Service): 081 308 4196`;
    }

    function applyModes() {
      document.body.classList.toggle('easy-mode', !!state.easyMode);
      document.body.classList.toggle('dark-mode', !!state.darkMode);
      document.body.classList.toggle('high-contrast', !!state.highContrast);
      document.body.classList.toggle('large-text', !!state.largeText);
      const ltb = document.getElementById('textsize-btn'); if (ltb) { ltb.classList.toggle('bg-blue-700', !!state.largeText); ltb.classList.toggle('text-white', !!state.largeText); ltb.textContent = state.largeText ? 'Large Text (A+): ON' : 'Large Text (A+)'; }
      const hcb = document.getElementById('hc-btn'); if (hcb) { hcb.classList.toggle('bg-slate-900', !!state.highContrast); hcb.classList.toggle('text-white', !!state.highContrast); hcb.textContent = state.highContrast ? 'High Contrast: ON' : 'High Contrast (HC)'; }
      const pb = document.getElementById('parent-btn');
      if (pb) { pb.classList.toggle('bg-indigo-700', !!state.parentMode); pb.classList.toggle('text-white', !!state.parentMode); pb.textContent = state.parentMode ? 'Parent View: ON' : 'Parent / Guardian View'; }
      const eb = document.getElementById('easy-btn');
      if (eb) { eb.classList.toggle('bg-emerald-600', !!state.easyMode); eb.classList.toggle('text-white', !!state.easyMode); eb.textContent = state.easyMode ? 'Easy View: ON' : 'Easy View'; }
      const tb = document.getElementById('theme-btn');
      if (tb) tb.textContent = state.darkMode ? 'Dark Mode: ON' : 'Dark Mode: OFF';
      const ps = document.getElementById('prov-select');
      if (ps) ps.value = state.province;
      const ls = document.getElementById('lang-select');
      if (ls) ls.value = state.lang || 'en';
    }

    function renderResults() {
      const subs = getActiveSubjects();
      const nsc = evaluateNsc(subs);
      const bottlenecks = findBottlenecks(state.subjects);
      const mathSub = state.subjects.find(s =>s.name === 'Mathematics' || s.name === 'Mathematical Literacy');
      return `
        <div class="space-y-4">
          <section class="rounded-2xl bg-slate-900 text-white p-5 sm:p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div class="space-y-2.5">
              <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 tracking-wide uppercase">${escapeHtml(getGreeting())} · ${state.parentMode ? 'Parent / Guardian View' : 'Learner Assessment'} · ${escapeHtml(state.province)}</div>
              <h1 class="text-xl sm:text-2xl font-extrabold tracking-tight text-white">Post-School Pathway Assessment</h1>
              <p class="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">Verify your NSC or N-course marks manually or by scanning your Statement of Results, inspect deterministic eligibility across University, TVET, QCTO, and workplace routes, and compare Plan A, B &amp; C.</p>
              <div class="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-semibold">
                <span class="text-slate-400 mr-1">Planning Focus:</span>
                ${[['ready', 'Standard Intake'], ['stressed', 'Bridging & Support Routes'], ['second_chance', 'Rewrite / Subject Upgrade']].map(([mk, ml]) =>`<button type="button" data-mood="${mk}" class="px-2.5 py-1 rounded-md border transition ${state.moodState === mk ? 'bg-white text-slate-900 border-white font-bold' : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'}">${ml}</button>`).join('')}
              </div>
              ${(() =>{ const hc = getHumanCheckIn(); return `<div class="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200 max-w-2xl"><strong class="text-white">${escapeHtml(hc.badge)}:</strong>${escapeHtml(hc.note)}</div>`; })()}
            </div>
            <div class="bg-slate-800/90 rounded-xl p-4 min-w-[240px] border border-slate-700 space-y-2">
              <div class="flex items-center justify-between">
                <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">${state.whatIfActive ? 'Hypothetical What-If' : 'Confirmed NSC Summary'}</div>
                <span class="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 text-[10px] font-bold">Readiness ${getReadinessRing()}%</span>
              </div>
              <div class="text-2xl font-extrabold tracking-tight text-white">APS ${nsc.aps ?? 'n/a'} <span class="text-xs font-medium text-slate-400">(excl. LO)</span></div>
              <div class="text-xs font-semibold text-emerald-300">${escapeHtml(nsc.passLevel)}</div>
              <button type="button" id="speak-summary-btn" class="mt-1 w-full py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-[11px] font-bold border border-slate-600">Read Summary Aloud</button>
            </div>
          </section>

          <!-- Live Quick-Route Summary Chips -->
          ${(() =>{
            const strongN = SAMPLE_PROGRAMMES.filter(p =>{ const s = evaluateProgramme(subs, p).status; return s === 'Meets Minimums' || s === 'Conditional'; }).length;
            const noUniN = SAMPLE_PROGRAMMES.filter(p =>!p.isUniversity).length;
            const docsDone = Object.values(state.docChecklist || {}).filter(Boolean).length;
            const docsTot = Object.keys(state.docChecklist || {}).length;
            return `<div class="flex flex-wrap gap-2 text-xs font-extrabold">
              <button type="button" data-quick-route="all" class="px-3.5 py-2 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100">${strongN} Matching Routes Ready</button>
              <button type="button" data-quick-route="nouni" class="px-3.5 py-2 rounded-2xl bg-teal-50 text-teal-900 border border-teal-200 hover:bg-teal-100">${noUniN} Non-University Routes (TVET / QCTO / Work)</button>
              <button type="button" data-tab="plan" class="px-3.5 py-2 rounded-2xl bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100">Docs Ready: ${docsDone}/${docsTot}</button>
            </div>`;
          })()}

          ${(() =>{
            const nba = getNextBestAction(subs);
            return `<div class="rounded-xl bg-white border border-slate-200 border-l-4 border-l-slate-900 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs shadow-sm">
              <div><strong class="text-indigo-950">Next Best Step: ${escapeHtml(nba.title)}</strong><span class="text-indigo-900">— ${escapeHtml(nba.desc)}</span></div>
              <button type="button" data-tab="${escapeHtml(nba.tab)}" class="px-3.5 py-1.5 rounded-xl bg-indigo-700 text-white font-extrabold hover:bg-indigo-800 shrink-0">${escapeHtml(nba.btn)}</button>
            </div>`;
          })()}

          <!-- Proactive "Don't Miss This" Bar -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
            <div class="p-3.5 rounded-xl bg-white border border-slate-200 border-l-4 border-l-amber-600 text-slate-700 shadow-sm">
               <strong>Improve My Options:</strong>${bottlenecks.length ? `Your biggest bottleneck is <u>${escapeHtml(bottlenecks[0].subject)}</u> (${bottlenecks[0].from}% → ${bottlenecks[0].to}% unlocks +${bottlenecks[0].unlocked} programme).` : 'You already meet minimum subject rules for the loaded pathways.'}
            </div>
            <div class="p-3.5 rounded-xl bg-white border border-slate-200 border-l-4 border-l-emerald-700 text-slate-700 shadow-sm">
               <strong>Plan A / B / C Active:</strong> Never rely on one competitive university — review your 3-tier backup plan in <strong>Plan A/B/C</strong>.
            </div>
            <div class="p-3.5 rounded-xl bg-white border border-slate-200 border-l-4 border-l-blue-700 text-slate-700 shadow-sm">
               <strong>Official CAS (Gov Service):</strong> WhatsApp <span class="font-mono">081 308 4196</span>for post-school placement guidance (replaced CACH from 2026).
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div class="lg:col-span-8 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 class="text-base font-extrabold text-slate-900">Academic Record &amp; Statement Entry</h2>
                  <p class="text-[11px] text-slate-500 mt-0.5">Choose manual entry or scan your NSC Statement of Results / school report card locally.</p>
                </div>
                <div class="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
                  <button type="button" id="mode-manual-btn" class="px-3 py-1.5 rounded-lg transition ${!state.scannerOpen ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">Enter Manually</button>
                  <button type="button" id="scan-results-btn" class="px-3 py-1.5 rounded-lg transition ${state.scannerOpen ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700 hover:text-slate-900'}">Scan Report Photo</button>
                </div>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap gap-1.5">
                  <button type="button" data-preset="tech" class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-semibold hover:bg-slate-200">Sample: Tech Learner</button>
                  <button type="button" data-preset="artisan" class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-semibold hover:bg-slate-200">Sample: Artisan / TVET</button>
                  <select id="quick-add-subject-select" aria-label="Quick add official NSC subject" class="px-2 py-1 rounded-lg bg-white text-slate-800 border border-slate-300 text-[11px] font-semibold">
                    <option value="">+ Quick-Add NSC Subject...</option>
                    ${['Accounting', 'Business Studies', 'Economics', 'Life Sciences', 'Physical Sciences', 'Mathematical Literacy', 'Computer Applications Technology', 'Engineering Graphics and Design', 'History', 'Geography', 'Agricultural Sciences', 'Tourism', 'Consumer Studies'].map(sub => `<option value="${sub}">${sub}</option>`).join('')}
                  </select>
                  <button type="button" id="add-subject-btn" class="px-2.5 py-1 rounded-lg bg-white text-slate-800 border border-slate-300 text-[11px] font-semibold hover:bg-slate-50">+ Add Subject</button>
                  <button type="button" id="reset-marks-btn" class="px-2.5 py-1 rounded-lg bg-white text-rose-700 border border-rose-200 text-[11px] font-semibold hover:bg-rose-50">Reset</button>
                  <button type="button" id="undo-subjects-btn" class="px-2.5 py-1 rounded-lg bg-white text-slate-700 border border-slate-300 text-[11px] font-semibold hover:bg-slate-50 ${subjectHistory.length ? '' : 'opacity-50'}">Undo</button>
                </div>
                <select id="grade-stage" aria-label="Academic stage" class="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
                  ${['Grade 9 (Subject Choice)', 'Grade 10', 'Grade 11', 'Grade 12 / Matric', 'After Matric / N2–N6'].map(g =>`<option ${state.gradeStage === g ? 'selected' : ''}>${g}</option>`).join('')}
                </select>
              </div>
              ${state.scannerOpen ? `
                <div id="image-scanner-panel" class="p-4 rounded-2xl bg-indigo-50/80 border-2 border-indigo-200 space-y-3 text-xs">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div class="font-extrabold text-indigo-950 text-sm">Image-to-Result Statement Scanner (100% On-Device)</div>
                      <div class="text-[11px] text-indigo-900">Your report card photo never leaves your phone. Take a photo, enhance contrast, auto-read or paste Google Lens text, then confirm below.</div>
                    </div>
                    <button type="button" id="scan-close-btn" class="px-2.5 py-1 rounded-lg bg-white text-slate-700 border border-slate-200 font-bold">✕ Close</button>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <label class="px-3 py-2 rounded-xl bg-indigo-700 text-white font-extrabold cursor-pointer hover:bg-indigo-800">
                       Choose from Gallery / Files
                      <input id="scan-image-input" type="file" accept="image/*" class="hidden" />
                    </label>
                    <select id="scan-doc-type-select" aria-label="Document type being scanned" class="px-2.5 py-2 rounded-xl bg-white text-slate-800 border border-slate-300 text-xs font-bold min-h-[44px]">
                      <option value="final_nsc" ${(state.scanDocType || 'final_nsc') === 'final_nsc' ? 'selected' : ''}>Doc: Final Grade 12 NSC Statement</option>
                      <option value="provisional_g11" ${state.scanDocType === 'provisional_g11' ? 'selected' : ''}>Doc: Grade 11 / Term Report (Provisional)</option>
                      <option value="sms_portal" ${state.scanDocType === 'sms_portal' ? 'selected' : ''}>Doc: Typed SMS / Portal Screenshot</option>
                    </select>
                    <label class="px-3 py-2 rounded-xl bg-slate-800 text-white font-extrabold cursor-pointer hover:bg-slate-900 min-h-[44px]">
                      Take Photo
                      <input id="scan-camera-input" type="file" accept="image/*" capture="environment" class="hidden" />
                    </label>
                    <button type="button" id="scan-rotate-btn" class="px-2.5 py-2 rounded-xl bg-white text-slate-800 border border-slate-200 font-bold">↻ Rotate 90°</button>
                    <button type="button" id="scan-contrast-btn" class="px-2.5 py-2 rounded-xl bg-white text-slate-800 border border-slate-200 font-bold">Boost Contrast</button>
                    <button type="button" id="scan-zoom-btn" class="px-2.5 py-2 rounded-xl bg-white text-slate-800 border border-slate-200 font-bold">Zoom Photo</button>
                    <button type="button" id="scan-detect-btn" class="px-3 py-2 rounded-xl bg-emerald-700 text-white font-extrabold hover:bg-emerald-800">Re-read Photo</button>
                    <button type="button" id="scan-sample-btn" class="px-2.5 py-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-bold">Load Sample Text</button>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                    <div class="bg-white rounded-xl p-2 border border-indigo-200 text-center">
                      <canvas id="scan-canvas" class="max-w-full h-auto ${state.scanZoom ? 'max-h-[460px]' : 'max-h-64'} mx-auto rounded-lg bg-slate-100"></canvas>
                      <div id="ocr-progress" role="status" aria-live="polite" class="text-[11px] font-bold text-indigo-800"></div>
                      <div id="scan-canvas-status" class="text-[11px] text-slate-500 mt-1">No photo loaded yet — upload a report card photo or paste text on the right.</div>
                    </div>
                    <div class="space-y-2">
                      <label for="scan-raw-text" class="block font-bold text-indigo-950">Statement Text (from Auto-Read, Google Lens, or Live Text):</label>
                      <textarea id="scan-raw-text" rows="5" placeholder="Paste or auto-read lines like:&#10;English Home Language 64%&#10;Mathematics 58%&#10;Physical Sciences 54%" class="w-full px-3 py-2 rounded-xl bg-white border border-indigo-200 text-xs">${escapeHtml(state.scanRawText || '')}</textarea>
                      <button type="button" id="scan-parse-btn" class="w-full py-2 rounded-xl bg-blue-700 text-white font-extrabold hover:bg-blue-800">Parse Subjects &amp; Marks</button>
                    </div>
                  </div>
                  ${Array.isArray(state.scanParsed) && state.scanParsed.length ? `
                    <div id="scan-preview-list" class="bg-white rounded-xl p-3 border border-emerald-200 space-y-2">
                      <div class="flex items-center justify-between">
                        ${(() => {
                          const activeScanned = state.scanParsed.filter(s => s.include !== false);
                          const pNsc = evaluateNsc(activeScanned);
                          return `<div><strong class="text-emerald-950">Review Detected Marks (${activeScanned.length}/${state.scanParsed.length} selected)</strong><div class="text-[11px] text-slate-600">Live Preview: <strong id="scan-live-preview">${escapeHtml(pNsc.passLevel)} · APS ${pNsc.aps} (excl. LO)</strong> — confirm before applying.</div></div>`;
                        })()}
                        ${state.scanDocType === 'provisional_g11' ? '<div class="w-full p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold">Grade 11 / Term marks are provisional. Admission offers (such as UP and UMP) may be conditional until final Grade 12 NSC results are released.</div>' : ''}
                        <label class="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-800 cursor-pointer"><input id="scan-confirm-check" type="checkbox" ${state.scanConfirmed ? 'checked' : ''} /> I checked these marks against my report card</label>
                        <button type="button" id="scan-apply-btn" ${state.scanConfirmed ? '' : 'disabled'} class="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white font-extrabold hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed">Confirm &amp; Apply to My Marks</button>
                      </div>
                      <div class="space-y-1.5">
                        ${state.scanParsed.map((sp, idx) =>`
                          <div class="grid grid-cols-12 gap-2 items-center p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                            <div class="col-span-1 text-center"><input type="checkbox" data-scan-inc="${idx}" ${sp.include !== false ? 'checked' : ''} aria-label="Include subject" class="w-4 h-4 accent-emerald-700" /></div>
                            <div class="col-span-6 font-bold text-slate-800">${escapeHtml(sp.name)}</div>
                            <div class="col-span-3"><input type="number" min="0" max="100" data-scan-mark="${idx}" value="${sp.mark ?? ''}" placeholder="type mark" aria-label="Detected mark" class="w-full px-2 py-1 rounded bg-white border border-slate-300 text-center font-extrabold" /></div>
                            <div class="col-span-2 text-center"><span class="px-1.5 py-0.5 rounded text-[10px] font-black ${sp.confidence === 'high' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}">${sp.confidence === 'high' ? 'High' : 'Review'}</span></div>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
              ${state.gradeStage === 'Grade 9 (Subject Choice)' ? `
                <div class="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs space-y-2">
                  <div class="font-extrabold text-indigo-950">Grade 9 Career-to-Subject Reverse Planner (Keep Your Doors Open)</div>
                  <div class="flex flex-wrap gap-1.5">
                    ${[
                      ['eng', ' Engineering & IT'],
                      ['health', ' Health & Medicine'],
                      ['comm', ' Accounting & BCom'],
                      ['trades', ' Trades & TVET']
                    ].map(([k, lbl]) =>`<button type="button" data-g9-goal="${k}" class="px-2.5 py-1 rounded-full font-bold border ${state.grade9Goal === k ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white text-indigo-900 border-indigo-200'}">${lbl}</button>`).join('')}
                  </div>
                  <div class="p-2.5 rounded-xl bg-white border border-indigo-200 text-slate-800">
                    ${state.grade9Goal === 'eng' ? '<strong>Recommended Gr 10–12 Subjects:</strong> Pure Mathematics + Physical Sciences + IT/EGD. Keeps BSc, BEng, and NATED/TVET Engineering open.' :
                      state.grade9Goal === 'health' ? '<strong>Recommended Gr 10–12 Subjects:</strong> Pure Mathematics + Physical Sciences + Life Sciences. Required for Medicine, Pharmacy, and Nursing degrees.' :
                      state.grade9Goal === 'comm' ? '<strong>Recommended Gr 10–12 Subjects:</strong> Pure Mathematics + Accounting + Business Studies/Economics. Pure Maths is required for BCom &amp; CA(SA) tracks.' :
                      '<strong>Recommended Gr 10–12 Subjects:</strong> Pure Maths or Maths Lit + Technical/EGD/CAT. Opens TVET NC(V), N2–N6 Engineering, and QCTO Red Seal apprenticeships.'}
                  </div>
                </div>
              ` : ''}
              <div class="space-y-2">
                ${state.subjects.map((s, i) =>`
                  <div class="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <div class="col-span-7 flex items-center gap-1">
                      <input data-sub-name="${i}" type="text" value="${escapeHtml(s.name)}" aria-label="Subject name" class="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold" />
                      <button type="button" data-toggle-hl="${i}" title="Toggle Home Language" class="px-1.5 py-1 rounded text-[10px] font-black border ${s.isHomeLanguage ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-500 border-slate-200'}">HL</button>
                      <button type="button" data-toggle-lo="${i}" title="Toggle Life Orientation" class="px-1.5 py-1 rounded text-[10px] font-black border ${s.isLifeOrientation ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white text-slate-500 border-slate-200'}">LO</button>
                    </div>
                    <div class="col-span-3 flex items-center gap-1">
                      <input data-sub-mark="${i}" type="number" min="0" max="100" value="${s.mark}" aria-label="Mark" class="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-extrabold text-center" />
                      <span class="text-xs font-bold text-slate-500">%</span>
                    </div>
                    <div class="col-span-2 flex items-center justify-center gap-1"><span class="text-xs font-extrabold ${s.isHomeLanguage && Number(s.mark) < 40 ? 'text-rose-800 bg-rose-100' : 'text-blue-800 bg-blue-50'} px-2 py-1.5 rounded-lg">${s.isHomeLanguage && Number(s.mark) < 40 ? 'HL &lt; 40%' : 'Lvl ' + markToLevel(s.mark)}</span>${state.subjects.length >6 ? `<button type="button" data-del-sub="${i}" aria-label="Remove subject" class="text-rose-600 font-bold text-xs px-1">✕</button>` : ''}</div>
                  </div>
                `).join('')}
              </div>
              ${(() => {
                const sm = window.MZCAT ? MZCAT.summaryFor(getActiveSubjects(), window) : { qualify: 0, open: 0, close: 0, incomplete: 0 };
                const studyLine = sm.incomplete ? 'Enter all 7 subjects to see your courses' : (sm.qualify + sm.open) + ' courses you likely qualify for · ' + sm.close + ' close';
                const ok = marksAreVerified();
                return `<div class="space-y-2 pt-1">
                  <div class="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">Choose a path (three different things)</div>
                  <button type="button" data-path-go="study" class="w-full text-left p-3.5 rounded-2xl bg-teal-700 text-white hover:bg-teal-800"><div class="text-sm font-extrabold">1. Study Path: what can I study?</div><div class="text-[11px] text-teal-100">Courses at universities, universities of technology and TVET that fit your marks. ${escapeHtml(studyLine)}</div></button>
                  <button type="button" data-path-go="careers" class="w-full text-left p-3.5 rounded-2xl bg-blue-700 text-white hover:bg-blue-800"><div class="text-sm font-extrabold">2. Career Path: what can I become?</div><div class="text-[11px] text-blue-100">Pick a career (teacher, lawyer, nurse, engineer...) and see the study route, entry jobs and growth ladder.</div></button>
                  <button type="button" data-path-go="work" class="w-full text-left p-3.5 rounded-2xl bg-slate-800 text-white hover:bg-slate-900"><div class="text-sm font-extrabold">3. Work Path: what jobs can I apply for now?</div><div class="text-[11px] text-slate-300">Open posts, learnerships and internships you can apply for with what you have today.</div></button>
                  <div class="text-[11px] ${ok ? 'text-emerald-800' : 'text-amber-900'} font-semibold">${ok ? '✓ You confirmed these marks.' : 'We will ask you to confirm your marks before showing results.'}</div>
                </div>`;
              })()}
            </div>

            <!-- Hypothetical What-If Simulator -->
            <div class="lg:col-span-4 bg-white rounded-3xl p-5 border ${state.whatIfActive ? 'border-amber-400 ring-2 ring-amber-200' : 'border-slate-200'} shadow-sm space-y-3">
              <div class="flex items-center justify-between">
                <h2 class="text-sm font-extrabold text-slate-900">What-If Rewrite Simulator</h2>
                <button id="toggle-whatif" class="px-3 py-1 rounded-full text-xs font-extrabold ${state.whatIfActive ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'}">${state.whatIfActive ? 'Hypothetical ON' : 'Off'}</button>
              </div>
              <p class="text-xs text-slate-600">Pick any subject to test a rewrite or Term-4 boost without changing your real saved marks.</p>
              <select id="whatif-sub-select" aria-label="Subject to simulate" class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold">
                ${state.subjects.filter(s =>!s.isLifeOrientation).map(s =>`<option value="${escapeHtml(s.name)}" ${(state.whatIfSubject || 'Mathematics') === s.name ? 'selected' : ''}>${escapeHtml(s.name)} (Real: ${s.mark}%)</option>`).join('')}
              </select>
              ${(() =>{
                const realSub = state.subjects.find(s =>s.name === (state.whatIfSubject || 'Mathematics')) || mathSub;
                return `<div class="flex justify-between text-xs font-bold"><span>Simulated Mark:</span><span class="text-amber-700">${state.whatIfMaths}% (Real: ${realSub ? realSub.mark : 0}%)</span></div>`;
              })()}
              <input id="whatif-range" type="range" min="30" max="90" value="${state.whatIfMaths}" class="w-full accent-amber-600" />
              ${(() => {
                const wd = getWhatIfDelta();
                const txt = wd.diff > 0 ? `Unlocks +${wd.diff} additional route${wd.diff === 1 ? '' : 's'} (${wd.realMatches} → ${wd.simMatches} total)` : wd.diff < 0 ? `Reduces matching routes by ${Math.abs(wd.diff)} (${wd.realMatches} → ${wd.simMatches})` : `Maintains ${wd.simMatches} matching routes`;
                return `<div id="whatif-impact-badge" class="px-3 py-2 rounded-lg text-[11px] font-bold border ${wd.diff > 0 ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'}">${txt}</div>`;
              })()}
              <div class="text-[11px] text-slate-500">Hypothetical marks are always clearly labelled and kept separate from your real record.</div>
              <details id="aps-scale-details" class="pt-2 border-t border-slate-100 text-xs">
                <summary class="cursor-pointer font-bold text-slate-800 hover:text-blue-800 select-none">NSC Level 1–7 APS Scale Reference</summary>
                <div class="mt-2 overflow-x-auto">
                  <table class="w-full text-[11px] text-left border-collapse">
                    <thead><tr class="border-b border-slate-200 text-slate-500"><th class="py-1">Level</th><th class="py-1">Mark Band</th><th class="py-1">Descriptor</th></tr></thead>
                    <tbody class="divide-y divide-slate-100 text-slate-700">
                      <tr><td class="py-1 font-bold">7</td><td class="py-1">80–100%</td><td class="py-1">Outstanding</td></tr>
                      <tr><td class="py-1 font-bold">6</td><td class="py-1">70–79%</td><td class="py-1">Meritorious</td></tr>
                      <tr><td class="py-1 font-bold">5</td><td class="py-1">60–69%</td><td class="py-1">Substantial</td></tr>
                      <tr><td class="py-1 font-bold">4</td><td class="py-1">50–59%</td><td class="py-1">Adequate</td></tr>
                      <tr><td class="py-1 font-bold">3</td><td class="py-1">40–49%</td><td class="py-1">Moderate</td></tr>
                      <tr><td class="py-1 font-bold">2</td><td class="py-1">30–39%</td><td class="py-1">Elementary</td></tr>
                      <tr><td class="py-1 font-bold">1</td><td class="py-1">0–29%</td><td class="py-1">Not Achieved</td></tr>
                    </tbody>
                  </table>
                  <p class="mt-1.5 text-[10px] text-slate-500">Standard APS sums your 6 non-LO subjects. Always confirm institution-specific APS scales (e.g., Wits, UCT, UJ).</p>
                </div>
              </details>
            </div>
          </div>
        </div>
      `;
    }

    function renderCareers() {
      const subs = getActiveSubjects();
      const car = CAREERS.find(c =>c.id === state.selectedCareerId) || CAREERS[0];
      const routes = SAMPLE_PROGRAMMES.filter(p =>p.careerFamily === car.family);
      return `
        <div class="space-y-4">
          <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div class="text-[11px] font-extrabold uppercase tracking-wide text-blue-700">Career Path · what you can become</div>
                <h1 class="text-xl font-extrabold text-slate-900">Career Reality &amp; Pathway Explorer</h1>
                <p class="text-xs text-slate-600">Pick a career to see what the job really involves and how people grow in it. Then jump to the <strong>Study Path</strong> (courses) or the <strong>Work Path</strong> (open jobs) for that career.</p>
              </div>
              <select id="career-sector-filter" aria-label="Filter careers by sector" class="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800">
                ${[['all', 'All Sectors']].concat([...new Set(CAREERS.map(c => c.family))].map(f => [f, MZDATA.state.familyLabels[f] || f])).map(([k, l]) => `<option value="${k}" ${(state.careerSector || 'all') === k ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="flex flex-wrap gap-2">
              ${CAREERS.filter(c => (state.careerSector || 'all') === 'all' || c.family === state.careerSector).map(c =>`<button data-pick-career="${escapeHtml(c.id)}" class="px-3.5 py-2 rounded-xl text-xs font-extrabold border ${c.id === car.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}">${escapeHtml(c.title)}</button>`).join('')}
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <!-- Career Reality Card -->
            <div class="lg:col-span-5 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3 text-xs">
              <div class="text-[11px] font-extrabold uppercase text-teal-700">Career Reality Page</div>
              <h2 class="text-lg font-black text-slate-900">${escapeHtml(car.title)}</h2>
              <p class="text-slate-700 leading-relaxed">${escapeHtml(car.summary)}</p>
              <div>
                <div class="font-extrabold text-slate-900 mb-1">Your Evidence vs. Career Skills:</div>
                <div class="flex flex-wrap gap-1.5">${(() =>{
                  const vb = (state.evidenceVault || []).map(e =>`${e.skill} ${e.tools} ${e.story}`).join(' ').toLowerCase();
                  return car.skills.map(s =>{
                    const firstTok = s.toLowerCase().split(/[\s/()]+/).find(w =>w.length >= 3) || '';
                    const hit = firstTok && vb.includes(firstTok);
                    return `<span class="px-2.5 py-0.5 rounded-full font-bold ${hit ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-50 text-amber-900 border border-amber-200'}">${hit ? '✓ ' : ' '}${escapeHtml(s)}</span>`;
                  }).join('');
                })()}</div>
                <button type="button" data-tab="vault" class="mt-2 text-[11px] font-extrabold text-blue-700 underline">Build missing proof in Evidence Vault →</button>
              </div>
              <div>
                <div class="font-extrabold text-slate-900 mb-1">Typical Progression Ladder:</div>
                <div class="space-y-1">${car.ladder.map((st, idx) =>`<div class="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-semibold">${idx + 1}. ${escapeHtml(st)}</div>`).join('')}</div>
              </div>
              <div class="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 font-semibold"><strong>Reality Check:</strong>${escapeHtml(car.reality)}</div>
            </div>

            <!-- Study route + Work route for this career (kept separate) -->
            <div class="lg:col-span-7 space-y-3">
              ${(() => {
                const E = window;
                const fields = window.MZCAT ? MZCAT.fieldsFor(car) : [];
                const rows = (window.MZCAT ? MZCAT.query(subs, E, { show: 'all' }).rows : []).filter(r => fields.includes(r.p.field));
                const yes = rows.filter(r => r.ev.tier === 'qualify' || r.ev.tier === 'open'), close = rows.filter(r => r.ev.tier === 'close');
                const top = yes.concat(close).slice(0, 5);
                return `<section class="bg-white rounded-3xl p-4 border border-teal-200 border-l-4 border-l-teal-700 shadow-sm space-y-2.5 text-xs">
                  <div class="text-[11px] font-extrabold uppercase text-teal-700">Study Path to this career</div>
                  <h3 class="text-sm font-extrabold text-slate-900">${yes.length} course${yes.length === 1 ? '' : 's'} you likely qualify for · ${close.length} close · ${rows.length} total</h3>
                  ${top.map(r => `<div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200"><div class="font-extrabold text-slate-900">${escapeHtml(r.p.name)}</div><div class="text-blue-700 font-semibold">${escapeHtml(r.inst.short || r.inst.name)} · ${escapeHtml(r.p.qualType)}${r.p.minAps > 0 ? ' · APS ' + r.p.minAps + '+' : ''}</div><div class="text-[11px] ${r.ev.tier === 'close' ? 'text-amber-900' : 'text-emerald-800'} font-semibold">${escapeHtml(MZCAT.TIER[r.ev.tier].label)}${r.ev.gaps.length ? ': ' + escapeHtml(r.ev.gaps.join(' | ')) : ''}</div></div>`).join('') || '<div class="text-slate-600">No matching courses loaded for this career yet. None to show.</div>'}
                  <button type="button" data-career-study="${escapeHtml(fields[0] || 'all')}" class="w-full py-2.5 rounded-xl bg-teal-700 text-white font-extrabold">See all ${rows.length} courses for this career in Study Paths →</button>
                </section>`;
              })()}
              <section class="bg-white rounded-3xl p-4 border border-slate-200 border-l-4 border-l-slate-800 shadow-sm space-y-2.5 text-xs">
                <div class="text-[11px] font-extrabold uppercase text-slate-600">Work Path into this career (jobs you can start with)</div>
                <div class="flex flex-wrap gap-1.5">${(car.entryRoles || []).map(r => `<span class="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 font-bold text-slate-800">${escapeHtml(r)}</span>`).join('')}</div>
                <button type="button" data-career-jobs="${escapeHtml(window.MZCAT ? MZCAT.jobQueryFor(car) : car.title)}" class="w-full py-2.5 rounded-xl bg-slate-900 text-white font-extrabold">Find open jobs for this career →</button>
              </section>
              ${(() => {
                const routes2 = routes;
                if (!routes2.length) return '';
                return `<details class="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm"><summary class="cursor-pointer font-extrabold text-sm text-slate-900 min-h-[44px] flex items-center">Other routes (QCTO, apprenticeships, sample campuses): ${routes2.length}</summary><div class="space-y-3 mt-2">${routes2.map(p => {
                  const ev = evaluateProgramme(subs, p);
                  return `<article class="rounded-2xl p-3 border border-slate-200 space-y-1.5 text-xs"><span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${ev.badge}">${escapeHtml(ev.status)}</span><div class="font-extrabold text-slate-900 text-sm">${escapeHtml(p.name)}</div><div class="font-semibold text-blue-700">${escapeHtml(p.institution)} · ${escapeHtml(p.campus)}</div>${ev.missing.length ? `<div class="text-rose-800 font-semibold">Gap: ${ev.missing.map(escapeHtml).join(' | ')}</div>` : ''}<div class="flex gap-2"><button data-why-prog="${escapeHtml(p.id)}" class="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 font-extrabold">Why? / Alternatives</button></div></article>`;
                }).join('')}</div></details>`;
              })()}
            </div>
          </div>
        </div>
      `;
    }

    function renderFunding() {
      const b = MZDATA.state.bursaries || [];
      if (!b.length) return '';
      return `<details class="mt-4 bg-white rounded-3xl p-4 border border-slate-200 shadow-sm"><summary class="font-extrabold text-sm cursor-pointer min-h-[44px] flex items-center">Funding &amp; bursaries (${b.length})</summary><div class="space-y-2 mt-2 text-xs">${b.map(x => `<div class="p-3 rounded-xl bg-slate-50 border border-slate-200"><div class="font-extrabold">${escapeHtml(x.name)} <span class="text-[10px] font-bold text-slate-500">${escapeHtml(x.type)}</span></div><div>${escapeHtml(x.summary)}</div><div class="text-slate-600">${escapeHtml(x.note)}</div></div>`).join('')}<div class="text-[11px] font-bold text-amber-900">Amounts, criteria and deadlines are not shown until checked against the funder's official site. Never pay to apply.</div></div></details>`;
    }
    function renderInstitutions() {
      const all = MZDATA.state.institutions || [];
      if (!all.length) return '';
      const yr = state.intakeYear;
      const q = (state.instQ || '').trim().toLowerCase(), fp = state.instProv || '', ft = state.instType || '';
      const ins = all.filter(i => (!fp || i.province === fp) && (!ft || i.type === ft) && (!q || (i.name + ' ' + (i.short || '') + ' ' + i.province + ' ' + i.type).toLowerCase().includes(q)));
      const years = MZDATA.yearChoices();
      const cov = years.map(y => { const ps = SAMPLE_PROGRAMMES.filter(p => p.intakeYear === y); return { y, n: ps.length, v: ps.filter(p => p.verificationStatus === 'verified').length }; });
      const covHtml = `<div class="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px]"><div class="font-extrabold text-slate-700">Programme records by intake year</div><div class="flex flex-wrap gap-1.5 pt-1">${cov.map(c => `<button type="button" data-year-jump="${c.y}" class="px-2 py-1 rounded-lg border ${c.y === yr ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-300'} font-bold">${c.y}: ${c.n} loaded, ${c.v} verified</button>`).join('')}</div></div>`;
      const card = i => {
        const progs = SAMPLE_PROGRAMMES.filter(p => p.institution.indexOf(i.name) === 0);
        const thisYr = progs.filter(p => p.intakeYear === yr);
        const ver = thisYr.filter(p => p.verificationStatus === 'verified').length;
        const others = [...new Set(progs.filter(p => p.intakeYear && p.intakeYear !== yr).map(p => p.intakeYear))].sort();
        const aps = i.type === 'TVET' ? escapeHtml(i.apsNote || 'Use the college\'s own entry rules.')
          : i.apsMethod ? `APS method loaded: ${escapeHtml(i.apsMethod.replace(/_/g, ' '))}. Re-checked each year.` : 'This institution uses its own APS table. Use its official calculator.';
        const draft = i.listStatus === 'draft_unchecked' ? '<div class="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-1.5">Draft list entry: name and province not yet checked against the official DHET list. Confirm on the DHET site before relying on it.</div>' : '';
        const link = i.officialUrl ? `<a href="${escapeHtml(i.officialUrl)}" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded-xl bg-slate-900 text-white font-bold min-h-[44px] inline-flex items-center">Official website</a>`
          : `<a href="https://www.dhet.gov.za/" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded-xl bg-slate-900 text-white font-bold min-h-[44px] inline-flex items-center">Find on DHET site</a>`;
        const key = i.type === 'TVET' ? i.name : i.short;
        return `<details class="rounded-xl bg-slate-50 border border-slate-200 p-2"><summary class="font-extrabold min-h-[44px] flex items-center cursor-pointer">${escapeHtml(i.name)} <span class="ml-2 text-[10px] font-bold text-slate-500">${escapeHtml(i.short)} · ${escapeHtml(i.province)}</span></summary>
          <div class="space-y-1 pt-1 text-xs"><div><strong>Type:</strong> ${escapeHtml(i.type)}</div>${draft}<div>${aps}</div>
          ${(() => { const ci = window.MZCAT ? MZCAT.load().institutions.find(x => x.id === i.id) : null; const n = ci ? ci.programmes.length : 0; return `<div><strong>Course details:</strong> ${n ? n + ' courses in ' + [...new Set(ci.programmes.map(p => p.faculty))].length + ' departments (indicative)' : 'None loaded yet'}</div>`; })()}
          <div><strong>${yr} verified prospectus records:</strong> ${thisYr.length} (${ver} fully verified)${thisYr.length ? '' : ' - none yet, confirm with the institution'}</div>
          ${others.length ? `<div class="text-slate-600">Other years loaded: ${others.join(', ')}. Rules are for that year only.</div>` : ''}
          <div class="flex flex-wrap gap-2 pt-1">${link}
          ${(window.MZCAT && MZCAT.load().institutions.some(x => x.id === i.id && x.programmes.length)) ? `<button type="button" data-study-inst="${escapeHtml(i.id)}" class="px-3 py-2 rounded-xl bg-teal-700 text-white font-bold min-h-[44px]">See its courses</button>` : ''}</div>
          <div class="text-[11px] text-slate-500">Admission is decided by the institution. Found a mistake? Tell the app owner (see CONTRIBUTING.md).</div></div></details>`;
      };
      const hasCat = id => window.MZCAT && MZCAT.load().institutions.some(x => x.id === id && x.programmes.length);
      ins.sort((a, b) => (hasCat(b.id) ? 1 : 0) - (hasCat(a.id) ? 1 : 0));
      const groups = [...new Set(ins.map(i => i.type))];
      const types = [...new Set(all.map(i => i.type))];
      const selCls = 'px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold';
      const filters = `<div class="flex flex-wrap gap-2"><input id="inst-search" type="text" value="${escapeHtml(state.instQ || '')}" aria-label="Search institutions" placeholder="Search name, province, type..." class="flex-1 min-w-[160px] px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold" />
        <select id="inst-prov" aria-label="Institution province" class="${selCls}"><option value="">All provinces</option>${MZDATA.PROVINCES.map(v => `<option value="${v}" ${fp === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <select id="inst-type" aria-label="Institution type" class="${selCls}"><option value="">All types</option>${types.map(v => `<option value="${escapeHtml(v)}" ${ft === v ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('')}</select></div>
        <div class="text-[11px] text-slate-500">Showing ${ins.length} of ${all.length}</div>`;
      return `<details id="inst-panel" ${state.instOpen ? 'open' : ''} class="mt-4 bg-white rounded-3xl p-4 border border-slate-200 shadow-sm"><summary class="font-extrabold text-sm cursor-pointer min-h-[44px] flex items-center"><span>Institutions</span>&nbsp;(${all.length})</summary><div class="space-y-2 mt-2">${covHtml}${filters}${groups.map(g => `<div class="text-[11px] font-extrabold text-slate-500 uppercase pt-1">${escapeHtml(g)}</div>${ins.filter(i => i.type === g).map(card).join('')}`).join('') || '<div class="text-xs text-slate-500">No institution matches. Clear the search or filters.</div>'}<div class="text-[11px] text-slate-500">Private colleges and SETAs are added once checked against official lists.</div></div></details>`;
    }
    function renderStudy() {
      const main = window.MZCAT ? MZCAT.renderStudyPaths(Object.assign({}, state, { _activeSubjects: getActiveSubjects }), window, MZDATA.state.institutions || []) : '';
      const legacy = `<details class="mt-4 bg-white rounded-3xl p-4 border border-slate-200 shadow-sm"><summary class="font-extrabold text-sm cursor-pointer min-h-[44px] flex items-center">Other route types: QCTO occupational, apprenticeships and sample campus routes</summary><div class="mt-3">${renderStudyCore()}</div></details>`;
      return main + legacy + renderInstitutions() + renderFunding();
    }
    function renderStudyCore() {
      const subs = getActiveSubjects();
      const rq = (state.routeSearch || '').trim().toLowerCase();
      let list = SAMPLE_PROGRAMMES.filter(p =>{
        if (p.intakeYear && p.intakeYear !== state.intakeYear) return false;
        if (state.provFilter && state.provFilter !== 'all' && p.province !== state.provFilter) return false;
        if (state.noUniOnly && p.isUniversity) return false;
        if (rq && !`${p.name} ${p.institution} ${p.campus} ${p.route} ${p.nqf}`.toLowerCase().includes(rq)) return false;
        if (state.nearHomeOnly && p.province !== state.province) return false;
        if (state.routeFilter !== 'All' && p.route !== state.routeFilter) return false;
        return true;
      });
      if (state.routeSort === 'near') {
        list.sort((a, b) =>(a.province === state.province ? 0 : 1) - (b.province === state.province ? 0 : 1));
      } else {
        const rank = { 'Meets Minimums': 0, 'Conditional': 1, 'Possible - Verify Rules': 2, 'Near Match': 3, 'Check Official Page': 4, 'Needs Verification': 5, 'Enter All 7 Subjects': 6, 'Not Currently Eligible': 7 };
        list.sort((a, b) =>(rank[evaluateProgramme(subs, a).status] ?? 9) - (rank[evaluateProgramme(subs, b).status] ?? 9));
      }
      const listAll = list; list = list.slice(0, state.routeLimit || 20);
      const yrHas = SAMPLE_PROGRAMMES.some(p => p.intakeYear === state.intakeYear);
      const yrsLoaded = [...new Set(SAMPLE_PROGRAMMES.map(p => p.intakeYear).filter(y => y && y !== state.intakeYear))].sort();
      const otherYearsHtml = yrsLoaded.length ? ' Rules are loaded for: ' + yrsLoaded.map(y => `<button type="button" data-year-jump="${y}" class="underline font-extrabold">${y}</button>`).join(', ') + '. Those rules are for that year only.' : '';
      const yrOpts = MZDATA.yearChoices().map(y => `<option value="${y}" ${y === state.intakeYear ? 'selected' : ''}>${y} intake</option>`).join('');
      const prOpts = ['all'].concat(MZDATA.PROVINCES).map(v => `<option value="${v}" ${(state.provFilter || 'all') === v ? 'selected' : ''}>${v === 'all' ? 'All provinces' : v}</option>`).join('');
      return `
        <div class="space-y-4">
          <div class="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
            <div class="w-full flex flex-wrap gap-2"><select id="intake-year" aria-label="Intake year" class="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold">${yrOpts}</select><select id="prov-filter" aria-label="Province" class="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold">${prOpts}</select></div>
            ${yrHas ? '' : `<div class="w-full text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2">No checked rules are loaded for ${state.intakeYear} yet. The pathways below are illustrative. Always confirm with the institution.${otherYearsHtml}</div>`}
            <div class="flex flex-wrap gap-2">
              <button id="toggle-nouni" class="px-3.5 py-2 rounded-xl text-xs font-extrabold border ${state.noUniOnly ? 'bg-teal-700 text-white border-teal-700' : 'bg-teal-50 text-teal-900 border-teal-200'}">${state.noUniOnly ? '✓ No University Required: ON' : ' No University Required Mode'}</button>
              <button id="toggle-nearhome" class="px-3.5 py-2 rounded-xl text-xs font-extrabold border ${state.nearHomeOnly ? 'bg-blue-700 text-white border-blue-700' : 'bg-blue-50 text-blue-900 border-blue-200'}">${state.nearHomeOnly ? `✓ Near Home (${escapeHtml(state.province)}): ON` : ` I Cannot Relocate (${escapeHtml(state.province)})`}</button>
            </div>
            <select id="route-sort" aria-label="Sort Routes" class="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"><option value="eligibility" ${state.routeSort === 'eligibility' ? 'selected' : ''}>Sort: Best Eligibility</option><option value="near" ${state.routeSort === 'near' ? 'selected' : ''}>Sort: Near Home First</option></select>
            <button type="button" id="export-routes-csv-btn" class="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shrink-0">Export CSV</button>
            <input id="route-search" type="text" value="${escapeHtml(state.routeSearch || '')}" placeholder="Search UMP, TUT, TVET, eMalahleni, NQF 5..." class="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold" />
            <div id="route-type-pills" class="w-full flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 text-[11px] font-bold">
              ${['All', 'University', 'Higher Certificate / UoT', 'Public TVET College', 'QCTO Occupational'].map(rt => `<button type="button" data-route-filter="${escapeHtml(rt)}" class="px-2.5 py-1 rounded-lg border ${state.routeFilter === rt ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}">${escapeHtml(rt)}</button>`).join('')}
              <button type="button" id="clear-route-filters-btn" class="ml-auto px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100">Clear Filters</button>
            </div>
            <div class="text-xs font-bold text-slate-500">Showing ${list.length} of ${listAll.length} pathways</div>${listAll.length > list.length ? '<button type="button" id="show-more-routes" class="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Show 20 more</button>' : ''}
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            ${list.map(p =>{
              const ev = evaluateProgramme(subs, p);
              return `
                <article class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between gap-2.5">
                  <div class="space-y-1.5">
                    <div class="flex flex-wrap items-center justify-between gap-1.5">
                      <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${ev.badge}">${escapeHtml(ev.status)}</span>
                      <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">${escapeHtml(p.route)} · ${escapeHtml(p.nqf)}</span>
                    </div>
                    <h2 class="text-base font-extrabold text-slate-900">${escapeHtml(p.name)}</h2>
                    <div class="text-xs font-semibold text-blue-700">${escapeHtml(p.institution)} · ${escapeHtml(p.campus)}</div>
                    <div class="text-xs text-slate-600">${escapeHtml(p.estAnnualCost)} · ${escapeHtml(p.legitStatus)}</div>
                    ${ev.missing.length ? `<div class="p-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-900 font-semibold">${ev.missing.map(escapeHtml).join(' | ')}</div>` : ''}
                  </div>
                  <div class="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <button data-why-prog="${escapeHtml(p.id)}" class="flex-1 py-2 rounded-xl bg-blue-700 text-white text-xs font-extrabold">Why? &amp; Closest Options</button>
                    <button type="button" data-cmp-route="${escapeHtml(p.id)}" class="px-3 py-2 rounded-xl text-xs font-bold border ${(state.compareRouteIds || []).includes(p.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-700 border-slate-200'}">${(state.compareRouteIds || []).includes(p.id) ? '✓ Compare' : 'Compare'}</button>
                    <a href="${escapeHtml(p.officialUrl)}" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold">Portal ↗</a>
                  </div>
                </article>
              `;
            }).join('')}
          </div>

          ${(() =>{
            const cmp = SAMPLE_PROGRAMMES.filter(p =>(state.compareRouteIds || []).includes(p.id)).slice(0, 3);
            if (!cmp.length) return '';
            return `
              <section class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm overflow-x-auto space-y-2">
                <h2 class="text-sm font-extrabold text-slate-900">Side-by-Side Route Comparison (${cmp.length} selected)</h2>
                <table class="w-full text-xs text-left border-collapse">
                  <thead><tr class="border-b border-slate-200 text-slate-500"><th class="py-2 pr-3">Criteria</th>${cmp.map(p =>`<th class="py-2 px-3 font-extrabold text-slate-900">${escapeHtml(p.name)}</th>`).join('')}</tr></thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr><td class="py-2 pr-3 font-bold">Route</td>${cmp.map(p =>`<td class="py-2 px-3">${escapeHtml(p.route)} (${escapeHtml(p.nqf)})</td>`).join('')}</tr>
                    <tr><td class="py-2 pr-3 font-bold">Eligibility</td>${cmp.map(p =>`<td class="py-2 px-3 font-bold">${escapeHtml(evaluateProgramme(subs, p).status)}</td>`).join('')}</tr>
                    <tr><td class="py-2 pr-3 font-bold">Duration</td>${cmp.map(p =>`<td class="py-2 px-3">${escapeHtml(p.duration)}</td>`).join('')}</tr>
                    <tr><td class="py-2 pr-3 font-bold">Est. Cost</td>${cmp.map(p =>`<td class="py-2 px-3">${escapeHtml(p.costLevel)}</td>`).join('')}</tr>
                    <tr><td class="py-2 pr-3 font-bold">Legitimacy</td>${cmp.map(p =>`<td class="py-2 px-3">${escapeHtml(p.legitStatus)}</td>`).join('')}</tr>
                  </tbody>
                </table>
              </section>
            `;
          })()}

          <!-- Interactive Prospectus Snippet Reader (Item #4 / #43) -->
          <section class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2.5 text-xs">
            <h2 class="text-sm font-extrabold text-slate-900">Prospectus Snippet Reader (Extract APS, Maths % &amp; Deadlines)</h2>
            <p class="text-slate-600">Paste any requirement paragraph from an official university or TVET prospectus to highlight key numbers (candidate check — always verify the original page).</p>
            <textarea id="prosp-input" rows="2" class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">${escapeHtml(state.prospectusText || '')}</textarea>
            ${(() =>{
              const t = state.prospectusText || '';
              const aps = t.match(/\bAPS\s*(?:of|:|>=|at least)?\s*(\d{2})\b/i);
              const mth = t.match(/\bMathematics\s*(?:at least|>=|:)?\s*(\d{2})\s*%/i);
              const eng = t.match(/\bEnglish\s*(?:HL|FAL|Home Language)?\s*(?:at least|>=|:)?\s*(\d{2})\s*%/i);
              const dt = t.match(/\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+20\d{2}|20\d{2}-\d{2}-\d{2})\b/i);
              return `<div class="flex flex-wrap gap-2 pt-1 font-bold">
                <span class="px-2.5 py-1 rounded-full bg-blue-50 text-blue-900">APS: ${aps ? aps[1] : 'Not found'}</span>
                <span class="px-2.5 py-1 rounded-full bg-teal-50 text-teal-900">Maths: ${mth ? mth[1] + '%' : 'Not found'}</span>
                <span class="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-900">English: ${eng ? eng[1] + '%' : 'Not found'}</span>
                <span class="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900">Deadline: ${dt ? escapeHtml(dt[1]) : 'Not found'}</span>
              </div>`;
            })()}
          </section>

          <!-- Legitimacy & Provider Verification Check (Items #12 & #14) -->
          <section class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2.5 text-xs">
            <h2 class="text-sm font-extrabold text-slate-900">Check Provider &amp; Qualification Legitimacy (Avoid Bogus Colleges)</h2>
            <p class="text-slate-600">Before paying any registration fee to a private college or training provider, confirm three separate facts: (1) the qualification is registered on the NQF, (2) the specific campus/delivery site is registered or QCTO-accredited, and (3) the intake is currently open.</p>
            <div class="flex flex-wrap gap-2 font-bold">
              <a href="https://www.dhet.gov.za/" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100">DHET Private College Registers ↗</a>
              <a href="https://www.qcto.org.za/" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100">QCTO Accredited SDP Search ↗</a>
              <a href="https://www.saqa.org.za/" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100">SAQA NQF Qualification Lookup ↗</a>
            </div>
          </section>
        </div>
      `;
    }

    function renderPlan() {
      const subs = getActiveSubjects();
      const slots = ['A', 'B', 'C'].map(k =>({ slot: k, prog: SAMPLE_PROGRAMMES.find(p =>p.id === state.plans[k]) }));
      return `
        <div class="space-y-4">
          ${(() => {
            const picks = (state.studyPlanPicks || []).map(id => window.MZCAT && MZCAT.load().flat.find(x => x.id === id)).filter(Boolean);
            if (!picks.length) return '';
            return `<section class="bg-white rounded-2xl p-4 border border-teal-200 border-l-4 border-l-teal-700 shadow-sm space-y-2 text-xs"><h2 class="text-sm font-extrabold text-slate-900">Courses you saved from Study Paths (${picks.length})</h2>${picks.map(pp => { const ev = MZCAT.evaluate(subs, pp, window); return `<div class="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200"><div><div class="font-extrabold text-slate-900">${escapeHtml(pp.name)}</div><div class="text-blue-700 font-semibold">${escapeHtml(pp._inst.short || pp._inst.name)} · ${escapeHtml(MZCAT.TIER[ev.tier].label)}${pp.minAps > 0 ? ' · APS ' + pp.minAps + '+' : ''}</div></div><button type="button" data-unsave-study="${escapeHtml(pp.id)}" class="px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold">Remove</button></div>`; }).join('')}</section>`;
          })()}
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 class="text-xl font-extrabold text-slate-900">${state.parentMode ? ' Parent / Guardian Decision Summary' : ' Plan A / Plan B / Plan C Decision Board'}</h1>
              <p class="text-xs text-slate-600">Compare academic eligibility, affordability, distance from ${escapeHtml(state.province)}, funding, and deadlines side-by-side.</p>
              <div class="inline-block mt-1 px-2.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-bold">Application Progress: ${escapeHtml(getPlanSubmissionProgress().summary)}</div>
            </div>
            <div class="flex flex-wrap gap-2"><button id="dl-dossier-btn" class="px-3.5 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold">Download Dossier (.txt)</button><button id="speak-plan-btn" class="px-3.5 py-2 rounded-xl bg-purple-700 text-white text-xs font-bold">Read Plan Aloud</button><button id="copy-family-talk-btn" class="px-3.5 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold">Family Talk Script</button><button id="copy-plan-btn" class="px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold">Share Family Plan</button><button id="print-plan-btn" class="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Print Family Plan</button></div>
          </div>

          ${(() => {
            const nf = getNsfasPreCheck(state.incomeBand);
            return `<div id="nsfas-precheck-card" class="p-4 rounded-xl bg-white border border-slate-200 border-l-4 ${nf.cls} shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
              <div class="space-y-0.5 max-w-2xl">
                <div class="font-extrabold text-slate-900">Funding Pre-Check: ${escapeHtml(nf.band)}</div>
                <div class="text-slate-600">${escapeHtml(nf.detail)}</div>
              </div>
              <a href="https://www.nsfas.org.za/" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 shrink-0">Verify at NSFAS ↗</a>
            </div>`;
          })()}

          <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm overflow-x-auto">
            <table class="w-full text-xs text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-200 text-slate-500">
                  <th class="py-2 pr-3">Plan</th>
                  <th class="py-2 px-3">Programme &amp; Institution</th>
                  <th class="py-2 px-3">Academic</th>
                  <th class="py-2 px-3">Affordability &amp; Distance</th>
                  <th class="py-2 px-3">Legitimacy</th>
                  <th class="py-2 px-3">Deadline</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${slots.map(({ slot, prog }) =>{
                  if (!prog) return `<tr><td class="py-3 font-black">Plan ${slot}</td><td colspan="5" class="py-3 text-slate-400">Not selected yet</td></tr>`;
                  const ev = evaluateProgramme(subs, prog);
                  return `
                    <tr>
                      <td class="py-3 pr-3 font-black text-blue-800">Plan ${slot}</td>
                      <td class="py-3 px-3"><button type="button" data-why-prog="${escapeHtml(prog.id)}" class="font-extrabold text-blue-800 hover:underline text-left">${escapeHtml(prog.name)} </button><div class="text-[11px] text-slate-500">${escapeHtml(prog.institution)} (${escapeHtml(prog.route)})</div></td>
                      <td class="py-3 px-3"><span class="px-2 py-0.5 rounded-full font-bold border ${ev.badge}">${escapeHtml(ev.status)}</span></td>
                      <td class="py-3 px-3"><div>${escapeHtml(prog.costLevel)}</div><div class="text-[11px] text-slate-500">${prog.province === state.province ? 'Near home (0 relocation)' : `Relocation (${escapeHtml(prog.province)})`}</div></td>
                      <td class="py-3 px-3 font-semibold">${escapeHtml(prog.legitStatus)}</td>
                      <td class="py-3 px-3">
                        ${(() =>{ const db = getDeadlineBadge(prog.deadline); return `<span class="inline-block mb-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${db.cls}">${db.label}</span>`; })()}
                        <div class="font-semibold">${escapeHtml(prog.deadline)}</div>
                        <select data-plan-st="${slot}" aria-label="Plan ${slot} status" class="mt-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-bold">
                          ${['Not Started', 'Docs Ready', 'Submitted', 'Accepted'].map(st =>`<option ${(state.planStatus && state.planStatus[slot]) === st ? 'selected' : ''}>${st}</option>`).join('')}
                        </select>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2.5 text-xs">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-sm font-extrabold text-slate-900">Typical South African Application Season Calendar</h2>
              <span class="text-[11px] text-slate-500 font-semibold">Indicative guide — verify exact dates on official portals</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div class="p-3 rounded-2xl bg-blue-50 border border-blue-200"><div class="font-extrabold text-blue-900">Apr – Sep</div><div class="text-slate-700 mt-0.5">Public Universities &amp; UoTs main intake window (competitive degrees close earliest).</div></div>
              <div class="p-3 rounded-2xl bg-emerald-50 border border-emerald-200"><div class="font-extrabold text-emerald-900">Sep – Nov</div><div class="text-slate-700 mt-0.5">NSFAS, corporate bursaries &amp; SETA funding cycles.</div></div>
              <div class="p-3 rounded-2xl bg-teal-50 border border-teal-200"><div class="font-extrabold text-teal-900">Sep – Jan</div><div class="text-slate-700 mt-0.5">Public TVET NC(V) &amp; Report 191 trimester/semester applications.</div></div>
              <div class="p-3 rounded-2xl bg-amber-50 border border-amber-200"><div class="font-extrabold text-amber-900">Jan – Feb</div><div class="text-slate-700 mt-0.5">Late spaces &amp; official CAS placement support (WhatsApp 081 308 4196).</div></div>
            </div>
          </div>

          <!-- Interactive "Can I Afford This?" Annual Cost Comparator (Item #10) -->
          <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3 text-xs">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-sm font-extrabold text-slate-900">"Can I Afford This?" — Annual Out-of-Pocket Comparison</h2>
              <span class="text-[11px] text-slate-500 font-semibold">Edit with your real estimates — always verify official ${state.intakeYear} fees</span>
            </div>
            ${(() =>{
              const a = state.affordA || { tuition: 58000, accomm: 45000, transport: 6000, funding: 0 };
              const c = state.affordC || { tuition: 12000, accomm: 0, transport: 7200, funding: 12000 };
              const netA = Math.max(0, (Number(a.tuition)||0) + (Number(a.accomm)||0) + (Number(a.transport)||0) - (Number(a.funding)||0));
              const netC = Math.max(0, (Number(c.tuition)||0) + (Number(c.accomm)||0) + (Number(c.transport)||0) - (Number(c.funding)||0));
              const diff = Math.abs(netA - netC);
              return `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div class="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
                    <div class="font-extrabold text-blue-950">Option A (e.g. Away University)</div>
                    <div class="grid grid-cols-2 gap-2">
                      <label>Tuition (R/yr)<input data-aff="A|tuition" type="number" min="0" value="${a.tuition}" class="w-full mt-0.5 px-2 py-1 rounded-lg bg-white border border-blue-200 font-bold" /></label>
                      <label>Accomm. (R/yr)<input data-aff="A|accomm" type="number" min="0" value="${a.accomm}" class="w-full mt-0.5 px-2 py-1 rounded-lg bg-white border border-blue-200 font-bold" /></label>
                      <label>Transport (R/yr)<input data-aff="A|transport" type="number" min="0" value="${a.transport}" class="w-full mt-0.5 px-2 py-1 rounded-lg bg-white border border-blue-200 font-bold" /></label>
                      <label>Funding/NSFAS (R)<input data-aff="A|funding" type="number" min="0" value="${a.funding}" class="w-full mt-0.5 px-2 py-1 rounded-lg bg-white border border-blue-200 font-bold" /></label>
                    </div>
                    <div class="font-black text-sm text-blue-950">Est. Family Out-of-Pocket: R${netA.toLocaleString()}/yr</div>
                  </div>
                  <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <div class="font-extrabold text-emerald-950">Option C (e.g. Near-Home TVET / Higher Cert)</div>
                    <div class="grid grid-cols-2 gap-2">
                      <label>Tuition (R/yr)<input data-aff="C|tuition" type="number" min="0" value="${c.tuition}" class="w-full mt-0.5 px-2 py-1 rounded-lg bg-white border border-emerald-200 font-bold" /></label>
                      <label>Accomm. (R/yr)<input data-aff="C|accomm" type="number" min="0" value="${c.accomm}" class="w-full mt-0.5 px-2 py-1 rounded-lg bg-white border border-emerald-200 font-bold" /></label>
                      <label>Transport (R/yr)<input data-aff="C|transport" type="number" min="0" value="${c.transport}" class="w-full mt-0.5 px-2 py-1 rounded-lg bg-white border border-emerald-200 font-bold" /></label>
                      <label>Funding/NSFAS (R)<input data-aff="C|funding" type="number" min="0" value="${c.funding}" class="w-full mt-0.5 px-2 py-1 rounded-lg bg-white border border-emerald-200 font-bold" /></label>
                    </div>
                    <div class="font-black text-sm text-emerald-950">Est. Family Out-of-Pocket: R${netC.toLocaleString()}/yr</div>
                  </div>
                </div>
                <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200 font-extrabold text-slate-800">
                  Estimated annual family cost difference: <span class="text-emerald-700">R${diff.toLocaleString()}/year</span>(${netC <= netA ? 'Option C is more affordable based on your entries' : 'Option A is more affordable based on your entries'}).
                </div>
              `;
            })()}
          </div>

          <!-- SA Document Readiness Checklist -->
          <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2.5 text-xs">
            ${(() =>{
              const entries = Object.entries(state.docChecklist || {});
              const doneN = entries.filter(([, v]) =>!!v).length;
              const pct = entries.length ? Math.round((doneN / entries.length) * 100) : 0;
              return `
                <div class="flex items-center justify-between gap-2">
                  <h2 class="text-sm font-extrabold text-slate-900">Application Document Readiness (${doneN}/${entries.length} ready · ${pct}%)</h2>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  ${entries.map(([doc, ok]) =>`
                    <label class="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer font-semibold">
                      <input type="checkbox" data-doc-chk="${escapeHtml(doc)}" ${ok ? 'checked' : ''} class="w-4 h-4 accent-blue-700" />
                      <span class="${ok ? 'line-through text-slate-400' : 'text-slate-800'}">${escapeHtml(doc)}</span>
                    </label>
                  `).join('')}
                </div>
              `;
            })()}
          </div>

          <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2 text-xs">
            <h2 class="text-sm font-extrabold text-slate-900">Separate Funding Check (NSFAS &amp; SETA)</h2>
            <p class="text-slate-600">Academic eligibility and funding are separate. Current household income band: <strong>R${Number(state.incomeBand).toLocaleString()}</strong> — ${state.incomeBand <= 350000 ? 'appears within the published R350,000 NSFAS household income threshold (still requires separate NSFAS application &amp; proof of admission).' : 'above the R350,000 NSFAS threshold — explore SETA bursaries, missing-middle loans, or employer apprenticeships.'}</p>
          </div>
        </div>
      `;
    }

    function renderVault() {
      const evList = state.evidenceVault || [];
      const activeEv = evList[interviewIdx % Math.max(1, evList.length)];
      const reqSkills = ['Windows', 'Networking', 'Active Directory', 'Microsoft 365', 'Troubleshooting'];
      const vaultBlob = evList.map(e =>`${e.skill} ${e.tools} ${e.story}`).join(' ').toLowerCase();
      return `
        <div class="max-w-6xl mx-auto space-y-4">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <!-- Career Evidence Vault -->
            <div class="lg:col-span-7 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3.5">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h1 class="text-xl font-extrabold text-slate-900">Career Evidence Vault &amp; CV Builder</h1>
                  <p class="text-xs text-slate-600">Record real tasks you actually completed, or import details from a previous CV file or printed CV photo on-device.</p>
                </div>
                <div class="flex flex-wrap gap-1.5 shrink-0">
                  <button type="button" id="matric-starter-btn" class="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold hover:bg-blue-100">Just Finished Matric? Starter</button>
                  <button type="button" id="cv-import-toggle-btn" class="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800">${state.cvImportOpen ? 'Close CV Importer' : 'Import / Scan Previous CV'}</button>
                </div>
              </div>
              ${(() => {
                const fr = getCvFreshnessStatus();
                return `<div class="p-3 rounded-xl bg-slate-50 border border-slate-200 border-l-4 ${fr.stale ? 'border-l-amber-600' : 'border-l-emerald-700'} text-[11px] text-slate-700 flex flex-wrap items-center justify-between gap-2">
                  <div><span class="inline-block mr-2 px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold">${escapeHtml(getCvReadinessScore().label)}</span><strong>CV Freshness:</strong> ${escapeHtml(fr.summary)}${fr.missing.length ? ` · <span class="text-amber-800">Optional missing fields (${escapeHtml(fr.missing.join(', '))}) are safely omitted on export rather than faked.</span>` : ' · Ready for single-column Word export.'}</div>
                  <button type="button" data-cv-freshness="${escapeHtml(getCvFreshnessInfo(state.cvUpdatedAt).label)}" id="cv-mark-current-btn" class="px-2.5 py-1 rounded-lg bg-white text-slate-800 border border-slate-300 font-bold hover:bg-slate-100 shrink-0">Mark Current Today</button>
                </div>`;
              })()}
              <details id="cv-missing-guide" class="p-3 rounded-xl bg-white border border-slate-200 text-xs">
                <summary class="cursor-pointer font-bold text-slate-800 hover:text-blue-700 select-none">What if some CV details are missing? (First-Time Matriculant Guide)</summary>
                <ul class="mt-2 space-y-1 text-[11px] text-slate-600 list-disc pl-4">
                  <li><strong>No previous job or CV?</strong> Tap <em>Just Finished Matric? Starter</em> and list real school projects, practical labs, sport/prefect duties, or community help.</li>
                  <li><strong>No email address yet?</strong> Leave email blank — Mzansi Pathways cleanly omits missing fields on Word/TXT export rather than printing placeholders.</li>
                  <li><strong>Keep it current:</strong> Update your phone number, skills, and qualifications every 90 days and tap <em>Mark Current Today</em>.</li>
                </ul>
              </details>
              ${state.cvImportOpen ? `
                <div id="cv-import-panel" class="p-4 rounded-2xl bg-slate-50 border border-slate-300 space-y-3 text-xs">
                  <div>
                    <div class="font-extrabold text-slate-900">Import Previous CV File or Scan Printed CV Photo (100% On-Device)</div>
                    <div class="text-[11px] text-slate-600">Upload a previous CV (.txt, .md, .html, .doc text), snap a photo of a printed CV, or paste text from Google Lens. Review all extracted fields honestly before applying.</div>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <label class="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold cursor-pointer hover:bg-slate-800">
                      Upload CV (PDF / Word .docx / text)
                      <input id="cv-file-input" type="file" accept=".pdf,.docx,.txt,.md,.html,.htm,.rtf" class="hidden" />
                    </label>
                    <label class="px-3 py-1.5 rounded-lg bg-blue-700 text-white font-bold cursor-pointer hover:bg-blue-800">
                      Scan Printed CV Photo
                      <input id="cv-image-input" type="file" accept="image/*" class="hidden" />
                    </label>
                    <label class="px-3 py-2 rounded-xl bg-slate-800 text-white font-extrabold cursor-pointer hover:bg-slate-900 min-h-[44px]">
                      Take Photo
                      <input id="cv-camera-input" type="file" accept="image/*" capture="environment" class="hidden" />
                    </label>
                    <button type="button" id="cv-rotate-btn" class="px-2.5 py-1.5 rounded-lg bg-white text-slate-800 border border-slate-300 font-bold hover:bg-slate-100">↻ Rotate 90°</button>
                    <button type="button" id="cv-contrast-btn" class="px-2.5 py-1.5 rounded-lg bg-white text-slate-800 border border-slate-300 font-bold hover:bg-slate-100">Boost Contrast</button>
                    <button type="button" id="cv-zoom-btn" class="px-2.5 py-1.5 rounded-lg bg-white text-slate-800 border border-slate-300 font-bold hover:bg-slate-100">Zoom Photo</button>
                    <button type="button" id="cv-detect-btn" class="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800">Re-read Photo</button>
                    <button type="button" id="cv-sample-btn" class="px-2.5 py-1.5 rounded-lg bg-white text-slate-800 border border-slate-300 font-bold hover:bg-slate-100">Load Sample CV</button>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                    <div class="bg-white rounded-xl p-2 border border-slate-200 text-center">
                      <canvas id="cv-canvas" class="max-w-full h-auto ${state.cvZoom ? 'max-h-[460px]' : 'max-h-48'} mx-auto rounded-lg bg-slate-100"></canvas>
                      <div id="cv-canvas-status" class="text-[11px] text-slate-500 mt-1">Optional: snap a printed CV photo here or upload/paste text on the right.</div>
                    </div>
                    <div class="space-y-2">
                      <textarea id="cv-raw-text" rows="5" placeholder="Paste your previous CV text or load a file/photo..." class="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs">${escapeHtml(state.cvRawText || '')}</textarea>
                      <button type="button" id="cv-parse-btn" class="w-full py-2 rounded-xl bg-blue-700 text-white font-bold hover:bg-blue-800">Extract CV Details</button>
                    </div>
                  </div>
                  ${state.cvParsed ? `
                    <div id="cv-import-preview" class="p-3 rounded-xl bg-white border border-emerald-300 space-y-2">
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <strong class="text-slate-900">Review Imported CV Details (Confirm Truthfulness Before Applying)</strong>
                        <button type="button" id="cv-import-apply-btn" class="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800">Apply to My CV &amp; Vault</button>
                      </div>
                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                        <label class="block"><span class="text-slate-500 block">Name (Editable)</span><input id="cv-imp-name" type="text" value="${escapeHtml(state.cvParsed.name || '')}" placeholder="Confirm name" class="w-full mt-0.5 px-2 py-1 rounded border border-slate-300 font-bold text-slate-900" /></label>
                        <label class="block"><span class="text-slate-500 block">Phone (Editable)</span><input id="cv-imp-phone" type="text" value="${escapeHtml(state.cvParsed.phone || '')}" placeholder="Confirm phone" class="w-full mt-0.5 px-2 py-1 rounded border border-slate-300 font-bold text-slate-900" /></label>
                        <label class="block"><span class="text-slate-500 block">Email (Editable)</span><input id="cv-imp-email" type="email" value="${escapeHtml(state.cvParsed.email || '')}" placeholder="Confirm email" class="w-full mt-0.5 px-2 py-1 rounded border border-slate-300 font-bold text-slate-900" /></label>
                      </div>
                      ${(state.cvParsed.qualifications || []).length ? `<div class="text-[11px]"><span class="text-slate-500">Detected Qualifications:</span> <strong>${escapeHtml(state.cvParsed.qualifications.join(' · '))}</strong></div>` : ''}
                      <div class="text-[11px]"><span class="text-slate-500">Detected Skills:</span> <strong>${escapeHtml((state.cvParsed.skills || []).join(', ') || 'None detected')}</strong></div>
                      ${(state.cvParsed.evidenceSnippets || []).length ? `<div class="text-[11px] space-y-1"><div class="text-slate-500">Detected Experience Lines (${state.cvParsed.evidenceSnippets.length}):</div>${state.cvParsed.evidenceSnippets.map(sn => `<div class="px-2 py-1 rounded bg-slate-50 border border-slate-200">${escapeHtml(sn)}</div>`).join('')}</div>` : ''}
                    </div>
                  ` : ''}
                </div>
              ` : ''}
              <form id="ev-form" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <input id="ev-skill" required type="text" placeholder="Skill demonstrated (e.g. Router / VLAN Setup)" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold" />
                <input id="ev-tools" required type="text" placeholder="Tools used (e.g. Packet Tracer, Excel, Spanners)" class="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs" />
                <textarea id="ev-story" required rows="2" placeholder="What did YOU actually do and what was the real result? (Never invent numbers)" class="sm:col-span-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs"></textarea>
                <button type="submit" class="sm:col-span-2 py-2 rounded-xl bg-blue-700 text-white text-xs font-extrabold">+ Add Real Evidence to Vault</button>
              </form>
              <div class="space-y-2">
                ${evList.map((e, i) =>`
                  <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-2 text-xs">
                    <label class="flex items-start gap-2.5 flex-1 cursor-pointer">
                      <input type="checkbox" data-inc-ev="${i}" ${e.includeInCv !== false ? 'checked' : ''} class="mt-1 w-4 h-4 accent-blue-700" />
                      <div>
                        <div class="font-extrabold text-slate-900">${escapeHtml(e.skill)} <span class="font-normal text-blue-700">(${escapeHtml(e.tools)})</span></div>
                        <p class="text-slate-600 mt-0.5">${escapeHtml(e.story)}</p>
                      </div>
                    </label>
                    <button data-del-ev="${i}" aria-label="Remove evidence" class="text-rose-600 font-bold">✕</button>
                  </div>
                `).join('')}
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <input id="cv-name" type="text" value="${escapeHtml(state.cvName)}" placeholder="Full Name for CV Export" class="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold" />
                <input id="cv-target-role" type="text" value="${escapeHtml(state.cvTargetRole || '')}" placeholder="Target Role (e.g. Junior IT Support)" class="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold" />
                <input id="cv-phone" type="text" value="${escapeHtml(state.cvPhone || '')}" placeholder="Phone (e.g. 082 555 0194)" class="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs" />
                <input id="cv-email" type="email" value="${escapeHtml(state.cvEmail || '')}" placeholder="Email (e.g. name@example.co.za)" class="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs" />
                <button type="button" id="save-cv-snapshot-btn" class="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold">Save CV Version Locally</button>
                <button id="dl-cv-doc" class="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold">Export Word CV (.doc)</button>
                <button type="button" id="dl-cv-txt" class="sm:col-span-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 text-xs font-bold">Export Lightweight Plain-Text ATS CV (.txt)</button>
                <button type="button" id="copy-cv-txt-btn" class="sm:col-span-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 text-xs font-bold">Copy Plain-Text CV to Clipboard</button>
              </div>
              ${(state.savedCvs && state.savedCvs.length) ? `
                <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div class="font-extrabold text-slate-900">Saved Previous CV Versions (${state.savedCvs.length})</div>
                  <div class="space-y-1.5">
                    ${state.savedCvs.map((cv, idx) => `
                      <div class="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200">
                        <div>
                          <div class="font-bold text-slate-900">${escapeHtml(cv.label)}</div>
                          <div class="text-[11px] text-slate-500">${escapeHtml(cv.savedAt)} · ${(cv.evidenceVault || []).length} evidence item(s)</div>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <button type="button" data-load-cv="${idx}" class="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 font-bold">Load</button>
                          <button type="button" data-del-cv="${idx}" aria-label="Delete saved CV" class="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold">✕</button>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              <div class="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 space-y-2 text-xs">
                <div class="flex items-center justify-between gap-2">
                  <strong class="text-blue-950">Honest Application Cover Letter (From Your Real Evidence)</strong>
                  <button type="button" id="copy-cover-btn" class="px-3 py-1 rounded-xl bg-blue-700 text-white font-extrabold">Copy Letter</button>
                </div>
                <pre class="whitespace-pre-wrap font-sans text-[11px] text-slate-800 bg-white p-3 rounded-xl border border-blue-100">${escapeHtml(buildHonestMotivationLetter())}</pre>
              </div>
            </div>

            <!-- Skills Gap + Evidence-Based Interview Coach + Starter Projects -->
            <div class="lg:col-span-5 space-y-4">
              <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2.5 text-xs">
                <h2 class="text-sm font-extrabold text-slate-900">Skills Gap Check (Target: IT Support)</h2>
                <div class="flex flex-wrap gap-1.5">
                  ${reqSkills.map(sk =>{
                    const has = vaultBlob.includes(sk.toLowerCase());
                    return `<span class="px-2.5 py-1 rounded-full font-bold ${has ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-50 text-amber-900 border border-amber-200'}">${has ? '✓ ' : ' Missing: '}${escapeHtml(sk)}</span>`;
                  }).join('')}
                </div>
              </div>

              <div class="bg-white rounded-3xl p-5 border border-indigo-200 shadow-sm space-y-2.5 text-xs">
                <div class="flex items-center justify-between">
                  <h2 class="text-sm font-extrabold text-indigo-950">Evidence-Based Interview Coach</h2>
                  <button id="next-int-q" class="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-bold">Next Question →</button>
                </div>
                ${activeEv ? `
                  <div class="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-1">
                    <div class="font-extrabold text-indigo-950">Based on your real entry ("${escapeHtml(activeEv.skill)}"):</div>
                    <p class="text-slate-800">"Tell me step-by-step how you used <strong>${escapeHtml(activeEv.tools)}</strong> when handling <strong>${escapeHtml(activeEv.skill)}</strong>. What went wrong first, and how did you confirm it was fixed?"</p>
                  </div>
                  <textarea id="star-draft" rows="2" placeholder="Practice your honest answer here (Situation → Action → Tools → Real Result)..." class="w-full px-2.5 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs">${escapeHtml(state.starDraft || '')}</textarea>
                  ${(() =>{
                    const g = evaluateStarAnswer(state.starDraft);
                    if (!g) return '<div class="text-[11px] text-slate-500">Type your real answer above for instant STAR structure feedback.</div>';
                    return `<div class="flex flex-wrap gap-1.5 text-[10px] font-bold">
                      <span class="px-2 py-0.5 rounded-full ${g.hasContext ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}">${g.hasContext ? '✓ Context/Situation' : ' Add where/when'}</span>
                      <span class="px-2 py-0.5 rounded-full ${g.hasAction ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}">${g.hasAction ? '✓ Action Verb' : ' Say what YOU did'}</span>
                      <span class="px-2 py-0.5 rounded-full ${g.hasResult ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}">${g.hasResult ? '✓ Outcome Verified' : ' Add real outcome'}</span>
                    </div>`;
                  })()}
                ` : '<p class="text-slate-500">Add one real evidence item on the left to unlock tailored interview questions.</p>'}
              </div>

              <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2 text-xs">
                <h2 class="text-sm font-extrabold text-slate-900">No Experience? Build a Real Starter Project</h2>
                ${STARTER_PROJECTS.map(pr =>`<div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200"><div class="font-bold text-slate-900">${escapeHtml(pr.title)}</div><div class="text-[11px] text-slate-600 mt-0.5">${escapeHtml(pr.prompt)}</div></div>`).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // v68: Work Path = jobs you can apply for NOW. Kept separate from Study Path (courses) and Career Path (what you can become).
    const JOB_KINDS = { gov: 'Government post', learn: 'Learnership / internship', private: 'Private / local employer' };
    function jobKindOf(w) {
      const blob = `${w.employer || ''} ${w.url || ''} ${w.title || ''}`.toLowerCase();
      if (/learnership|internship|apprentic|trainee|\byouth\b|sayouth|\bintern\b/.test(blob)) return 'learn';
      if (/gov\.za|\.gov\.|dpsa|department|municipal|provincial|public service|dpme|saps/.test(blob)) return 'gov';
      return 'private';
    }
    const JOB_KIND_HELP = {
      gov: 'Usually Grade 12 for entry posts. Send a completed Z83 form and certified copies, quoting the reference number. Never pay to apply.',
      learn: 'Often Grade 9-12 (depends on the NQF level), sometimes Maths or Maths Lit, and age/unemployed rules. You earn a stipend while learning.',
      private: 'Read the advert for the exact minimum (often Grade 12 plus experience). A real employer never charges you to apply.'
    };
    function workReadinessRows() {
      const n = evaluateNsc(getActiveSubjects());
      const have = n.complete && n.passLevel !== 'Did Not Meet Minimum NSC Pass';
      const g12 = n.complete ? (have ? { t: 'You have a Grade 12 pass', c: 'text-emerald-300' } : { t: 'Grade 12 pass not reached yet', c: 'text-rose-300' }) : { t: 'Enter all 7 subjects to check', c: 'text-slate-300' };
      const mathsOk = (() => { const m = state.subjects.find(x => x.name === 'Mathematics' || x.name === 'Mathematical Literacy'); return m && Number(m.mark) >= 40; })();
      return [
        ['Public Service entry posts (clerk, admin, data capturer)', 'Grade 12 (NSC) for most entry levels. Higher posts need a diploma or degree.', g12],
        ['Learnerships (paid training with a qualification)', 'Grade 9 to 12, depends on the NQF level. Many want Maths or Maths Lit.', n.complete ? (have && mathsOk ? { t: 'You likely meet the usual minimum', c: 'text-emerald-300' } : { t: have ? 'Check the Maths/Maths Lit requirement' : 'Lower-level learnerships may still accept you', c: 'text-amber-300' }) : { t: 'Enter all 7 subjects to check', c: 'text-slate-300' }],
        ['Apprenticeships / artisan (diesel, electrical, fitting)', 'N2 or NC(V) Level 3-4, or Grade 12 with Maths and technical subjects, plus an employer.', { t: 'Study Path: TVET NC(V) or N1-N3 first', c: 'text-amber-300' }],
        ['Graduate internships / traineeships', 'A completed diploma or degree.', { t: 'Needs a finished qualification: see Study Path', c: 'text-slate-300' }],
        ['Retail, call centre, hospitality, security', 'Grade 12 helps; security needs PSIRA registration.', g12]
      ];
    }
    function activeWorkItems() { return SAMPLE_WORK.filter(w => !getJobFreshness(w.closing).expired); }
    function workQualCard() {
      const M = window.MZWORK; if (!M) return '';
      const lvl = state.qualLevel || '', fld = state.qualField || '', wq = state.workQual || 'all';
      const act = activeWorkItems();
      const nGen = act.filter(w => M.jobQual(w).rank === 0).length;
      const nQual = act.filter(w => (M.jobQual(w).rank || 0) >= 1).length;
      const nMine = lvl ? act.filter(w => M.jobQual(w).rank >= 1 && M.fits(lvl, w)).length : 0;
      const chips = [['all', 'All jobs (' + act.length + ')'], ['general', 'General jobs, no qualification (' + nGen + ')'], ['qualified', 'Needs a qualification (' + nQual + ')'], ['mine', 'Fits what I completed' + (lvl ? ' (' + nMine + ')' : '')]];
      const help = !lvl ? 'Tell us what you have finished and we will sort jobs for you.' : (wq === 'mine' ? 'Showing jobs that ask for a qualification at or below yours' + (fld ? ', with ' + escapeHtml(fld) + ' jobs first.' : '.') : 'Jobs are labelled by what they usually ask for.');
      return `<section id="work-qual-card" class="wq-card">
        <h2 class="wq-h">What have you completed?</h2>
        <p class="wq-p">Finished studying? Pick your highest qualification and your field. Jobs that need a diploma or degree are shown separately from general jobs.</p>
        <div class="wq-row">
          <label class="wq-lab">Highest qualification<select id="qual-level" class="wq-in"><option value="">Choose...</option>${M.LEVELS.map(l => `<option value="${l.key}" ${lvl === l.key ? 'selected' : ''}>${l.label}</option>`).join('')}</select></label>
          <label class="wq-lab">Field of study<input id="qual-field" class="wq-in" type="text" maxlength="60" value="${escapeHtml(fld)}" placeholder="e.g. IT, Accounting, Engineering" /></label>
        </div>
        <div class="wq-chips" id="work-qual-chips">${chips.map(([k, l]) => `<button type="button" data-work-qual="${k}" class="wq-chip ${wq === k ? 'on' : ''}">${escapeHtml(l)}</button>`).join('')}</div>
        <p class="wq-note">${help} Labels are guesses from the job title unless the job states them. The advert always has the final word.</p>
        <div class="wq-boards"><strong>Where graduates and diploma holders look:</strong>
          <a href="https://www.pnet.co.za/" target="_blank" rel="noopener noreferrer">PNet ↗</a>
          <a href="https://www.careerjunction.co.za/" target="_blank" rel="noopener noreferrer">CareerJunction ↗</a>
          <a href="https://za.indeed.com/" target="_blank" rel="noopener noreferrer">Indeed SA ↗</a>
          <a href="https://www.linkedin.com/jobs/" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
          <a href="https://www.yes4youth.co.za/" target="_blank" rel="noopener noreferrer">YES programme ↗</a>
          <a href="https://sayouth.mobi/" target="_blank" rel="noopener noreferrer">SA Youth ↗</a>
          <span>Never pay to apply for a job.</span></div>
      </section>`;
    }
    function atsCard() {
      return `<section id="ats-card" class="wq-card">
        <h2 class="wq-h">Is my CV ATS friendly?</h2>
        <p class="wq-p">Many employers use software (an ATS) that reads your CV before a person does. Paste your CV text for a quick checklist. This is a rule-based check to help you fix common problems. It cannot promise a pass.</p>
        <label class="wq-lab">Your CV text<textarea id="ats-cv" rows="6" class="wq-in" placeholder="Paste your CV here...">${escapeHtml(state.cvRawText || '')}</textarea></label>
        <label class="wq-lab">Job advert (optional, to check key words)<textarea id="ats-ad" rows="3" class="wq-in" placeholder="Paste the job advert to see which key words you are missing"></textarea></label>
        <div class="wq-actions"><button type="button" id="ats-run" class="wq-btn">Check my CV</button><button type="button" data-tab="vault" class="wq-btn ghost">Build or fix my CV</button></div>
        <div id="ats-out" class="wq-out" aria-live="polite"></div>
        <p class="wq-note">Safest format: a Word (.docx) or text-based PDF, one column, plain headings, no photos, tables or text boxes. Keep your ID number off it.</p>
      </section>`;
    }
    function renderAtsResult(r) {
      const col = r.score >= 75 ? 'good' : (r.score >= 50 ? 'mid' : 'bad');
      const kw = (r.adGiven ? `<div class="wq-kw"><strong>Key words you have:</strong> ${r.matched.length ? escapeHtml(r.matched.join(', ')) : 'none yet'}<br><strong>Missing from your CV (add only if true):</strong> ${r.missing.length ? escapeHtml(r.missing.join(', ')) : 'none'}</div>` : '');
      return `<div class="wq-score ${col}">${r.score}<small>/100</small></div><ul class="wq-list">${r.items.map(i => `<li class="${i.ok ? 'ok' : 'no'}"><span aria-hidden="true">${i.ok ? '✓' : '!'}</span> ${escapeHtml(i.text)}</li>`).join('')}</ul>${kw}`;
    }
    function renderWork() {
      const wr = workReadinessRows();
      const wk = state.workKind || 'all';
      return `
        <div class="space-y-4">
          <section class="rounded-2xl bg-slate-900 text-white p-5 space-y-3">
            <div class="text-[11px] font-extrabold uppercase tracking-wide text-slate-300">Work Path · jobs you can apply for now</div>
            <h1 class="text-xl font-extrabold">Which jobs can I apply for?</h1>
            <p class="text-xs text-slate-300 leading-relaxed">This page is about <strong>jobs, learnerships and internships</strong>. Courses are on the <strong>Study Paths</strong> tab and careers are on <strong>Career Paths</strong>.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">${wr.map(r => `<div class="p-2.5 rounded-xl bg-white/10 text-xs space-y-0.5"><div class="font-extrabold">${escapeHtml(r[0])}</div><div class="text-slate-300">${escapeHtml(r[1])}</div><div class="font-bold ${r[2].c}">${escapeHtml(r[2].t)}</div></div>`).join('')}</div>
            <div class="text-[11px] text-slate-400">Typical minimums only. The advert always has the final word.</div>
            <div class="flex flex-wrap gap-1.5 text-[11px] font-extrabold" id="work-kind-chips">${[['all', 'All jobs'], ['gov', 'Government posts'], ['learn', 'Learnerships & internships'], ['private', 'Private & local']].map(([k, l]) => `<button type="button" data-work-kind="${k}" class="px-3 py-1.5 rounded-full border ${wk === k ? 'bg-white text-slate-900 border-white' : 'bg-transparent text-white border-slate-500'}">${l}</button>`).join('')}</div>
          </section>
          ${workQualCard()}
          ${atsCard()}
          <div id="legal-free-jobs-card" class="rounded-2xl bg-white border border-slate-200 border-l-4 border-l-slate-900 p-4 shadow-sm space-y-2.5 text-xs">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 class="text-sm font-extrabold text-slate-900">Free, Legal Open-Job Sources (Zero Scraping · Still-Open Closing Dates)</h2>
                <p class="text-slate-600 mt-0.5">Never pay fees and never rely on scraped boards. Use official South African portals below (weekly DPSA circulars stay open 2–3 weeks) or import a verified open-jobs JSON list:</p>
              </div>
              <div class="flex flex-wrap gap-1.5 shrink-0">
                <button type="button" id="dl-jobs-template-btn" class="px-3 py-1.5 rounded-lg bg-white text-slate-800 border border-slate-300 font-bold hover:bg-slate-100">Employer JSON Template</button>
                <label class="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold cursor-pointer hover:bg-slate-800">
                  Import Open Jobs (.json)
                  <input id="import-jobs-json-input" type="file" accept=".json" class="hidden" />
                </label>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 font-bold text-[11px]">
              <a href="https://www.gov.za/about-government/government-jobs" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-200">SA Gov / Weekly DPSA Circulars ↗</a>
              <a href="https://www.labour.gov.za/vacancies" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-200">Dept. of Employment &amp; Labour ↗</a>
              <a href="https://sayouth.mobi/" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100">SA Youth (Data-Free) ↗</a>
              <a href="https://docs.greenhouse.io/job-board.html" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100">Public ATS Feeds (Greenhouse) ↗</a>
              <a href="https://developer.adzuna.com/" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100">Adzuna Free SA API ↗</a>
            </div>
          </div>
          <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2.5 text-xs">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="font-extrabold text-slate-900">Automatic Open-Job Search &amp; Profile Match ${liveFeedLoadedCount ? `<span class="ml-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px]">Live Feed: +${liveFeedLoadedCount}</span>` : ''}</div>
              <div class="flex flex-wrap gap-1.5"><button type="button" id="refresh-live-jobs-btn" class="px-2.5 py-1.5 rounded-lg bg-white text-slate-800 border border-slate-300 font-bold hover:bg-slate-100">Refresh Live Feed</button>${(state.jobSearchQuery || state.savedJobsOnly || state.closingSoonOnly || state.autoMatchJobsOnly || (state.jobProvinceFilter && state.jobProvinceFilter !== 'ALL')) ? '<button type="button" id="clear-job-filters-btn" class="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-bold hover:bg-rose-100">Reset Filters</button>' : ''}<button type="button" id="export-saved-jobs-csv-btn" class="px-2.5 py-1.5 rounded-lg bg-white text-slate-800 border border-slate-300 font-bold hover:bg-slate-100">Export CSV</button><button type="button" id="closing-soon-jobs-btn" class="px-2.5 py-1.5 rounded-lg font-bold border ${state.closingSoonOnly ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'}">Closing ≤7d</button><button type="button" id="saved-jobs-only-btn" class="px-2.5 py-1.5 rounded-lg font-bold border ${state.savedJobsOnly ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'}">Saved Only (${(state.savedOpenJobs || []).length})</button><button type="button" id="auto-job-match-btn" class="px-3 py-1.5 rounded-lg font-bold border ${state.autoMatchJobsOnly ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-800 border-slate-300'}">${state.autoMatchJobsOnly ? 'Auto-Matched to My Profile: ON' : 'Auto-Match to My Profile & Province'}</button></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input id="auto-job-search-input" type="text" value="${escapeHtml(state.jobSearchQuery || '')}" placeholder="Search open jobs by role, skill, or town (e.g. Technician, Clerk, IT, Mpumalanga, eMalahleni)..." class="sm:col-span-6 w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold" />
              <select id="job-province-filter" aria-label="Filter open jobs by province" class="sm:col-span-3 w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold">
                ${['ALL', 'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'].map(pv => `<option value="${pv}" ${(state.jobProvinceFilter || 'ALL') === pv ? 'selected' : ''}>${pv === 'ALL' ? 'All 9 Provinces & National' : pv}</option>`).join('')}
              </select>
              <select id="job-sort-select" aria-label="Sort open jobs" class="sm:col-span-3 w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold">
                <option value="match" ${(state.jobSortBy || 'match') === 'match' ? 'selected' : ''}>Sort: Best Profile Match</option>
                <option value="closing_soonest" ${state.jobSortBy === 'closing_soonest' ? 'selected' : ''}>Sort: Closing Soonest</option>
                <option value="employer_az" ${state.jobSortBy === 'employer_az' ? 'selected' : ''}>Sort: Employer A–Z</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            ${(() => {
              const q = (state.jobSearchQuery || '').trim().toLowerCase();
              const savedSet = new Set(state.savedOpenJobs || []);
              const provFilter = state.jobProvinceFilter || 'ALL';
              let items = SAMPLE_WORK.map(w => ({ ...w, jobKey: `${w.title}|${w.employer}|${w.url}`, matchScore: scoreJobMatch(w), freshness: getJobFreshness(w.closing), kind: jobKindOf(w) })).filter(w => !w.freshness.expired);
              if ((state.workKind || 'all') !== 'all') items = items.filter(w => w.kind === state.workKind);
              if (window.MZWORK) {
                const wqf = state.workQual || 'all';
                if (wqf === 'general') items = items.filter(w => MZWORK.jobQual(w).rank === 0);
                else if (wqf === 'qualified') items = items.filter(w => (MZWORK.jobQual(w).rank || 0) >= 1);
                else if (wqf === 'mine') items = items.filter(w => MZWORK.jobQual(w).rank >= 1 && MZWORK.fits(state.qualLevel, w) !== false);
              }
              if (provFilter !== 'ALL') items = items.filter(w => `${w.province} ${w.town}`.toLowerCase().includes(provFilter.toLowerCase()) || String(w.province || '').toLowerCase() === 'south africa');
              if (q) items = items.filter(w => `${w.title} ${w.employer} ${w.town} ${w.province}`.toLowerCase().includes(q));
              if (state.savedJobsOnly) items = items.filter(w => savedSet.has(w.jobKey));
              if (state.closingSoonOnly) items = items.filter(w => {
                const m = String(w.closing || '').match(/(\d{4}-\d{2}-\d{2})/);
                if (!m) return false;
                const t = new Date(); t.setHours(0, 0, 0, 0);
                const d = Math.round((new Date(m[1] + 'T00:00:00').getTime() - t.getTime()) / 86400000);
                return d >= 0 && d <= 7;
              });
              if (state.autoMatchJobsOnly) items = items.filter(w => w.matchScore > 0);
              const sortMode = state.jobSortBy || 'match';
              if (sortMode === 'closing_soonest') {
                items.sort((a, b) => {
                  const da = (String(a.closing || '').match(/\d{4}-\d{2}-\d{2}/) || ['9999-12-31'])[0];
                  const db = (String(b.closing || '').match(/\d{4}-\d{2}-\d{2}/) || ['9999-12-31'])[0];
                  return da.localeCompare(db) || (b.matchScore - a.matchScore);
                });
              } else if (sortMode === 'employer_az') {
                items.sort((a, b) => String(a.employer || '').localeCompare(String(b.employer || '')));
              } else {
                items.sort((a, b) => b.matchScore - a.matchScore);
              }
              const totalActive = SAMPLE_WORK.filter(w => !getJobFreshness(w.closing).expired).length;
              if (!items.length) return '<div class="md:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2"><span>No active open jobs matched that filter. Reset filters, import an open-jobs JSON feed, or check the official SA portals below.</span><button type="button" data-empty-reset-jobs="1" class="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold">Clear All Filters</button></div>';
              return `<div class="md:col-span-2 text-[11px] font-semibold text-slate-600">Showing <strong>${items.length}</strong> of <strong>${totalActive}</strong> active open job${totalActive === 1 ? '' : 's'} (expired roles automatically hidden).</div>` + items.map(w =>`
              <article class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2 text-xs">
                <div class="flex flex-wrap items-center justify-between gap-1.5">
                  <div class="font-bold text-teal-700">${escapeHtml(w.employer)}</div>
                  <div class="flex flex-wrap items-center gap-1">
                    <span class="px-2 py-0.5 rounded border text-[10px] font-bold ${w.freshness.badgeClass}">${escapeHtml(w.freshness.label)}</span>
                    ${w.matchScore > 0 ? `<span class="px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-bold">Profile Match ${w.matchScore}%</span>` : ''}
                  </div>
                </div>
                <h2 class="text-base font-extrabold text-slate-900">${escapeHtml(w.title)}</h2>
                <div class="flex flex-wrap items-center gap-1.5"><span class="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-extrabold">${escapeHtml(JOB_KINDS[w.kind] || 'Job')}</span>${window.MZWORK ? (() => { const q = MZWORK.jobQual(w), f = MZWORK.fits(state.qualLevel, w); return `<span class="wq-badge r${q.rank === null ? 'x' : q.rank}">${escapeHtml(q.label)}${q.inferred ? ' (guess)' : ''}</span>` + (q.rank >= 1 && f === true ? '<span class="wq-badge you">You have this level ✓</span>' : (q.rank >= 1 && f === false ? '<span class="wq-badge no">Above your level</span>' : '')) + (MZWORK.fieldFit(state.qualField, w) ? '<span class="wq-badge you">In your field</span>' : ''); })() : ''}</div>
                <div class="text-slate-600">${escapeHtml(w.town)}, ${escapeHtml(w.province)} · ${escapeHtml(w.salary)} · Closes ${escapeHtml(w.closing)}</div>
                <div class="p-2 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-950"><strong>Minimum to apply (typical):</strong> ${escapeHtml(JOB_KIND_HELP[w.kind] || '')}</div>
                <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-0.5">
                  <div><strong>Employer Identity:</strong> ${escapeHtml(w.trust.id)}</div>
                  <div><strong>Source Check:</strong> ${escapeHtml(w.trust.source)}</div>
                  <div><strong>Scam Check:</strong> ${escapeHtml(w.trust.scam)}</div>
                </div>
                <div class="flex flex-wrap items-center gap-2 pt-1">
                  <a href="${escapeHtml(w.url)}" target="_blank" rel="noopener noreferrer" class="inline-block px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold">Official Link ↗</a>
                  <button type="button" data-verify-job-employer="${escapeHtml(w.employer)}" data-verify-job-url="${escapeHtml(w.url)}" class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold">Verify Employer</button>
                  <button type="button" data-tailor-job-title="${escapeHtml(w.title)}" class="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold">Tailor CV</button>
                  <button type="button" data-save-job-id="${escapeHtml(w.jobKey)}" class="px-3 py-2 rounded-xl border font-bold ${savedSet.has(w.jobKey) ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'}">${savedSet.has(w.jobKey) ? 'Saved ✓' : 'Save Job'}</button>
                  <button type="button" data-copy-job-url="${escapeHtml(w.url)}" data-copy-job-title="${escapeHtml(w.title)}" class="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold">Copy Link</button>
                </div>
              </article>
            `).join('');
            })()}
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <section id="gov-portal-directory" class="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2.5 text-xs">
              <div>
                <h2 class="text-sm font-extrabold text-slate-900">Official SA Government &amp; Municipal Job Notice Strategy (${escapeHtml(state.province)})</h2>
                <p class="text-slate-600 mt-0.5">South Africa has 250+ separate municipalities and many go months without posting vacancies. Instead of checking stale municipal sites daily, follow this reliable public cadence:</p>
              </div>
              <ul class="space-y-1.5 text-slate-700 list-disc pl-4">
                <li><strong>Every Friday (Best National Source):</strong> Check the weekly DPSA Public Service Vacancy Circular on <a href="https://www.gov.za/about-government/government-jobs" target="_blank" rel="noopener noreferrer" class="text-blue-700 font-bold underline">gov.za</a> (posts stay open 2–3 weeks across all 9 provinces).</li>
                <li><strong>Weekly Check:</strong> Browse <a href="https://www.labour.gov.za/vacancies" target="_blank" rel="noopener noreferrer" class="text-blue-700 font-bold underline">Department of Employment &amp; Labour</a> and data-free <a href="https://sayouth.mobi/" target="_blank" rel="noopener noreferrer" class="text-blue-700 font-bold underline">SA Youth</a> for entry-level Matric &amp; learnership openings.</li>
                <li><strong>Local Municipalities (${escapeHtml(state.province)}):</strong> Only check your local municipal noticeboard once a week and always verify the official <code>.gov.za</code> domain before submitting any CV or Z83.</li>
              </ul>
            </section>
            <section id="z83-checklist-card" class="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 border-l-4 border-l-blue-700 shadow-sm space-y-2 text-xs">
              <h2 class="text-sm font-extrabold text-slate-900">Z83 Government Application Checklist</h2>
              <p class="text-slate-600">Government posts reject incomplete applications automatically. Before submitting:</p>
              <ul class="space-y-1 text-slate-700 list-disc pl-4">
                <li>Use the latest official Z83 form from <a href="https://www.gov.za/about-government/government-jobs" target="_blank" rel="noopener noreferrer" class="text-blue-700 font-bold underline">gov.za</a>.</li>
                <li>Copy the exact <strong>Post Reference Number</strong> from the DPSA circular.</li>
                <li>Initial every page and sign &amp; date the declaration.</li>
                <li>Attach your clean single-column Evidence CV (certified copies are usually requested only if shortlisted).</li>
              </ul>
              <button type="button" id="dl-z83-prep-btn" class="mt-2 w-full py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800">Download Z83 Prep Sheet (.txt)</button>
            </section>
          </div>
          <section id="gov-alerts-card" class="bg-white rounded-2xl p-5 border border-slate-200 border-l-4 border-l-emerald-700 shadow-sm space-y-2 text-xs">
            <h2 class="text-sm font-extrabold text-slate-900">Official SA Government Opportunity &amp; Bursary Cycles (Zero Fees)</h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-slate-700">
              <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200"><strong>Weekly DPSA Circulars:</strong> Published every Friday on <a href="https://www.gov.za/about-government/government-jobs" target="_blank" rel="noopener noreferrer" class="text-blue-700 font-bold underline">gov.za</a> (2–3 week closing windows).</div>
              <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200"><strong>NSFAS &amp; DHET Notices:</strong> Verify annual bursary &amp; Missing Middle windows on <a href="https://www.nsfas.org.za/" target="_blank" rel="noopener noreferrer" class="text-blue-700 font-bold underline">nsfas.org.za</a> &amp; <a href="https://www.dhet.gov.za/" target="_blank" rel="noopener noreferrer" class="text-blue-700 font-bold underline">dhet.gov.za</a>.</div>
              <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200"><strong>CAS Placement Support:</strong> Official government WhatsApp <span class="font-mono font-bold">081 308 4196</span> (replaced CACH from 2026).</div>
            </div>
          </section>
          ${renderMultiUniApsComparison(getActiveSubjects())}
          <section id="qcto-verify-wizard" class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 text-xs">
            <div>
              <h2 class="text-sm font-extrabold text-slate-900">Verify a QCTO / Private Training Provider (Anti-Scam &amp; Legacy SAQA Check)</h2>
              <p class="text-slate-600 mt-0.5">QCTO accreditation is <strong>qualification-specific AND campus-site-specific</strong>. Never pay a private college before completing all 4 checks:</p>
            </div>
            <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
              <strong>Legacy Qualification Warning:</strong> Retired IT qualifications like <em>National Certificate: IT Technical Support</em> (<strong>SAQA 24293</strong>) and <em>FETC: IT Technical Support</em> (<strong>SAQA 78964</strong>) have passed their registration end dates. Prefer current occupational certificates such as <strong>SAQA 101408</strong> (Computer Technician, NQF 5, 282 credits), <strong>SAQA 119438</strong> (Software Tester, NQF 5, 70 credits), or <strong>SAQA 122661</strong> (Database Administrator, MICT SETA).
            </div>
            <ol class="list-decimal pl-5 space-y-1 text-slate-700">
              <li>Look up the exact SAQA Qualification ID and active registration status on <a href="https://allqs.saqa.org.za/" target="_blank" rel="noopener noreferrer" class="font-bold text-blue-700 hover:underline">SAQA Qualification Search ↗</a>.</li>
              <li>Verify the provider is listed on <a href="https://www.qcto.org.za/" target="_blank" rel="noopener noreferrer" class="font-bold text-blue-700 hover:underline">QCTO Accredited SDPs ↗</a> for that exact qualification and physical campus site.</li>
              <li>Ask the provider for their written QCTO/SETA accreditation certificate number and confirm whether they are an accredited training site vs. assessment/trade-test centre.</li>
              <li>Never pay upfront registration fees to personal bank accounts or eWallet/CashSend, and distrust any provider promising a "guaranteed job".</li>
            </ol>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div class="font-bold text-slate-900">Quick Offline DHET Private College Registration Format Checker</div>
              <div class="flex flex-wrap gap-2">
                <input id="dhet-reg-check-input" type="text" placeholder="e.g. 2023/FE07/003 or 2008/HE07/004" class="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-mono" />
                <button type="button" id="dhet-reg-check-btn" class="px-3.5 py-2 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800">Check Format</button>
              </div>
              <div id="dhet-reg-check-out" class="text-[11px] font-semibold text-slate-700">Note: NATED Report 191 N1–N3 was phased out from 1 Jan 2024 (Gazette 49518); private colleges may not enrol new N1–N3 learners.</div>
            </div>
          </section>
          <section id="next-90-days-card" class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 text-xs">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 class="text-sm font-extrabold text-slate-900">Next 90 Days: Key SA 2026/2027 Dates &amp; What Now?</h2>
                <p class="text-slate-600 mt-0.5">NSFAS 2027 closed 31 Oct 2026 (no extensions; helpline 0800 067 327). Missed a window? Check May/June 2027 rewrites, TVET July intakes, SETA learnerships, or early 2028 openings.</p>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              ${NEXT_90_DAYS_EVENTS.map(ev => {
                const d = getDaysUntilIso(ev.date);
                const badge = d === null ? 'Check Date' : (d < 0 ? 'Passed' : (d === 0 ? 'Today' : `${d} day${d === 1 ? '' : 's'} left`));
                const cls = d !== null && d >= 0 && d <= 7 ? 'bg-amber-50 text-amber-900 border-amber-200' : (d !== null && d < 0 ? 'bg-rose-50 text-rose-900 border-rose-200' : 'bg-blue-50 text-blue-900 border-blue-200');
                return `<div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"><div><a href="${escapeHtml(ev.url)}" target="_blank" rel="noopener noreferrer" class="font-bold text-blue-700 hover:underline">${escapeHtml(ev.title)} ↗</a><div class="text-[11px] text-slate-500">Date: <strong>${escapeHtml(ev.date)}</strong></div></div><span class="px-2 py-0.5 rounded border text-[10px] font-bold whitespace-nowrap ${cls}">${escapeHtml(badge)}</span></div>`;
              }).join('')}
            </div>
            <div id="mpumalanga-reality-banner" class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
              <strong>Mpumalanga Career Reality (DHET LMI 2024):</strong> Provincial job growth has lagged the national average since 2019, and heavily subscribed trades/clerical roles carry an oversupply caution (<code>*</code>). Build demonstrable skills, verify every employer, and apply across multiple routes.
            </div>
            <details id="missed-deadline-tree" class="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-950">
              <summary class="font-extrabold cursor-pointer">Missed a 2027 Application Deadline? View 5 Legal Next Steps</summary>
              <ol class="list-decimal pl-5 mt-2 space-y-1">
                <li><strong>Wait for Jan 2027 NSC results:</strong> Check official institution portals for space or second-round openings (note: institutions like CUT explicitly do not accept walk-ins or late applications).</li>
                <li><strong>Improve your marks:</strong> Register for the <strong>May/June 2027 Second-Chance NSC Rewrite</strong> before <strong>5 Feb 2027</strong> (manual/official registration; no late applications).</li>
                <li><strong>Public TVET July intake:</strong> Check Mpumalanga's 3 public TVET colleges (Nkangala, Gert Sibande, Ehlanzeni) for mid-year NC(V), NATED N4–N6, or QCTO intakes.</li>
                <li><strong>Zero-fee SETA learnerships &amp; apprenticeships:</strong> Apply directly on official SETA sites (MICT SETA, merSETA, CETA) and Friday DPSA Circulars.</li>
                <li><strong>Apply early for 2028:</strong> Most SA universities open 2028 applications between March and June 2027.</li>
              </ol>
            </details>
            <div class="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
              <span>Spotted a changed closing date, fee, or APS rule?</span>
              <a id="creator-studio-link" href="./creator_studio.html" target="_blank" rel="noopener noreferrer" class="font-bold text-emerald-700 hover:underline mr-3">Open Creator Studio ↗</a><a id="report-data-issue-link" href="https://github.com/pmech1987/mzansi-pathways/issues/new" target="_blank" rel="noopener noreferrer" class="font-bold text-blue-700 hover:underline">Report an error / prospectus update ↗</a>
            </div>
          </section>
          <section id="gov-watchlist-card" class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 text-xs">
            <div>
              ${(() => { const overdueCount = (state.govWatchlist || []).filter(w => getPortalCheckStatus(w.lastChecked).overdue).length; return `<div class="flex flex-wrap items-center justify-between gap-2"><h2 class="text-sm font-extrabold text-slate-900">Personal Official Portal &amp; Municipal Check Tracker</h2><span class="px-2 py-0.5 rounded border text-[10px] font-bold ${overdueCount > 0 ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-emerald-50 text-emerald-900 border-emerald-200'}">${overdueCount > 0 ? `${overdueCount} Due for Check` : 'All Up to Date'}</span>${overdueCount > 0 ? '<button type="button" id="mark-all-portals-checked-btn" class="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold hover:bg-slate-800">Mark All Checked</button>' : ''}</div>`; })()}
              <p class="text-slate-600 mt-0.5">Track when you last checked official government or local <code>.gov.za</code> municipal sites so you save mobile data and avoid checking quiet sites repeatedly.</p>
            </div>
            <div class="space-y-1.5">
              ${(state.govWatchlist || []).map((w, idx) => { const st = getPortalCheckStatus(w.lastChecked); return `
                <div class="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <div class="flex flex-wrap items-center gap-1.5">
                      <a href="${escapeHtml(w.url)}" target="_blank" rel="noopener noreferrer" class="font-bold text-blue-700 hover:underline">${escapeHtml(w.name)} ↗</a>
                      <span class="px-1.5 py-0.5 rounded border text-[10px] font-bold ${st.badgeClass}">${escapeHtml(st.label)}</span>
                    </div>
                    <div class="text-[11px] text-slate-500">Cadence: ${escapeHtml(w.cadence || 'Weekly')} · Last checked: <strong>${escapeHtml(w.lastChecked || 'Not checked yet')}</strong></div>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <button type="button" data-check-portal="${idx}" class="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800">Checked Today</button>
                    ${idx >= 1 ? `<button type="button" data-del-portal="${idx}" aria-label="Remove portal" class="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold">✕</button>` : ''}
                  </div>
                </div>
              `; }).join('')}
            </div>
            <form id="add-muni-form" class="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
              <input id="muni-name" required type="text" placeholder="Local Municipality / Dept (e.g. eMalahleni Local Municipality)" class="sm:col-span-5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-semibold" />
              <input id="muni-url" required type="url" placeholder="Official https://...gov.za URL" class="sm:col-span-5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs" />
              <button type="submit" class="sm:col-span-2 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800">+ Track</button>
            </form>
          </section>
          <section id="job-flyer-scanner" class="bg-white rounded-2xl p-5 border border-slate-200 border-l-4 border-l-blue-700 shadow-sm space-y-3 text-xs">
            <div>
              <h2 class="text-sm font-extrabold text-slate-900">WhatsApp &amp; Facebook Job Flyer Photo Scanner (On-Device Trust Check)</h2>
              <p class="text-slate-600 mt-0.5">Local SMEs often post vacancy flyers as images on WhatsApp or Facebook where automated scraping is illegal. Upload any job flyer photo here to check closing dates, email domain legitimacy, landlines, and scam flags locally.</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <label class="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold cursor-pointer hover:bg-slate-800">
                Upload / Snap Job Flyer Photo
                <input id="flyer-image-input" type="file" accept="image/*" class="hidden" />
                    </label>
                    <label class="px-3 py-2 rounded-xl bg-slate-800 text-white font-extrabold cursor-pointer hover:bg-slate-900 min-h-[44px]">
                      Take Photo
                      <input id="flyer-camera-input" type="file" accept="image/*" capture="environment" class="hidden" />
              </label>
              <button type="button" id="flyer-rotate-btn" class="px-2.5 py-1.5 rounded-lg bg-white text-slate-800 border border-slate-300 font-bold hover:bg-slate-100">↻ Rotate 90°</button>
              <button type="button" id="flyer-contrast-btn" class="px-2.5 py-1.5 rounded-lg bg-white text-slate-800 border border-slate-300 font-bold hover:bg-slate-100">Boost Contrast</button>
              <button type="button" id="flyer-detect-btn" class="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800">Re-read Flyer</button>
              <button type="button" id="flyer-sample-btn" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-300 font-bold hover:bg-slate-200">Load Sample Local Flyer</button>
              <button type="button" id="export-flyer-jobs-btn" class="px-3 py-1.5 rounded-lg bg-white text-slate-800 border border-slate-300 font-bold hover:bg-slate-100">Export Saved Jobs (.json)</button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div class="bg-slate-50 rounded-xl p-2 border border-slate-200 text-center">
                <canvas id="flyer-canvas" class="max-w-full h-auto max-h-48 mx-auto rounded-lg bg-slate-100"></canvas>
                <div id="flyer-canvas-status" class="text-[11px] text-slate-500 mt-1">Snap a job poster photo or paste Google Lens text on the right.</div>
              </div>
              <div class="space-y-2">
                <textarea id="flyer-raw-text" rows="4" placeholder="Paste job flyer text (from Auto-Read or Google Lens)..." class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs">${escapeHtml(state.flyerRawText || '')}</textarea>
                <button type="button" id="flyer-parse-btn" class="w-full py-2 rounded-xl bg-blue-700 text-white font-bold hover:bg-blue-800">Analyze Flyer &amp; Trust Signals</button>
              </div>
            </div>
            ${state.flyerParsed ? `
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-300 space-y-1.5 text-[11px]">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <strong class="text-slate-900 text-xs">${escapeHtml(state.flyerParsed.role)}</strong>
                  <button type="button" id="flyer-save-btn" class="px-3 py-1 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800">Save to My Open Jobs</button>
                </div>
                <div><strong>Closing Date:</strong> ${escapeHtml(state.flyerParsed.closing)} · <strong>Phone:</strong> ${escapeHtml(state.flyerParsed.phone || 'Not detected')}</div>
                <div><strong>Apply Email:</strong> ${escapeHtml(state.flyerParsed.email || 'Not detected')} — <span class="font-semibold">${escapeHtml(state.flyerParsed.domainTrust)}</span></div>
                <div class="font-bold ${state.flyerParsed.flags && state.flyerParsed.flags.length ? 'text-rose-700' : 'text-emerald-800'}">${escapeHtml(state.flyerParsed.safeVerdict)}</div>
              </div>
            ` : ''}
            ${(state.savedOpenJobs && state.savedOpenJobs.length) ? `
              <div class="pt-2 border-t border-slate-100 space-y-1.5">
                <div class="font-extrabold text-slate-900">Your Saved Open Flyer Jobs (${state.savedOpenJobs.length})</div>
                ${state.savedOpenJobs.map((sj, i) => `
                  <div class="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                    <div><strong>${escapeHtml(sj.role)}</strong> · Closes: ${escapeHtml(sj.closing)} · ${escapeHtml(sj.email || sj.phone || 'Check flyer')}</div>
                    <button type="button" data-del-saved-job="${i}" class="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold">✕</button>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </section>

          <section id="local-job-finder" class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2.5 text-xs">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 class="text-sm font-extrabold text-slate-900">Local Town &amp; Ward Official Opportunity Finder (${escapeHtml(state.province)})</h2>
                <p class="text-slate-600 mt-0.5">Enter your town or area (e.g. Siyabuswa, eMalahleni, Vaalbank, Mbombela) to launch legal, zero-scraping searches on public South African portals.</p>
              </div>
              <input id="local-town-input" type="text" value="${escapeHtml(state.localTown || '')}" placeholder="Your Town / Ward" class="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-bold" />
            </div>
            <div class="flex flex-wrap gap-2 text-[11px] font-bold">
              <a href="https://sayouth.mobi/" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100">SA Youth (${escapeHtml(state.localTown || state.province)}) ↗</a>
              <a href="https://essa.labour.gov.za/EssaOnline/WebBeans/" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100">ESSA Work-Seeker Match ↗</a>
              <a href="https://www.gov.za/about-government/government-jobs" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-900 border border-slate-300 hover:bg-slate-200">Weekly DPSA Circular (${escapeHtml(state.province)}) ↗</a>
            </div>
          </section>
          <section id="company-legit-card" class="bg-white rounded-2xl p-5 border border-slate-200 border-l-4 border-l-slate-900 shadow-sm space-y-3 text-xs">
            <div>
              <h2 class="text-sm font-extrabold text-slate-900">Verify Any South African Company or Recruitment Agency (Free Official Registers)</h2>
              <p class="text-slate-600 mt-0.5">Before sending your ID, banking details, or attending an interview, check whether the company or agency is genuinely registered using official free government registers (never scraped):</p>
            </div>
            <div class="flex flex-wrap gap-2 font-bold text-[11px]">
              <a href="https://www.bizportal.gov.za/" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800">CIPC BizPortal (Company Lookup) ↗</a>
              <a href="https://www.cipc.co.za/" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-900 border border-slate-300 hover:bg-slate-200">CIPC Official Portal ↗</a>
              <a href="https://www.labour.gov.za/DocumentCenter/Pages/Private-Employment-Agencies-(PEA)-and-Temporary-Employment-Services-(TES).aspx" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100">Registered Recruitment Agencies (PEA/TES) ↗</a>
              <a href="https://essa.labour.gov.za/EssaOnline/WebBeans/" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100">ESSA Free Gov Job Portal ↗</a>
              <a href="https://inforegulator.bizportal.gov.za/Search/Default.aspx" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200">POPIA InfoRegulator Search ↗</a>
              <button type="button" id="copy-registers-btn" class="px-3 py-1.5 rounded-lg bg-white text-slate-900 border border-slate-300 hover:bg-slate-100">Copy Official Links for WhatsApp</button>
            </div>
            <div class="flex flex-wrap items-center gap-2 pt-1">
              <input id="cipc-check-input" type="text" placeholder="Check CIPC Reg No. format (e.g. 2018/123456/07)" class="flex-1 min-w-[220px] px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono" />
              <button type="button" id="cipc-check-btn" class="px-3.5 py-2 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800">Check Format</button>
            </div>
            <div id="cipc-check-out" class="hidden p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-800"></div>
          </section>
          <section class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2.5" aria-labelledby="reg-title">
            <h2 id="reg-title" class="text-base font-extrabold text-slate-900">Verify a private college or qualification</h2>
            <p class="text-xs text-slate-600">Checks the <em>format</em> of a DHET registration number or SAQA ID and warns about retired qualifications. It cannot confirm a college is registered: always check the official DHET register or call 0800 87 2222 before paying anything.</p>
            <div class="flex flex-wrap items-end gap-2">
              <div class="flex-1 min-w-[200px]"><label for="reg-dhet-in" class="block text-[11px] font-bold text-slate-600 mb-1">DHET registration no.</label><input id="reg-dhet-in" type="text" inputmode="text" autocomplete="off" placeholder="e.g. 2015/HE07/001" class="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono" /></div>
              <button type="button" id="reg-dhet-btn" class="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800">Check college number</button>
            </div>
            <div class="flex flex-wrap items-end gap-2">
              <div class="flex-1 min-w-[200px]"><label for="reg-saqa-in" class="block text-[11px] font-bold text-slate-600 mb-1">SAQA qualification ID</label><input id="reg-saqa-in" type="text" inputmode="numeric" autocomplete="off" placeholder="e.g. 78964" class="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono" /></div>
              <button type="button" id="reg-saqa-btn" class="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800">Check SAQA ID</button>
            </div>
            <div id="reg-out" role="status" aria-live="polite" class="hidden p-2.5 rounded-lg border text-[11px] font-semibold"></div>
          </section>
          <form id="scam-form" class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2.5">
            <h2 class="text-base font-extrabold text-slate-900">SA Recruitment Scam Indicator Scanner</h2>
            <textarea id="scam-in" rows="3" required placeholder="Paste any suspicious WhatsApp, Facebook, or SMS job advert..." class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"></textarea>
            <div class="flex flex-wrap gap-2">
              <button type="submit" class="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-extrabold hover:bg-rose-700">Check Risk Indicators</button> <button type="button" id="copy-scam-checklist-btn" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold">Copy Verification Checklist</button>
              <button type="button" id="scam-sample-btn" class="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold hover:bg-slate-200">Test With Sample Scam Advert</button>
            </div>
            ${scamResult ? `<div class="p-3 rounded-2xl border text-xs font-bold ${scamResult.length ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-emerald-50 border-emerald-300 text-emerald-900'}">${scamResult.length ? ' Risk indicators detected: ' + scamResult.map(escapeHtml).join(' | ') : ' No fee or free-email impersonation indicators detected — still verify on the official company site.'}</div>` : ''}
          </form>
        </div>
      `;
    }

    function safeRender() {
      try {
        repairState(state);
        document.querySelectorAll('[data-tab]').forEach(b =>b.classList.toggle('active', b.dataset.tab === state.tab));
        const m = document.getElementById('app-main');
        if (!m) return;
        if (state.tab === 'results') m.innerHTML = renderResults();
        else if (state.tab === 'careers') m.innerHTML = renderCareers();
        else if (state.tab === 'study') m.innerHTML = renderStudy();
        else if (state.tab === 'plan') m.innerHTML = renderPlan();
        else if (state.tab === 'vault') m.innerHTML = renderVault();
        else m.innerHTML = renderWork();
        bindEvents();
        if (state.tab === 'study' && window.MZCAT) MZCAT.bindStudy(state, saveState, render, showToast);
      } catch (err) {
        state.tab = 'results';
        try { document.getElementById('app-main').innerHTML = renderResults(); bindEvents(); showToast('Recovered view safely'); }
        catch (e2) {
          // Last resort: never leave a blank screen. The saved profile is untouched.
          const mm = document.getElementById('app-main');
          if (mm) {
            mm.innerHTML = '<div class="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-sm text-amber-950 space-y-2"><div class="font-extrabold">This screen could not load.</div><p>Your saved information is safe on this phone. Reload the page. If it happens again, open Sync &amp; Backup in Settings and download a backup first.</p><button type="button" id="mz-reload-btn" class="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs">Reload</button></div>';
            const rb = document.getElementById('mz-reload-btn'); if (rb) rb.addEventListener('click', () => location.reload());
          }
        }
      }
    }
    function render() { safeRender(); }

    function bindEvents() {
      document.querySelectorAll('[data-sub-name]').forEach(el =>el.addEventListener('change', e =>{ state.subjects[Number(el.dataset.subName)].name = e.target.value.trim(); saveState(); render(); }));
      document.querySelectorAll('[data-sub-mark]').forEach(el =>el.addEventListener('change', e =>{ state.subjects[Number(el.dataset.subMark)].mark = Math.max(0, Math.min(100, Number(e.target.value) || 0)); saveState(); render(); }));
      const gs = document.getElementById('grade-stage');
      if (gs) gs.addEventListener('change', e =>{ state.gradeStage = e.target.value; saveState(); render(); });
      const ql = document.getElementById('qual-level'); if (ql) ql.addEventListener('change', e => { state.qualLevel = e.target.value; if (state.qualLevel && state.workQual === 'all') state.workQual = 'mine'; saveState(); render(); });
      const qf = document.getElementById('qual-field'); if (qf) qf.addEventListener('change', e => { state.qualField = e.target.value.trim().slice(0, 60); saveState(); render(); });
      const atsBtn = document.getElementById('ats-run'); if (atsBtn) atsBtn.addEventListener('click', () => {
        const cvT = document.getElementById('ats-cv').value, adT = document.getElementById('ats-ad').value;
        state.cvRawText = cvT.slice(0, 30000); saveState();
        const out = document.getElementById('ats-out'); out.innerHTML = renderAtsResult(MZWORK.atsCheck(cvT, adT)); out.scrollIntoView({ block: 'nearest' });
      });
      document.querySelectorAll('[data-aff]').forEach(inp =>inp.addEventListener('change', e =>{
        const [planKey, field] = inp.dataset.aff.split('|');
        const target = planKey === 'A' ? state.affordA : state.affordC;
        if (target) { target[field] = Math.max(0, Number(e.target.value) || 0); saveState(); render(); }
      }));
      const tw = document.getElementById('toggle-whatif');
      if (tw) tw.addEventListener('click', () =>{ state.whatIfActive = !state.whatIfActive; saveState(); render(); });
      const ws = document.getElementById('whatif-sub-select'); if (ws) ws.addEventListener('change', e =>{ state.whatIfSubject = e.target.value; state.whatIfActive = true; saveState(); render(); });
      const wr = document.getElementById('whatif-range');
      if (wr) wr.addEventListener('input', e =>{ state.whatIfMaths = Number(e.target.value); state.whatIfActive = true; saveState(); render(); });
      const tn = document.getElementById('toggle-nouni');
      if (tn) tn.addEventListener('click', () =>{ state.noUniOnly = !state.noUniOnly; saveState(); render(); });
      const th = document.getElementById('toggle-nearhome');
      if (th) th.addEventListener('click', () =>{ state.nearHomeOnly = !state.nearHomeOnly; saveState(); render(); });
      const spkBtn = document.getElementById('speak-summary-btn');
      if (spkBtn) spkBtn.addEventListener('click', speakPathwaysSummary);
      document.querySelectorAll('[data-toggle-hl]').forEach(b =>b.addEventListener('click', () =>{
        const idx = Number(b.dataset.toggleHl);
        if (state.subjects[idx]) { state.subjects[idx].isHomeLanguage = !state.subjects[idx].isHomeLanguage; saveState(); render(); }
      }));
      document.querySelectorAll('[data-toggle-lo]').forEach(b =>b.addEventListener('click', () =>{
        const idx = Number(b.dataset.toggleLo);
        if (state.subjects[idx]) { state.subjects[idx].isLifeOrientation = !state.subjects[idx].isLifeOrientation; saveState(); render(); }
      }));
      const rsort = document.getElementById('route-sort'); if (rsort) rsort.addEventListener('change', e =>{ state.routeSort = e.target.value; saveState(); render(); });
      const rs = document.getElementById('route-search');
      if (rs) rs.addEventListener('input', e =>{
        state.routeSearch = e.target.value;
        clearTimeout(window._rsT);
        window._rsT = setTimeout(() =>{ saveState(); render(); const el = document.getElementById('route-search'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 180);
      });
      document.querySelectorAll('[data-doc-chk]').forEach(chk =>chk.addEventListener('change', () =>{
        state.docChecklist[chk.dataset.docChk] = chk.checked; saveState(); render();
      }));
      const sd = document.getElementById('star-draft');
      if (sd) sd.addEventListener('input', e =>{
        state.starDraft = e.target.value;
        clearTimeout(window._sdT);
        window._sdT = setTimeout(() =>{ saveState(); render(); const el = document.getElementById('star-draft'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 300);
      });
      const rstBtn = document.getElementById('reset-marks-btn');
      if (rstBtn) rstBtn.addEventListener('click', () =>{ state.subjects = DEFAULT_SUBJECTS.map(x =>({ ...x })); state.whatIfActive = false; saveState(); render(); showToast('Reset to default subjects'); });
      document.querySelectorAll('[data-del-sub]').forEach(b =>b.addEventListener('click', () =>{
        if (state.subjects.length <= 6) { showToast('Keep at least 6 subjects for NSC calculation'); return; }
        pushSubjectUndo(); state.subjects.splice(Number(b.dataset.delSub), 1); saveState(); render();
      }));
      document.querySelectorAll('[data-plan-st]').forEach(sel =>sel.addEventListener('change', e =>{
        state.planStatus[sel.dataset.planSt] = e.target.value; saveState(); showToast(`Plan ${sel.dataset.planSt}: ${e.target.value}`);
      }));
      const addSubBtn = document.getElementById('add-subject-btn');
      if (addSubBtn) addSubBtn.addEventListener('click', () =>{
        state.subjects.push({ name: 'New Subject', mark: 50, isHomeLanguage: false, isLifeOrientation: false });
        saveState(); render(); showToast('Added subject row');
      });
      document.querySelectorAll('[data-preset]').forEach(btn =>btn.addEventListener('click', () =>{
        if (btn.dataset.preset === 'tech') {
          state.subjects[2].mark = 48; state.subjects[3].mark = 51; state.selectedCareerId = 'network_eng';
          showToast('Loaded Tech Learner sample marks (Maths 48%)');
        } else {
          state.subjects[2].mark = 42; state.subjects[3].mark = 44; state.selectedCareerId = 'diesel_artisan';
          showToast('Loaded Artisan / TVET sample marks');
        }
        saveState(); render();
      }));
      const pi = document.getElementById('prosp-input');
      if (pi) pi.addEventListener('input', e =>{
        state.prospectusText = e.target.value;
        clearTimeout(window._prT);
        window._prT = setTimeout(() =>{ saveState(); render(); const el = document.getElementById('prosp-input'); if (el) el.focus(); }, 350);
      });
      document.querySelectorAll('[data-quick-route]').forEach(b =>b.addEventListener('click', () =>{
        state.noUniOnly = b.dataset.quickRoute === 'nouni';
        state.tab = 'study'; saveState(); render();
      }));
      const ccBtn = document.getElementById('copy-cover-btn');
      if (ccBtn) ccBtn.addEventListener('click', () =>{
        const msg = buildHonestMotivationLetter();
        const ta = document.createElement('textarea'); ta.value = msg; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); showToast('Honest cover letter copied!'); } catch (err) {} ta.remove();
      });
      document.querySelectorAll('[data-cmp-route]').forEach(b =>b.addEventListener('click', () =>{
        const id = b.dataset.cmpRoute;
        if (state.compareRouteIds.includes(id)) state.compareRouteIds = state.compareRouteIds.filter(x =>x !== id);
        else state.compareRouteIds = [...state.compareRouteIds.slice(-2), id];
        saveState(); render();
      }));
      const csvBtn = document.getElementById('export-routes-csv-btn');
      if (csvBtn) csvBtn.addEventListener('click', exportMatchedRoutesCsv);
      const ddBtn = document.getElementById('dl-dossier-btn');
      if (ddBtn) ddBtn.addEventListener('click', () =>{
        const txt = buildFamilyDossier();
        const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
        const a = document.createElement('a'); a.href = url; a.download = 'Mzansi_Pathways_Family_Dossier.txt';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() =>URL.revokeObjectURL(url), 1000);
        showToast('Downloaded Family Study & Career Dossier!');
      });
      const cpBtn = document.getElementById('copy-plan-btn');
      if (cpBtn) cpBtn.addEventListener('click', () =>{
        const nsc = evaluateNsc(getActiveSubjects());
        const txt = ['A', 'B', 'C'].map(k =>{
          const p = SAMPLE_PROGRAMMES.find(x =>x.id === state.plans[k]);
          return p ? `Plan ${k}: ${p.name} @ ${p.institution} (${p.route}) — ${p.estAnnualCost}` : `Plan ${k}: Not set`;
        }).join('\n');
        const msg = `Mzansi Pathways Family Plan (${state.province}) | ${nsc.passLevel} (APS ${nsc.aps ?? 'n/a'})\n` + txt;
        const ta = document.createElement('textarea'); ta.value = msg; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); showToast('Family Plan A/B/C copied for WhatsApp!'); } catch (err) {} ta.remove();
      });
      document.querySelectorAll('[data-mood]').forEach(b =>b.addEventListener('click', () =>{ state.moodState = b.dataset.mood; saveState(); render(); }));
      const szBtn = document.getElementById('scan-zoom-btn');
      if (szBtn) szBtn.addEventListener('click', () =>{ state.scanZoom = !state.scanZoom; saveState(); render(); });
      const spPlanBtn = document.getElementById('speak-plan-btn');
      if (spPlanBtn) spPlanBtn.addEventListener('click', () =>safeSpeech(buildFamilyTalkScript()));
      const ftBtn = document.getElementById('copy-family-talk-btn');
      if (ftBtn) ftBtn.addEventListener('click', () =>{
        const msg = buildFamilyTalkScript();
        const ta = document.createElement('textarea'); ta.value = msg; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); showToast('Family Talk Script copied!'); } catch (err) {} ta.remove();
      });
      const qas = document.getElementById('quick-add-subject-select');
      if (qas) qas.addEventListener('change', e => {
        const subName = e.target.value;
        if (!subName) return;
        if (state.subjects.some(s => s.name.toLowerCase() === subName.toLowerCase())) {
          showToast(`${subName} is already in your profile`);
          e.target.value = '';
          return;
        }
        pushSubjectUndo();
        state.subjects.push({ name: subName, mark: 55, isHomeLanguage: false, isLifeOrientation: false });
        saveState(); render();
        showToast(`Added ${subName} (set your real mark %)`);
      });
      const undoBtn = document.getElementById('undo-subjects-btn');
      if (undoBtn) undoBtn.addEventListener('click', undoLastSubjects);
      const mmBtn = document.getElementById('mode-manual-btn');
      if (mmBtn) mmBtn.addEventListener('click', () =>{ state.scannerOpen = false; saveState(); render(); });
      const srBtn = document.getElementById('scan-results-btn');
      if (srBtn) srBtn.addEventListener('click', () =>{ state.scannerOpen = true; saveState(); render(); });
      const scBtn = document.getElementById('scan-close-btn');
      if (scBtn) scBtn.addEventListener('click', () =>{ state.scannerOpen = false; saveState(); render(); });
      document.querySelectorAll('[data-g9-goal]').forEach(b =>b.addEventListener('click', () =>{ state.grade9Goal = b.dataset.g9Goal; saveState(); render(); }));

      document.querySelectorAll('[data-inst-search]').forEach(b => b.addEventListener('click', () => { state.routeSearch = b.dataset.instSearch; state.routeFilter = 'All'; state.noUniOnly = false; state.nearHomeOnly = false; state.routeLimit = 20; saveState(); render(); window.scrollTo(0, 0); }));
      const iy = document.getElementById('intake-year');
      if (iy) iy.addEventListener('change', e => { state.intakeYear = Number(e.target.value); state.routeLimit = 20; syncYearLabels(); saveState(); render(); });
      document.querySelectorAll('[data-year-jump]').forEach(b => b.addEventListener('click', () => { state.intakeYear = Number(b.dataset.yearJump); state.routeLimit = 20; syncYearLabels(); saveState(); render(); }));
      const ipn = document.getElementById('inst-panel'); if (ipn) ipn.addEventListener('toggle', () => { state.instOpen = ipn.open; saveState(); });
      const isr = document.getElementById('inst-search');
      if (isr) isr.addEventListener('input', e => { state.instQ = e.target.value; state.instOpen = true; clearTimeout(window._isT); window._isT = setTimeout(() => { saveState(); render(); const el = document.getElementById('inst-search'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 180); });
      const ipv = document.getElementById('inst-prov'); if (ipv) ipv.addEventListener('change', e => { state.instProv = e.target.value; state.instOpen = true; saveState(); render(); });
      const ity = document.getElementById('inst-type'); if (ity) ity.addEventListener('change', e => { state.instType = e.target.value; state.instOpen = true; saveState(); render(); });
      const pf = document.getElementById('prov-filter');
      if (pf) pf.addEventListener('change', e => { state.provFilter = e.target.value; state.routeLimit = 20; saveState(); render(); });
      const smr = document.getElementById('show-more-routes');
      if (smr) smr.addEventListener('click', () => { state.routeLimit = (state.routeLimit || 20) + 20; render(); });
      // v68: photos are read AUTOMATICALLY right after upload (no extra tap needed). The button stays as "Re-read".
      const autoReadAfterLoad = (btnId, statusId, what) => {
        const btn = document.getElementById(btnId);
        const st = document.getElementById(statusId);
        if (!btn) return;
        if (st) st.textContent = 'Photo loaded. Reading ' + what + ' automatically, this can take 10-30 seconds...';
        setTimeout(() => { try { btn.click(); } catch (e) {} }, 60);
      };
      const loadScan = async f => {
        if (!f) return;
        const canvas = document.getElementById('scan-canvas');
        if (!canvas) return;
        try {
          await MZOCR.fileToCanvas(f, canvas);
          const st = document.getElementById('scan-canvas-status');
          if (st) st.textContent = `Loaded ${canvas.width}x${canvas.height}px on this device.`;
          autoReadAfterLoad('scan-detect-btn', 'scan-canvas-status', 'your marks');
        } catch (err) { showToast(MZOCR.friendlyError(err)); }
      };
      ['scan-image-input','scan-camera-input'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', e => { loadScan(e.target.files && e.target.files[0]); e.target.value = ''; });
      });


      const rotBtn = document.getElementById('scan-rotate-btn');
      if (rotBtn) rotBtn.addEventListener('click', () =>{
        const canvas = document.getElementById('scan-canvas');
        if (!canvas || !canvas.width || !canvas.height) { showToast('Load a photo first'); return; }
        const tmp = document.createElement('canvas');
        tmp.width = canvas.height; tmp.height = canvas.width;
        const tctx = tmp.getContext('2d');
        tctx.translate(tmp.width / 2, tmp.height / 2);
        tctx.rotate(Math.PI / 2);
        tctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
        canvas.width = tmp.width; canvas.height = tmp.height;
        canvas.getContext('2d').drawImage(tmp, 0, 0);
        showToast('Rotated 90°');
      });

      const conBtn = document.getElementById('scan-contrast-btn');
      if (conBtn) conBtn.addEventListener('click', () =>{
        const canvas = document.getElementById('scan-canvas');
        if (!canvas || !canvas.width || !canvas.height) { showToast('Load a photo first'); return; }
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const c = Math.max(0, Math.min(255, (g - 128) * 1.45 + 128));
          d[i] = d[i + 1] = d[i + 2] = c;
        }
        ctx.putImageData(imgData, 0, 0);
        showToast('Enhanced contrast for easier reading');
      });

      const detBtn = document.getElementById('scan-detect-btn');
      if (detBtn) detBtn.addEventListener('click', async () =>{
        const canvas = document.getElementById('scan-canvas');
        if (!canvas || !canvas.width) { showToast('Load a report card photo first'); return; }
        try {
          showToast('Reading your report... this can take 10–30 seconds');
          const out = await MZOCR.readStatementCanvas(canvas, parseStatementText);
          if (!out.text.trim()) { showToast('No text found. Try a clearer photo, or type your marks.'); return; }
          state.scanRawText = out.text; state.scanParsed = out.rows;
          state.scanLowConfidence = out.confidence < 70;
          saveState(); render();
          showToast(out.rows.length ? `Read ${out.rows.length} subjects. Please check EVERY mark.` : 'Could not find subjects. Type your marks or paste the text.');
        } catch (err) { showToast(MZOCR.friendlyError(err)); }
      });

      const sampBtn = document.getElementById('scan-sample-btn');
      if (sampBtn) sampBtn.addEventListener('click', () =>{
        state.scanRawText = 'English Home Language 66%\nisiZulu First Additional Language 72%\nMathematics 61%\nPhysical Sciences 58%\nInformation Technology 74%\nGeography 63%\nLife Orientation 82%';
        state.scanParsed = parseStatementText(state.scanRawText);
        saveState(); render();
        showToast('Loaded sample NSC Statement — review and tap Confirm & Apply!');
      });

      const rawTa = document.getElementById('scan-raw-text');
      if (rawTa) rawTa.addEventListener('input', e =>{ state.scanRawText = e.target.value; });

      const parseBtn = document.getElementById('scan-parse-btn');
      if (parseBtn) parseBtn.addEventListener('click', () =>{
        const txt = document.getElementById('scan-raw-text')?.value || state.scanRawText || '';
        state.scanRawText = txt;
        state.scanParsed = parseStatementText(txt);
        saveState(); render();
        showToast(state.scanParsed.length ? `Parsed ${state.scanParsed.length} subjects — confirm below!` : 'No SA subjects matched — check spelling.');
      });

      document.querySelectorAll('[data-scan-inc]').forEach(cb =>cb.addEventListener('change', e =>{
        const idx = Number(cb.dataset.scanInc);
        if (state.scanParsed[idx]) {
          state.scanParsed[idx].include = e.target.checked; saveState();
          const lp = document.getElementById('scan-live-preview');
          if (lp) { const act = state.scanParsed.filter(s => s.include !== false); const pn = evaluateNsc(act.filter(hasMark)); lp.textContent = act.length ? `${pn.passLevel} · APS ${pn.aps ?? 'n/a'} (excl. LO)` : 'Select at least 1 subject'; }
        }
      }));
      document.querySelectorAll('[data-scan-mark]').forEach(inp =>inp.addEventListener('input', e =>{
        const idx = Number(inp.dataset.scanMark);
        if (state.scanParsed[idx]) {
          const v = e.target.value === '' ? null : Math.max(0, Math.min(100, Math.round(Number(e.target.value))));
          state.scanParsed[idx].mark = v; saveState();
          const lp = document.getElementById('scan-live-preview');
          if (lp) { const pn = evaluateNsc(state.scanParsed.filter(s => s.include !== false && hasMark(s))); lp.textContent = `${pn.passLevel} · APS ${pn.aps ?? 'n/a'} (excl. LO)`; }
        }
      }));

      const applyScanBtn = document.getElementById('scan-apply-btn');
      if (applyScanBtn) applyScanBtn.addEventListener('click', () =>{
        const chosen = (state.scanParsed || []).filter(s =>s.include !== false).map(s =>({
          name: s.name, mark: Math.max(0, Math.min(100, Number(s.mark))),
          isHomeLanguage: Boolean(s.isHomeLanguage), isLifeOrientation: Boolean(s.isLifeOrientation)
        }));
        const ready = scanRowsReady((state.scanParsed || []));
        if (!ready.ok) { showToast(ready.why); return; }
        if (!window._scanArmed) { window._scanArmed = true; showToast('Check every mark against your report card, then tap Confirm again. Photos can be misread.'); return; }
        window._scanArmed = false;
        pushSubjectUndo(); state.subjects = chosen;
        state.marksVerified = true; state.marksSig = marksSignature();
        state.scannerOpen = false;
        saveState(); render();
        showToast(`Applied ${chosen.length} scanned subjects to your profile!`);
      });



      const pp = document.getElementById('print-plan-btn');
      if (pp) pp.addEventListener('click', () =>window.print());

      const ef = document.getElementById('ev-form');
      if (ef) ef.addEventListener('submit', e =>{
        e.preventDefault();
        state.evidenceVault.unshift({
          id: 'ev_' + Date.now(),
          skill: document.getElementById('ev-skill').value.trim(),
          tools: document.getElementById('ev-tools').value.trim(),
          story: document.getElementById('ev-story').value.trim()
        });
        saveState(); render(); showToast('Added real evidence to your vault!');
      });
      const nq = document.getElementById('next-int-q');
      if (nq) nq.addEventListener('click', () =>{ interviewIdx++; render(); });
      const mcBtn = document.getElementById('cv-mark-current-btn');
      if (mcBtn) mcBtn.addEventListener('click', () => {
        state.cvUpdatedAt = new Date().toISOString().slice(0, 10);
        saveState(); render();
        showToast('CV marked reviewed and current for today!');
      });

      const z83Btn = document.getElementById('dl-z83-prep-btn');
      if (z83Btn) z83Btn.addEventListener('click', () => {
        const nsc = evaluateNsc(state.subjects);
        const quals = (state.cvQualifications && state.cvQualifications.length) ? state.cvQualifications : [`National Senior Certificate (${nsc.passLevel}, APS ${nsc.aps ?? 'n/a'} excl. LO)`];
        const txt = [
          'MZANSI PATHWAYS — Z83 GOVERNMENT APPLICATION PREP SHEET',
          'Official Form Source: https://www.gov.za/about-government/government-jobs',
          'NOTE: Never store your SA ID number here; write it directly on the official Z83 form.',
          '',
          'PART A — ADVERTISED POST',
          `  Position Applied For: ${state.cvTargetRole || '(Copy exact post title from DPSA circular)'}`,
          '  Department / Municipality: (Copy exact name from circular)',
          '  Reference Number: (Copy exact Ref No. from circular)',
          '',
          'PART B — PERSONAL & CONTACT DETAILS',
          `  Full Name: ${state.cvName || '(Write your full legal name on the Z83)'}`,
          `  Province: ${state.province}`,
          `  Phone: ${state.cvPhone || '(Add phone)'}`,
          `  Email: ${state.cvEmail || '(Add email)'}`,
          '',
          'PART E — QUALIFICATIONS',
          ...quals.map(q => `  - ${q}`),
          '',
          'FINAL CHECKLIST',
          '  [ ] Initial every page & sign/date the last page',
          '  [ ] Attach single-column Evidence CV (zero fees ever required)'
        ].join('\n');
        const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
        const a = document.createElement('a'); a.href = url; a.download = 'Mzansi_Pathways_Z83_Prep_Sheet.txt';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast('Downloaded POPIA-safe Z83 Prep Sheet (.txt)!');
      });

      document.querySelectorAll('[data-verify-job-employer]').forEach(b => b.addEventListener('click', () => {
        const emp = b.dataset.verifyJobEmployer || '';
        const url = b.dataset.verifyJobUrl || '';
        const scamBox = document.getElementById('scam-in');
        if (scamBox) {
          scamBox.value = `Employer: ${emp}\nOfficial URL: ${url}`;
          scamBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          scamBox.focus();
        }
        showToast(`Loaded "${emp}" into the Scam & Employer Verification tool.`);
      }));
      document.querySelectorAll('[data-tailor-job-title]').forEach(b => b.addEventListener('click', () => {
        const role = b.dataset.tailorJobTitle || '';
        if (role) {
          state.cvTargetRole = role;
          state.tab = 'vault';
          saveState(); render();
          showToast(`CV target role updated to "${role}" — review & export your tailored CV.`);
        }
      }));
      const mapc = document.getElementById('mark-all-portals-checked-btn');
      if (mapc) mapc.addEventListener('click', () => {
        const today = new Date().toISOString().slice(0, 10);
        (state.govWatchlist || []).forEach(w => { w.lastChecked = today; });
        saveState(); render();
        showToast('Marked all tracked official portals checked today!');
      });
      document.querySelectorAll('[data-check-portal]').forEach(b => b.addEventListener('click', () => {
        const idx = Number(b.dataset.checkPortal);
        if (state.govWatchlist && state.govWatchlist[idx]) {
          state.govWatchlist[idx].lastChecked = new Date().toISOString().slice(0, 10);
          saveState(); render();
          showToast(`Marked "${state.govWatchlist[idx].name}" checked today!`);
        }
      }));

      document.querySelectorAll('[data-del-portal]').forEach(b => b.addEventListener('click', () => {
        if (!Array.isArray(state.govWatchlist)) return;
        state.govWatchlist.splice(Number(b.dataset.delPortal), 1);
        saveState(); render();
      }));

      const amf = document.getElementById('add-muni-form');
      if (amf) amf.addEventListener('submit', e => {
        e.preventDefault();
        const nm = (document.getElementById('muni-name')?.value || '').trim();
        const u = (document.getElementById('muni-url')?.value || '').trim();
        const okHost = u.startsWith('https://') && /(?:\.gov\.za|\.org\.za|\.ac\.za|\.edu\.za|sayouth\.mobi)(?:\/|$)/i.test(u);
        if (!okHost) { showToast('Only official HTTPS .gov.za / .org.za / .ac.za / sayouth.mobi portals allowed.'); return; }
        if (!Array.isArray(state.govWatchlist)) state.govWatchlist = [];
        state.govWatchlist.push({ name: nm, url: u, cadence: 'Check weekly', lastChecked: 'Not checked yet' });
        saveState(); render();
        showToast(`Added "${nm}" to your official portal tracker!`);
      });

      const djtBtn = document.getElementById('dl-jobs-template-btn');
      if (djtBtn) djtBtn.addEventListener('click', () => {
        const tmpl = {
          notice: 'Copyright-safe factual metadata only — never copy full job advert prose. Always link directly to the official employer or government application page.',
          jobs: [
            {
              title: 'Junior Admin / IT Clerk (Example)',
              employer: 'Local Municipality or Employer Name',
              town: 'eMalahleni',
              province: 'Mpumalanga',
              salary: 'Verify on official advert',
              closingDate: '2026-12-18',
              sourceType: 'direct_employer',
              officialUrl: 'https://www.gov.za/about-government/government-jobs'
            }
          ]
        };
        const url = URL.createObjectURL(new Blob([JSON.stringify(tmpl, null, 2)], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = 'mzansi_open_jobs_template.json';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast('Downloaded copyright-safe Employer Open Jobs JSON template!');
      });

      const msBtn = document.getElementById('matric-starter-btn');
      if (msBtn) msBtn.addEventListener('click', () => {
        const nsc = evaluateNsc(state.subjects);
        if (!Array.isArray(state.cvQualifications)) state.cvQualifications = [];
        const qual = `National Senior Certificate (${nsc.passLevel}, APS ${nsc.aps ?? 'n/a'} excl. LO)`;
        if (!state.cvQualifications.includes(qual)) state.cvQualifications.unshift(qual);
        const starterStory = 'Completed Matric practical projects, school assignments, and community/family support tasks — replace this line with one specific real task you personally completed.';
        if (!state.evidenceVault.some(e => e.skill === 'First-Time Matriculant School & Community Project')) {
          state.evidenceVault.unshift({ id: 'ev_matric_' + Date.now(), skill: 'First-Time Matriculant School & Community Project', tools: 'NSC Subjects, MS Office / Practical Skills', story: starterStory, includeInCv: true });
        }
        state.cvUpdatedAt = new Date().toISOString().slice(0, 10);
        saveState(); render();
        showToast('Added First-Time Matriculant starter — edit with your real school/community tasks!');
      });

      const impJobsIn = document.getElementById('import-jobs-json-input');
      if (impJobsIn) impJobsIn.addEventListener('change', e => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          try {
            const raw = JSON.parse(String(r.result || '[]'));
            const list = Array.isArray(raw) ? raw : (raw.jobs || []);
            const valid = filterLegalOpenJobs(list);
            if (!valid.length) { showToast('No open, legal, non-expired HTTPS job posts found in JSON.'); return; }
            for (const j of valid) {
              if (!SAMPLE_WORK.some(w => w.title === j.title && w.employer === j.employer)) SAMPLE_WORK.unshift(j);
            }
            render();
            showToast(`Loaded ${valid.length} verified still-open job post(s)!`);
          } catch (err) { showToast('Invalid jobs JSON rejected by failsafe.'); }
        };
        r.readAsText(f);
      });

      const cviToggle = document.getElementById('cv-import-toggle-btn');
      if (cviToggle) cviToggle.addEventListener('click', () => { state.cvImportOpen = !state.cvImportOpen; saveState(); render(); });

      const cviFile = document.getElementById('cv-file-input');
      if (cviFile) cviFile.addEventListener('change', e => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        showToast('Reading CV file...');
        MZOCR.readAnyFile(f, { canvas: document.getElementById('cv-canvas') }).then(res => {
          state.cvRawText = String(res.text || '').slice(0, 30000);
          state.cvParsed = parsePreviousCvText(state.cvRawText);
          saveState(); render();
          showToast('CV read on this device. Review the extracted details below.');
        }).catch(err => showToast(MZOCR.friendlyError(err)));
      });

      const loadCvImg = async f => {
        if (!f) return;
        const canvas = document.getElementById('cv-canvas');
        if (!canvas) return;
        try {
          await MZOCR.fileToCanvas(f, canvas);
          const st = document.getElementById('cv-canvas-status');
          if (st) st.textContent = `Loaded ${canvas.width}x${canvas.height}px on this device.`;
          autoReadAfterLoad('cv-detect-btn', 'cv-canvas-status', 'your CV');
        } catch (err) { showToast(MZOCR.friendlyError(err)); }
      };
      ['cv-image-input','cv-camera-input'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', e => { loadCvImg(e.target.files && e.target.files[0]); e.target.value = ''; });
      });


      const cviRot = document.getElementById('cv-rotate-btn');
      if (cviRot) cviRot.addEventListener('click', () => {
        const canvas = document.getElementById('cv-canvas');
        if (!canvas || !canvas.width || !canvas.height) { showToast('Load a printed CV photo first'); return; }
        const tmp = document.createElement('canvas'); tmp.width = canvas.height; tmp.height = canvas.width;
        const tctx = tmp.getContext('2d'); tctx.translate(tmp.width / 2, tmp.height / 2); tctx.rotate(Math.PI / 2);
        tctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
        canvas.width = tmp.width; canvas.height = tmp.height; canvas.getContext('2d').drawImage(tmp, 0, 0);
        showToast('Rotated CV photo 90°');
      });

      const cviCon = document.getElementById('cv-contrast-btn');
      if (cviCon) cviCon.addEventListener('click', () => {
        const canvas = document.getElementById('cv-canvas');
        if (!canvas || !canvas.width || !canvas.height) { showToast('Load a printed CV photo first'); return; }
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const c = Math.max(0, Math.min(255, (g - 128) * 1.45 + 128));
          d[i] = d[i + 1] = d[i + 2] = c;
        }
        ctx.putImageData(imgData, 0, 0);
        showToast('Boosted CV photo contrast');
      });

      const saveCvBtn = document.getElementById('save-cv-snapshot-btn');
      if (saveCvBtn) saveCvBtn.addEventListener('click', () => {
        const nameEl = document.getElementById('cv-name'); if (nameEl) state.cvName = nameEl.value.trim();
        const phEl = document.getElementById('cv-phone'); if (phEl) state.cvPhone = phEl.value.trim();
        const emEl = document.getElementById('cv-email'); if (emEl) state.cvEmail = emEl.value.trim();
        const trEl = document.getElementById('cv-target-role'); if (trEl) state.cvTargetRole = trEl.value.trim();
        if (!Array.isArray(state.savedCvs)) state.savedCvs = [];
        const label = `${state.cvTargetRole || 'General CV'} (${state.cvName || 'Draft'})`;
        state.savedCvs.unshift({
          label,
          savedAt: new Date().toISOString().slice(0, 10),
          cvName: state.cvName, cvPhone: state.cvPhone, cvEmail: state.cvEmail, cvTargetRole: state.cvTargetRole,
          evidenceVault: (state.evidenceVault || []).map(x => ({ ...x }))
        });
        state.savedCvs = state.savedCvs.slice(0, 8);
        saveState(); render();
        showToast(`Saved CV version "${label}" locally!`);
      });

      document.querySelectorAll('[data-load-cv]').forEach(b => b.addEventListener('click', () => {
        const snap = state.savedCvs && state.savedCvs[Number(b.dataset.loadCv)];
        if (!snap) return;
        state.cvName = snap.cvName || ''; state.cvPhone = snap.cvPhone || ''; state.cvEmail = snap.cvEmail || ''; state.cvTargetRole = snap.cvTargetRole || '';
        state.evidenceVault = (snap.evidenceVault || []).map(x => ({ ...x }));
        saveState(); render();
        showToast(`Loaded "${snap.label}"!`);
      }));

      document.querySelectorAll('[data-del-cv]').forEach(b => b.addEventListener('click', () => {
        if (!Array.isArray(state.savedCvs)) return;
        state.savedCvs.splice(Number(b.dataset.delCv), 1);
        saveState(); render();
        showToast('Removed saved CV version');
      }));

      const cviDet = document.getElementById('cv-detect-btn');
      if (cviDet) cviDet.addEventListener('click', async () => {
        const canvas = document.getElementById('cv-canvas');
        if (!canvas || !canvas.width) { showToast('Load a printed CV photo first'); return; }
        try {
          showToast('Reading CV photo... please wait');
          const out = await MZOCR.readTextCanvas(canvas, '4');
          if (!out.text.trim()) { showToast('No text found. Try a clearer photo or paste the text.'); return; }
          state.cvRawText = out.text; state.cvParsed = parsePreviousCvText(out.text);
          saveState(); render();
          showToast('Text read from CV photo. Review and confirm below.');
        } catch (err) { showToast(MZOCR.friendlyError(err)); }
      });

      const cviSample = document.getElementById('cv-sample-btn');
      if (cviSample) cviSample.addEventListener('click', () => {
        state.cvRawText = 'Thabo Mokoena\n082 555 0194 | thabo.mokoena@example.co.za\nNational Senior Certificate (Matric) · Higher Certificate in IT (NQF 5)\nSkills: Windows, Microsoft Excel, Networking, Packet Tracer, Troubleshooting\n- Installed and configured Windows 11 laptops and office printers for local learners.\n- Prepared weekly stock and attendance spreadsheets in Microsoft Excel.';
        state.cvParsed = parsePreviousCvText(state.cvRawText);
        saveState(); render();
        showToast('Loaded sample previous CV — review and tap Apply!');
      });

      const cviRaw = document.getElementById('cv-raw-text');
      if (cviRaw) cviRaw.addEventListener('input', e => { state.cvRawText = e.target.value; });

      const cviParse = document.getElementById('cv-parse-btn');
      if (cviParse) cviParse.addEventListener('click', () => {
        const txt = document.getElementById('cv-raw-text')?.value || state.cvRawText || '';
        state.cvRawText = txt;
        state.cvParsed = parsePreviousCvText(txt);
        saveState(); render();
        showToast(state.cvParsed ? 'Extracted CV details — review below!' : 'Paste or upload CV text first.');
      });

      const cviZoom = document.getElementById('cv-zoom-btn');
      if (cviZoom) cviZoom.addEventListener('click', () => { state.cvZoom = !state.cvZoom; saveState(); render(); });

      const cviApply = document.getElementById('cv-import-apply-btn');
      if (cviApply) cviApply.addEventListener('click', () => {
        const cp = state.cvParsed;
        if (!cp) return;
        const nVal = (document.getElementById('cv-imp-name')?.value || cp.name || '').trim();
        const pVal = (document.getElementById('cv-imp-phone')?.value || cp.phone || '').trim();
        const eVal = (document.getElementById('cv-imp-email')?.value || cp.email || '').trim();
        if (nVal) state.cvName = nVal;
        if (pVal) state.cvPhone = pVal;
        if (eVal) state.cvEmail = eVal;
        if (Array.isArray(cp.qualifications) && cp.qualifications.length) {
          state.cvQualifications = [...new Set([...(state.cvQualifications || []), ...cp.qualifications])].slice(0, 8);
        }
        const toolsStr = (cp.skills || []).slice(0, 5).join(', ') || 'Imported from Previous CV';
        let added = 0;
        for (const sn of (cp.evidenceSnippets || [])) {
          if (!state.evidenceVault.some(ev => ev.story === sn)) {
            state.evidenceVault.unshift({ id: 'ev_imp_' + Date.now() + '_' + added, skill: (cp.skills && cp.skills[added]) || 'Previous CV Experience', tools: toolsStr, story: sn, includeInCv: true });
            added++;
          }
        }
        state.cvImportOpen = false; state.cvUpdatedAt = new Date().toISOString().slice(0, 10);
        saveState(); render();
        showToast(`Applied contact details & ${added} experience item(s) to your CV Vault!`);
      });

      const dcvTxt = document.getElementById('dl-cv-txt');
      if (dcvTxt) dcvTxt.addEventListener('click', exportPlainTextCv);
      const dcv = document.getElementById('dl-cv-doc');
      if (dcv) dcv.addEventListener('click', () =>{
        const nameEl = document.getElementById('cv-name');
        if (nameEl) state.cvName = nameEl.value.trim();
        const phEl = document.getElementById('cv-phone'); if (phEl) state.cvPhone = phEl.value.trim();
        const emEl = document.getElementById('cv-email'); if (emEl) state.cvEmail = emEl.value.trim();
        const trEl = document.getElementById('cv-target-role'); if (trEl) state.cvTargetRole = trEl.value.trim();
        saveState();
        const contactBits = [state.province + ', South Africa', state.cvPhone, state.cvEmail].filter(Boolean).map(escapeHtml).join(' | ');
        const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:11pt;max-width:740px;margin:20px auto;line-height:1.45}h1{margin-bottom:2px}h2{border-bottom:1px solid #222;text-transform:uppercase;font-size:11pt;margin-top:16px}</style></head><body><h1>${escapeHtml(state.cvName || 'Your Name')}</h1>${state.cvTargetRole ? `<p><strong>Target Role:</strong> ${escapeHtml(state.cvTargetRole)}</p>` : ''}<p>${contactBits}</p><h2>Demonstrated Skills &amp; Real Evidence</h2><ul>${(state.evidenceVault || []).filter(e =>e.includeInCv !== false).map(e =>`<li><strong>${escapeHtml(e.skill)} (${escapeHtml(e.tools)}):</strong> ${escapeHtml(e.story)}</li>`).join('')}</ul>${(state.cvQualifications && state.cvQualifications.length) ? `<h2>Qualifications &amp; Certificates</h2><ul>${state.cvQualifications.map(q => `<li>${escapeHtml(q)}</li>`).join('')}</ul>` : ''}<h2>Academic Results (${escapeHtml(state.gradeStage)})</h2><ul>${state.subjects.map(s =>`<li>${escapeHtml(s.name)}: ${s.mark}%</li>`).join('')}</ul></body></html>`;
        const blob = new Blob([doc], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'Mzansi_Pathways_Evidence_CV.doc'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() =>URL.revokeObjectURL(url), 1000);
        showToast('Exported single-column Evidence CV (.doc)!');
      });
      const crf = document.getElementById('clear-route-filters-btn');
      if (crf) crf.addEventListener('click', () => { state.noUniOnly = false; state.nearHomeOnly = false; state.routeFilter = 'All'; state.routeSearch = ''; saveState(); render(); showToast('Cleared all route filters'); });
      document.querySelectorAll('[data-route-filter]').forEach(b => b.addEventListener('click', () => { state.routeFilter = b.dataset.routeFilter; saveState(); render(); }));
      const csf = document.getElementById('career-sector-filter');
      if (csf) csf.addEventListener('change', e => { state.careerSector = e.target.value; const first = CAREERS.find(c => state.careerSector === 'all' || c.family === state.careerSector); if (first) state.selectedCareerId = first.id; saveState(); render(); });
      const ajs = document.getElementById('auto-job-search-input');
      if (ajs) ajs.addEventListener('input', e => {
        state.jobSearchQuery = e.target.value;
        clearTimeout(window._ajT);
        window._ajT = setTimeout(() => { saveState(); render(); const el = document.getElementById('auto-job-search-input'); if (el) { el.focus(); el.selectionStart = el.selectionEnd = el.value.length; } }, 220);
      });
      const rlj = document.getElementById('refresh-live-jobs-btn');
      if (rlj) rlj.addEventListener('click', async () => { await loadLiveOpenJobs(); showToast(liveFeedLoadedCount ? `Live feed active (+${liveFeedLoadedCount} open jobs)` : 'Checked live feed (showing local/sample listings offline)'); });
      const efj = document.getElementById('export-flyer-jobs-btn');
      if (efj) efj.addEventListener('click', exportSavedFlyerJobsJson);
      const ajm = document.getElementById('auto-job-match-btn');
      if (ajm) ajm.addEventListener('click', () => { state.autoMatchJobsOnly = !state.autoMatchJobsOnly; saveState(); render(); });
      const esjc = document.getElementById('export-saved-jobs-csv-btn');
      if (esjc) esjc.addEventListener('click', exportOpenJobsCsv);
      const cjf = document.getElementById('clear-job-filters-btn');
      if (cjf) cjf.addEventListener('click', () => { state.jobSearchQuery = ''; state.savedJobsOnly = false; state.closingSoonOnly = false; state.autoMatchJobsOnly = false; state.jobProvinceFilter = 'ALL'; saveState(); render(); showToast('Cleared all open-job filters.'); });
      const csc = document.getElementById('copy-scam-checklist-btn');
      if (csc) csc.addEventListener('click', copyScamChecklist);
      document.querySelectorAll('[data-copy-job-url]').forEach(b => b.addEventListener('click', () => {
        const u = b.dataset.copyJobUrl || '';
        const t = b.dataset.copyJobTitle || 'Open Job';
        if (u && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(`${t} — Official Apply Link: ${u}`).then(() => showToast(`Copied official link for "${t}"!`));
        } else {
          showToast('Use Official Link ↗ to open this job directly.');
        }
      }));
      const sdts = document.getElementById('scan-doc-type-select');
      if (sdts) sdts.addEventListener('change', e => { state.scanDocType = e.target.value; saveState(); render(); });
      const drb = document.getElementById('dhet-reg-check-btn');
      if (drb) drb.addEventListener('click', () => {
        const inp = (document.getElementById('dhet-reg-check-input')?.value || '').trim().toUpperCase();
        const out = document.getElementById('dhet-reg-check-out');
        if (!out) return;
        if (/^(19|20)\d{2}\/(HE07|HE08|HE10|FE07)\/\d{3}$/.test(inp)) {
          out.textContent = `Valid DHET format (${inp}). Next: confirm the exact qualification AND physical campus address on the official monthly DHET Register PDF at dhet.gov.za or call 0800 87 2222.`;
          out.className = 'text-[11px] font-bold text-emerald-800';
        } else {
          out.textContent = `Invalid DHET registration format ("${inp || 'empty'}"). Official numbers look like YYYY/HE07/NNN (Private HEI) or YYYY/FE07/NNN (Private College). Do not pay fees before calling 0800 87 2222.`;
          out.className = 'text-[11px] font-bold text-rose-700';
        }
      });
      const scc = document.getElementById('scan-confirm-check');
      if (scc) scc.addEventListener('change', e => { state.scanConfirmed = !!e.target.checked; saveState(); render(); });
      const sjo = document.getElementById('saved-jobs-only-btn');
      if (sjo) sjo.addEventListener('click', () => { state.savedJobsOnly = !state.savedJobsOnly; saveState(); render(); });
      const csj = document.getElementById('closing-soon-jobs-btn');
      if (csj) csj.addEventListener('click', () => { state.closingSoonOnly = !state.closingSoonOnly; saveState(); render(); });
      const ccv = document.getElementById('copy-cv-txt-btn');
      if (ccv) ccv.addEventListener('click', copyPlainTextCv);
      const jpf = document.getElementById('job-province-filter');
      if (jpf) jpf.addEventListener('change', e => { state.jobProvinceFilter = e.target.value; saveState(); render(); });
      const jss = document.getElementById('job-sort-select');
      if (jss) jss.addEventListener('change', e => { state.jobSortBy = e.target.value; saveState(); render(); });
      document.querySelectorAll('[data-empty-reset-jobs]').forEach(b => b.addEventListener('click', () => {
        state.jobSearchQuery = ''; state.savedJobsOnly = false; state.closingSoonOnly = false; state.autoMatchJobsOnly = false; state.jobProvinceFilter = 'ALL'; saveState(); render();
        showToast('Cleared all open-job filters.');
      }));
      document.querySelectorAll('[data-save-job-id]').forEach(b => b.addEventListener('click', () => {
        const key = b.dataset.saveJobId || '';
        if (!key) return;
        const cur = Array.isArray(state.savedOpenJobs) ? [...state.savedOpenJobs] : [];
        const i = cur.indexOf(key);
        if (i >= 0) { cur.splice(i, 1); showToast('Removed job from your shortlist.'); }
        else { cur.push(key); showToast('Saved job to your shortlist!'); }
        state.savedOpenJobs = cur;
        saveState(); render();
      }));
      const lti = document.getElementById('local-town-input');
      if (lti) lti.addEventListener('change', e => { state.localTown = e.target.value.trim(); saveState(); render(); });

      const loadFlyerImg = async f => {
        if (!f) return;
        const canvas = document.getElementById('flyer-canvas');
        if (!canvas) return;
        try {
          await MZOCR.fileToCanvas(f, canvas);
          const st = document.getElementById('flyer-canvas-status');
          if (st) st.textContent = `Loaded ${canvas.width}x${canvas.height}px on this device.`;
          autoReadAfterLoad('flyer-detect-btn', 'flyer-canvas-status', 'the job flyer');
        } catch (err) { showToast(MZOCR.friendlyError(err)); }
      };
      ['flyer-image-input','flyer-camera-input'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', e => { loadFlyerImg(e.target.files && e.target.files[0]); e.target.value = ''; });
      });


      const fRot = document.getElementById('flyer-rotate-btn');
      if (fRot) fRot.addEventListener('click', () => {
        const canvas = document.getElementById('flyer-canvas');
        if (!canvas || !canvas.width || !canvas.height) { showToast('Upload a job flyer photo first'); return; }
        const tmp = document.createElement('canvas'); tmp.width = canvas.height; tmp.height = canvas.width;
        const tctx = tmp.getContext('2d'); tctx.translate(tmp.width / 2, tmp.height / 2); tctx.rotate(Math.PI / 2);
        tctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
        canvas.width = tmp.width; canvas.height = tmp.height; canvas.getContext('2d').drawImage(tmp, 0, 0);
        showToast('Rotated job flyer 90°');
      });
      const fCon = document.getElementById('flyer-contrast-btn');
      if (fCon) fCon.addEventListener('click', () => {
        const canvas = document.getElementById('flyer-canvas');
        if (!canvas || !canvas.width || !canvas.height) { showToast('Upload a job flyer photo first'); return; }
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const c = Math.max(0, Math.min(255, (g - 128) * 1.45 + 128));
          d[i] = d[i + 1] = d[i + 2] = c;
        }
        ctx.putImageData(imgData, 0, 0);
        showToast('Boosted job flyer contrast');
      });
      const fDet = document.getElementById('flyer-detect-btn');
      if (fDet) fDet.addEventListener('click', async () => {
        const canvas = document.getElementById('flyer-canvas');
        if (!canvas || !canvas.width) { showToast('Upload a job flyer photo first'); return; }
        try {
          showToast('Reading flyer... please wait');
          const out = await MZOCR.readTextCanvas(canvas, '4');
          if (!out.text.trim()) { showToast('No text found. Crop to the text area or paste the text.'); return; }
          state.flyerRawText = out.text; state.flyerParsed = parseJobFlyerText(out.text);
          saveState(); render();
          showToast('Flyer read on this device. Always verify the employer.');
        } catch (err) { showToast(MZOCR.friendlyError(err)); }
      });

      const fSamp = document.getElementById('flyer-sample-btn');
      if (fSamp) fSamp.addEventListener('click', () => {
        state.flyerRawText = 'VACANCY: Assistant Wireless Technician\nPublished: 25 November 2026 | Closes: 11 December 2026\nAreas: Siyabuswa, Vaalbank, Moripe Gardens\nApply CV to: careers@localict-example.co.za | Tel: 013 880 0000';
        state.flyerParsed = parseJobFlyerText(state.flyerRawText);
        saveState(); render();
        showToast('Loaded sample local SME vacancy flyer!');
      });

      const fRaw = document.getElementById('flyer-raw-text');
      if (fRaw) fRaw.addEventListener('input', e => { state.flyerRawText = e.target.value; });

      const fParse = document.getElementById('flyer-parse-btn');
      if (fParse) fParse.addEventListener('click', () => {
        const txt = document.getElementById('flyer-raw-text')?.value || state.flyerRawText || '';
        state.flyerRawText = txt;
        state.flyerParsed = parseJobFlyerText(txt);
        saveState(); render();
      });

      const fSave = document.getElementById('flyer-save-btn');
      if (fSave) fSave.addEventListener('click', () => {
        if (!state.flyerParsed) return;
        if (!Array.isArray(state.savedOpenJobs)) state.savedOpenJobs = [];
        state.savedOpenJobs.unshift({ role: state.flyerParsed.role, closing: state.flyerParsed.closing, email: state.flyerParsed.email, phone: state.flyerParsed.phone });
        state.savedOpenJobs = state.savedOpenJobs.slice(0, 12);
        saveState(); render();
        showToast('Saved open job flyer to your local tracker!');
      });

      document.querySelectorAll('[data-del-saved-job]').forEach(b => b.addEventListener('click', () => {
        if (!Array.isArray(state.savedOpenJobs)) return;
        state.savedOpenJobs.splice(Number(b.dataset.delSavedJob), 1);
        saveState(); render();
      }));

      const crb = document.getElementById('copy-registers-btn');
      if (crb) crb.addEventListener('click', () => {
        const msg = [
          'Official Free South African Verification & Job Portals (Zero Fees):',
          '- CIPC Company Check (BizPortal): https://www.bizportal.gov.za/',
          '- Registered Recruitment Agencies (Dept. of Labour): https://www.labour.gov.za/DocumentCenter/Pages/Private-Employment-Agencies-(PEA)-and-Temporary-Employment-Services-(TES).aspx',
          '- Weekly DPSA Gov Circulars: https://www.gov.za/about-government/government-jobs',
          '- SA Youth (Data-Free): https://sayouth.mobi/',
          '- ESSA Gov Jobs: https://essa.labour.gov.za/EssaOnline/WebBeans/',
          '- DHET / QCTO / SAQA / NSFAS: https://www.dhet.gov.za/ | https://www.qcto.org.za/ | https://www.saqa.org.za/ | https://www.nsfas.org.za/'
        ].join('\n');
        const ta = document.createElement('textarea'); ta.value = msg; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); showToast('Copied official SA verification links for WhatsApp!'); } catch (err) {} ta.remove();
      });
      const cipcBtn = document.getElementById('cipc-check-btn');
      if (cipcBtn) cipcBtn.addEventListener('click', () => {
        const val = document.getElementById('cipc-check-input')?.value || '';
        const res = validateCipcFormat(val);
        const out = document.getElementById('cipc-check-out');
        if (out) {
          out.classList.remove('hidden');
          out.textContent = res.msg;
        }
      });
      const regOut = (r) => {
        const out = document.getElementById('reg-out'); if (!out || !r) return;
        const tone = r.tone === 'red' ? 'bg-rose-50 border-rose-300 text-rose-900' : r.tone === 'amber' ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-blue-50 border-blue-300 text-blue-900';
        out.className = 'p-2.5 rounded-lg border text-[11px] font-semibold ' + tone;
        out.textContent = r.message;
      };
      const dhetBtn = document.getElementById('reg-dhet-btn');
      if (dhetBtn) dhetBtn.addEventListener('click', () => { if (window.MZ_TRUST) regOut(window.MZ_TRUST.checkPrivateCollegeReg(document.getElementById('reg-dhet-in').value)); });
      const saqaBtn = document.getElementById('reg-saqa-btn');
      if (saqaBtn) saqaBtn.addEventListener('click', () => { if (window.MZ_TRUST) regOut(window.MZ_TRUST.checkSaqaQualification(document.getElementById('reg-saqa-in').value)); });
      const sf = document.getElementById('scam-form');
      const ssb = document.getElementById('scam-sample-btn');
      if (ssb) ssb.addEventListener('click', () => {
        const ta = document.getElementById('scam-in');
        if (ta) ta.value = 'URGENT Eskom General Workers needed! Send ID on WhatsApp only via bit.ly/fakejob or email eskomhr2027@gmail.com. Pay R150 uniform fee via eWallet to confirm interview.';
        if (sf) sf.dispatchEvent(new Event('submit', { cancelable: true }));
      });

      if (sf) sf.addEventListener('submit', e =>{
        e.preventDefault();
        const txt = document.getElementById('scam-in').value;
        const flags = [];
        // "no registration fee" / "zero admin fee" is reassuring, so drop those phrases before looking for fee demands.
        // (No regex lookbehind: it is a syntax error on iPhones older than iOS 16.4 and would stop the whole app loading.)
        const t2 = txt.replace(/\b(?:no|zero|without|free of)\s+(?:any\s+)?(?:registration|application|admin|processing)\s+fees?\b/gi, ' ');
        if (/\b(?:registration|application|admin|processing)\s+fees?\b/i.test(t2)) flags.push('Requests application/registration fee');
        if (/\b(?:pay|deposit|eft|ewallet|cashsend|send)\s*r?\s*\d+/i.test(txt)) flags.push('Requests upfront payment/deposit');
        if (/\b(?:ewallet|cash\s*send|mukuru|pep\s*money|shoprite\s*money|capitec\s*pay\s*me)\b/i.test(txt)) flags.push('Asks for an informal money transfer (eWallet / CashSend / Mukuru)');
        if (/(eskom|transnet|sasol|saps|department of|shoprite|fnb)/i.test(txt) && /@(gmail|yahoo|hotmail|outlook)\.com/i.test(txt)) flags.push('Major SA employer using free webmail');
        if (/\b(?:bit\.ly|tinyurl\.com|t\.co|wa\.me|rb\.gy|cutt\.ly|shorturl\.at)\b/i.test(txt)) flags.push('Hides the real destination behind a shortened link');
        if (/\b(?:urgent|whatsapp only|whatsapp\s+your\s+cv|send id)\b/i.test(txt)) flags.push('Pressure or WhatsApp-only application with no official employer portal');
        if (/\b(?:medical|police clearance|uniform|training|placement)\s+(?:fee|deposit|payment)\b/i.test(txt)) flags.push('Demands upfront medical/clearance/placement fee (illegal for job seekers)');
        if (/\b100\s*%\s*(?:guaranteed|assured)\s*(?:job|placement|employment)\b/i.test(txt)) flags.push('Promises a guaranteed job (reputable employers never do)');
        if (/\b(?:send|share|attach)\b[^.\n]{0,40}\b(?:id\s*(?:copy|number|document)|bank\s*(?:details|statement)|pin|otp)\b/i.test(txt)) flags.push('Asks for ID copies, bank details, PIN or OTP before any interview');
        if (/\bn[1-3]\b/i.test(txt) && /\b(?:nated|report\s*191|certificate|diploma)\b/i.test(txt)) flags.push('Mentions NATED N1-N3, which was phased out on 1 Jan 2024');
        scamResult = flags; render();
      });
    }

    document.addEventListener('click', e =>{
      const pg = e.target.closest && e.target.closest('[data-path-go]');
      if (pg) { goPath(pg.dataset.pathGo); return; }
      const ov = e.target.closest && e.target.closest('[data-open-verify]');
      if (ov) { openVerifyModal(() => { render(); }); return; }
      const tb = e.target.closest && e.target.closest('[data-tab]');
      if (tb) { state.tab = tb.dataset.tab; saveState(); render(); return; }
      const us = e.target.closest && e.target.closest('[data-unsave-study]');
      if (us) { state.studyPlanPicks = (state.studyPlanPicks || []).filter(x => x !== us.dataset.unsaveStudy); saveState(); render(); return; }
      const si = e.target.closest && e.target.closest('[data-study-inst]');
      if (si) { state.studyF = { inst: si.dataset.studyInst, show: 'all' }; saveState(); render(); window.scrollTo(0, 0); return; }
      const wqb = e.target.closest && e.target.closest('[data-work-qual]');
      if (wqb) { state.workQual = wqb.dataset.workQual; if (state.workQual === 'mine' && !state.qualLevel) showToast('Choose your highest qualification first.'); saveState(); render(); return; }
      const wkb = e.target.closest && e.target.closest('[data-work-kind]');
      if (wkb) { state.workKind = wkb.dataset.workKind; saveState(); render(); return; }
      const cs = e.target.closest && e.target.closest('[data-career-study]');
      if (cs) { state.studyF = { field: cs.dataset.careerStudy || 'all', show: 'all' }; state.tab = 'study'; saveState(); render(); window.scrollTo(0, 0); return; }
      const cj = e.target.closest && e.target.closest('[data-career-jobs]');
      if (cj) { state.jobSearchQuery = cj.dataset.careerJobs || ''; state.jobProvinceFilter = 'ALL'; state.tab = 'work'; saveState(); render(); window.scrollTo(0, 0); return; }
      const pc = e.target.closest && e.target.closest('[data-pick-career]');
      if (pc) { state.selectedCareerId = pc.dataset.pickCareer; saveState(); render(); return; }
      const wp = e.target.closest && e.target.closest('[data-why-prog]');
      if (wp) { openWhyModal(wp.dataset.whyProg); return; }
      const sp = e.target.closest && e.target.closest('[data-set-plan]');
      if (sp) {
        const [slot, pid] = sp.dataset.setPlan.split('|');
        state.plans[slot] = pid; saveState();
        document.getElementById('why-modal').classList.add('hidden');
        showToast(`Saved to Plan ${slot}!`);
        render(); return;
      }
      const de = e.target.closest && e.target.closest('[data-del-ev]');
      if (de) { state.evidenceVault.splice(Number(de.dataset.delEv), 1); saveState(); render(); return; }
      const fp = e.target.closest && e.target.closest('[data-flag-prog]');
      if (fp) {
        const rep = `[Mzansi Pathways Tier-5 Report] ${fp.dataset.flagProg} | Please verify latest prospectus/intake requirements`;
        const ta = document.createElement('textarea'); ta.value = rep; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (err) {} ta.remove();
        showToast('Conflict report copied — held for admin verification (never overwrites official rules).');
        return;
      }
      if (e.target.closest && e.target.closest('#close-why')) { document.getElementById('why-modal').classList.add('hidden'); return; }
      if (e.target.closest && e.target.closest('#tut-skip-btn')) { closeTutorial(); }
    });

    const setBtn = document.getElementById('settings-btn');
    if (setBtn) setBtn.addEventListener('click', () => { const st = document.getElementById('settings-integrity-status'); if (st) st.textContent = getClientHealthStatus(); document.getElementById('settings-modal').classList.remove('hidden'); });
    const closeSet = document.getElementById('close-settings');
    if (closeSet) closeSet.addEventListener('click', () =>document.getElementById('settings-modal').classList.add('hidden'));
    const doneSet = document.getElementById('settings-done-btn');
    if (doneSet) doneSet.addEventListener('click', () =>document.getElementById('settings-modal').classList.add('hidden'));
    const setOpenSync = document.getElementById('settings-open-sync');
    if (setOpenSync) setOpenSync.addEventListener('click', () =>{ document.getElementById('settings-modal').classList.add('hidden'); document.getElementById('auth-modal').classList.remove('hidden'); });
    const setOpenTour = document.getElementById('settings-open-tour');
    if (setOpenTour) setOpenTour.addEventListener('click', () =>{ document.getElementById('settings-modal').classList.add('hidden'); openTutorial(0); });
    function resetDisplayPreferences() {
      state.province = 'Mpumalanga';
      state.lang = 'en';
      state.parentMode = false;
      state.easyMode = false;
      state.largeText = false;
      state.highContrast = false;
      state.darkMode = false;
      saveState(); applyModes(); render();
      showToast('Display & region preferences reset (your marks were kept safe)');
    }
    const rpBtn = document.getElementById('reset-prefs-btn');
    if (rpBtn) rpBtn.addEventListener('click', resetDisplayPreferences);
    const vlsBtn = document.getElementById('verify-local-state-btn');
    if (vlsBtn) vlsBtn.addEventListener('click', () => {
      validateStateIntegrity(state);
      saveState();
      const st = document.getElementById('settings-integrity-status');
      const msg = getClientHealthStatus();
      if (st) st.textContent = msg;
      showToast(msg);
    });
    const encPassEl = document.getElementById('enc-pass');
    if (encPassEl) encPassEl.addEventListener('input', e => {
      const res = checkPassphraseStrength(e.target.value);
      const out = document.getElementById('enc-pass-strength');
      if (out) { out.textContent = res.label; out.className = 'text-[11px] ' + res.cls; }
    });
    const impRulesIn = document.getElementById('import-rules-file');
    if (impRulesIn) impRulesIn.addEventListener('change', e =>{
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () =>{
        try {
        const parsed = JSON.parse(String(r.result || '{}'));
        const res = validateImportedProgrammes(parsed);
        if (!res.ok) { showToast(res.error); return; }
        for (const item of res.items) {
          if (!SAMPLE_PROGRAMMES.some(x =>x.id === item.id)) SAMPLE_PROGRAMMES.push(item);
        }
        render();
        showToast(`Validated & loaded ${res.items.length} programme rules!`);
        } catch (err) { showToast('Invalid JSON rules file rejected by failsafe.'); }
      };
      r.readAsText(f);
    });
    document.getElementById('parent-btn').addEventListener('click', () =>{ state.parentMode = !state.parentMode; saveState(); applyModes(); render(); showToast(state.parentMode ? 'Parent / Guardian View ON' : 'Student View ON'); });
    document.getElementById('easy-btn').addEventListener('click', () =>{ state.easyMode = !state.easyMode; saveState(); applyModes(); showToast(state.easyMode ? 'Easy View ON' : 'Standard View'); });
    const ltBtn = document.getElementById('textsize-btn'); if (ltBtn) ltBtn.addEventListener('click', () =>{ state.largeText = !state.largeText; saveState(); applyModes(); showToast(state.largeText ? 'Large Text ON' : 'Standard Text'); });
        const hcBtn = document.getElementById('hc-btn'); if (hcBtn) hcBtn.addEventListener('click', () =>{ state.highContrast = !state.highContrast; if (state.highContrast) state.darkMode = false; saveState(); applyModes(); showToast(state.highContrast ? 'High Contrast ON (Light Base)' : 'Standard Contrast'); });
        document.getElementById('theme-btn').addEventListener('click', () =>{ state.darkMode = !state.darkMode; if (state.darkMode) state.highContrast = false; saveState(); applyModes(); showToast(state.darkMode ? 'Dark Mode ON' : 'Light Mode ON'); });
    const TUTORIAL_STEPS = [
      {
        title: '1. Enter or Scan Your Statement of Results',
        demoLabel: 'Demo: Load Sample Scan ↗',
        demoAction: 'scan_demo',
        body: 'On the <strong>Results</strong> tab, switch between <strong>Enter Manually</strong> and <strong>Scan Report Photo</strong>. Photos stay 100% on your device (never uploaded): you can rotate, boost contrast, zoom, auto-read or paste Google Lens text, and confirm every subject before saving.',
        example: '<strong>Worked Example:</strong> Uploading an NSC statement with English HL 64%, isiZulu FAL 70%, Maths 48%, Physical Sciences 51%, IT 68%, Geography 59%, and LO 80% calculates <strong>Bachelor\'s Pass · APS 27 (excl. LO)</strong>.'
      },
      {
        title: '2. How APS, Bottlenecks & What-If Work',
        demoLabel: 'Demo: Simulate Maths 60% ↗',
        demoAction: 'whatif_demo',
        body: 'The engine calculates your APS excluding Life Orientation, flags if Home Language is below 40%, and highlights your single biggest <strong>Subject Bottleneck</strong>. Use the <strong>What-If Rewrite Simulator</strong> to test improving any subject without touching your real saved marks.',
        example: '<strong>Worked Example:</strong> Lifting Mathematics from 48% to 60% in What-If mode previews newly unlocked Computer Science and Engineering routes while keeping your confirmed marks safely isolated.'
      },
      {
        title: '3. Careers First & All Legitimate Routes',
        demoLabel: 'Demo: Non-University Routes ↗',
        demoAction: 'nouni_demo',
        body: 'Open <strong>Careers</strong> to inspect real job duties and entry ladders, then open <strong>All Routes</strong> to compare Public Universities, UoTs, TVET Colleges, QCTO Occupational Certificates, and Workplace Learnerships. Tap <strong>Why?</strong> on any route to audit exact subject checks.',
        example: '<strong>Worked Example:</strong> Turning on <strong>No University Required Mode</strong> or <strong>I Cannot Relocate</strong> immediately filters for near-home TVET, Higher Certificate bridging, and QCTO programmes.'
      },
      {
        title: '4. Plan A, B & C, Affordability & Family Talk',
        demoLabel: 'Demo: Open Plan A/B/C ↗',
        demoAction: 'plan_demo',
        body: 'Never rely on a single competitive university. Assign a Reach (Plan A), Safe In-Province (Plan B), and Near-Home Backup (Plan C), compare annual tuition/accommodation costs side-by-side, track your 6 application documents, and copy a calm <strong>Family Talk Script</strong>.',
        example: '<strong>Worked Example:</strong> Comparing Plan A (relocation ~R109k/yr) against Plan C (near-home TVET/bridging with NSFAS) exposes the real funding gap before application fees are spent.'
      },
      {
        title: '5. Honest Evidence Vault, CV & Scam Shield',
        demoLabel: 'Demo: Open Scam Shield ↗',
        demoAction: 'scam_demo',
        body: 'In <strong>Evidence &amp; CV</strong>, log real projects or tools you have actually used (never invented numbers) to export a clean single-column Word CV and cover letter. In <strong>Work &amp; Scams</strong>, paste any suspicious WhatsApp or SMS job advert to detect upfront-fee scams.',
        example: '<strong>Worked Example:</strong> Pasting an advert asking for a R150 uniform or registration fee via eWallet triggers a High-Risk Scam alert with official zero-fee links (SA Youth, DPSA, DHET).'
      },
      {
        title: '6. Settings, Modes & Accessibility',
        demoLabel: 'Demo: Open Settings ↗',
        demoAction: 'settings_demo',
        body: 'Tap <strong>Settings</strong> in the top-right corner to switch your <strong>Home Province</strong>, <strong>Language</strong> (English, isiZulu, Afrikaans), <strong>Parent / Guardian View</strong>, <strong>Easy View</strong>, <strong>Large Text (A+)</strong>, <strong>High Contrast (HC)</strong>, <strong>Dark Mode</strong>, or import custom prospectus rules (<code>.json</code>).',
        example: '<strong>When to Use Modes:</strong> Use <strong>Parent View</strong> for plain-language family summaries, <strong>Easy View</strong> + <strong>A+</strong> for larger uncluttered controls, and <strong>HC</strong> for bright outdoor phone screens.'
      },
      {
        title: '7. Cross-Device Sync & Shared-Device Privacy',
        demoLabel: 'Demo: Open Sync & Wipe ↗',
        demoAction: 'sync_demo',
        body: 'Tap <strong>Sync</strong> to download an <strong>AES-256 Encrypted Backup</strong> (protected by your 8+ character passphrase) that unlocks on another phone completely offline. If you are using a school computer or borrowed phone, tap <strong>Wipe My Info From This Device</strong> when finished.',
        example: '<strong>Privacy Guarantee:</strong> No SA ID number is required to browse, and under-18 POPIA guardian consent is built into the cloud OTP sync design. Replay this tour anytime via <strong>Tour</strong>.'
      }
    ];

    function renderTutorial() {
      const idx = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, Number(state.tutorialStep) || 0));
      state.tutorialStep = idx;
      const step = TUTORIAL_STEPS[idx];
      const badge = document.getElementById('tut-step-badge');
      const title = document.getElementById('tut-title');
      const body = document.getElementById('tut-body');
      const ex = document.getElementById('tut-example');
      const bar = document.getElementById('tut-progress-bar');
      const prevBtn = document.getElementById('tut-prev-btn');
      const demoBtn = document.getElementById('tut-demo-btn');
      const nextBtn = document.getElementById('tut-next-btn');
      if (badge) badge.textContent = `Step ${idx + 1} of ${TUTORIAL_STEPS.length}`;
      if (title) title.textContent = step.title;
      if (body) body.innerHTML = step.body;
      if (ex) ex.innerHTML = step.example;
      if (bar) bar.style.width = `${Math.round(((idx + 1) / TUTORIAL_STEPS.length) * 100)}%`;
      if (prevBtn) prevBtn.classList.toggle('invisible', idx === 0);
      if (demoBtn) demoBtn.textContent = step.demoLabel;
      if (nextBtn) nextBtn.textContent = idx === TUTORIAL_STEPS.length - 1 ? 'Finish & Plan ✓' : 'Next →';
    }

    function openTutorial(stepIdx = 0) {
      state.tutorialStep = stepIdx;
      renderTutorial();
      document.getElementById('tutorial-modal').classList.remove('hidden');
    }

    function closeTutorial() {
      state.tutorialSeen = true;
      saveState();
      document.getElementById('tutorial-modal').classList.add('hidden');
    }

    function runTutorialDemo(action) {
      closeTutorial();
      if (action === 'scan_demo') {
        state.tab = 'results';
        state.scannerOpen = true;
        state.scanRawText = 'English Home Language 66%\nisiZulu First Additional Language 72%\nMathematics 61%\nPhysical Sciences 58%\nInformation Technology 74%\nGeography 63%\nLife Orientation 82%';
        state.scanParsed = parseStatementText(state.scanRawText);
        saveState(); render();
        showToast('Live Demo: Loaded sample NSC statement in Scan Report Photo!');
      } else if (action === 'whatif_demo') {
        state.tab = 'results';
        state.scannerOpen = false;
        state.whatIfActive = true;
        state.whatIfSubject = 'Mathematics';
        state.whatIfMaths = 60;
        saveState(); render();
        showToast('Live Demo: What-If Rewrite Simulator ON (Mathematics -> 60%)');
      } else if (action === 'nouni_demo') {
        state.tab = 'study';
        state.noUniOnly = true;
        saveState(); render();
        showToast('Live Demo: Showing Non-University (TVET, QCTO & Bridging) routes');
      } else if (action === 'plan_demo') {
        state.tab = 'plan';
        saveState(); render();
      } else if (action === 'scam_demo') {
        state.tab = 'work';
        saveState(); render();
      } else if (action === 'settings_demo') {
        document.getElementById('settings-modal').classList.remove('hidden');
      } else if (action === 'sync_demo') {
        document.getElementById('auth-modal').classList.remove('hidden');
      }
    }

    document.getElementById('help-btn').addEventListener('click', () => openTutorial(0));
    document.getElementById('tut-prev-btn').addEventListener('click', () => {
      state.tutorialStep = Math.max(0, (Number(state.tutorialStep) || 0) - 1);
      renderTutorial();
    });
    document.getElementById('tut-next-btn').addEventListener('click', () => {
      if ((Number(state.tutorialStep) || 0) >= TUTORIAL_STEPS.length - 1) { closeTutorial(); return; }
      state.tutorialStep = (Number(state.tutorialStep) || 0) + 1;
      renderTutorial();
    });
    document.getElementById('tut-demo-btn').addEventListener('click', () => {
      const step = TUTORIAL_STEPS[Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, Number(state.tutorialStep) || 0))];
      runTutorialDemo(step.demoAction);
    });
    document.getElementById('prov-select').addEventListener('change', e =>{ state.province = e.target.value; saveState(); render(); });
    const langSel = document.getElementById('lang-select'); if (langSel) langSel.addEventListener('change', e =>{ state.lang = e.target.value; saveState(); try { if (window.MZI18N) window.MZI18N.setLang(state.lang); } catch (err) {} render(); showToast('Language updated'); });
    document.addEventListener('keydown', e =>{
      if (e.altKey && ['1','2','3','4','5','6'].includes(e.key)) {
        const tabs = ['results', 'careers', 'study', 'plan', 'vault', 'work'];
        state.tab = tabs[Number(e.key) - 1]; saveState(); render(); return;
      }
            if (e.key === 'Escape') {
        document.getElementById('why-modal').classList.add('hidden');
        if (!document.getElementById('tutorial-modal').classList.contains('hidden')) closeTutorial();
        document.getElementById('auth-modal').classList.add('hidden');
        document.getElementById('settings-modal').classList.add('hidden');
      }
    });
    ['why-modal', 'tutorial-modal', 'settings-modal'].forEach(id =>{
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', e =>{ if (e.target === el) el.classList.add('hidden'); });
    });

    document.addEventListener('change', e =>{
      if (e.target && e.target.dataset && e.target.dataset.incEv !== undefined) {
        const idx = Number(e.target.dataset.incEv);
        if (state.evidenceVault[idx]) { state.evidenceVault[idx].includeInCv = e.target.checked; saveState(); }
      }
    });
    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
      const hadController = !!navigator.serviceWorker.controller;
      let swNoticeShown = false;
      // A new release takes over by itself; tell the person once instead of leaving them on a half-old screen.
      navigator.serviceWorker.addEventListener('controllerchange', () =>{
        if (!hadController || swNoticeShown) return; swNoticeShown = true;
        showToast('A new version of Mzansi Pathways is ready. Reload the page when convenient to use it.', 7000);
      });
      window.addEventListener('load', () =>{ navigator.serviceWorker.register('./sw.js').catch(() =>{}); });
    }
    // v2 backups use OWASP-recommended 600k PBKDF2 rounds and record the count in the file; v1 files (120k) still open.
    const KDF_ITER_V1 = 120000, KDF_ITER_V2 = 600000;
    async function deriveAesKey(passphrase, salt, iterations) {
      const enc = new TextEncoder();
      const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: iterations || KDF_ITER_V2, hash: 'SHA-256' },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    }

    const authBtn = document.getElementById('auth-btn');
    if (authBtn) authBtn.addEventListener('click', () =>document.getElementById('auth-modal').classList.remove('hidden'));
    const closeAuth = document.getElementById('close-auth');
    if (closeAuth) closeAuth.addEventListener('click', () =>document.getElementById('auth-modal').classList.add('hidden'));
    const authModalEl = document.getElementById('auth-modal');
    if (authModalEl) authModalEl.addEventListener('click', e =>{ if (e.target === authModalEl) authModalEl.classList.add('hidden'); });

    function syncBackupUi() {
      const lb = document.getElementById('enc-last-backup');
      if (lb) {
        let when = '';
        try { if (state.lastBackupAt) when = new Date(state.lastBackupAt).toLocaleDateString(); } catch (e) {}
        lb.textContent = when ? 'Last backup downloaded: ' + when : 'No backup downloaded yet. Make one before you clear your browser or change phones.';
      }
      const ub = document.getElementById('btn-undo-restore');
      let has = false; try { has = !!localStorage.getItem(UNDO_KEY); } catch (e) {}
      if (ub) ub.classList.toggle('hidden', !has);
    }
    const undoRestoreBtn = document.getElementById('btn-undo-restore');
    if (undoRestoreBtn) undoRestoreBtn.addEventListener('click', () => {
      try {
        const prev = JSON.parse(localStorage.getItem(UNDO_KEY) || 'null');
        if (!prev || typeof prev !== 'object' || Array.isArray(prev)) { showToast('Nothing to undo'); return; }
        state = { ...state, ...prev }; localStorage.removeItem(UNDO_KEY);
        repairState(state); saveState(); applyModes(); render(); syncBackupUi(); showToast('Your earlier profile is back.');
      } catch (e) { showToast('Could not undo'); }
    });
    if (authBtn) authBtn.addEventListener('click', syncBackupUi);
    if (setOpenSync) setOpenSync.addEventListener('click', syncBackupUi);
    const expEncBtn = document.getElementById('btn-export-enc');
    if (expEncBtn) expEncBtn.addEventListener('click', async () =>{
      const pass = (document.getElementById('enc-pass')?.value || '');
      if (pass.length < 8) { showToast('Use at least 8 characters for your passphrase'); return; }
      try {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveAesKey(pass, salt, KDF_ITER_V2);
        const plain = new TextEncoder().encode(JSON.stringify(state));
        const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
        // Chunked: String.fromCharCode(...bigArray) overflows the call stack for a large profile and made backups fail.
        const b64 = u => { let bin = ''; for (let i = 0; i < u.length; i += 8192) bin += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(bin); };
        const bundle = JSON.stringify({ format: 'mzansi-pathways-aes256-v2', kdf: 'PBKDF2-SHA256', iterations: KDF_ITER_V2, createdAt: new Date().toISOString(), salt: b64(salt), iv: b64(iv), data: b64(cipher) });
        const url = URL.createObjectURL(new Blob([bundle], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = 'mzansi_pathways_encrypted.mzansi';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() =>URL.revokeObjectURL(url), 1000);
        state.lastBackupAt = new Date().toISOString(); saveState(); syncBackupUi();
        showToast('Downloaded AES-256 encrypted backup! Keep a second copy somewhere else (WhatsApp it to yourself, email, or a USB stick).', 5000);
      } catch (err) { showToast(err && err.name === 'QuotaExceededError' ? 'Not enough space to create the backup' : 'Could not create the backup in this browser. Try another browser.'); }
    });

    const impEncIn = document.getElementById('in-import-enc');
    if (impEncIn) impEncIn.addEventListener('change', e =>{
      const f = e.target.files && e.target.files[0];
      const pass = (document.getElementById('enc-pass')?.value || '');
      if (!f || pass.length < 8) { showToast('Enter your 8+ character passphrase first, then choose the file'); return; }
      if (f.size > 5 * 1024 * 1024) { showToast('That file is too big to be a Mzansi Pathways backup'); e.target.value = ''; return; }
      const r = new FileReader();
      r.onload = async () =>{
        try {
          const pkg = JSON.parse(String(r.result || '{}'));
          if (!pkg || (pkg.format !== 'mzansi-pathways-aes256-v1' && pkg.format !== 'mzansi-pathways-aes256-v2') || !pkg.salt || !pkg.iv || !pkg.data) { showToast('This is not a Mzansi Pathways backup file'); return; }
          const fromB64 = s =>Uint8Array.from(atob(s), c =>c.charCodeAt(0));
          const iters = pkg.format === 'mzansi-pathways-aes256-v2' ? Number(pkg.iterations) : KDF_ITER_V1;
          // Refuse weakened or absurd values so a tampered file can neither downgrade the key stretching nor freeze the phone.
          if (!Number.isInteger(iters) || iters < KDF_ITER_V1 || iters > 5000000) { showToast('This backup file is not valid'); return; }
          showToast('Unlocking... this can take a few seconds');
          const key = await deriveAesKey(pass, fromB64(pkg.salt), iters);
          const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(pkg.iv) }, key, fromB64(pkg.data));
          const restored = JSON.parse(new TextDecoder().decode(dec));
          if (!restored || typeof restored !== 'object' || Array.isArray(restored) || !Array.isArray(restored.subjects)) { showToast('The backup opened but its contents look damaged. Your current profile was not changed.'); return; }
          // Safety copy of the CURRENT profile first, so a wrong restore can be undone.
          try { localStorage.setItem(UNDO_KEY, JSON.stringify(state)); } catch (e2) {}
          state = { ...state, ...restored, plans: { ...state.plans, ...(restored.plans || {}) } };
          repairState(state);
          saveState(); applyModes(); render(); syncBackupUi();
          document.getElementById('auth-modal').classList.add('hidden');
          showToast('Unlocked & restored your profile. Tap Sync & Backup > Undo restore if this was the wrong file.', 5000);
        } catch (err) { showToast('Wrong passphrase or invalid backup file. Your current profile was not changed.'); }
        finally { e.target.value = ''; }
      };
      r.onerror = () => showToast('Could not read that file');
      r.readAsText(f);
    });

    const wipeBtn = document.getElementById('btn-wipe-device'); if (wipeBtn) wipeBtn.addEventListener('click', wipeLocalProfile);
        const otpForm = document.getElementById('otp-preview-form');
    if (otpForm) otpForm.addEventListener('submit', e =>{
      e.preventDefault();
      showToast('Cloud OTP requires connecting your Supabase Auth URL — use Option 1 encrypted transfer offline today!');
    });

    // Errors never pop up in front of a learner, but the last few are kept in memory (window.__mzErrors) so a helper can read them from the console.
    window.__mzErrors = [];
    const keepErr = m =>{ try { window.__mzErrors.push(String(m).slice(0, 300)); if (window.__mzErrors.length > 20) window.__mzErrors.shift(); } catch (x) {} };
    window.addEventListener('error', e =>{ if (e && e.target === window) keepErr((e.message || 'error') + ' @' + (e.filename || '').split('/').pop() + ':' + (e.lineno || 0)); if (e && e.preventDefault) e.preventDefault(); });
    window.addEventListener('unhandledrejection', e =>{ keepErr('promise: ' + (e && e.reason && (e.reason.message || e.reason))); if (e && e.preventDefault) e.preventDefault(); });

    let deferredPwaPrompt = null;
    window.addEventListener('beforeinstallprompt', e =>{
      e.preventDefault(); deferredPwaPrompt = e;
      const ib = document.getElementById('install-pwa-btn');
      if (ib) ib.classList.remove('hidden');
    });
    const instBtn = document.getElementById('install-pwa-btn');
    if (instBtn) instBtn.addEventListener('click', async () =>{
      if (!deferredPwaPrompt) return;
      deferredPwaPrompt.prompt();
      const ch = await deferredPwaPrompt.userChoice;
      if (ch && ch.outcome === 'accepted') instBtn.classList.add('hidden');
      deferredPwaPrompt = null;
    });

    const syncNetPill = () =>{
      const np = document.getElementById('net-pill');
      if (np) np.classList.toggle('hidden', navigator.onLine);
    };
    window.addEventListener('online', syncNetPill);
    window.addEventListener('offline', syncNetPill);
    syncNetPill();
    // Ask the browser not to evict saved marks when the phone is short of space (silent, best effort).
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() =>{}); } catch (e) {}
    applyModes();
    syncBackupUi();
    if (window._mzRecovered) showToast('Your saved profile was damaged, so the last good copy was restored. Please check your marks.', 6000);
    if (!state.intakeYear) state.intakeYear = MZDATA.defaultYear();
    syncYearLabels();
    render();
    // Apply the saved language to the key screens (i18n.js keeps its own copy, so sync it from the profile).
    try { if (window.MZI18N && state.lang) window.MZI18N.setLang(state.lang); } catch (e) {}
    MZDATA.load(SAMPLE_PROGRAMMES, CAREERS).then(n => { if (n) render(); });
    /* v78: tour is opt-in (home page link or Help), no longer pops over the first screen */
    loadLiveOpenJobs();
  