/* =========================================================================
 * LegentArena — Authentication (localStorage, mobile-first)
 * Demo only: passwords stored in plaintext locally. A production app must
 * authenticate against a backend (OTP + hashed secrets).
 * ======================================================================= */
(function () {
  'use strict';

  var Auth = {
    current: function () { var id = Store.getSession(); return id ? Store.userById(id) : null; },
    isLoggedIn: function () { return !!Auth.current(); },
    isAdmin: function () { var u = Auth.current(); return !!u && u.role === 'admin'; },

    register: function (data) {
      var users = Store.users();
      var uname = (data.username || '').trim();
      if (users.some(function (u) { return u.username.toLowerCase() === uname.toLowerCase(); }))
        return { ok: false, error: 'That username is already taken.' };
      if (users.some(function (u) { return u.mobile === data.mobile; }))
        return { ok: false, error: 'This mobile number is already registered.' };

      var s = Store.settings();
      var bonus = (s.signupBonus || 0);
      var user = {
        id: Store.uid('u'), username: uname, mobile: data.mobile, freeFireUID: data.freeFireUID,
        password: data.password, balance: bonus, tournamentsWon: 0, totalEarnings: 0,
        kills: 0, deaths: 0, matchesPlayed: 0, role: 'user', createdAt: new Date().toISOString(),
      };
      Store.upsertUser(user);
      if (bonus > 0) Store.credit(user.id, bonus, 'Welcome bonus', { kind: 'bonus' });
      Store.setSession(user.id);
      return { ok: true, user: Store.userById(user.id) };
    },

    login: function (mobileOrName, password) {
      var id = (mobileOrName || '').trim();
      var user = Store.users().find(function (u) {
        return (u.mobile === id || u.username.toLowerCase() === id.toLowerCase()) && u.password === password;
      });
      if (!user) return { ok: false, error: 'Wrong mobile/username or password.' };
      Store.setSession(user.id);
      return { ok: true, user: user };
    },

    logout: function () { Store.clearSession(); sessionStorage.removeItem('ffth_admin_ok'); },

    requireAuth: function () {
      if (Auth.isLoggedIn()) return true;
      UI.toast('Login to continue.', 'warn'); location.hash = '#/login'; return false;
    },
  };

  window.Auth = Auth;
})();
