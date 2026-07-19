/* =========================================================================
 * LegentArena — App bootstrap + hash router + nav chrome
 * ======================================================================= */
(function () {
  'use strict';

  var appEl = document.getElementById('app');

  var routes = {
    '': Pages.landing,
    'tournaments': Pages.tournaments,
    'leaderboard': Pages.leaderboard,
    'my-tournaments': Pages.myTournaments,
    'wallet': Pages.wallet,
    'profile': Pages.profile,
    'login': Pages.loginPage,
    'register': Pages.registerPage,
    'admin': function () { return Admin.panel(); },
    'tournament': function (id) { return Pages.tournamentDetail(id); },
    'brackets': function (id) { return Pages.brackets(id); },
  };

  function parseHash() {
    var raw = (location.hash || '#/').replace(/^#\/?/, '');
    raw = raw.split('?')[0];
    var parts = raw.split('/').filter(Boolean);
    return { name: parts[0] || '', param: parts[1] || null };
  }

  function route() {
    var r = parseHash();
    var handler = routes[r.name];
    if (!handler) {
      appEl.innerHTML = '<section class="section"><div class="empty glass"><span class="empty-ic">🚫</span><h2>Page not found</h2><a href="#/" class="btn btn-primary btn-sm">Go home</a></div></section>';
      return;
    }
    var node;
    try {
      node = handler(r.param);
    } catch (e) {
      console.error('Route render error:', e);
      appEl.innerHTML = '<section class="section"><div class="empty glass"><p>Something went wrong rendering this page.</p></div></section>';
      return;
    }
    appEl.innerHTML = '';
    if (node) appEl.appendChild(node);
    window.scrollTo({ top: 0, behavior: 'auto' });
    updateActiveNav(r.name);
    closeMobileMenu();
  }

  function updateActiveNav(name) {
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var target = (a.getAttribute('href') || '').replace(/^#\/?/, '').split('/')[0];
      a.classList.toggle('active', target === name);
    });
  }

  /* ---- Nav chrome reflects auth state ---- */
  function refreshChrome() {
    var user = Auth.current();
    var actions = document.getElementById('navActions');

    // Toggle auth-only / admin-only links visibility.
    document.querySelectorAll('[data-auth]').forEach(function (n) { n.style.display = user ? '' : 'none'; });
    document.querySelectorAll('[data-admin]').forEach(function (n) { n.style.display = (user && user.role === 'admin') ? '' : 'none'; });

    if (user) {
      actions.innerHTML = '' +
        '<a href="#/wallet" class="nav-wallet" title="Wallet">💰 ' + UI.money(user.balance) + '</a>' +
        '<a href="#/profile" class="nav-user"><span class="nav-av">' + UI.esc(user.username.slice(0, 1).toUpperCase()) + '</span>' +
          '<span class="nav-uname">' + UI.esc(user.username) + '</span></a>' +
        '<button class="btn btn-ghost btn-sm" id="logoutBtn">Logout</button>';
      var lb = document.getElementById('logoutBtn');
      if (lb) lb.addEventListener('click', function () {
        Auth.logout();
        sessionStorage.removeItem('ffth_admin_ok');
        UI.toast('Logged out.', 'info');
        location.hash = '#/';
        refreshChrome();
      });
    } else {
      actions.innerHTML = '' +
        '<a href="#/login" class="btn btn-ghost btn-sm">Login</a>' +
        '<a href="#/register" class="btn btn-primary btn-sm">Sign Up</a>';
    }
  }

  /* ---- Mobile menu ---- */
  function toggleMobileMenu() {
    var links = document.getElementById('navLinks');
    var ham = document.getElementById('hamburger');
    var open = links.classList.toggle('open');
    ham.classList.toggle('open', open);
    ham.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function closeMobileMenu() {
    var links = document.getElementById('navLinks');
    var ham = document.getElementById('hamburger');
    if (links) links.classList.remove('open');
    if (ham) { ham.classList.remove('open'); ham.setAttribute('aria-expanded', 'false'); }
  }

  /* ---- Nav shadow on scroll ---- */
  function onScroll() {
    var nav = document.getElementById('nav');
    if (window.scrollY > 8) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');
  }

  function init() {
    Store.seed();
    document.getElementById('hamburger').addEventListener('click', toggleMobileMenu);
    document.getElementById('navLinks').addEventListener('click', function (e) {
      if (e.target.tagName === 'A') closeMobileMenu();
    });
    window.addEventListener('hashchange', route);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    refreshChrome();
    if (!location.hash) location.hash = '#/';
    route();
  }

  window.App = { route: route, refreshChrome: refreshChrome };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
