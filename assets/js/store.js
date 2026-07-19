/* =========================================================================
 * LegentArena — Data layer (localStorage persistence)
 * All app data lives under these keys. Structure mirrors the spec.
 * ======================================================================= */
(function () {
  'use strict';

  var KEYS = {
    users: 'ffth_users',
    tournaments: 'ffth_tournaments',
    registrations: 'ffth_registrations',
    transactions: 'ffth_transactions',
    matches: 'ffth_matches',
    session: 'ffth_session',
    seeded: 'ffth_seeded_v1',
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('store.read failed for', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('store.write failed for', key, e);
      if (window.UI) UI.toast('Storage error — your browser may be full or in private mode.', 'error');
    }
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---- Typed collection accessors ---- */
  var Store = {
    KEYS: KEYS,
    uid: uid,

    users: function () { return read(KEYS.users, []); },
    tournaments: function () { return read(KEYS.tournaments, []); },
    registrations: function () { return read(KEYS.registrations, []); },
    transactions: function () { return read(KEYS.transactions, []); },
    matches: function () { return read(KEYS.matches, []); },

    saveUsers: function (v) { write(KEYS.users, v); },
    saveTournaments: function (v) { write(KEYS.tournaments, v); },
    saveRegistrations: function (v) { write(KEYS.registrations, v); },
    saveTransactions: function (v) { write(KEYS.transactions, v); },
    saveMatches: function (v) { write(KEYS.matches, v); },

    /* ---- Session ---- */
    getSession: function () { return read(KEYS.session, null); },
    setSession: function (userId) { write(KEYS.session, userId); },
    clearSession: function () { localStorage.removeItem(KEYS.session); },

    /* ---- Lookups ---- */
    userById: function (id) { return Store.users().find(function (u) { return u.id === id; }) || null; },
    tournamentById: function (id) { return Store.tournaments().find(function (t) { return t.id === id; }) || null; },

    upsertUser: function (user) {
      var users = Store.users();
      var i = users.findIndex(function (u) { return u.id === user.id; });
      if (i === -1) users.push(user); else users[i] = user;
      Store.saveUsers(users);
      return user;
    },

    upsertTournament: function (t) {
      var list = Store.tournaments();
      var i = list.findIndex(function (x) { return x.id === t.id; });
      if (i === -1) list.push(t); else list[i] = t;
      Store.saveTournaments(list);
      return t;
    },

    addTransaction: function (tx) {
      var list = Store.transactions();
      list.unshift(tx);
      Store.saveTransactions(list);
      return tx;
    },

    /* ---- Wallet helpers (single source of truth for balance changes) ---- */
    credit: function (userId, amount, description) {
      var u = Store.userById(userId);
      if (!u) return null;
      u.balance = Math.round((u.balance + amount) * 100) / 100;
      Store.upsertUser(u);
      Store.addTransaction({
        id: uid('tx'), userId: userId, amount: amount, type: 'credit',
        status: 'success', description: description || 'Credit', date: new Date().toISOString(),
      });
      return u;
    },

    debit: function (userId, amount, description) {
      var u = Store.userById(userId);
      if (!u || u.balance < amount) return null;
      u.balance = Math.round((u.balance - amount) * 100) / 100;
      Store.upsertUser(u);
      Store.addTransaction({
        id: uid('tx'), userId: userId, amount: amount, type: 'debit',
        status: 'success', description: description || 'Debit', date: new Date().toISOString(),
      });
      return u;
    },

    /* ---- Derived: registered team count for a tournament ---- */
    registeredCount: function (tournamentId) {
      return Store.registrations().filter(function (r) {
        return r.tournamentId === tournamentId && r.paymentStatus === 'paid';
      }).length;
    },

    /* ---- Seed demo data once ---- */
    seed: function () {
      if (read(KEYS.seeded, false)) return;

      var now = new Date();
      function daysFromNow(d) {
        var x = new Date(now.getTime() + d * 86400000);
        return x.toISOString().slice(0, 10);
      }

      var admin = {
        id: uid('u'), username: 'admin', mobile: '9000000000', freeFireUID: '000000000',
        password: 'admin123', balance: 0, tournamentsWon: 0, totalEarnings: 0,
        kills: 0, deaths: 0, matchesPlayed: 0, role: 'admin', createdAt: now.toISOString(),
      };

      var demoNames = [
        ['GhostSniper', 42, 320, 610, 180, 24000, 9],
        ['NoScopeKing', 38, 280, 540, 150, 19500, 7],
        ['ClutchGod', 51, 410, 720, 210, 31000, 12],
        ['RushOrDie', 27, 190, 380, 140, 12000, 4],
        ['SilentBooyah', 33, 240, 500, 160, 16800, 6],
        ['HeadshotHero', 45, 360, 640, 170, 22500, 8],
      ];
      var players = demoNames.map(function (d, i) {
        return {
          id: uid('u'), username: d[0], mobile: '98000000' + (10 + i),
          freeFireUID: '1234' + (1000 + i), password: 'player123',
          balance: 500 + i * 120, tournamentsWon: d[6],
          totalEarnings: d[5], kills: d[3], deaths: d[4], matchesPlayed: d[1],
          role: 'user', createdAt: now.toISOString(),
        };
      });

      var users = [admin].concat(players);

      var tournaments = [
        {
          id: uid('t'), title: 'Booyah Blitz — Solo Showdown', date: daysFromNow(1), time: '20:00',
          entryFee: 30, prizePool: 2000, maxTeams: 48, type: 'Solo', status: 'upcoming',
          map: 'Bermuda', rules: 'No emulators. No teaming. Screenshot of result required. Top 8 paid.',
          createdAt: now.toISOString(),
        },
        {
          id: uid('t'), title: 'Duo Dynamite Cup', date: daysFromNow(2), time: '21:00',
          entryFee: 50, prizePool: 5000, maxTeams: 50, type: 'Duo', status: 'upcoming',
          map: 'Purgatory', rules: 'Duos only. Character skills allowed. Hackers instantly banned.',
          createdAt: now.toISOString(),
        },
        {
          id: uid('t'), title: 'Squad Supremacy Weekly', date: daysFromNow(3), time: '19:30',
          entryFee: 80, prizePool: 12000, maxTeams: 25, type: 'Squad', status: 'upcoming',
          map: 'Kalahari', rules: 'Full squads of 4. Per-kill ₹20 bonus. Booyah = ₹3000.',
          createdAt: now.toISOString(),
        },
        {
          id: uid('t'), title: 'Midnight Solo Rumble', date: daysFromNow(0), time: '23:30',
          entryFee: 20, prizePool: 1500, maxTeams: 48, type: 'Solo', status: 'live',
          map: 'Bermuda Remastered', rules: 'One life mode. Fast-paced. Winner takes 50%.',
          createdAt: now.toISOString(),
        },
        {
          id: uid('t'), title: 'Champions Grand Finals', date: daysFromNow(-2), time: '20:00',
          entryFee: 100, prizePool: 25000, maxTeams: 12, type: 'Squad', status: 'completed',
          map: 'Alpine', rules: 'Invite + qualifier squads. Best of 3 matches.',
          createdAt: now.toISOString(),
        },
      ];

      // Pre-fill some paid registrations to make slot counters feel alive.
      var registrations = [];
      var transactions = [];
      tournaments.slice(0, 4).forEach(function (t, ti) {
        var fill = [30, 44, 12, 25][ti] || 0;
        for (var k = 0; k < fill; k++) {
          var pl = players[k % players.length];
          registrations.push({
            id: uid('r'), userId: pl.id, tournamentId: t.id,
            teamName: pl.username + (t.type === 'Solo' ? '' : ' Squad'),
            paymentStatus: 'paid', registeredAt: now.toISOString(),
          });
        }
      });

      write(KEYS.users, users);
      write(KEYS.tournaments, tournaments);
      write(KEYS.registrations, registrations);
      write(KEYS.transactions, transactions);
      write(KEYS.matches, []);
      write(KEYS.seeded, true);
    },

    /* ---- Danger: wipe everything (used by admin reset) ---- */
    resetAll: function () {
      Object.keys(KEYS).forEach(function (k) { localStorage.removeItem(KEYS[k]); });
    },
  };

  window.Store = Store;
})();
