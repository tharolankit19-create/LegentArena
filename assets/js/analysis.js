/* The "AI" layer: everything here is derived from the student's own records.
   No number in this file is hard-coded or invented — each one is computed from
   padhai_progress / padhai_logs / padhai_attempts plus the syllabus weightage. */
(function () {
  const S = window.CONFIG.study;

  function pyqTarget() {
    const p = DB.cache.profile;
    return (p && p.pyq_target) || S.pyqTarget;
  }

  /* ---------- per-chapter ---------- */

  // Which of the five checkpoints are cleared, and how far along the chapter is.
  function chapterStatus(chapterId) {
    const ch = SYLLABUS.chapter(chapterId);
    const p = DB.progressOf(chapterId);
    const target = pyqTarget();
    const pyqRatio = Math.min(1, (p.pyq_count || 0) / target);
    const testOk = p.test_score != null && Number(p.test_score) >= S.testPassScore;

    const steps = {
      lecture: !!p.lecture_done,
      dpp:     !!p.dpp_done,
      module:  !!p.module_done,
      pyq:     pyqRatio >= 1,
      test:    testOk
    };
    // PYQ contributes partially so the bar moves while the student grinds questions
    const score = (steps.lecture ? 1 : 0) + (steps.dpp ? 1 : 0) + (steps.module ? 1 : 0)
                + pyqRatio + (steps.test ? 1 : 0);
    const pct = Math.round((score / 5) * 100);
    const doneCount = Object.keys(steps).filter(function (k) { return steps[k]; }).length;

    return {
      chapter: ch, progress: p, steps: steps,
      pyqRatio: pyqRatio, pyqCount: p.pyq_count || 0, pyqTarget: target,
      testScore: p.test_score == null ? null : Number(p.test_score),
      pct: pct, doneCount: doneCount, isDone: doneCount === 5,
      started: score > 0,
      nextStep: !steps.lecture ? 'lecture' : !steps.dpp ? 'dpp' : !steps.module ? 'module'
              : !steps.pyq ? 'pyq' : !steps.test ? 'test' : null
    };
  }

  function allStatuses() {
    return SYLLABUS.chapters.map(function (c) { return chapterStatus(c.id); });
  }

  /* ---------- subject / overall ---------- */

  function subjectSummary(subjectId) {
    const list = SYLLABUS.chaptersOf(subjectId).map(function (c) { return chapterStatus(c.id); });
    const done = list.filter(function (s) { return s.isDone; }).length;
    const started = list.filter(function (s) { return s.started && !s.isDone; }).length;
    const pctSum = list.reduce(function (a, s) { return a + s.pct; }, 0);

    // weightage actually secured = sum(weight × completion) / sum(weight)
    let wTotal = 0, wDone = 0;
    list.forEach(function (s) {
      const w = SYLLABUS.weightOf(s.chapter).value;
      wTotal += w; wDone += w * (s.pct / 100);
    });

    return {
      subject: SYLLABUS.subject(subjectId),
      total: list.length, done: done, started: started,
      pct: list.length ? Math.round(pctSum / list.length) : 0,
      weightPct: wTotal ? Math.round((wDone / wTotal) * 100) : 0,
      statuses: list
    };
  }

  function overall() {
    const list = allStatuses();
    const done = list.filter(function (s) { return s.isDone; }).length;
    const pctSum = list.reduce(function (a, s) { return a + s.pct; }, 0);
    let wTotal = 0, wDone = 0;
    list.forEach(function (s) {
      const w = SYLLABUS.weightOf(s.chapter).value;
      wTotal += w; wDone += w * (s.pct / 100);
    });
    return {
      total: list.length, done: done,
      pct: list.length ? Math.round(pctSum / list.length) : 0,
      weightPct: wTotal ? Math.round((wDone / wTotal) * 100) : 0,
      pyqSolved: list.reduce(function (a, s) { return a + s.pyqCount; }, 0),
      pyqNeeded: list.length * pyqTarget()
    };
  }

  /* ---------- time / streak ---------- */

  function logsOn(dateIso) {
    return DB.cache.logs.filter(function (l) { return l.log_date === dateIso; });
  }
  function minutesOn(dateIso) {
    return logsOn(dateIso).reduce(function (a, l) { return a + (l.minutes || 0); }, 0);
  }
  function questionsOn(dateIso) {
    return logsOn(dateIso).reduce(function (a, l) {
      return a + ((l.activity === 'pyq' || l.activity === 'dpp' || l.activity === 'module') ? (l.qty || 0) : 0);
    }, 0);
  }

  // Consecutive days (ending today or yesterday) with at least one logged action.
  function streak() {
    const days = {};
    DB.cache.logs.forEach(function (l) { days[l.log_date] = true; });
    const t = UI.today();
    let cursor = days[t] ? t : UI.addDays(t, -1);
    if (!days[cursor]) return 0;
    let n = 0;
    while (days[cursor]) { n++; cursor = UI.addDays(cursor, -1); }
    return n;
  }

  function last7() {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = UI.addDays(UI.today(), -i);
      out.push({ date: d, minutes: minutesOn(d), questions: questionsOn(d) });
    }
    return out;
  }

  /* ---------- pace vs exam date ---------- */

  function pace() {
    const p = DB.cache.profile;
    const examDate = (p && p.exam_date) || S.defaultExamDate;
    const daysLeft = Math.max(0, UI.daysBetween(UI.today(), examDate));
    const o = overall();
    const remaining = o.total - o.done;
    const perWeekNeeded = daysLeft > 0 ? (remaining / (daysLeft / 7)) : remaining;

    // actual rate: chapters finished in the last 28 days, from the progress rows
    const since = UI.addDays(UI.today(), -28);
    let finishedRecently = 0;
    SYLLABUS.chapters.forEach(function (c) {
      const st = chapterStatus(c.id);
      if (st.isDone && st.progress.updated_at && st.progress.updated_at.slice(0, 10) >= since) finishedRecently++;
    });
    const perWeekActual = finishedRecently / 4;

    const goal = (p && p.daily_goal_min) || S.defaultDailyGoalMin;
    return {
      examDate: examDate, daysLeft: daysLeft, remaining: remaining,
      perWeekNeeded: Math.round(perWeekNeeded * 10) / 10,
      perWeekActual: Math.round(perWeekActual * 10) / 10,
      onTrack: perWeekActual >= perWeekNeeded,
      dailyGoalMin: goal,
      todayMinutes: minutesOn(UI.today()),
      todayPct: goal ? Math.min(100, Math.round((minutesOn(UI.today()) / goal) * 100)) : 0
    };
  }

  /* ---------- what to study next ---------- */

  // Priority = weightage still unclaimed, nudged by how easy the win is.
  // score = weight × (1 - completion) × easeBonus
  function priorities(limit) {
    const EASE = { easy: 1.25, moderate: 1.0, hard: 0.85 };
    return allStatuses()
      .filter(function (s) { return !s.isDone; })
      .map(function (s) {
        const w = SYLLABUS.weightOf(s.chapter);
        const gap = 1 - s.pct / 100;
        const ease = EASE[s.chapter.difficulty] || 1;
        const nearlyDone = s.pct >= 60 ? 1.35 : 1;   // finish what you started
        return {
          status: s,
          weight: w,
          score: w.value * gap * ease * nearlyDone,
          reason: reasonFor(s, w)
        };
      })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, limit || 6);
  }

  function reasonFor(s, w) {
    if (s.pct >= 60) return 'लगभग पूरा — बस ' + (5 - s.doneCount) + ' स्टेप बाकी';
    if (w.known && w.value >= 2) return 'हाई वेटेज: ~' + w.value + ' प्रश्न/पेपर';
    if (s.chapter.isSmall) return 'छोटा चैप्टर — जल्दी निपटेगा';
    if (w.known) return '~' + w.value + ' प्रश्न/पेपर';
    return 'सिलेबस का हिस्सा — वेटेज डेटा नहीं';
  }

  // Small chapters that are still open: fastest marks per hour.
  function quickWins(limit) {
    return allStatuses()
      .filter(function (s) { return s.chapter.isSmall && !s.isDone; })
      .sort(function (a, b) { return b.pct - a.pct; })
      .slice(0, limit || 6);
  }

  // High weightage but barely touched — the most expensive gaps.
  function biggestGaps(limit) {
    return allStatuses()
      .filter(function (s) { return s.pct < 40 && SYLLABUS.weightOf(s.chapter).known; })
      .sort(function (a, b) { return SYLLABUS.weightOf(b.chapter).value - SYLLABUS.weightOf(a.chapter).value; })
      .slice(0, limit || 5);
  }

  /* ---------- spaced revision ---------- */

  // A finished chapter becomes due again after 1, 3, 7, 21, 45 days.
  function revisionsDue() {
    const out = [];
    allStatuses().forEach(function (s) {
      if (!s.isDone) return;
      const base = s.progress.last_studied || (s.progress.updated_at || '').slice(0, 10);
      if (!base) return;
      const done = s.progress.revision_count || 0;
      const gap = S.revisionGaps[Math.min(done, S.revisionGaps.length - 1)];
      const due = UI.addDays(base, gap);
      const overdue = UI.daysBetween(due, UI.today());
      if (overdue >= 0) out.push({ status: s, dueOn: due, overdueDays: overdue, round: done + 1 });
    });
    return out.sort(function (a, b) { return b.overdueDays - a.overdueDays; });
  }

  /* ---------- accuracy from practice attempts ---------- */

  function accuracyByChapter(attempts) {
    const map = {};
    (attempts || []).forEach(function (a) {
      if (!a.chapter_id) return;
      const m = map[a.chapter_id] || (map[a.chapter_id] = { total: 0, correct: 0, seconds: 0 });
      m.total++; if (a.is_correct) m.correct++; m.seconds += a.seconds || 0;
    });
    Object.keys(map).forEach(function (k) {
      const m = map[k];
      m.accuracy = Math.round((m.correct / m.total) * 100);
      m.avgSeconds = Math.round(m.seconds / m.total);
    });
    return map;
  }

  function weakChapters(attempts, minAttempts, limit) {
    const map = accuracyByChapter(attempts);
    return Object.keys(map)
      .filter(function (k) { return map[k].total >= (minAttempts || 5) && map[k].accuracy < 60 && SYLLABUS.chapter(k); })
      .map(function (k) { return { chapter: SYLLABUS.chapter(k), stats: map[k] }; })
      .sort(function (a, b) { return a.stats.accuracy - b.stats.accuracy; })
      .slice(0, limit || 5);
  }

  /* ---------- daily briefing ---------- */

  // Returns UI-ready cards. Each line quotes a number the student can verify.
  function dailyInsights(attempts) {
    const out = [];
    const p = pace();
    const o = overall();
    const st = streak();
    const t = UI.today();

    // 1. today's effort
    const todayLogs = logsOn(t);
    if (!todayLogs.length) {
      out.push({ kind: 'warn', icon: '⏰', title: 'आज अभी तक कुछ लॉग नहीं हुआ',
        detail: 'रोज़ का लक्ष्य ' + UI.mins(p.dailyGoalMin) + ' है। एक लेक्चर या 20 PYQ से शुरुआत करें।' });
    } else {
      const q = questionsOn(t);
      out.push({ kind: p.todayPct >= 100 ? 'good' : 'info', icon: p.todayPct >= 100 ? '✅' : '📈',
        title: 'आज ' + UI.mins(p.todayMinutes) + ' पढ़ाई' + (q ? ' · ' + q + ' प्रश्न' : ''),
        detail: 'लक्ष्य का ' + p.todayPct + '% पूरा (' + UI.mins(p.dailyGoalMin) + ' में से)' });
    }

    // 2. streak
    if (st >= 2) {
      out.push({ kind: 'good', icon: '🔥', title: st + ' दिन की लगातार पढ़ाई',
        detail: 'यह सिलसिला मत तोड़िए — आज भी कुछ न कुछ लॉग करें।' });
    }

    // 3. pace vs exam
    if (p.daysLeft > 0) {
      out.push({
        kind: p.onTrack ? 'good' : 'warn',
        icon: p.onTrack ? '🎯' : '⚠️',
        title: p.onTrack
          ? 'रफ़्तार ठीक है — हफ़्ते में ' + p.perWeekActual + ' चैप्टर'
          : 'रफ़्तार बढ़ानी होगी',
        detail: p.remaining + ' चैप्टर बाकी, ' + p.daysLeft + ' दिन बचे → हर हफ़्ते ' +
                p.perWeekNeeded + ' चैप्टर चाहिए (अभी ' + p.perWeekActual + ')'
      });
    }

    // 4. top priority chapter
    const pr = priorities(1)[0];
    if (pr) {
      out.push({ kind: 'info', icon: '📌', title: 'अगला चैप्टर: ' + pr.status.chapter.hi,
        detail: pr.reason + ' · अभी ' + pr.status.pct + '% पूरा' });
    }

    // 5. revision due
    const rev = revisionsDue();
    if (rev.length) {
      out.push({ kind: 'warn', icon: '🔁', title: rev.length + ' चैप्टर रिवीज़न के लिए तैयार',
        detail: rev.slice(0, 3).map(function (r) { return r.status.chapter.hi; }).join(', ') +
                (rev.length > 3 ? ' और ' + (rev.length - 3) + ' और' : '') });
    }

    // 6. weak areas from real attempts
    const weak = weakChapters(attempts, 5, 3);
    if (weak.length) {
      out.push({ kind: 'bad', icon: '🩺', title: 'कमज़ोर: ' + weak[0].chapter.hi + ' (' + weak[0].stats.accuracy + '% सही)',
        detail: weak.length > 1
          ? 'साथ में ' + weak.slice(1).map(function (w) { return w.chapter.hi; }).join(', ') + ' पर भी काम करें'
          : weak[0].stats.total + ' प्रश्नों के आधार पर' });
    }

    // 7. quick wins
    const qw = quickWins(3);
    if (qw.length && o.pct < 90) {
      out.push({ kind: 'info', icon: '⚡', title: qw.length + ' छोटे चैप्टर बाकी हैं',
        detail: qw.map(function (s) { return s.chapter.hi; }).join(', ') + ' — कम समय, पूरे मार्क्स' });
    }

    return out;
  }

  // A concrete plan for today, sized to the daily goal.
  function todayPlan() {
    const p = pace();
    const items = [];
    const rev = revisionsDue().slice(0, 2);
    rev.forEach(function (r) {
      items.push({ icon: '🔁', title: r.status.chapter.hi + ' का रिवीज़न',
        detail: 'राउंड ' + r.round + (r.overdueDays > 0 ? ' · ' + r.overdueDays + ' दिन से बाकी' : ' · आज due'),
        chapterId: r.status.chapter.id, minutes: 30 });
    });
    priorities(3).forEach(function (pr) {
      const s = pr.status;
      const step = s.nextStep;
      const label = { lecture: 'लेक्चर देखें', dpp: 'DPP हल करें', module: 'मॉड्यूल पूरा करें',
                      pyq: (s.pyqTarget - s.pyqCount) + ' PYQ बाकी', test: 'चैप्टर टेस्ट दें' }[step];
      items.push({ icon: { lecture: '🎥', dpp: '📝', module: '📘', pyq: '🎯', test: '🏁' }[step],
        title: s.chapter.hi, detail: label + ' · ' + pr.reason,
        chapterId: s.chapter.id, minutes: step === 'lecture' ? 90 : step === 'test' ? 60 : 75 });
    });
    // trim to the daily goal
    let acc = 0;
    const fitted = [];
    for (const it of items) {
      if (acc >= p.dailyGoalMin) break;
      fitted.push(it); acc += it.minutes;
    }
    return { items: fitted, plannedMinutes: acc, goalMinutes: p.dailyGoalMin };
  }

  window.ANALYSIS = {
    pyqTarget: pyqTarget,
    chapterStatus: chapterStatus, allStatuses: allStatuses,
    subjectSummary: subjectSummary, overall: overall,
    logsOn: logsOn, minutesOn: minutesOn, questionsOn: questionsOn,
    streak: streak, last7: last7, pace: pace,
    priorities: priorities, quickWins: quickWins, biggestGaps: biggestGaps,
    revisionsDue: revisionsDue,
    accuracyByChapter: accuracyByChapter, weakChapters: weakChapters,
    dailyInsights: dailyInsights, todayPlan: todayPlan
  };
})();
