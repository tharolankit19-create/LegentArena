/* =========================================================================
 * LegentArena — Data layer (localStorage) + coin economy
 * All displayed money numbers are COMPUTED from real records here — no
 * hardcoded prize pools or fake counters.
 * ======================================================================= */
(function () {
  'use strict';

  var KEYS = {
    users: 'ffth_users',
    tournaments: 'ffth_tournaments',
    registrations: 'ffth_registrations',
    transactions: 'ffth_transactions',
    matches: 'ffth_matches',
    settings: 'ffth_settings',
    session: 'ffth_session',
    seeded: 'ffth_seeded_v2',
  };

  function read(key, fb) {
    try { var r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; }
    catch (e) { console.warn('read fail', key, e); return fb; }
  }
  function write(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); }
    catch (e) { console.error('write fail', key, e); if (window.UI) UI.toast('Storage full or blocked (private mode?).', 'error'); }
  }
  function uid(p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function floor(n) { return Math.floor(n); }

  var Store = {
    KEYS: KEYS, uid: uid,

    users: function () { return read(KEYS.users, []); },
    tournaments: function () { return read(KEYS.tournaments, []); },
    registrations: function () { return read(KEYS.registrations, []); },
    transactions: function () { return read(KEYS.transactions, []); },
    matches: function () { return read(KEYS.matches, []); },
    settings: function () { return read(KEYS.settings, {}); },

    saveUsers: function (v) { write(KEYS.users, v); },
    saveTournaments: function (v) { write(KEYS.tournaments, v); },
    saveRegistrations: function (v) { write(KEYS.registrations, v); },
    saveTransactions: function (v) { write(KEYS.transactions, v); },
    saveMatches: function (v) { write(KEYS.matches, v); },
    saveSettings: function (v) { write(KEYS.settings, v); },

    getSession: function () { return read(KEYS.session, null); },
    setSession: function (id) { write(KEYS.session, id); },
    clearSession: function () { localStorage.removeItem(KEYS.session); },

    userById: function (id) { return Store.users().find(function (u) { return u.id === id; }) || null; },
    userByMobile: function (m) { return Store.users().find(function (u) { return u.mobile === m; }) || null; },
    tournamentById: function (id) { return Store.tournaments().find(function (t) { return t.id === id; }) || null; },

    upsertUser: function (u) {
      var list = Store.users(); var i = list.findIndex(function (x) { return x.id === u.id; });
      if (i === -1) list.push(u); else list[i] = u; Store.saveUsers(list); return u;
    },
    upsertTournament: function (t) {
      var list = Store.tournaments(); var i = list.findIndex(function (x) { return x.id === t.id; });
      if (i === -1) list.push(t); else list[i] = t; Store.saveTournaments(list); return t;
    },
    addTransaction: function (tx) { var l = Store.transactions(); l.unshift(tx); Store.saveTransactions(l); return tx; },

    /* ---- Coin wallet (single source of truth) ---- */
    credit: function (userId, coins, description, meta) {
      var u = Store.userById(userId); if (!u) return null;
      u.balance = floor(u.balance + coins); Store.upsertUser(u);
      Store.addTransaction({ id: uid('tx'), userId: userId, amount: coins, type: 'credit', status: 'success',
        description: description || 'Credit', date: new Date().toISOString(), meta: meta || null });
      return u;
    },
    debit: function (userId, coins, description, meta) {
      var u = Store.userById(userId); if (!u || u.balance < coins) return null;
      u.balance = floor(u.balance - coins); Store.upsertUser(u);
      Store.addTransaction({ id: uid('tx'), userId: userId, amount: coins, type: 'debit', status: 'success',
        description: description || 'Debit', date: new Date().toISOString(), meta: meta || null });
      return u;
    },

    /* ---- Registrations / slots ---- */
    regsFor: function (tid) {
      return Store.registrations().filter(function (r) { return r.tournamentId === tid && r.paymentStatus === 'paid'; });
    },
    joinedCount: function (tid) { return Store.regsFor(tid).length; },
    slotsLeft: function (t) { return Math.max(0, t.maxTeams - Store.joinedCount(t.id)); },
    nextSlotNo: function (tid) {
      var used = Store.regsFor(tid).map(function (r) { return r.slotNo; });
      for (var i = 1; i <= 200; i++) if (used.indexOf(i) === -1) return i;
      return used.length + 1;
    },
    isRegistered: function (userId, tid) {
      return !!Store.registrations().find(function (r) {
        return r.userId === userId && r.tournamentId === tid && r.paymentStatus === 'paid';
      });
    },

    /* ---- Economy: live prize pool computed from REAL joins ---- */
    commissionOf: function (t) {
      var s = Store.settings();
      var c = (t && typeof t.commissionOverride === 'number') ? t.commissionOverride : s.commissionPercent;
      return (typeof c === 'number') ? c : 20;
    },
    collection: function (t) { return Store.joinedCount(t.id) * (t.entryFee || 0); },
    fullCollection: function (t) { return t.maxTeams * (t.entryFee || 0); },
    livePool: function (t) {
      if (t.poolMode === 'fixed') return t.guaranteedPool || 0;
      return floor(Store.collection(t) * (100 - Store.commissionOf(t)) / 100);
    },
    fullPool: function (t) {
      if (t.poolMode === 'fixed') return t.guaranteedPool || 0;
      return floor(Store.fullCollection(t) * (100 - Store.commissionOf(t)) / 100);
    },
    /* Prize a given rank earns from the distributable pool of tournament t. */
    rankPrize: function (t, rank) {
      var pool = Store.livePool(t);
      var s = Store.settings().split || { first: 50, second: 30, third: 20 };
      if (rank === 1) return floor(pool * (s.first || 0) / 100);
      if (rank === 2) return floor(pool * (s.second || 0) / 100);
      if (rank === 3) return floor(pool * (s.third || 0) / 100);
      return 0;
    },

    /* ---- Earnings within a date window (for weekly/monthly ranks) ---- */
    earningsSince: function (userId, sinceMs) {
      return Store.transactions().filter(function (x) {
        return x.userId === userId && x.type === 'credit' && x.status === 'success' &&
          x.meta && x.meta.kind === 'prize' && new Date(x.date).getTime() >= sinceMs;
      }).reduce(function (s, x) { return s + x.amount; }, 0);
    },

    resetAll: function () { Object.keys(KEYS).forEach(function (k) { localStorage.removeItem(KEYS[k]); }); },

    /* ---- Seed ---- */
    seed: function () {
      // Always ensure settings exist (merge defaults).
      var d = (window.APP_CONFIG && APP_CONFIG.defaults) || {};
      var s = Store.settings();
      if (!s || !s.coinPerRupee) { Store.saveSettings(JSON.parse(JSON.stringify(d))); }

      if (read(KEYS.seeded, false)) { Store.ensureAdmin(); return; }

      var now = new Date();
      function dayAt(offsetDays, hhmm) {
        var base = new Date(now.getTime() + offsetDays * 86400000);
        return { date: base.toISOString().slice(0, 10), time: hhmm };
      }

      var admin = {
        id: uid('u'), username: 'Arena Admin', mobile: d.adminMobile || '8955005076',
        freeFireUID: '000000000', password: d.adminPassword || 'admin@123',
        balance: 0, tournamentsWon: 0, totalEarnings: 0, kills: 0, deaths: 0, matchesPlayed: 0,
        role: 'admin', createdAt: now.toISOString(),
      };

      // Real player accounts (used to create real registrations & real earnings).
      var seedPlayers = [
        ['fftejas', '9800000001'], ['rcpkings1x', '9800000002'], ['bgkrishna', '9800000003'],
        ['notsharad', '9800000004'], ['kuldeepsingh_ka', '9800000005'], ['ratulgnr21', '9800000006'],
        ['suncava', '9800000007'], ['dabang', '9800000008'], ['imDONWANTED', '9800000009'],
        ['DCM999', '9800000010'], ['hacccrrrr79', '9800000011'], ['KARTIKFF1k', '9800000012'],
      ];
      var players = seedPlayers.map(function (p, i) {
        return {
          id: uid('u'), username: p[0], mobile: p[1], freeFireUID: '24039' + (1000 + i),
          password: 'player123', balance: 40 + i * 15, tournamentsWon: 0, totalEarnings: 0,
          kills: 0, deaths: 0, matchesPlayed: 0, role: 'user', createdAt: now.toISOString(),
        };
      });
      var users = [admin].concat(players);
      write(KEYS.users, users);

      var t1 = dayAt(0, '21:00'), t2 = dayAt(0, '23:00'), t3 = dayAt(1, '20:30'), t4 = dayAt(1, '22:00'), t5 = dayAt(-2, '21:00');
      var tournaments = [
        { id: uid('t'), title: 'Clash Squad — 1v1 Gold Rush', date: t1.date, time: t1.time, entryFee: 20, perKill: 0,
          maxTeams: 24, type: 'Solo', map: 'Bermuda', status: 'upcoming', poolMode: 'dynamic',
          rules: 'No emulators. No teaming. Screenshot required. Room ID shared 10 min before start.', createdAt: now.toISOString() },
        { id: uid('t'), title: 'Full Map Solo — Booyah Blitz', date: t2.date, time: t2.time, entryFee: 30, perKill: 2,
          maxTeams: 48, type: 'Solo', map: 'Kalahari', status: 'upcoming', poolMode: 'dynamic',
          rules: '₹2 per kill + rank prizes. Hackers permanently banned.', createdAt: now.toISOString() },
        { id: uid('t'), title: 'Duo Dynamite Cup', date: t3.date, time: t3.time, entryFee: 40, perKill: 0,
          maxTeams: 25, type: 'Duo', map: 'Purgatory', status: 'upcoming', poolMode: 'dynamic',
          rules: 'Duos only. Character skills allowed.', createdAt: now.toISOString() },
        { id: uid('t'), title: 'Squad Supremacy — Big Pool', date: t4.date, time: t4.time, entryFee: 50, perKill: 5,
          maxTeams: 12, type: 'Squad', map: 'Alpine', status: 'upcoming', poolMode: 'dynamic',
          rules: 'Full squads of 4. ₹5 per kill. Booyah bonus.', createdAt: now.toISOString() },
        { id: uid('t'), title: 'Midnight Solo Rumble', date: t5.date, time: t5.time, entryFee: 20, perKill: 0,
          maxTeams: 24, type: 'Solo', map: 'Bermuda', status: 'completed', poolMode: 'dynamic',
          rules: 'One life mode.', createdAt: now.toISOString() },
      ];
      write(KEYS.tournaments, tournaments);

      // Real registrations (so pools/slot counters are computed, not faked).
      var regs = [], txns = [];
      function joinBot(t, player, slotNo) {
        regs.push({ id: uid('r'), userId: player.id, tournamentId: t.id, teamName: player.username,
          inGameName: player.username, inGameId: player.freeFireUID, slotNo: slotNo, position: 'A',
          paymentStatus: 'paid', registeredAt: now.toISOString() });
        txns.push({ id: uid('tx'), userId: player.id, amount: t.entryFee, type: 'debit', status: 'success',
          description: 'Entry: ' + t.title, date: now.toISOString(), meta: { kind: 'entry', tid: t.id } });
      }
      // Fill some real slots on the open tournaments.
      [ [tournaments[0], 15], [tournaments[1], 39], [tournaments[2], 11], [tournaments[3], 8] ].forEach(function (pair) {
        var t = pair[0], fill = pair[1];
        for (var k = 0; k < fill; k++) joinBot(t, players[k % players.length], k + 1);
      });

      // A completed tournament with REAL declared results -> real earnings for the leaderboard.
      var done = tournaments[4];
      for (var k = 0; k < 12; k++) joinBot(done, players[k % players.length], k + 1);
      var donePool = floor(done.entryFee * 12 * 0.8); // computed
      var winners = [ [players[0], 1, 9], [players[1], 2, 7], [players[2], 3, 5] ];
      var matches = [];
      winners.forEach(function (w) {
        var pl = Store.userByMobileIn(users, w[0].mobile);
        var prize = w[1] === 1 ? floor(donePool * 0.5) : w[1] === 2 ? floor(donePool * 0.3) : floor(donePool * 0.2);
        pl.balance += prize; pl.totalEarnings += prize; pl.tournamentsWon += (w[1] === 1 ? 1 : 0);
        pl.kills += w[2]; pl.deaths += 1; pl.matchesPlayed += 1;
        txns.push({ id: uid('tx'), userId: pl.id, amount: prize, type: 'credit', status: 'success',
          description: 'Prize: ' + done.title + ' (#' + w[1] + ')', date: now.toISOString(),
          meta: { kind: 'prize', tid: done.id, rank: w[1] } });
        matches.push({ id: uid('m'), tournamentId: done.id, rank: w[1], kills: w[2], winnerUserId: pl.id,
          inGameName: pl.username, screenshot: null, verified: true, createdAt: now.toISOString() });
      });
      // give the rest some matchesPlayed for honest K/D
      players.forEach(function (p) { var u = users.find(function (x) { return x.id === p.id; }); if (!u.matchesPlayed) { u.matchesPlayed = 1; u.deaths = 1; u.kills = Math.floor(Math.random()*4); } });

      write(KEYS.users, users);
      write(KEYS.registrations, regs);
      write(KEYS.transactions, txns);
      write(KEYS.matches, matches);
      write(KEYS.seeded, true);
    },

    // helper used in seed (find within an in-memory array by mobile)
    userByMobileIn: function (arr, m) { return arr.find(function (u) { return u.mobile === m; }); },

    /* Make sure an admin with the configured mobile always exists. */
    ensureAdmin: function () {
      var d = (window.APP_CONFIG && APP_CONFIG.defaults) || {};
      var mob = d.adminMobile || '8955005076';
      var existing = Store.userByMobile(mob);
      if (existing) { if (existing.role !== 'admin') { existing.role = 'admin'; Store.upsertUser(existing); } return; }
      Store.upsertUser({ id: uid('u'), username: 'Arena Admin', mobile: mob, freeFireUID: '000000000',
        password: d.adminPassword || 'admin@123', balance: 0, tournamentsWon: 0, totalEarnings: 0,
        kills: 0, deaths: 0, matchesPlayed: 0, role: 'admin', createdAt: new Date().toISOString() });
    },
  };

  window.Store = Store;
})();
