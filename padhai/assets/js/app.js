/* Router + app shell (sidebar on desktop, bottom tabs on mobile). */
(function () {
  const el = UI.el;

  const NAV = [
    { hash: '#/',           key: 'home',      icon: '🏠', label: 'डैशबोर्ड', title: 'डैशबोर्ड' },
    { hash: '#/syllabus',   key: 'syllabus',  icon: '📚', label: 'सिलेबस',   title: 'सिलेबस' },
    { hash: '#/practice',   key: 'practice',  icon: '🎯', label: 'प्रैक्टिस', title: 'प्रैक्टिस' },
    { hash: '#/analysis',   key: 'analysis',  icon: '📊', label: 'विश्लेषण',  title: 'विश्लेषण' },
    { hash: '#/resources',  key: 'resources', icon: '📁', label: 'सामग्री',   title: 'मेरी सामग्री' },
    { hash: '#/profile',    key: 'profile',   icon: '👤', label: 'प्रोफ़ाइल', title: 'प्रोफ़ाइल' }
  ];

  let shellBuilt = false;
  let currentKey = 'home';

  function buildShell() {
    const root = document.getElementById('root');
    UI.clear(root);

    const sidebar = el('aside', { class: 'sidebar' }, [
      el('div', { class: 'brand' }, [
        el('div', { class: 'brand-logo', text: 'प' }),
        el('div', {}, [
          el('div', { class: 'brand-name', text: window.CONFIG.app.name }),
          el('div', { class: 'brand-sub', text: window.CONFIG.app.tagline })
        ])
      ])
    ]);
    NAV.forEach(function (n) {
      sidebar.appendChild(el('a', { href: n.hash, class: 'navlink', dataset: { nav: n.key } }, [
        el('span', { class: 'ic', text: n.icon }), el('span', { text: n.label })
      ]));
    });
    sidebar.appendChild(el('div', { class: 'nav-spacer' }));
    sidebar.appendChild(el('button', {
      class: 'navlink', style: 'width:100%',
      onclick: function () { PAGES.logModal(); }
    }, [el('span', { class: 'ic', text: '➕' }), el('span', { text: 'पढ़ाई लॉग करें' })]));

    const topbar = el('header', { class: 'topbar' }, [
      el('div', {}, [
        el('h1', { id: 'pageTitle', text: 'डैशबोर्ड' }),
        el('div', { class: 'topbar-sub', id: 'pageSub' })
      ]),
      el('div', { class: 'topbar-right' }, [
        el('button', { class: 'btn btn-sm', id: 'streakChip', onclick: function () { location.hash = '#/analysis'; } })
      ])
    ]);

    const main = el('main', { class: 'main' }, [topbar, el('div', { id: 'view' })]);

    const tabbar = el('nav', { class: 'tabbar' });
    NAV.filter(function (n) { return n.key !== 'profile'; }).slice(0, 5).forEach(function (n) {
      tabbar.appendChild(el('a', { href: n.hash, dataset: { nav: n.key } }, [
        el('span', { class: 'ic', text: n.icon }), el('span', { text: n.label })
      ]));
    });

    root.appendChild(el('div', { class: 'shell' }, [sidebar, main]));
    root.appendChild(tabbar);
    shellBuilt = true;
  }

  function refreshChrome() {
    if (!shellBuilt) return;
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      a.classList.toggle('active', a.dataset.nav === currentKey);
    });
    const chip = document.getElementById('streakChip');
    if (chip) {
      const st = ANALYSIS.streak();
      const p = ANALYSIS.pace();
      chip.textContent = (st ? '🔥 ' + st + ' दिन' : '🔥 शुरू करें') + ' · ⏳ ' + p.daysLeft + ' दिन';
    }
    const sub = document.getElementById('pageSub');
    if (sub) {
      const pr = DB.cache.profile;
      sub.textContent = pr ? (pr.target_exam || '') + ' · ' + UI.dateHi(pr.exam_date) : '';
    }
  }

  function setTitle(t) {
    const h = document.getElementById('pageTitle');
    if (h) h.textContent = t;
    document.title = t + ' · ' + window.CONFIG.app.name;
  }

  function parseHash() {
    const raw = (location.hash || '#/').replace(/^#/, '');
    const parts = raw.split('/').filter(Boolean);
    return { head: parts[0] || '', arg: parts[1] || null };
  }

  async function route() {
    const { head, arg } = parseHash();
    const user = DB.cache.user;

    if (!user) {
      shellBuilt = false;
      PAGES.authScreen(head === 'signup' ? 'signup' : 'login');
      return;
    }
    if (head === 'login' || head === 'signup') { location.hash = '#/'; return; }

    if (!shellBuilt) buildShell();
    const view = document.getElementById('view');
    UI.clear(view);

    switch (head) {
      case '':
        currentKey = 'home'; setTitle('डैशबोर्ड');
        await PAGES.dashboard(view);
        break;
      case 'syllabus':
        currentKey = 'syllabus'; setTitle('सिलेबस');
        PAGES.syllabus(view, arg);
        break;
      case 'chapter':
        currentKey = 'syllabus';
        setTitle(SYLLABUS.chapter(arg) ? SYLLABUS.chapter(arg).hi : 'चैप्टर');
        PAGES.chapterDetail(view, arg);
        break;
      case 'practice':
        currentKey = 'practice'; setTitle('प्रैक्टिस');
        PRACTICE.setup(view, arg);
        break;
      case 'analysis':
        currentKey = 'analysis'; setTitle('विश्लेषण');
        await PAGES.analysisPage(view);
        break;
      case 'resources':
        currentKey = 'resources'; setTitle('मेरी सामग्री');
        PAGES.resources(view);
        break;
      case 'profile':
        currentKey = 'profile'; setTitle('प्रोफ़ाइल');
        PAGES.profile(view);
        break;
      default:
        currentKey = 'home';
        location.hash = '#/';
        return;
    }
    refreshChrome();
    window.scrollTo(0, 0);
  }

  function rerender() { route(); }

  // Navigate even when the target hash is the one already in the address bar
  // (e.g. the practice player and its result screen both live at #/practice).
  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  async function afterLogin() {
    const root = document.getElementById('root');
    UI.clear(root);
    root.appendChild(el('div', { class: 'auth-wrap' },
      el('div', { class: 'center' }, [
        el('span', { class: 'spin' }),
        el('div', { class: 'small dim mt8', text: 'आपका डेटा लोड हो रहा है…' })
      ])));
    await DB.currentUser();
    try {
      await DB.load();
    } catch (e) {
      UI.toast('डेटा लोड नहीं हुआ: ' + e.message, 'err');
    }
    shellBuilt = false;
    if (['#/login', '#/signup', ''].indexOf(location.hash) >= 0) location.hash = '#/';
    await route();
  }

  async function boot() {
    const root = document.getElementById('root');
    root.appendChild(el('div', { class: 'auth-wrap' },
      el('div', { class: 'center' }, [
        el('div', { class: 'auth-logo', text: 'प' }),
        el('span', { class: 'spin' })
      ])));

    await DB.currentUser();
    if (DB.cache.user) {
      try { await DB.load(); }
      catch (e) { UI.toast('डेटा लोड नहीं हुआ: ' + e.message, 'err'); }
    }
    await route();

    window.addEventListener('hashchange', route);
    DB.onAuthChange(function (user) {
      const had = !!DB.cache.user;
      DB.cache.user = user;
      if (!user && had) { shellBuilt = false; route(); }
    });
  }

  window.APP = { route: route, rerender: rerender, go: go, refreshChrome: refreshChrome, afterLogin: afterLogin, boot: boot };
  document.addEventListener('DOMContentLoaded', boot);
})();
