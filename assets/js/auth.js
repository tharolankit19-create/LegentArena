/* =========================================================================
 * LegentArena — Authentication (localStorage backed)
 * NOTE: passwords are stored in plaintext in localStorage for demo purposes
 * only. A real app must authenticate against a backend with hashed secrets.
 * ======================================================================= */
(function () {
  'use strict';

  var Auth = {
    current: function () {
      var id = Store.getSession();
      return id ? Store.userById(id) : null;
    },

    isLoggedIn: function () { return !!Auth.current(); },

    isAdmin: function () {
      var u = Auth.current();
      return !!u && u.role === 'admin';
    },

    register: function (data) {
      var users = Store.users();
      var uname = (data.username || '').trim();
      if (users.some(function (u) { return u.username.toLowerCase() === uname.toLowerCase(); }))
        return { ok: false, error: 'That username is already taken.' };
      if (users.some(function (u) { return u.mobile === data.mobile; }))
        return { ok: false, error: 'An account with this mobile already exists.' };

      var bonus = (window.APP_CONFIG && APP_CONFIG.newUserBonus) || 0;
      var user = {
        id: Store.uid('u'),
        username: uname,
        mobile: data.mobile,
        freeFireUID: data.freeFireUID,
        password: data.password,
        balance: bonus,
        tournamentsWon: 0,
        totalEarnings: 0,
        kills: 0,
        deaths: 0,
        matchesPlayed: 0,
        role: 'user',
        createdAt: new Date().toISOString(),
      };
      Store.upsertUser(user);
      if (bonus > 0) {
        Store.addTransaction({
          id: Store.uid('tx'), userId: user.id, amount: bonus, type: 'credit',
          status: 'success', description: 'Welcome bonus', date: new Date().toISOString(),
        });
      }
      Store.setSession(user.id);
      return { ok: true, user: user };
    },

    login: function (identifier, password) {
      var id = (identifier || '').trim().toLowerCase();
      var user = Store.users().find(function (u) {
        return (u.username.toLowerCase() === id || u.mobile === identifier) && u.password === password;
      });
      if (!user) return { ok: false, error: 'Invalid credentials. Check your username/mobile and password.' };
      Store.setSession(user.id);
      return { ok: true, user: user };
    },

    logout: function () {
      Store.clearSession();
    },

    requireAuth: function () {
      if (Auth.isLoggedIn()) return true;
      UI.toast('Please log in to continue.', 'warn');
      location.hash = '#/login';
      return false;
    },
  };

  window.Auth = Auth;
})();
