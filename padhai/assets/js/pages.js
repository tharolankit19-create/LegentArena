/* All screens. Every figure shown here comes from ANALYSIS, which reads the
   student's own rows — nothing on screen is a placeholder number. */
(function () {
  const el = UI.el;
  const S = window.CONFIG.study;

  const SUBJ_COLOR = { physics: 'var(--phy)', chemistry: 'var(--chem)', maths: 'var(--math)' };

  /* ============ auth ============ */

  function authScreen(mode) {
    const root = document.getElementById('root');
    UI.clear(root);
    const isLogin = mode !== 'signup';

    const name  = UI.input({ placeholder: 'आपका नाम', autocomplete: 'name' });
    const email = UI.input({ type: 'email', placeholder: 'you@example.com', autocomplete: 'email' });
    const pass  = UI.input({ type: 'password', placeholder: '••••••••', autocomplete: isLogin ? 'current-password' : 'new-password' });

    const form = el('form', { class: 'auth-card' });
    const submit = el('button', { class: 'btn btn-primary btn-lg btn-block mt8', type: 'submit',
      text: isLogin ? 'लॉगिन करें' : 'खाता बनाएँ' });

    form.appendChild(el('div', { class: 'auth-logo', text: 'प' }));
    form.appendChild(el('h2', { class: 'center', text: isLogin ? 'वापस स्वागत है' : 'PadhAI से शुरू करें' }));
    form.appendChild(el('p', { class: 'center muted small mb16',
      text: isLogin ? 'अपनी तैयारी वहीं से जारी रखें' : 'JEE Main की तैयारी — हिंदी में, आपके अपने डेटा पर' }));
    if (!isLogin) form.appendChild(UI.field('नाम', name));
    form.appendChild(UI.field('ईमेल', email));
    form.appendChild(UI.field('पासवर्ड', pass, isLogin ? null : 'कम से कम 6 अक्षर'));
    form.appendChild(submit);
    form.appendChild(el('div', { class: 'center small mt16' }, [
      el('span', { class: 'dim', text: isLogin ? 'नया खाता? ' : 'पहले से खाता है? ' }),
      el('a', { href: isLogin ? '#/signup' : '#/login', style: 'color:var(--brand);font-weight:650',
        text: isLogin ? 'बनाएँ' : 'लॉगिन करें' })
    ]));

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      UI.clearErrors(form);
      let bad = false;
      if (!isLogin && name.value.trim().length < 2) { UI.showError(name, 'नाम लिखें'); bad = true; }
      if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) { UI.showError(email, 'सही ईमेल लिखें'); bad = true; }
      if (pass.value.length < 6) { UI.showError(pass, 'पासवर्ड कम से कम 6 अक्षर'); bad = true; }
      if (bad) return;

      submit.disabled = true;
      submit.textContent = isLogin ? 'लॉगिन हो रहा है…' : 'खाता बन रहा है…';
      try {
        if (isLogin) {
          await DB.signIn(email.value.trim(), pass.value);
        } else {
          const res = await DB.signUp(email.value.trim(), pass.value, name.value.trim());
          if (!res.session) {
            UI.modal({
              title: 'ईमेल की पुष्टि करें',
              body: el('p', { class: 'muted', text: 'आपके ईमेल पर एक लिंक भेजा गया है। उसे खोलकर पुष्टि करें, फिर लॉगिन करें।' }),
              actions: [{ label: 'ठीक है', class: 'btn-primary', onClick: function () { location.hash = '#/login'; } }]
            });
            submit.disabled = false;
            submit.textContent = 'खाता बनाएँ';
            return;
          }
        }
        await APP.afterLogin();
      } catch (err) {
        submit.disabled = false;
        submit.textContent = isLogin ? 'लॉगिन करें' : 'खाता बनाएँ';
        const m = String(err.message || '');
        UI.toast(/Invalid login/i.test(m) ? 'ईमेल या पासवर्ड गलत है'
               : /already registered/i.test(m) ? 'यह ईमेल पहले से रजिस्टर्ड है'
               : m || 'कुछ गड़बड़ हुई', 'err');
      }
    });

    root.appendChild(el('div', { class: 'auth-wrap' }, form));
  }

  /* ============ dashboard ============ */

  async function dashboard(root) {
    UI.clear(root);
    const wrap = el('div', { class: 'page fade-up' });
    root.appendChild(wrap);

    const o = ANALYSIS.overall();
    const p = ANALYSIS.pace();
    const st = ANALYSIS.streak();
    const prof = DB.cache.profile || {};

    // hero
    const d = p.daysLeft;
    wrap.appendChild(el('div', { class: 'hero' }, [
      el('h2', { text: 'नमस्ते, ' + (prof.name || 'विद्यार्थी') + ' 👋' }),
      el('p', { text: (prof.target_exam || S.defaultExam) + ' · ' + UI.dateHi(p.examDate) }),
      el('div', { class: 'hero-stats' }, [
        el('div', { class: 'hero-stat' }, [el('b', { text: d }), el('span', { text: 'दिन बाकी' })]),
        el('div', { class: 'hero-stat' }, [el('b', { text: o.done + '/' + o.total }), el('span', { text: 'चैप्टर पूरे' })]),
        el('div', { class: 'hero-stat' }, [el('b', { text: o.weightPct + '%' }), el('span', { text: 'वेटेज कवर' })]),
        el('div', { class: 'hero-stat' }, [el('b', { text: st }), el('span', { text: 'दिन स्ट्रीक' })])
      ])
    ]));

    // today's goal
    wrap.appendChild(el('div', { class: 'card card-pad mt16' }, [
      el('div', { class: 'row' }, [
        el('div', {}, [
          el('div', { style: 'font-weight:700', text: 'आज की पढ़ाई' }),
          el('div', { class: 'small dim', text: UI.mins(p.todayMinutes) + ' / ' + UI.mins(p.dailyGoalMin) })
        ]),
        el('div', { class: 'spacer' }),
        el('button', { class: 'btn btn-sm btn-primary', text: '+ लॉग करें', onclick: function () { logModal(); } })
      ]),
      el('div', { class: 'mt12' }, UI.bar(p.todayPct, p.todayPct >= 100 ? 'green' : p.todayPct >= 50 ? '' : 'amber'))
    ]));

    // AI briefing
    const insightsBox = el('div');
    wrap.appendChild(el('div', { class: 'section-title', text: 'आज का विश्लेषण' }));
    wrap.appendChild(insightsBox);
    insightsBox.appendChild(UI.loading('आपका डेटा जाँचा जा रहा है…'));
    DB.attemptStats().then(function (attempts) {
      UI.clear(insightsBox);
      const cards = ANALYSIS.dailyInsights(attempts);
      if (!cards.length) {
        insightsBox.appendChild(UI.insight('info', '👋', 'शुरुआत करें',
          'कोई भी चैप्टर खोलकर लेक्चर/DPP मार्क करें — फिर यहाँ रोज़ का विश्लेषण दिखेगा।'));
      }
      cards.forEach(function (c) { insightsBox.appendChild(UI.insight(c.kind, c.icon, c.title, c.detail)); });
    }).catch(function () {
      UI.clear(insightsBox);
      insightsBox.appendChild(UI.insight('warn', '⚠️', 'विश्लेषण लोड नहीं हुआ', 'इंटरनेट जाँचें और पेज रिफ़्रेश करें।'));
    });

    // today's plan
    const plan = ANALYSIS.todayPlan();
    wrap.appendChild(el('div', { class: 'section-title', text: 'आज का प्लान (' + UI.mins(plan.plannedMinutes) + ')' }));
    if (!plan.items.length) {
      wrap.appendChild(el('div', { class: 'card' }, UI.empty('🎉', 'सब कुछ पूरा!', 'सारे चैप्टर हो चुके — अब रिवीज़न और मॉक टेस्ट पर ध्यान दें।')));
    } else {
      const planBox = el('div');
      plan.items.forEach(function (it) {
        planBox.appendChild(el('div', { class: 'insight', style: 'cursor:pointer',
          onclick: function () { location.hash = '#/chapter/' + it.chapterId; } }, [
          el('div', { class: 'insight-ic', text: it.icon }),
          el('div', { style: 'flex:1;min-width:0' }, [
            el('div', { class: 'insight-t', text: it.title }),
            el('div', { class: 'insight-d', text: it.detail })
          ]),
          el('div', { class: 'chip', text: UI.mins(it.minutes) })
        ]));
      });
      wrap.appendChild(planBox);
    }

    // subject rings
    wrap.appendChild(el('div', { class: 'section-title', text: 'विषय-वार प्रगति' }));
    const grid = el('div', { class: 'grid g3' });
    SYLLABUS.subjects.forEach(function (s) {
      const sum = ANALYSIS.subjectSummary(s.id);
      grid.appendChild(el('div', { class: 'card card-pad', style: 'cursor:pointer',
        onclick: function () { location.hash = '#/syllabus/' + s.id; } }, [
        el('div', { class: 'row' }, [
          UI.ring(sum.pct, s.color),
          el('div', { style: 'min-width:0' }, [
            el('div', { style: 'font-weight:700', text: s.hi }),
            el('div', { class: 'tiny dim', text: sum.done + '/' + sum.total + ' चैप्टर पूरे' }),
            el('div', { class: 'tiny dim', text: 'वेटेज कवर ' + sum.weightPct + '%' })
          ])
        ])
      ]));
    });
    wrap.appendChild(grid);

    // quick actions
    wrap.appendChild(el('div', { class: 'grid g2 mt16' }, [
      el('button', { class: 'btn btn-primary btn-lg', text: '🎯 प्रैक्टिस शुरू करें', onclick: function () { location.hash = '#/practice'; } }),
      el('button', { class: 'btn btn-lg', text: '📚 सिलेबस देखें', onclick: function () { location.hash = '#/syllabus'; } })
    ]));
  }

  /* ============ log modal ============ */

  function logModal(chapterId) {
    const chapters = SYLLABUS.chapters;
    const chSel = UI.select(
      [{ value: '', label: '— चैप्टर चुनें (वैकल्पिक) —' }].concat(chapters.map(function (c) {
        return { value: c.id, label: SYLLABUS.subject(c.subjectId).short + ' · ' + c.hi, selected: c.id === chapterId };
      })));
    const actSel = UI.select([
      { value: 'lecture', label: '🎥 लेक्चर' }, { value: 'dpp', label: '📝 DPP' },
      { value: 'module', label: '📘 मॉड्यूल' }, { value: 'pyq', label: '🎯 PYQ' },
      { value: 'test', label: '🏁 टेस्ट' }, { value: 'revision', label: '🔁 रिवीज़न' }
    ]);
    const qty = UI.input({ type: 'number', min: '0', value: '0', placeholder: '0' });
    const minutes = UI.input({ type: 'number', min: '0', value: '60' });
    const note = UI.input({ placeholder: 'कोई नोट (वैकल्पिक)' });

    UI.modal({
      title: 'पढ़ाई लॉग करें',
      body: el('div', {}, [
        UI.field('चैप्टर', chSel),
        el('div', { class: 'grid g2' }, [
          UI.field('गतिविधि', actSel),
          UI.field('समय (मिनट)', minutes)
        ]),
        UI.field('कितने प्रश्न हल किए', qty, 'PYQ/DPP/मॉड्यूल के लिए — चैप्टर की गिनती अपने आप बढ़ेगी'),
        UI.field('नोट', note)
      ]),
      actions: [
        { label: 'रद्द', class: 'btn-ghost' },
        { label: 'सेव करें', class: 'btn-primary', onClick: function (ctx) {
          const m = parseInt(minutes.value, 10) || 0;
          const q = parseInt(qty.value, 10) || 0;
          if (!m && !q) { UI.toast('समय या प्रश्नों की संख्या भरें', 'err'); return true; }
          ctx.button.disabled = true; ctx.button.textContent = 'सेव…';
          DB.addLog({
            chapter_id: chSel.value || null, activity: actSel.value,
            qty: q, minutes: m, note: note.value.trim() || null
          }).then(async function () {
            if (chSel.value && q && actSel.value === 'pyq') {
              const cur = DB.progressOf(chSel.value);
              await DB.saveProgress(chSel.value, { pyq_count: (cur.pyq_count || 0) + q });
            }
            UI.toast('लॉग हो गया', 'ok');
            ctx.close();
            APP.rerender();
          }).catch(function (e) {
            ctx.button.disabled = false; ctx.button.textContent = 'सेव करें';
            UI.toast(e.message || 'सेव नहीं हुआ', 'err');
          });
          return true;
        } }
      ]
    });
  }

  /* ============ syllabus ============ */

  const syllabusState = { subjectId: 'physics', filter: 'all', q: '' };

  function syllabus(root, subjectId) {
    if (subjectId) syllabusState.subjectId = subjectId;
    UI.clear(root);
    const wrap = el('div', { class: 'page fade-up' });
    root.appendChild(wrap);

    const tabs = el('div', { class: 'pill-tabs' });
    SYLLABUS.subjects.forEach(function (s) {
      tabs.appendChild(el('button', {
        class: syllabusState.subjectId === s.id ? 'active' : '', text: s.hi,
        onclick: function () { syllabusState.subjectId = s.id; syllabus(root); }
      }));
    });

    const search = UI.input({ placeholder: 'चैप्टर खोजें…', value: syllabusState.q, style: 'max-width:240px' });
    search.addEventListener('input', function () { syllabusState.q = search.value; renderList(); });

    wrap.appendChild(el('div', { class: 'row row-wrap mb12' }, [tabs, el('div', { class: 'spacer' }), search]));

    const filters = el('div', { class: 'row row-wrap mb16' });
    [['all', 'सभी'], ['pending', 'बाकी'], ['progress', 'चल रहे'], ['done', 'पूरे'], ['small', 'छोटे चैप्टर'], ['high', 'हाई वेटेज']]
      .forEach(function (f) {
        filters.appendChild(el('button', {
          class: 'chip' + (syllabusState.filter === f[0] ? ' chip-blue' : ''), text: f[1],
          style: 'cursor:pointer',
          onclick: function () { syllabusState.filter = f[0]; syllabus(root); }
        }));
      });
    wrap.appendChild(filters);

    const summary = ANALYSIS.subjectSummary(syllabusState.subjectId);
    wrap.appendChild(el('div', { class: 'grid g4 mb16' }, [
      UI.stat(summary.done + '/' + summary.total, 'चैप्टर पूरे'),
      UI.stat(summary.pct + '%', 'औसत प्रगति'),
      UI.stat(summary.weightPct + '%', 'वेटेज कवर'),
      UI.stat(summary.started, 'चल रहे')
    ]));

    const listBox = el('div', { class: 'grid g2' });
    wrap.appendChild(listBox);

    function renderList() {
      UI.clear(listBox);
      const q = syllabusState.q.trim().toLowerCase();
      let items = SYLLABUS.chaptersOf(syllabusState.subjectId).map(function (c) { return ANALYSIS.chapterStatus(c.id); });

      if (syllabusState.filter === 'pending')  items = items.filter(function (s) { return !s.started; });
      if (syllabusState.filter === 'progress') items = items.filter(function (s) { return s.started && !s.isDone; });
      if (syllabusState.filter === 'done')     items = items.filter(function (s) { return s.isDone; });
      if (syllabusState.filter === 'small')    items = items.filter(function (s) { return s.chapter.isSmall; });
      if (syllabusState.filter === 'high')     items = items.filter(function (s) { return SYLLABUS.weightOf(s.chapter).known && SYLLABUS.weightOf(s.chapter).value >= 1.5; });
      if (q) items = items.filter(function (s) {
        return s.chapter.hi.toLowerCase().indexOf(q) >= 0 || s.chapter.en.toLowerCase().indexOf(q) >= 0;
      });

      if (!items.length) {
        listBox.appendChild(el('div', { style: 'grid-column:1/-1' },
          UI.empty('🔍', 'कोई चैप्टर नहीं मिला', 'फ़िल्टर या खोज बदलकर देखें')));
        return;
      }
      items.forEach(function (s) { listBox.appendChild(chapterCard(s)); });
    }
    renderList();
  }

  function chapterCard(s) {
    const c = s.chapter;
    const w = SYLLABUS.weightOf(c);
    const card = el('div', { class: 'ch-card', onclick: function () { location.hash = '#/chapter/' + c.id; } });

    card.appendChild(el('div', { class: 'ch-top' }, [
      el('div', { class: 'subject-dot', style: 'background:' + SUBJ_COLOR[c.subjectId] }),
      el('div', { style: 'min-width:0;flex:1' }, [
        el('div', { class: 'ch-name', text: c.hi }),
        el('div', { class: 'ch-en', text: c.en })
      ]),
      el('div', { class: 'ch-pct', style: 'color:' + (s.isDone ? 'var(--green)' : s.pct ? 'var(--brand)' : 'var(--text-3)'),
        text: s.pct + '%' })
    ]));

    card.appendChild(el('div', { class: 'mt12' }, UI.bar(s.pct, s.isDone ? 'green' : s.pct >= 50 ? '' : 'amber')));

    const meta = el('div', { class: 'ch-meta' });
    meta.appendChild(UI.chip(w.known ? '~' + w.value + ' प्रश्न/पेपर' : 'वेटेज डेटा नहीं', w.known && w.value >= 2 ? 'red' : w.known ? 'blue' : ''));
    meta.appendChild(UI.chip(c.difficultyHi, c.difficulty === 'easy' ? 'green' : c.difficulty === 'hard' ? 'red' : 'amber'));
    if (c.isSmall) meta.appendChild(UI.chip('छोटा चैप्टर', 'violet'));
    if (s.isDone) meta.appendChild(UI.chip('✓ पूरा', 'green'));
    card.appendChild(meta);

    const steps = el('div', { class: 'ch-steps' });
    S.checkpoints.forEach(function (cp) {
      const on = s.steps[cp.key];
      const part = cp.key === 'pyq' && !on && s.pyqRatio > 0;
      steps.appendChild(el('div', {
        class: 'step-dot' + (on ? ' on' : part ? ' part' : ''),
        title: cp.label,
        text: cp.key === 'pyq' && !on ? Math.round(s.pyqRatio * 100) + '%' : cp.icon
      }));
    });
    card.appendChild(steps);
    return card;
  }

  /* ============ chapter detail ============ */

  function chapterDetail(root, chapterId) {
    const c = SYLLABUS.chapter(chapterId);
    if (!c) { root.appendChild(UI.empty('❓', 'चैप्टर नहीं मिला')); return; }

    function render() {
      UI.clear(root);
      const s = ANALYSIS.chapterStatus(chapterId);
      const w = SYLLABUS.weightOf(c);
      const wrap = el('div', { class: 'page page-narrow fade-up' });
      root.appendChild(wrap);

      wrap.appendChild(el('button', { class: 'btn btn-sm btn-ghost mb12', text: '← सिलेबस',
        onclick: function () { location.hash = '#/syllabus/' + c.subjectId; } }));

      // header
      wrap.appendChild(el('div', { class: 'card card-pad' }, [
        el('div', { class: 'row' }, [
          el('div', { style: 'min-width:0;flex:1' }, [
            el('h2', { style: 'font-size:19px', text: c.hi }),
            el('div', { class: 'small dim', text: c.en })
          ]),
          UI.ring(s.pct, s.isDone ? 'var(--green)' : SUBJ_COLOR[c.subjectId])
        ]),
        el('div', { class: 'ch-meta mt12' }, [
          UI.chip(SYLLABUS.subject(c.subjectId).hi),
          UI.chip(c.difficultyHi, c.difficulty === 'easy' ? 'green' : c.difficulty === 'hard' ? 'red' : 'amber'),
          c.isSmall ? UI.chip('छोटा चैप्टर — जल्दी निपटेगा', 'violet') : null,
          s.isDone ? UI.chip('✓ चैप्टर पूरा', 'green') : null
        ].filter(Boolean)),
        // weightage — with its source, or an honest "no data"
        el('div', { class: 'mt12 small' }, w.known
          ? el('div', {}, [
              el('b', { text: '~' + w.value + ' प्रश्न प्रति पेपर' }),
              c.totalQ ? el('span', { class: 'dim', text: '  ·  2021–26 में कुल ' + c.totalQ + ' प्रश्न' }) : null,
              el('div', { class: 'tiny dim', text: 'स्रोत: ' + c.weightSource })
            ])
          : el('div', { class: 'dim' }, [
              el('span', { text: 'इस चैप्टर का सत्यापित वेटेज डेटा उपलब्ध नहीं है' }),
              c.note ? el('div', { class: 'tiny', text: c.note }) : null
            ]))
      ]));

      // checkpoints
      wrap.appendChild(el('div', { class: 'section-title', text: 'पाँच स्टेप — सब पूरे तो चैप्टर डन' }));

      ['lecture', 'dpp', 'module'].forEach(function (key) {
        const cp = S.checkpoints.filter(function (x) { return x.key === key; })[0];
        const on = s.steps[key];
        wrap.appendChild(el('div', { class: 'cp' + (on ? ' done' : '') }, [
          el('div', { class: 'cp-ic', text: cp.icon }),
          el('div', { class: 'cp-body' }, [
            el('div', { class: 'cp-t', text: cp.label }),
            el('div', { class: 'cp-h', text: cp.hint })
          ]),
          el('button', {
            class: 'btn btn-sm ' + (on ? '' : 'btn-primary'),
            text: on ? '✓ हो गया' : 'मार्क करें',
            onclick: async function (e) {
              const btn = e.currentTarget;
              if (btn.disabled) return;
              btn.disabled = true;
              // read the live value, not the one captured when this row was drawn
              const was = !!DB.progressOf(chapterId)[key + '_done'];
              const patch = {}; patch[key + '_done'] = !was;
              try {
                await DB.saveProgress(chapterId, patch);
                if (!was) await DB.addLog({ chapter_id: chapterId, activity: key, qty: 1, minutes: 0 });
                UI.toast(!was ? cp.label + ' पूरा ✓' : cp.label + ' हटाया', 'ok');
              } catch (err) { UI.toast(err.message, 'err'); }
              render();
            }
          })
        ]));
      });

      // PYQ counter
      const target = s.pyqTarget;
      wrap.appendChild(el('div', { class: 'cp' + (s.steps.pyq ? ' done' : '') }, [
        el('div', { class: 'cp-ic', text: '🎯' }),
        el('div', { class: 'cp-body' }, [
          el('div', { class: 'cp-t', text: 'PYQ — ' + s.pyqCount + ' / ' + target }),
          el('div', { class: 'cp-h', text: s.steps.pyq ? 'लक्ष्य पूरा' : (target - s.pyqCount) + ' और बाकी' }),
          el('div', { class: 'mt8' }, UI.bar(s.pyqRatio * 100, s.steps.pyq ? 'green' : ''))
        ]),
        el('div', { class: 'stepper' }, [
          el('button', { text: '−', onclick: function (e) { bumpPyq(-10, e.currentTarget); } }),
          el('button', { text: '+', onclick: function (e) { bumpPyq(10, e.currentTarget); } })
        ])
      ]));

      async function bumpPyq(n, btn) {
        if (btn && btn.disabled) return;
        if (btn) btn.disabled = true;
        // always start from the stored count so quick taps can't overwrite each other
        const next = Math.max(0, (DB.progressOf(chapterId).pyq_count || 0) + n);
        try {
          await DB.saveProgress(chapterId, { pyq_count: next });
          if (n > 0) await DB.addLog({ chapter_id: chapterId, activity: 'pyq', qty: n, minutes: 0 });
        } catch (err) { UI.toast(err.message, 'err'); }
        render();
      }

      // test
      wrap.appendChild(el('div', { class: 'cp' + (s.steps.test ? ' done' : '') }, [
        el('div', { class: 'cp-ic', text: '🏁' }),
        el('div', { class: 'cp-body' }, [
          el('div', { class: 'cp-t', text: 'चैप्टर टेस्ट' }),
          el('div', { class: 'cp-h', text: s.testScore == null ? 'अभी नहीं दिया'
            : s.testScore + '% ' + (s.steps.test ? '· पास' : '· ' + S.testPassScore + '% चाहिए') })
        ]),
        el('button', { class: 'btn btn-sm ' + (s.steps.test ? '' : 'btn-primary'), text: 'स्कोर डालें',
          onclick: function () { testModal(chapterId, s.testScore, render); } })
      ]));

      // actions
      wrap.appendChild(el('div', { class: 'grid g2 mt16' }, [
        el('button', { class: 'btn btn-primary', text: '🎯 इस चैप्टर की प्रैक्टिस',
          onclick: function () { location.hash = '#/practice/' + chapterId; } }),
        el('button', { class: 'btn', text: '＋ पढ़ाई लॉग करें', onclick: function () { logModal(chapterId); } })
      ]));

      // confidence
      wrap.appendChild(el('div', { class: 'section-title', text: 'आत्मविश्वास' }));
      const confRow = el('div', { class: 'row', style: 'gap:6px' });
      for (let i = 1; i <= 5; i++) {
        (function (n) {
          confRow.appendChild(el('button', {
            class: 'btn btn-sm' + (s.progress.confidence >= n ? ' btn-primary' : ''),
            text: '★',
            onclick: async function (e) {
              const btn = e.currentTarget;
              if (btn.disabled) return;
              btn.disabled = true;
              const cur = DB.progressOf(chapterId).confidence || 0;
              try { await DB.saveProgress(chapterId, { confidence: cur === n ? 0 : n }); }
              catch (err) { UI.toast(err.message, 'err'); }
              render();
            }
          }));
        })(i);
      }
      confRow.appendChild(el('div', { class: 'small dim', style: 'margin-left:8px',
        text: ['अभी रेट नहीं किया', 'बहुत कमज़ोर', 'कमज़ोर', 'ठीक-ठाक', 'अच्छा', 'पक्का'][s.progress.confidence] }));
      wrap.appendChild(confRow);

      // revision
      if (s.isDone) {
        const base = s.progress.last_studied || (s.progress.updated_at || '').slice(0, 10);
        const round = s.progress.revision_count || 0;
        const gap = S.revisionGaps[Math.min(round, S.revisionGaps.length - 1)];
        const due = base ? UI.addDays(base, gap) : null;
        const overdue = due ? UI.daysBetween(due, UI.today()) : -1;
        wrap.appendChild(el('div', { class: 'section-title', text: 'रिवीज़न' }));
        wrap.appendChild(el('div', { class: 'cp' + (overdue >= 0 ? '' : ' done') }, [
          el('div', { class: 'cp-ic', text: '🔁' }),
          el('div', { class: 'cp-body' }, [
            el('div', { class: 'cp-t', text: round + ' रिवीज़न हो चुके' }),
            el('div', { class: 'cp-h', text: due ? (overdue >= 0 ? 'अभी करना है (' + UI.dateHi(due) + ' से due)' : 'अगला ' + UI.dateHi(due) + ' को') : '—' })
          ]),
          el('button', { class: 'btn btn-sm btn-primary', text: 'रिवीज़न किया', onclick: async function (e) {
            const btn = e.currentTarget;
            if (btn.disabled) return;
            btn.disabled = true;
            try {
              await DB.saveProgress(chapterId, { revision_count: (DB.progressOf(chapterId).revision_count || 0) + 1 });
              await DB.addLog({ chapter_id: chapterId, activity: 'revision', qty: 1, minutes: 30 });
              UI.toast('रिवीज़न दर्ज ✓', 'ok');
            } catch (err) { UI.toast(err.message, 'err'); }
            render();
          } })
        ]));
      }

      // topics
      wrap.appendChild(el('div', { class: 'section-title', text: 'टॉपिक (' + c.topics.length + ')' }));
      const tl = el('div', { class: 'card' });
      c.topics.forEach(function (t, i) {
        tl.appendChild(el('div', { class: 'row', style: 'padding:11px 14px;' + (i ? 'border-top:1px solid var(--border-2)' : '') }, [
          el('div', { style: 'min-width:0' }, [
            el('div', { style: 'font-weight:600;font-size:14px', text: t.hi }),
            el('div', { class: 'tiny dim', text: t.en })
          ]),
          el('div', { class: 'spacer' }),
          el('button', { class: 'btn btn-sm btn-ghost', text: 'प्रैक्टिस →',
            onclick: function () { location.hash = '#/practice/' + chapterId; } })
        ]));
      });
      wrap.appendChild(tl);

      // notes
      wrap.appendChild(el('div', { class: 'section-title', text: 'मेरे नोट्स' }));
      const ta = el('textarea', { class: 'textarea', placeholder: 'फ़ॉर्मूले, गलतियाँ, याद रखने की बातें…' });
      ta.value = s.progress.notes || '';
      wrap.appendChild(ta);
      wrap.appendChild(el('button', { class: 'btn btn-sm mt8', text: 'नोट सेव करें', onclick: async function () {
        await DB.saveProgress(chapterId, { notes: ta.value });
        UI.toast('नोट सेव हो गया', 'ok');
      } }));

      // this chapter's uploaded material
      const mine = DB.cache.resources.filter(function (r) { return r.chapter_id === chapterId; });
      wrap.appendChild(el('div', { class: 'section-title', text: 'इस चैप्टर की सामग्री (' + mine.length + ')' }));
      if (!mine.length) {
        wrap.appendChild(el('div', { class: 'card' },
          UI.empty('📁', 'कुछ अपलोड नहीं है', 'DPP, मॉड्यूल या किताब अपलोड करें',
            el('button', { class: 'btn btn-primary btn-sm', text: 'अपलोड करें', onclick: function () { location.hash = '#/resources'; } }))));
      } else {
        const box = el('div', { class: 'card' });
        mine.forEach(function (r, i) { box.appendChild(resourceRow(r, i > 0, function () { render(); })); });
        wrap.appendChild(box);
      }
    }
    render();
  }

  function testModal(chapterId, current, onDone) {
    const score = UI.input({ type: 'number', min: '0', max: '100', value: current == null ? '' : current, placeholder: '0–100' });
    UI.modal({
      title: 'चैप्टर टेस्ट का स्कोर',
      body: el('div', {}, [
        UI.field('कितने प्रतिशत आए?', score, S.testPassScore + '% या ज़्यादा पर यह स्टेप पूरा माना जाएगा'),
      ]),
      actions: [
        { label: 'रद्द', class: 'btn-ghost' },
        { label: 'सेव करें', class: 'btn-primary', onClick: function (ctx) {
          const v = parseFloat(score.value);
          if (isNaN(v) || v < 0 || v > 100) { UI.toast('0 से 100 के बीच स्कोर डालें', 'err'); return true; }
          ctx.button.disabled = true;
          DB.saveProgress(chapterId, { test_score: v })
            .then(function () { return DB.addLog({ chapter_id: chapterId, activity: 'test', qty: 1, minutes: 60, score: v }); })
            .then(function () { UI.toast('स्कोर सेव ✓', 'ok'); ctx.close(); onDone(); })
            .catch(function (e) { ctx.button.disabled = false; UI.toast(e.message, 'err'); });
          return true;
        } }
      ]
    });
  }

  /* ============ resources ============ */

  const KINDS = [
    { value: 'dpp', label: 'DPP' }, { value: 'module', label: 'मॉड्यूल' },
    { value: 'book', label: 'किताब' }, { value: 'pyq', label: 'PYQ पेपर' },
    { value: 'biq', label: 'BIQ' }, { value: 'notes', label: 'नोट्स' }, { value: 'other', label: 'अन्य' }
  ];
  const KIND_HI = {}; KINDS.forEach(function (k) { KIND_HI[k.value] = k.label; });
  const resState = { kind: 'all', subject: 'all' };

  function resources(root) {
    UI.clear(root);
    const wrap = el('div', { class: 'page fade-up' });
    root.appendChild(wrap);

    wrap.appendChild(el('div', { class: 'row mb16' }, [
      el('div', {}, [
        el('div', { style: 'font-weight:700;font-size:16px', text: 'मेरी सामग्री' }),
        el('div', { class: 'small dim', text: 'किताबें, DPP, मॉड्यूल, BIQ, PYQ पेपर — सब एक जगह' })
      ]),
      el('div', { class: 'spacer' }),
      el('button', { class: 'btn btn-primary', text: '⬆ अपलोड करें', onclick: function () { uploadModal(function () { resources(root); }); } })
    ]));

    const filters = el('div', { class: 'row row-wrap mb16' });
    [{ value: 'all', label: 'सभी' }].concat(KINDS).forEach(function (k) {
      filters.appendChild(el('button', {
        class: 'chip' + (resState.kind === k.value ? ' chip-blue' : ''), text: k.label, style: 'cursor:pointer',
        onclick: function () { resState.kind = k.value; resources(root); }
      }));
    });
    wrap.appendChild(filters);

    let list = DB.cache.resources;
    if (resState.kind !== 'all') list = list.filter(function (r) { return r.kind === resState.kind; });

    if (!list.length) {
      wrap.appendChild(el('div', { class: 'card' }, UI.empty('📚', 'अभी कुछ अपलोड नहीं है',
        'अपने DPP, मॉड्यूल और किताबें यहाँ रखें — चैप्टर पेज पर भी दिखेंगी',
        el('button', { class: 'btn btn-primary', text: 'पहली फ़ाइल अपलोड करें', onclick: function () { uploadModal(function () { resources(root); }); } }))));
      return;
    }

    const box = el('div', { class: 'card' });
    list.forEach(function (r, i) { box.appendChild(resourceRow(r, i > 0, function () { resources(root); })); });
    wrap.appendChild(box);
  }

  function resourceRow(r, border, onChange) {
    const ch = r.chapter_id ? SYLLABUS.chapter(r.chapter_id) : null;
    return el('div', { class: 'row', style: 'padding:12px 14px;gap:11px;' + (border ? 'border-top:1px solid var(--border-2)' : '') }, [
      el('div', { style: 'font-size:20px' }, r.kind === 'book' ? '📕' : r.kind === 'pyq' ? '📄' : r.kind === 'module' ? '📘' : r.kind === 'notes' ? '🗒️' : '📝'),
      el('div', { style: 'min-width:0;flex:1' }, [
        el('div', { style: 'font-weight:650;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap', text: r.title }),
        el('div', { class: 'tiny dim', text: [KIND_HI[r.kind] || r.kind, ch ? ch.hi : null, r.year || null, UI.bytes(r.file_size)].filter(Boolean).join(' · ') })
      ]),
      el('button', { class: 'btn btn-sm', text: 'खोलें', onclick: async function () {
        try { window.open(await DB.resourceUrl(r.file_path), '_blank'); }
        catch (e) { UI.toast('फ़ाइल नहीं खुली: ' + e.message, 'err'); }
      } }),
      el('button', { class: 'btn btn-sm btn-ghost', text: '🗑', onclick: async function () {
        if (!await UI.confirm({ title: 'हटाएँ?', message: r.title + ' हटा दी जाएगी।', ok: 'हटाएँ', danger: true })) return;
        try { await DB.deleteResource(r); UI.toast('हटा दी गई', 'ok'); onChange(); }
        catch (e) { UI.toast(e.message, 'err'); }
      } })
    ]);
  }

  function uploadModal(onDone) {
    const file = el('input', { type: 'file', class: 'input', accept: '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt' });
    const title = UI.input({ placeholder: 'जैसे: भौतिकी DPP – आधुनिक भौतिकी' });
    const kind = UI.select(KINDS);
    const subj = UI.select([{ value: '', label: '— विषय —' }].concat(
      SYLLABUS.subjects.map(function (s) { return { value: s.id, label: s.hi }; })));
    const chap = UI.select([{ value: '', label: '— चैप्टर (वैकल्पिक) —' }]);
    const year = UI.input({ type: 'number', placeholder: 'साल (वैकल्पिक)', min: '2000', max: '2030' });

    subj.addEventListener('change', function () {
      UI.clear(chap);
      chap.appendChild(el('option', { value: '', text: '— चैप्टर (वैकल्पिक) —' }));
      if (subj.value) SYLLABUS.chaptersOf(subj.value).forEach(function (c) {
        chap.appendChild(el('option', { value: c.id, text: c.hi }));
      });
    });
    file.addEventListener('change', function () {
      if (file.files[0] && !title.value) title.value = file.files[0].name.replace(/\.[^.]+$/, '');
    });

    UI.modal({
      title: 'सामग्री अपलोड करें',
      body: el('div', {}, [
        UI.field('फ़ाइल', file, 'अधिकतम 50 MB · PDF/इमेज/डॉक'),
        UI.field('नाम', title),
        el('div', { class: 'grid g2' }, [UI.field('प्रकार', kind), UI.field('साल', year)]),
        el('div', { class: 'grid g2' }, [UI.field('विषय', subj), UI.field('चैप्टर', chap)])
      ]),
      actions: [
        { label: 'रद्द', class: 'btn-ghost' },
        { label: 'अपलोड', class: 'btn-primary', onClick: function (ctx) {
          const f = file.files[0];
          if (!f) { UI.toast('फ़ाइल चुनें', 'err'); return true; }
          if (f.size > 50 * 1024 * 1024) { UI.toast('फ़ाइल 50 MB से बड़ी है', 'err'); return true; }
          if (!title.value.trim()) { UI.toast('नाम लिखें', 'err'); return true; }
          ctx.button.disabled = true; ctx.button.textContent = 'अपलोड हो रहा है…';
          DB.uploadResource(f, {
            title: title.value.trim(), kind: kind.value,
            subject_id: subj.value || null, chapter_id: chap.value || null,
            year: year.value ? Number(year.value) : null
          }).then(function () {
            UI.toast('अपलोड हो गया ✓', 'ok'); ctx.close(); onDone();
          }).catch(function (e) {
            ctx.button.disabled = false; ctx.button.textContent = 'अपलोड';
            UI.toast(e.message || 'अपलोड नहीं हुआ', 'err');
          });
          return true;
        } }
      ]
    });
  }

  /* ============ analysis page ============ */

  async function analysisPage(root) {
    UI.clear(root);
    const wrap = el('div', { class: 'page fade-up' });
    root.appendChild(wrap);
    wrap.appendChild(UI.loading());

    let attempts = [];
    try { attempts = await DB.attemptStats(); } catch (e) { /* offline-safe */ }
    UI.clear(wrap);

    const o = ANALYSIS.overall();
    const p = ANALYSIS.pace();

    wrap.appendChild(el('div', { class: 'grid g4' }, [
      UI.stat(o.pct + '%', 'कुल सिलेबस', o.done + '/' + o.total + ' चैप्टर पूरे'),
      UI.stat(o.weightPct + '%', 'वेटेज कवर', 'प्रश्न-भार के हिसाब से'),
      UI.stat(o.pyqSolved, 'PYQ हल किए', 'लक्ष्य ' + o.pyqNeeded),
      UI.stat(ANALYSIS.streak(), 'दिन की स्ट्रीक')
    ]));

    // last 7 days
    wrap.appendChild(el('div', { class: 'section-title', text: 'पिछले 7 दिन' }));
    const week = ANALYSIS.last7();
    const maxMin = Math.max(60, Math.max.apply(null, week.map(function (d) { return d.minutes; })));
    const chart = el('div', { class: 'card card-pad' });
    const bars = el('div', { class: 'row', style: 'align-items:flex-end;gap:8px;height:150px' });
    week.forEach(function (d) {
      const h = Math.round((d.minutes / maxMin) * 118);
      bars.appendChild(el('div', { style: 'flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;justify-content:flex-end;height:100%' }, [
        el('div', { class: 'tiny', style: 'font-weight:700;color:var(--text-2)', text: d.minutes ? Math.round(d.minutes / 60 * 10) / 10 + 'घं' : '' }),
        el('div', { title: UI.dateHi(d.date) + ': ' + UI.mins(d.minutes),
          style: 'width:100%;max-width:44px;height:' + Math.max(4, h) + 'px;border-radius:7px 7px 3px 3px;background:' +
                 (d.minutes >= p.dailyGoalMin ? 'var(--green)' : d.minutes ? 'var(--brand)' : 'var(--border)') }),
        el('div', { class: 'tiny dim', text: UI.dayNameHi(d.date).slice(0, 3) })
      ]));
    });
    chart.appendChild(bars);
    chart.appendChild(el('div', { class: 'tiny dim center mt8',
      text: 'कुल ' + UI.mins(week.reduce(function (a, d) { return a + d.minutes; }, 0)) +
            ' · ' + week.reduce(function (a, d) { return a + d.questions; }, 0) + ' प्रश्न' }));
    wrap.appendChild(chart);

    // subject-wise
    wrap.appendChild(el('div', { class: 'section-title', text: 'विषय-वार' }));
    const sg = el('div', { class: 'grid g3' });
    SYLLABUS.subjects.forEach(function (s) {
      const sum = ANALYSIS.subjectSummary(s.id);
      sg.appendChild(el('div', { class: 'card card-pad' }, [
        el('div', { class: 'row' }, [
          el('div', { style: 'font-weight:700', text: s.hi }),
          el('div', { class: 'spacer' }),
          el('div', { style: 'font-weight:800;color:' + s.color, text: sum.pct + '%' })
        ]),
        el('div', { class: 'mt8' }, UI.bar(sum.pct)),
        el('div', { class: 'tiny dim mt8', text: sum.done + ' पूरे · ' + sum.started + ' चल रहे · ' + (sum.total - sum.done - sum.started) + ' बाकी' })
      ]));
    });
    wrap.appendChild(sg);

    // biggest gaps — high weightage, low completion
    const gaps = ANALYSIS.biggestGaps(6);
    if (gaps.length) {
      wrap.appendChild(el('div', { class: 'section-title', text: 'सबसे महँगे गैप (हाई वेटेज, कम तैयारी)' }));
      const gw = el('div', { class: 'tbl-wrap' });
      const tb = el('table', { class: 'tbl' });
      tb.appendChild(el('thead', {}, el('tr', {}, [
        el('th', { text: 'चैप्टर' }), el('th', { text: 'विषय' }),
        el('th', { text: 'प्रश्न/पेपर' }), el('th', { text: 'प्रगति' })
      ])));
      const tbody = el('tbody');
      gaps.forEach(function (s) {
        const w = SYLLABUS.weightOf(s.chapter);
        tbody.appendChild(el('tr', { style: 'cursor:pointer', onclick: function () { location.hash = '#/chapter/' + s.chapter.id; } }, [
          el('td', {}, [el('div', { style: 'font-weight:650', text: s.chapter.hi }), el('div', { class: 'tiny dim', text: s.chapter.en })]),
          el('td', { class: 'small', text: SYLLABUS.subject(s.chapter.subjectId).short }),
          el('td', { class: 'num', style: 'font-weight:700', text: '~' + w.value }),
          el('td', { style: 'min-width:130px' }, [UI.bar(s.pct, 'amber'), el('div', { class: 'tiny dim mt8', text: s.pct + '%' })])
        ]));
      });
      tb.appendChild(tbody); gw.appendChild(tb); wrap.appendChild(gw);
    }

    // accuracy from real attempts
    const accMap = ANALYSIS.accuracyByChapter(attempts);
    const accKeys = Object.keys(accMap).filter(function (k) { return SYLLABUS.chapter(k); });
    wrap.appendChild(el('div', { class: 'section-title', text: 'प्रैक्टिस सटीकता' }));
    if (!accKeys.length) {
      wrap.appendChild(el('div', { class: 'card' }, UI.empty('🎯', 'अभी कोई प्रैक्टिस डेटा नहीं',
        'प्रैक्टिस सेशन पूरा करें — फिर चैप्टर-वार सटीकता यहाँ दिखेगी',
        el('button', { class: 'btn btn-primary', text: 'प्रैक्टिस शुरू करें', onclick: function () { location.hash = '#/practice'; } }))));
    } else {
      const aw = el('div', { class: 'tbl-wrap' });
      const at = el('table', { class: 'tbl' });
      at.appendChild(el('thead', {}, el('tr', {}, [
        el('th', { text: 'चैप्टर' }), el('th', { text: 'हल' }), el('th', { text: 'सही' }),
        el('th', { text: 'सटीकता' }), el('th', { text: 'औसत समय' })
      ])));
      const ab = el('tbody');
      accKeys.sort(function (a, b) { return accMap[a].accuracy - accMap[b].accuracy; }).forEach(function (k) {
        const m = accMap[k];
        ab.appendChild(el('tr', { style: 'cursor:pointer', onclick: function () { location.hash = '#/chapter/' + k; } }, [
          el('td', { style: 'font-weight:650', text: SYLLABUS.chapter(k).hi }),
          el('td', { class: 'num', text: m.total }),
          el('td', { class: 'num', text: m.correct }),
          el('td', {}, UI.chip(m.accuracy + '%', m.accuracy >= 75 ? 'green' : m.accuracy >= 50 ? 'amber' : 'red')),
          el('td', { class: 'num small', text: m.avgSeconds + ' सेकंड' })
        ]));
      });
      at.appendChild(ab); aw.appendChild(at); wrap.appendChild(aw);
    }

    // recent sessions
    wrap.appendChild(el('div', { class: 'section-title', text: 'पिछले प्रैक्टिस सेशन' }));
    const sessBox = el('div');
    wrap.appendChild(sessBox);
    sessBox.appendChild(UI.loading());
    DB.sessionHistory(12).then(function (rows) {
      UI.clear(sessBox);
      if (!rows.length) { sessBox.appendChild(el('div', { class: 'card' }, UI.empty('📝', 'कोई सेशन नहीं'))); return; }
      const box = el('div', { class: 'card' });
      rows.forEach(function (r, i) {
        const acc = r.total ? Math.round((r.correct / r.total) * 100) : 0;
        box.appendChild(el('div', { class: 'row', style: 'padding:12px 14px;' + (i ? 'border-top:1px solid var(--border-2)' : '') }, [
          el('div', { style: 'min-width:0;flex:1' }, [
            el('div', { style: 'font-weight:650;font-size:14px',
              text: (r.config && r.config.chapters ? r.config.chapters.length : 0) + ' चैप्टर · ' + r.total + ' प्रश्न' }),
            el('div', { class: 'tiny dim', text: UI.dateHi(r.started_at.slice(0, 10)) + ' · ' + UI.mins(Math.round(r.seconds / 60)) })
          ]),
          UI.chip(acc + '%', acc >= 75 ? 'green' : acc >= 50 ? 'amber' : 'red')
        ]));
      });
      sessBox.appendChild(box);
    }).catch(function () { UI.clear(sessBox); });
  }

  /* ============ profile ============ */

  function profile(root) {
    UI.clear(root);
    const wrap = el('div', { class: 'page page-narrow fade-up' });
    root.appendChild(wrap);
    const pr = DB.cache.profile || {};

    const name = UI.input({ value: pr.name || '' });
    const exam = UI.input({ value: pr.target_exam || S.defaultExam });
    const date = UI.input({ type: 'date', value: (pr.exam_date || S.defaultExamDate) });
    const goal = UI.input({ type: 'number', min: '30', max: '900', step: '30', value: pr.daily_goal_min || S.defaultDailyGoalMin });

    wrap.appendChild(el('div', { class: 'card card-pad' }, [
      el('div', { class: 'row mb16' }, [
        el('div', { class: 'auth-logo', style: 'margin:0;width:44px;height:44px;font-size:19px',
          text: (pr.name || 'वि').slice(0, 1) }),
        el('div', {}, [
          el('div', { style: 'font-weight:700', text: pr.name || 'विद्यार्थी' }),
          el('div', { class: 'small dim', text: (DB.cache.user && DB.cache.user.email) || '' })
        ])
      ]),
      UI.field('नाम', name),
      UI.field('लक्ष्य परीक्षा', exam),
      el('div', { class: 'grid g2' }, [
        UI.field('परीक्षा की तारीख़', date),
        UI.field('रोज़ का लक्ष्य (मिनट)', goal)
      ]),
      el('button', { class: 'btn btn-primary btn-block', text: 'सेव करें', onclick: async function (e) {
        const btn = e.currentTarget;
        btn.disabled = true; btn.textContent = 'सेव…';
        try {
          await DB.updateProfile({
            name: name.value.trim(), target_exam: exam.value.trim(),
            exam_date: date.value, daily_goal_min: parseInt(goal.value, 10) || S.defaultDailyGoalMin
          });
          UI.toast('प्रोफ़ाइल सेव ✓', 'ok');
          APP.refreshChrome();
        } catch (err) { UI.toast(err.message, 'err'); }
        btn.disabled = false; btn.textContent = 'सेव करें';
      } })
    ]));

    const o = ANALYSIS.overall();
    wrap.appendChild(el('div', { class: 'section-title', text: 'मेरा रिकॉर्ड' }));
    wrap.appendChild(el('div', { class: 'grid g2' }, [
      UI.stat(o.done + '/' + o.total, 'चैप्टर पूरे'),
      UI.stat(o.pyqSolved, 'PYQ हल किए'),
      UI.stat(DB.cache.logs.length, 'लॉग एंट्री'),
      UI.stat(DB.cache.resources.length, 'फ़ाइलें')
    ]));

    wrap.appendChild(el('div', { class: 'section-title', text: 'अन्य' }));
    wrap.appendChild(el('div', { class: 'card' }, [
      el('button', { class: 'row', style: 'padding:13px 15px;width:100%;text-align:left',
        onclick: function () { PRACTICE.importModal(function () { UI.toast('प्रश्न जुड़ गए', 'ok'); }); } },
        [el('span', { text: '➕' }), el('span', { style: 'font-weight:600', text: 'प्रश्न इम्पोर्ट करें' })]),
      el('button', { class: 'row', style: 'padding:13px 15px;width:100%;text-align:left;border-top:1px solid var(--border-2);color:var(--red)',
        onclick: async function () {
          if (!await UI.confirm({ title: 'लॉगआउट?', message: 'आपका डेटा सुरक्षित रहेगा।', ok: 'लॉगआउट', danger: true })) return;
          await DB.signOut();
          location.hash = '#/login';
          APP.route();
        } },
        [el('span', { text: '🚪' }), el('span', { style: 'font-weight:600', text: 'लॉगआउट' })])
    ]));

    wrap.appendChild(el('div', { class: 'tiny dim center mt24',
      text: 'PadhAI v' + window.CONFIG.app.version + ' · आपका डेटा सिर्फ़ आपके खाते में सुरक्षित है' }));
  }

  window.PAGES = {
    authScreen: authScreen, dashboard: dashboard, syllabus: syllabus,
    chapterDetail: chapterDetail, resources: resources, analysisPage: analysisPage,
    profile: profile, logModal: logModal
  };
})();
