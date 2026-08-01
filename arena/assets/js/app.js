/* =========================================================================
 * LegentArena — App shell: hash router, bottom nav, live countdowns
 * ======================================================================= */
(function () {
  'use strict';

  var appEl = document.getElementById('app');

  var routes = {
    '': Pages.home,
    'contest': function (id) { return Pages.contestDetail(id); },
    'joinings': function (id) { return Pages.joinings(id); },
    'my-contests': Pages.myContests,
    'wallet': Pages.wallet,
    'leaderboard': Pages.leaderboard,
    'menu': Pages.menu,
    'statistics': Pages.statistics,
    'how': Pages.howItWorks,
    'faq': Pages.faq,
    'contact': Pages.contact,
    'about': Pages.about,
    'legal': Pages.legal,
    'login': Pages.loginPage,
    'register': Pages.registerPage,
    'admin': function () { return Admin.panel(); },
  };

  function parseHash() {
    var raw = (location.hash || '#/').replace(/^#\/?/, '').split('?')[0];
    var parts = raw.split('/').filter(Boolean);
    return { name: parts[0] || '', param: parts[1] || null };
  }

  function route() {
    var r = parseHash();
    var handler = routes[r.name];
    var node;
    if (!handler) node = notFound();
    else { try { node = handler(r.param); } catch (e) { console.error('render error', e); node = errorScreen(); } }
    appEl.innerHTML = '';
    if (node) appEl.appendChild(node);
    window.scrollTo(0, 0);
    updateNav(r.name);
    tickCountdowns();
  }

  function notFound() {
    return UI.screen({ title: 'Not found', backTo: '#/', html: '<div class="empty"><span class="empty-ic">🚫</span><h3>Page not found</h3><a href="#/" class="btn btn-primary btn-sm">Go Home</a></div>' });
  }
  function errorScreen() {
    return UI.screen({ title: 'Error', backTo: '#/', html: '<div class="empty"><span class="empty-ic">😵</span><p class="muted">Something went wrong rendering this page.</p></div>' });
  }

  function updateNav(name) {
    var map = { '': 'home', 'contest': 'home', 'my-contests': 'mine', 'wallet': 'wallet', 'leaderboard': 'ranks', 'menu': 'menu', 'statistics': 'menu', 'admin': 'menu', 'how': 'menu', 'faq': 'menu', 'contact': 'menu', 'about': 'menu', 'legal': 'menu' };
    var active = map[name] || '';
    document.querySelectorAll('#tabbar a').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-tab') === active); });
  }

  function refreshChrome() {
    var user = Auth.current();
    var wt = document.querySelector('#tabbar [data-tab="wallet"] .tb-badge');
    if (wt) wt.textContent = user ? UI.num(user.balance) : '';
    if (wt) wt.style.display = user ? '' : 'none';
  }

  /* ---- Live countdown updater ---- */
  function tickCountdowns() {
    var now = Date.now();
    document.querySelectorAll('[data-deadline]').forEach(function (el) {
      var target = new Date(el.getAttribute('data-deadline')).getTime();
      if (isNaN(target)) { el.textContent = ''; return; }
      var diff = target - now;
      if (diff <= 0) { el.textContent = '⏱ Starting'; el.classList.add('soon'); return; }
      var d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
      var txt = d > 0 ? (d + 'd ' + h + 'h') : h > 0 ? (h + 'h ' + m + 'm') : (m + 'm ' + s + 's');
      el.textContent = '⏱ ' + txt;
      if (diff < 3600000) el.classList.add('soon');
    });
  }

  function init() {
    Store.seed();
    window.addEventListener('hashchange', route);
    setInterval(tickCountdowns, 1000);
    refreshChrome();
    if (!location.hash) location.hash = '#/';
    route();
  }

  window.App = { route: route, refreshChrome: refreshChrome, tickCountdowns: tickCountdowns };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
