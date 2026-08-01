/* PadhAI — app configuration.
   Only PUBLIC values live here. The publishable key is safe in the browser:
   every table is protected by Row Level Security, so a student can only ever
   read or write their own rows. Never put a service_role / sb_secret_ key here. */
window.CONFIG = {
  app: {
    name: 'PadhAI',
    tagline: 'JEE Main की तैयारी — हिंदी में',
    version: '1.0.0'
  },

  supabase: {
    url: 'https://bgkwdatqefigoonznqjs.supabase.co',
    publishableKey: 'sb_publishable_KuMFeGIaDsx8bu18FFWNSQ_gGM2hASI',
    bucket: 'padhai-resources'
  },

  study: {
    // A chapter counts as "पूरा" only when all five checkpoints are cleared.
    checkpoints: [
      { key: 'lecture', label: 'लेक्चर',  icon: '🎥', hint: 'पूरा लेक्चर देखा' },
      { key: 'dpp',     label: 'DPP',     icon: '📝', hint: 'सारे DPP हल किए' },
      { key: 'module',  label: 'मॉड्यूल', icon: '📘', hint: 'मॉड्यूल के प्रश्न पूरे' },
      { key: 'pyq',     label: 'PYQ',     icon: '🎯', hint: 'लक्ष्य तक PYQ हल किए' },
      { key: 'test',    label: 'टेस्ट',   icon: '🏁', hint: 'चैप्टर टेस्ट दिया' }
    ],
    pyqTarget: 100,        // PYQs needed per chapter (editable in प्रोफ़ाइल)
    testPassScore: 60,     // % needed for the test checkpoint to count
    // Spaced repetition: days after completion when a revision falls due.
    revisionGaps: [1, 3, 7, 21, 45],
    defaultDailyGoalMin: 360,
    defaultExamDate: '2027-01-24',
    defaultExam: 'JEE Main 2027'
  },

  practice: {
    sizes: [10, 20, 30, 50],
    defaultSize: 20,
    secondsPerQuestion: 120,
    marking: { correct: 4, wrong: -1 }   // JEE Main scheme
  }
};
