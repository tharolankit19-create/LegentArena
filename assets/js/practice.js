/* Practice: pick chapters/topics/year/difficulty → solve → get a real analysis back. */
(function () {
  const el = UI.el;
  const P = window.CONFIG.practice;

  // selection kept across renders so the student doesn't lose picks
  const sel = {
    subjectId: 'physics',
    chapters: {},        // chapterId -> true
    topics: {},          // topicId -> true
    year: '',            // '' = any year
    onlyPyq: false,
    difficulty: 'progressive',
    size: P.defaultSize
  };

  function selectedChapterIds() { return Object.keys(sel.chapters).filter(function (k) { return sel.chapters[k]; }); }
  function selectedTopicIds()   { return Object.keys(sel.topics).filter(function (k) { return sel.topics[k]; }); }

  /* ---------------- setup screen ---------------- */

  function setup(root, prefillChapterId) {
    if (prefillChapterId) {
      const ch = SYLLABUS.chapter(prefillChapterId);
      if (ch) { sel.subjectId = ch.subjectId; sel.chapters = {}; sel.chapters[ch.id] = true; sel.topics = {}; }
    }
    UI.clear(root);
    const wrap = el('div', { class: 'page page-narrow fade-up' });
    root.appendChild(wrap);

    // subject tabs
    const tabs = el('div', { class: 'pill-tabs mb16' });
    SYLLABUS.subjects.forEach(function (s) {
      tabs.appendChild(el('button', {
        class: sel.subjectId === s.id ? 'active' : '', text: s.hi,
        onclick: function () { sel.subjectId = s.id; setup(root); }
      }));
    });
    wrap.appendChild(tabs);

    // chapters
    wrap.appendChild(el('div', { class: 'row mb8' }, [
      el('div', { class: 'section-title', style: 'margin:0', text: 'चैप्टर चुनें' }),
      el('div', { class: 'spacer' }),
      el('button', { class: 'btn btn-sm btn-ghost', text: 'सभी', onclick: function () {
        SYLLABUS.chaptersOf(sel.subjectId).forEach(function (c) { sel.chapters[c.id] = true; });
        setup(root);
      } }),
      el('button', { class: 'btn btn-sm btn-ghost', text: 'हटाएँ', onclick: function () {
        SYLLABUS.chaptersOf(sel.subjectId).forEach(function (c) { delete sel.chapters[c.id]; });
        sel.topics = {}; setup(root);
      } })
    ]));

    const chGrid = el('div', { class: 'pick-grid mb16' });
    SYLLABUS.chaptersOf(sel.subjectId).forEach(function (c) {
      const on = !!sel.chapters[c.id];
      chGrid.appendChild(el('button', {
        class: 'pick' + (on ? ' on' : ''),
        onclick: function () {
          if (sel.chapters[c.id]) {
            delete sel.chapters[c.id];
            c.topics.forEach(function (t) { delete sel.topics[t.id]; });
          } else sel.chapters[c.id] = true;
          setup(root);
        }
      }, [
        el('span', { class: 'pick-box', text: on ? '✓' : '' }),
        el('span', {}, c.hi)
      ]));
    });
    wrap.appendChild(chGrid);

    // topics (only for chosen chapters)
    const chosen = selectedChapterIds().map(SYLLABUS.chapter).filter(Boolean);
    if (chosen.length) {
      wrap.appendChild(el('div', { class: 'section-title', text: 'टॉपिक (वैकल्पिक — न चुनें तो पूरा चैप्टर)' }));
      const tGrid = el('div', { class: 'pick-grid mb16' });
      chosen.forEach(function (c) {
        c.topics.forEach(function (t) {
          const on = !!sel.topics[t.id];
          tGrid.appendChild(el('button', {
            class: 'pick' + (on ? ' on' : ''),
            onclick: function () {
              if (sel.topics[t.id]) delete sel.topics[t.id]; else sel.topics[t.id] = true;
              setup(root);
            }
          }, [
            el('span', { class: 'pick-box', text: on ? '✓' : '' }),
            el('span', {}, [el('span', {}, t.hi), el('div', { class: 'tiny dim', text: c.hi })])
          ]));
        });
      });
      wrap.appendChild(tGrid);
    }

    // filters
    const yearSelect = UI.select([{ value: '', label: 'कोई भी साल' }], { id: 'pYear' });
    DB.availableYears().then(function (years) {
      years.forEach(function (y) {
        yearSelect.appendChild(el('option', { value: y, text: y + ' के PYQ', selected: String(sel.year) === String(y) }));
      });
      if (!years.length) {
        yearSelect.appendChild(el('option', { value: '', text: 'कोई भी साल (अभी कोई PYQ अपलोड नहीं)', disabled: true }));
      }
    }).catch(function () {});
    yearSelect.addEventListener('change', function () { sel.year = yearSelect.value; });

    const diffSelect = UI.select([
      { value: 'progressive', label: 'आसान → कठिन (सुझाया गया)', selected: sel.difficulty === 'progressive' },
      { value: 'easy',        label: 'सिर्फ़ आसान',   selected: sel.difficulty === 'easy' },
      { value: 'medium',      label: 'सिर्फ़ मध्यम',  selected: sel.difficulty === 'medium' },
      { value: 'hard',        label: 'सिर्फ़ कठिन',   selected: sel.difficulty === 'hard' },
      { value: 'mixed',       label: 'मिला-जुला (रैंडम)', selected: sel.difficulty === 'mixed' }
    ]);
    diffSelect.addEventListener('change', function () { sel.difficulty = diffSelect.value; });

    const sizeSelect = UI.select(P.sizes.map(function (n) {
      return { value: n, label: n + ' प्रश्न', selected: sel.size === n };
    }));
    sizeSelect.addEventListener('change', function () { sel.size = Number(sizeSelect.value); });

    wrap.appendChild(el('div', { class: 'card card-pad' }, [
      el('div', { class: 'grid g2' }, [
        UI.field('साल', yearSelect),
        UI.field('कठिनाई', diffSelect),
        UI.field('कितने प्रश्न', sizeSelect),
        UI.field('प्रकार', (function () {
          const s = UI.select([
            { value: 'all', label: 'सभी प्रश्न', selected: !sel.onlyPyq },
            { value: 'pyq', label: 'सिर्फ़ PYQ', selected: sel.onlyPyq }
          ]);
          s.addEventListener('change', function () { sel.onlyPyq = s.value === 'pyq'; });
          return s;
        })())
      ])
    ]));

    const info = el('div', { class: 'small dim mt12 center' });
    wrap.appendChild(info);

    const startBtn = el('button', {
      class: 'btn btn-primary btn-lg btn-block mt12', text: 'प्रैक्टिस शुरू करें',
      onclick: function () { start(root, startBtn, info); }
    });
    wrap.appendChild(startBtn);

    wrap.appendChild(el('button', {
      class: 'btn btn-block mt8', text: '➕ अपने प्रश्न जोड़ें / इम्पोर्ट करें',
      onclick: function () { importModal(function () { setup(root); }); }
    }));

    if (!chosen.length) {
      info.textContent = 'शुरू करने के लिए कम से कम एक चैप्टर चुनें।';
      startBtn.disabled = true;
    }
  }

  /* ---------------- start ---------------- */

  async function start(root, btn, info) {
    const chapterIds = selectedChapterIds();
    if (!chapterIds.length) { UI.toast('कम से कम एक चैप्टर चुनें', 'err'); return; }
    btn.disabled = true;
    btn.textContent = 'प्रश्न ढूँढ़ रहे हैं…';
    try {
      const topicIds = selectedTopicIds();
      const filter = {
        chapterIds: chapterIds,
        topicIds: topicIds.length ? topicIds : null,
        year: sel.year || null,
        onlyPyq: sel.onlyPyq,
        difficulty: sel.difficulty,
        limit: 500
      };
      let pool = (await DB.findQuestions(filter)).concat(seedPool(filter));

      if (!pool.length && topicIds.length) {           // fall back to whole chapters
        const wide = Object.assign({}, filter, { topicIds: null });
        pool = (await DB.findQuestions(wide)).concat(seedPool(wide));
        if (pool.length) UI.toast('चुने टॉपिक में प्रश्न नहीं मिले — पूरे चैप्टर से लिए गए', 'ok');
      }
      if (!pool.length) {
        btn.disabled = false; btn.textContent = 'प्रैक्टिस शुरू करें';
        noQuestions(info, filter);
        return;
      }

      const questions = pickQuestions(pool, sel.size, sel.difficulty);
      const session = await DB.startSession({
        chapters: chapterIds, topics: topicIds, year: sel.year || null,
        difficulty: sel.difficulty, size: questions.length, onlyPyq: sel.onlyPyq
      });
      run(root, session, questions);
    } catch (e) {
      btn.disabled = false; btn.textContent = 'प्रैक्टिस शुरू करें';
      UI.toast(e.message || 'प्रश्न लोड नहीं हो सके', 'err');
    }
  }

  // The built-in bank ships with the app; it has no year, so it is skipped the
  // moment the student filters by a specific year or asks for PYQs only.
  function seedPool(filter) {
    const bank = window.SEED_QUESTIONS || [];
    if (filter.year || filter.onlyPyq) return [];
    return bank.filter(function (q) {
      if (filter.chapterIds && filter.chapterIds.indexOf(q.chapter_id) < 0) return false;
      if (filter.topicIds && filter.topicIds.length && filter.topicIds.indexOf(q.topic_id) < 0) return false;
      if (filter.difficulty && filter.difficulty !== 'mixed' && filter.difficulty !== 'progressive'
          && q.difficulty !== filter.difficulty) return false;
      return true;
    });
  }

  function noQuestions(info, filter) {
    UI.clear(info);
    info.appendChild(el('div', { class: 'insight warn', style: 'text-align:left' }, [
      el('div', { class: 'insight-ic', text: '📭' }),
      el('div', {}, [
        el('div', { class: 'insight-t', text: 'इस चुनाव के लिए कोई प्रश्न नहीं मिला' }),
        el('div', { class: 'insight-d', text: filter.year
          ? filter.year + ' के PYQ अभी अपलोड नहीं हैं। "अपने प्रश्न जोड़ें" से इम्पोर्ट करें या साल हटा दें।'
          : 'इन चैप्टरों में अभी प्रश्न नहीं हैं। "अपने प्रश्न जोड़ें" से अपने DPP/PYQ इम्पोर्ट करें।' })
      ])
    ]));
  }

  function shuffle(a) {
    const arr = a.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // 'progressive' = easy first, then medium, then hard (the ramp the student asked for)
  function pickQuestions(pool, size, difficulty) {
    if (difficulty !== 'progressive') return shuffle(pool).slice(0, size);
    const buckets = { easy: [], medium: [], hard: [] };
    pool.forEach(function (q) { (buckets[q.difficulty] || buckets.medium).push(q); });
    Object.keys(buckets).forEach(function (k) { buckets[k] = shuffle(buckets[k]); });
    const want = { easy: Math.round(size * 0.4), medium: Math.round(size * 0.4) };
    want.hard = size - want.easy - want.medium;
    const out = [];
    ['easy', 'medium', 'hard'].forEach(function (k) { out.push.apply(out, buckets[k].splice(0, want[k])); });
    // top up from whatever is left, keeping the easy→hard order
    const left = buckets.easy.concat(buckets.medium, buckets.hard);
    while (out.length < size && left.length) out.push(left.shift());
    const rank = { easy: 0, medium: 1, hard: 2 };
    return out.sort(function (a, b) { return (rank[a.difficulty] || 1) - (rank[b.difficulty] || 1); });
  }

  /* ---------------- player ---------------- */

  function run(root, session, questions) {
    const state = {
      i: 0,
      answers: new Array(questions.length).fill(null),
      times: new Array(questions.length).fill(0),
      revealed: new Array(questions.length).fill(false),
      startedAt: Date.now(),
      qStart: Date.now()
    };
    const totalSeconds = questions.length * P.secondsPerQuestion;

    UI.clear(root);
    const wrap = el('div', { class: 'page fade-up' });
    const shell = el('div', { class: 'q-shell' });
    wrap.appendChild(shell);
    root.appendChild(wrap);

    const timerEl = el('div', { class: 'q-timer' });
    const tick = setInterval(function () {
      const left = totalSeconds - Math.floor((Date.now() - state.startedAt) / 1000);
      timerEl.textContent = '⏱ ' + UI.clock(Math.max(0, left));
      timerEl.classList.toggle('low', left <= 60);
      if (left <= 0) { clearInterval(tick); finish(); }
    }, 500);

    function markTime() {
      state.times[state.i] += Math.round((Date.now() - state.qStart) / 1000);
      state.qStart = Date.now();
    }

    function go(n) {
      markTime();
      state.i = Math.max(0, Math.min(questions.length - 1, n));
      render();
    }

    function render() {
      UI.clear(shell);
      const q = questions[state.i];
      const ch = SYLLABUS.chapter(q.chapter_id);
      const revealed = state.revealed[state.i];

      shell.appendChild(el('div', { class: 'q-head' }, [
        el('button', { class: 'btn btn-sm btn-ghost', text: '← छोड़ें', onclick: function () {
          UI.confirm({ title: 'प्रैक्टिस छोड़ें?', message: 'अब तक का जवाब सेव नहीं होगा।', ok: 'छोड़ें', danger: true })
            .then(function (ok) { if (ok) { clearInterval(tick); APP.go('#/practice'); } });
        } }),
        el('div', { class: 'chip chip-blue', text: (state.i + 1) + ' / ' + questions.length }),
        ch ? el('div', { class: 'chip', text: ch.hi }) : null,
        q.year ? el('div', { class: 'chip chip-violet', text: q.year }) : null,
        el('div', { class: 'chip chip-' + ({ easy: 'green', medium: 'amber', hard: 'red' }[q.difficulty] || 'amber'),
          text: { easy: 'आसान', medium: 'मध्यम', hard: 'कठिन' }[q.difficulty] || 'मध्यम' }),
        el('div', { class: 'spacer' }),
        timerEl
      ]));

      shell.appendChild(el('div', { class: 'card card-pad' }, [
        el('div', { class: 'q-text', text: q.question_hi }),
        q.question_en ? el('div', { class: 'small dim mt8', text: q.question_en }) : null
      ]));

      const opts = el('div', { class: 'mt16' });
      if (q.q_type === 'numeric') {
        const inp = UI.input({ type: 'number', step: 'any', placeholder: 'उत्तर लिखें',
          value: state.answers[state.i] == null ? '' : state.answers[state.i] });
        inp.disabled = revealed;
        inp.addEventListener('input', function () { state.answers[state.i] = inp.value; });
        opts.appendChild(UI.field('आपका उत्तर', inp));
        if (revealed) {
          const ok = isCorrect(q, state.answers[state.i]);
          opts.appendChild(el('div', { class: 'insight ' + (ok ? 'good' : 'bad') }, [
            el('div', { class: 'insight-ic', text: ok ? '✓' : '✕' }),
            el('div', {}, [
              el('div', { class: 'insight-t', text: ok ? 'सही उत्तर' : 'सही उत्तर: ' + q.answer })
            ])
          ]));
        }
      } else {
        (q.options || []).forEach(function (o) {
          const key = o.key || o.k;
          const chosen = state.answers[state.i] === key;
          let cls = 'opt' + (chosen ? ' sel' : '');
          if (revealed) {
            if (key === q.answer) cls = 'opt right';
            else if (chosen) cls = 'opt wrong';
            else cls = 'opt';
          }
          opts.appendChild(el('button', {
            class: cls,
            onclick: function () {
              if (revealed) return;
              state.answers[state.i] = chosen ? null : key;   // tap again to unselect
              render();
            }
          }, [
            el('span', { class: 'opt-k', text: key }),
            el('span', { class: 'opt-body' }, [
              el('div', {}, o.hi || o.text || ''),
              o.en ? el('div', { class: 'tiny dim', text: o.en }) : null
            ])
          ]));
        });
      }
      shell.appendChild(opts);

      if (revealed && q.solution_hi) {
        shell.appendChild(el('div', { class: 'card card-pad mt12' }, [
          el('div', { class: 'section-title', style: 'margin:0 0 6px', text: 'हल' }),
          el('div', { class: 'small', style: 'white-space:pre-wrap', text: q.solution_hi })
        ]));
      }

      const nav = el('div', { class: 'row mt16' }, [
        el('button', { class: 'btn', text: '← पिछला', disabled: state.i === 0, onclick: function () { go(state.i - 1); } }),
        el('button', {
          class: 'btn btn-ghost',
          text: revealed ? 'हल देखा' : '💡 उत्तर देखें',
          disabled: revealed,
          onclick: function () { state.revealed[state.i] = true; render(); }
        }),
        el('div', { class: 'spacer' }),
        state.i === questions.length - 1
          ? el('button', { class: 'btn btn-green', text: 'जमा करें', onclick: function () { markTime(); finish(); } })
          : el('button', { class: 'btn btn-primary', text: 'अगला →', onclick: function () { go(state.i + 1); } })
      ]);
      shell.appendChild(nav);

      // question palette
      const nums = el('div', { class: 'q-nums mt16' });
      questions.forEach(function (_, idx) {
        let cls = 'q-num' + (idx === state.i ? ' cur' : '');
        if (state.answers[idx] != null && state.answers[idx] !== '') cls += ' ans';
        nums.appendChild(el('button', { class: cls, text: idx + 1, onclick: function () { go(idx); } }));
      });
      shell.appendChild(el('div', { class: 'card card-pad mt16' }, [
        el('div', { class: 'section-title', style: 'margin:0 0 8px', text: 'प्रश्न सूची' }), nums
      ]));
    }

    async function finish() {
      clearInterval(tick);
      const seconds = Math.round((Date.now() - state.startedAt) / 1000);
      const attempts = questions.map(function (q, idx) {
        const ans = state.answers[idx];
        const answered = ans != null && ans !== '';
        return {
          session_id: session.id, question_id: q.id, chapter_id: q.chapter_id,
          chosen: answered ? String(ans) : null,
          is_correct: answered ? isCorrect(q, ans) : false,
          seconds: state.times[idx] || 0
        };
      });
      const correct = attempts.filter(function (a) { return a.is_correct; }).length;
      const answered = attempts.filter(function (a) { return a.chosen != null; }).length;
      const totals = { total: questions.length, correct: correct, wrong: answered - correct,
                       skipped: questions.length - answered, seconds: seconds };
      try {
        await DB.saveAttempts(attempts);
        await DB.finishSession(session.id, totals);
        // solved PYQs count toward the chapter's PYQ checkpoint
        const perChapter = {};
        attempts.forEach(function (a) {
          if (a.chosen == null) return;
          perChapter[a.chapter_id] = (perChapter[a.chapter_id] || 0) + 1;
        });
        for (const cid of Object.keys(perChapter)) {
          const cur = DB.progressOf(cid);
          await DB.saveProgress(cid, { pyq_count: (cur.pyq_count || 0) + perChapter[cid] });
        }
        const totalSolved = Object.keys(perChapter).reduce(function (a, k) { return a + perChapter[k]; }, 0);
        if (totalSolved) {
          await DB.addLog({ activity: 'pyq', qty: totalSolved, minutes: Math.round(seconds / 60),
            score: totals.total ? Math.round((correct / totals.total) * 100) : null,
            chapter_id: Object.keys(perChapter)[0], note: 'प्रैक्टिस सेशन' });
        }
      } catch (e) {
        UI.toast('रिज़ल्ट सेव नहीं हुआ: ' + e.message, 'err');
      }
      result(root, questions, state, totals);
    }

    render();
  }

  function isCorrect(q, ans) {
    if (ans == null || ans === '') return false;
    if (q.q_type === 'numeric') {
      const a = parseFloat(ans), b = parseFloat(q.answer);
      if (isNaN(a) || isNaN(b)) return String(ans).trim() === String(q.answer).trim();
      return Math.abs(a - b) <= Math.max(0.01, Math.abs(b) * 0.01);   // 1% tolerance
    }
    return String(ans).trim().toUpperCase() === String(q.answer).trim().toUpperCase();
  }

  /* ---------------- result ---------------- */

  function result(root, questions, state, totals) {
    UI.clear(root);
    const wrap = el('div', { class: 'page page-narrow fade-up' });
    root.appendChild(wrap);

    const acc = totals.total ? Math.round((totals.correct / totals.total) * 100) : 0;
    const marks = totals.correct * P.marking.correct + totals.wrong * P.marking.wrong;
    const maxMarks = totals.total * P.marking.correct;

    wrap.appendChild(el('div', { class: 'card card-pad center' }, [
      el('div', { style: 'font-size:40px', text: acc >= 80 ? '🎉' : acc >= 50 ? '💪' : '📚' }),
      el('h2', { class: 'mt8', text: acc + '% सही' }),
      el('div', { class: 'muted small', text: totals.correct + ' सही · ' + totals.wrong + ' गलत · ' + totals.skipped + ' छोड़े' }),
      el('div', { class: 'row mt16', style: 'justify-content:center;gap:10px' }, [
        UI.chip('स्कोर ' + marks + '/' + maxMarks, marks >= maxMarks * 0.6 ? 'green' : 'amber'),
        UI.chip('समय ' + UI.mins(Math.round(totals.seconds / 60)))
      ])
    ]));

    // chapter-wise breakdown, computed from this session's attempts
    const byChapter = {};
    questions.forEach(function (q, idx) {
      const m = byChapter[q.chapter_id] || (byChapter[q.chapter_id] = { total: 0, correct: 0 });
      m.total++;
      const ans = state.answers[idx];
      if (ans != null && ans !== '' && isCorrect(q, ans)) m.correct++;
    });
    wrap.appendChild(el('div', { class: 'section-title', text: 'चैप्टर-वार प्रदर्शन' }));
    const list = el('div');
    Object.keys(byChapter).forEach(function (cid) {
      const m = byChapter[cid], ch = SYLLABUS.chapter(cid);
      const a = Math.round((m.correct / m.total) * 100);
      list.appendChild(el('div', { class: 'card card-pad mb8' }, [
        el('div', { class: 'row' }, [
          el('div', {}, [
            el('div', { style: 'font-weight:700', text: ch ? ch.hi : cid }),
            el('div', { class: 'tiny dim', text: m.correct + '/' + m.total + ' सही' })
          ]),
          el('div', { class: 'spacer' }),
          el('div', { style: 'font-weight:800;color:' + (a >= 60 ? 'var(--green)' : 'var(--red)'), text: a + '%' })
        ]),
        el('div', { class: 'mt8' }, UI.bar(a, a >= 60 ? 'green' : 'red'))
      ]));
    });
    wrap.appendChild(list);

    // every question with the right answer + solution
    wrap.appendChild(el('div', { class: 'section-title', text: 'सभी प्रश्न देखें' }));
    questions.forEach(function (q, idx) {
      const ans = state.answers[idx];
      const answered = ans != null && ans !== '';
      const ok = answered && isCorrect(q, ans);
      wrap.appendChild(el('div', { class: 'card card-pad mb8' }, [
        el('div', { class: 'row', style: 'align-items:flex-start;gap:9px' }, [
          el('div', { class: 'chip chip-' + (ok ? 'green' : answered ? 'red' : ''), text: ok ? '✓' : answered ? '✕' : '–' }),
          el('div', { style: 'flex:1;min-width:0' }, [
            el('div', { style: 'font-weight:600;white-space:pre-wrap', text: (idx + 1) + '. ' + q.question_hi }),
            el('div', { class: 'small mt8' }, [
              el('span', { class: 'dim', text: 'सही: ' }),
              el('b', { text: q.answer }),
              answered ? el('span', { class: 'dim', text: '  ·  आपका: ' + ans }) : el('span', { class: 'dim', text: '  ·  छोड़ा' })
            ]),
            q.solution_hi ? el('details', { class: 'small mt8' }, [
              el('summary', { style: 'cursor:pointer;color:var(--brand)', text: 'हल देखें' }),
              el('div', { class: 'mt8', style: 'white-space:pre-wrap', text: q.solution_hi })
            ]) : null
          ])
        ])
      ]));
    });

    wrap.appendChild(el('div', { class: 'row mt16' }, [
      el('button', { class: 'btn btn-primary', text: 'फिर से प्रैक्टिस', onclick: function () { APP.go('#/practice'); } }),
      el('button', { class: 'btn', text: 'डैशबोर्ड', onclick: function () { APP.go('#/'); } })
    ]));
  }

  /* ---------------- import questions ---------------- */

  const SAMPLE = JSON.stringify([{
    chapter_id: 'phy_modern', topic_id: 'phy_modern__1', year: 2024, difficulty: 'easy',
    q_type: 'mcq',
    question_hi: 'किसी धातु का कार्यफलन 2 eV है। 400 nm के प्रकाश से उत्सर्जित फोटोइलेक्ट्रॉन की अधिकतम गतिज ऊर्जा लगभग क्या होगी?',
    options: [{ key: 'A', hi: '1.1 eV' }, { key: 'B', hi: '3.1 eV' }, { key: 'C', hi: '0.5 eV' }, { key: 'D', hi: '2.0 eV' }],
    answer: 'A',
    solution_hi: 'E = 1240/400 = 3.1 eV; KEmax = 3.1 − 2 = 1.1 eV'
  }], null, 2);

  function importModal(onDone) {
    const ta = el('textarea', { class: 'textarea', style: 'min-height:200px;font-family:ui-monospace,monospace;font-size:12px',
      placeholder: 'यहाँ JSON चिपकाएँ…' });
    const fileIn = el('input', { type: 'file', accept: '.json,application/json', class: 'input' });
    fileIn.addEventListener('change', function () {
      const f = fileIn.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = function () { ta.value = r.result; };
      r.readAsText(f);
    });

    const body = el('div', {}, [
      el('p', { class: 'small muted', text: 'अपने DPP / PYQ / मॉड्यूल के प्रश्न JSON में जोड़ें। chapter_id सिलेबस से लें (जैसे phy_modern)। year डालने पर वह प्रश्न उस साल के PYQ फ़िल्टर में दिखेगा।' }),
      UI.field('JSON फ़ाइल', fileIn),
      UI.field('या सीधे चिपकाएँ', ta),
      el('details', { class: 'small' }, [
        el('summary', { style: 'cursor:pointer;color:var(--brand)', text: 'नमूना फ़ॉर्मैट देखें' }),
        el('pre', { class: 'mt8', style: 'background:var(--surface-2);padding:10px;border-radius:8px;overflow:auto;font-size:11px', text: SAMPLE })
      ])
    ]);

    UI.modal({
      title: 'प्रश्न इम्पोर्ट करें', body: body,
      actions: [
        { label: 'रद्द', class: 'btn-ghost' },
        { label: 'इम्पोर्ट', class: 'btn-primary', onClick: function (ctx) {
          let rows;
          try { rows = JSON.parse(ta.value); } catch (e) { UI.toast('JSON सही नहीं है', 'err'); return true; }
          if (!Array.isArray(rows)) rows = [rows];
          const clean = [];
          for (const r of rows) {
            const ch = SYLLABUS.chapter(r.chapter_id);
            if (!ch) { UI.toast('गलत chapter_id: ' + r.chapter_id, 'err'); return true; }
            if (!r.question_hi || !r.answer) { UI.toast('हर प्रश्न में question_hi और answer ज़रूरी है', 'err'); return true; }
            clean.push({
              subject_id: ch.subjectId, chapter_id: ch.id,
              topic_id: r.topic_id && SYLLABUS.topic(r.topic_id) ? r.topic_id : null,
              year: r.year ? Number(r.year) : null,
              exam: r.exam || 'JEE Main', shift: r.shift || null,
              q_type: r.q_type === 'numeric' ? 'numeric' : 'mcq',
              question_hi: String(r.question_hi), question_en: r.question_en || null,
              options: r.options || null, answer: String(r.answer),
              solution_hi: r.solution_hi || null,
              difficulty: ['easy', 'medium', 'hard'].indexOf(r.difficulty) >= 0 ? r.difficulty : 'medium',
              source: r.source || 'स्वयं इम्पोर्ट'
            });
          }
          ctx.button.disabled = true; ctx.button.textContent = 'जोड़ रहे हैं…';
          DB.insertQuestions(clean).then(function (ins) {
            UI.toast(ins.length + ' प्रश्न जुड़ गए', 'ok');
            ctx.close();
            if (onDone) onDone();
          }).catch(function (e) {
            ctx.button.disabled = false; ctx.button.textContent = 'इम्पोर्ट';
            UI.toast(e.message || 'इम्पोर्ट नहीं हुआ', 'err');
          });
          return true;
        } }
      ]
    });
  }

  window.PRACTICE = { setup: setup, importModal: importModal, isCorrect: isCorrect };
})();
