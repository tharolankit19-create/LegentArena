/* =========================================================================
 * LegentArena — Admin panel (mobile-first)
 * Settings (commission/coin rate/split), tournament CRUD, room details,
 * declare results (auto coin payout), withdrawals, users. Gated by role +
 * admin password once per session.
 * ======================================================================= */
(function () {
  'use strict';

  var esc = UI.esc, coins = UI.coins, num = UI.num;
  function frag(h) { var d = document.createElement('div'); d.innerHTML = h; return d; }

  function panel() {
    var u = Auth.current();
    if (!u || u.role !== 'admin') {
      return UI.screen({ title: 'Admin', backTo: '#/', html: '<div class="empty"><span class="empty-ic">🔒</span><h3>Admin only</h3><p class="muted">Login with the admin account (' + esc((APP_CONFIG.defaults && APP_CONFIG.defaults.adminMobile) || '') + ').</p><a href="#/login" class="btn btn-primary btn-sm">Login</a></div>' });
    }
    if (sessionStorage.getItem('ffth_admin_ok') !== '1') { setTimeout(pwPrompt, 20); return UI.screen({ title: 'Admin', backTo: '#/' }); }

    var tab = 'tournaments';
    var node = UI.screen({ title: 'Admin Panel', backTo: '#/' });
    var body = node._body;
    body.innerHTML = statsRow() +
      '<div class="admin-tabs" id="atabs">' +
        tb('tournaments', '🎮 Contests', tab) + tb('results', '📸 Results', tab) +
        tb('withdrawals', '💸 Payouts', tab) + tb('users', '👥 Users', tab) + tb('settings', '⚙️ Settings', tab) +
      '</div><div id="abody"></div>';
    body.querySelector('#atabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tab]'); if (!b) return; tab = b.getAttribute('data-tab');
      body.querySelectorAll('#atabs .atab').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active');
      renderTab(body.querySelector('#abody'), tab);
    });
    renderTab(body.querySelector('#abody'), tab);
    return node;
  }
  function tb(k, l, a) { return '<button class="atab ' + (k === a ? 'active' : '') + '" data-tab="' + k + '">' + l + '</button>'; }

  function pwPrompt() {
    var s = Store.settings(); var pw = s.adminPassword || (APP_CONFIG.defaults && APP_CONFIG.defaults.adminPassword) || 'admin@123';
    var body = frag('<div class="admin-lock"><div class="lock-ic">🔐</div><p class="muted">Enter admin password.</p><div class="field"><input id="apw" type="password" placeholder="Admin password"/><span class="field-err"></span></div></div>');
    UI.openModal({ title: 'Admin Login', node: body,
      actions: [ { label: 'Cancel', kind: 'ghost', onClick: function () { location.hash = '#/'; } },
        { label: 'Unlock', kind: 'primary', onClick: function () {
          var i = body.querySelector('#apw'); if (i.value !== pw) { UI.fieldError(i, 'Wrong password.'); return true; }
          sessionStorage.setItem('ffth_admin_ok', '1'); UI.closeModal(); if (window.App) App.route();
        } } ] });
  }

  function statsRow() {
    var users = Store.users().filter(function (u) { return u.role === 'user'; });
    var pendingRes = Store.matches().filter(function (m) { return !m.verified; }).length;
    var pendingWd = Store.transactions().filter(function (t) { return t.meta && t.meta.kind === 'withdrawal' && t.status === 'pending'; }).length;
    var revenue = Store.tournaments().reduce(function (s, t) {
      return s + Math.floor(Store.collection(t) * Store.commissionOf(t) / 100);
    }, 0);
    function tile(ic, v, l) { return '<div class="itile"><span class="itile-ic">' + ic + '</span><span class="itile-val">' + v + '</span><span class="itile-label">' + l + '</span></div>'; }
    return '<div class="info-grid admin-stats">' + tile('👥', users.length, 'Players') + tile('📸', pendingRes, 'Results') +
      tile('💸', pendingWd, 'Payouts') + tile('🪙', coins(revenue), 'Your fees') + '</div>';
  }

  function renderTab(body, tab) {
    if (tab === 'tournaments') return renderTours(body);
    if (tab === 'results') return renderResults(body);
    if (tab === 'withdrawals') return renderWithdrawals(body);
    if (tab === 'users') return renderUsers(body);
    if (tab === 'settings') return renderSettings(body);
  }

  /* ---- Contests ---- */
  function renderTours(body) {
    var tours = Store.tournaments().slice().sort(function (a, b) { return (b.date + b.time).localeCompare(a.date + a.time); });
    body.innerHTML = '<div class="admin-bar"><button class="btn btn-primary btn-sm" id="newT">＋ New Contest</button></div><div class="admin-list">' +
      tours.map(function (t) {
        return '<div class="arow"><div class="arow-main"><strong>' + esc(t.title) + '</strong>' +
          '<div class="muted small">' + esc(t.type) + ' • ' + UI.fmtDate(t.date) + ' ' + esc(t.time) + ' • ' + Store.joinedCount(t.id) + '/' + t.maxTeams + ' • pool ' + coins(Store.livePool(t)) + '</div></div>' +
          '<div class="arow-actions"><select class="mini-sel" data-st="' + t.id + '">' +
            ['upcoming', 'live', 'completed'].map(function (s) { return '<option value="' + s + '"' + (t.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
          '<button class="btn btn-ghost btn-sm" data-room="' + t.id + '">Room</button>' +
          '<button class="btn btn-ghost btn-sm" data-edit="' + t.id + '">Edit</button>' +
          '<button class="btn btn-danger btn-sm" data-del="' + t.id + '">✕</button></div></div>';
      }).join('') + '</div>';
    body.querySelector('#newT').addEventListener('click', function () { tourForm(null, body); });
    body.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { tourForm(b.getAttribute('data-edit'), body); }); });
    body.querySelectorAll('[data-room]').forEach(function (b) { b.addEventListener('click', function () { roomForm(b.getAttribute('data-room'), body); }); });
    body.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () {
      UI.confirm({ title: 'Delete contest?', message: 'Removes it for everyone.', danger: true, confirmLabel: 'Delete' }).then(function (ok) {
        if (!ok) return; Store.saveTournaments(Store.tournaments().filter(function (t) { return t.id !== b.getAttribute('data-del'); }));
        UI.toast('Deleted.', 'info'); renderTours(body);
      }); }); });
    body.querySelectorAll('[data-st]').forEach(function (sel) { sel.addEventListener('change', function () {
      var t = Store.tournamentById(sel.getAttribute('data-st')); t.status = sel.value; Store.upsertTournament(t); UI.toast('Status: ' + sel.value, 'success'); }); });
  }

  function tourForm(id, body) {
    var s = Store.settings();
    var t = id ? Store.tournamentById(id) : { title: '', date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), time: '21:00',
      entryFee: 20, perKill: 0, maxTeams: 24, type: 'Solo', map: 'Bermuda', status: 'upcoming', poolMode: 'dynamic', guaranteedPool: 0, rules: '' };
    var f = frag('<div class="tour-form">' +
      '<div class="field"><label>Title</label><input id="f_title" value="' + esc(t.title) + '"/><span class="field-err"></span></div>' +
      '<div class="form-row"><div class="field"><label>Date</label><input id="f_date" type="date" value="' + esc(t.date) + '"/></div>' +
        '<div class="field"><label>Time</label><input id="f_time" type="time" value="' + esc(t.time) + '"/></div></div>' +
      '<div class="form-row"><div class="field"><label>Type</label><select id="f_type">' + ['Solo', 'Duo', 'Squad'].map(function (x) { return '<option' + (t.type === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Map</label><input id="f_map" value="' + esc(t.map || '') + '"/></div></div>' +
      '<div class="form-row"><div class="field"><label>Entry (coins)</label><input id="f_fee" type="number" min="0" value="' + t.entryFee + '"/></div>' +
        '<div class="field"><label>Per Kill</label><input id="f_pk" type="number" min="0" value="' + (t.perKill || 0) + '"/></div>' +
        '<div class="field"><label>Slots</label><input id="f_max" type="number" min="2" value="' + t.maxTeams + '"/></div></div>' +
      '<div class="form-row"><div class="field"><label>Pool mode</label><select id="f_pmode">' +
          '<option value="dynamic"' + (t.poolMode !== 'fixed' ? ' selected' : '') + '>Dynamic (80% of entries)</option>' +
          '<option value="fixed"' + (t.poolMode === 'fixed' ? ' selected' : '') + '>Guaranteed fixed</option></select></div>' +
        '<div class="field"><label>Fixed pool</label><input id="f_gpool" type="number" min="0" value="' + (t.guaranteedPool || 0) + '"/></div></div>' +
      '<div class="form-row"><div class="field"><label>Commission % (blank=global ' + (s.commissionPercent || 20) + '%)</label><input id="f_comm" type="number" min="0" max="90" value="' + (typeof t.commissionOverride === 'number' ? t.commissionOverride : '') + '"/></div>' +
        '<div class="field"><label>Status</label><select id="f_status">' + ['upcoming', 'live', 'completed'].map(function (x) { return '<option' + (t.status === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="field"><label>Rules</label><textarea id="f_rules" rows="3">' + esc(t.rules || '') + '</textarea></div></div>');
    UI.openModal({ title: id ? 'Edit Contest' : 'New Contest', node: f, size: 'lg',
      actions: [ { label: 'Cancel', kind: 'ghost' }, { label: id ? 'Save' : 'Create', kind: 'primary', onClick: function () {
        var title = f.querySelector('#f_title').value.trim(); if (title.length < 3) { UI.fieldError(f.querySelector('#f_title'), 'Title too short.'); return true; }
        var comm = f.querySelector('#f_comm').value;
        var data = { id: id || Store.uid('t'), title: title, date: f.querySelector('#f_date').value, time: f.querySelector('#f_time').value,
          type: f.querySelector('#f_type').value, map: f.querySelector('#f_map').value.trim(),
          entryFee: Math.max(0, Number(f.querySelector('#f_fee').value) || 0), perKill: Math.max(0, Number(f.querySelector('#f_pk').value) || 0),
          maxTeams: Math.max(2, Number(f.querySelector('#f_max').value) || 2), poolMode: f.querySelector('#f_pmode').value,
          guaranteedPool: Math.max(0, Number(f.querySelector('#f_gpool').value) || 0),
          commissionOverride: comm === '' ? undefined : Math.max(0, Math.min(90, Number(comm) || 0)),
          status: f.querySelector('#f_status').value, rules: f.querySelector('#f_rules').value.trim(),
          roomId: t.roomId, roomPass: t.roomPass, createdAt: (id && t.createdAt) || new Date().toISOString() };
        Store.upsertTournament(data); UI.closeModal(); UI.toast(id ? 'Saved.' : 'Contest created!', 'success'); renderTours(body);
      } } ] });
  }

  function roomForm(id, body) {
    var t = Store.tournamentById(id);
    var f = frag('<div class="tour-form"><p class="muted small">Players who joined see these ~before start.</p>' +
      '<div class="field"><label>Room ID</label><input id="rmId" value="' + esc(t.roomId || '') + '" placeholder="e.g. 123456"/></div>' +
      '<div class="field"><label>Room Password</label><input id="rmPw" value="' + esc(t.roomPass || '') + '" placeholder="e.g. ff123"/></div></div>');
    UI.openModal({ title: '🎮 Match Room — ' + esc(t.title), node: f,
      actions: [ { label: 'Cancel', kind: 'ghost' }, { label: 'Publish', kind: 'primary', onClick: function () {
        t.roomId = f.querySelector('#rmId').value.trim(); t.roomPass = f.querySelector('#rmPw').value.trim(); Store.upsertTournament(t);
        UI.closeModal(); UI.toast('Room details published.', 'success'); renderTours(body);
      } } ] });
  }

  /* ---- Results (declare + auto payout) ---- */
  function renderResults(body) {
    var subs = Store.matches().slice().sort(function (a, b) { return (a.verified === b.verified) ? 0 : a.verified ? 1 : -1; });
    body.innerHTML = '<div class="admin-bar"><button class="btn btn-primary btn-sm" id="declBtn">🏆 Declare Winners</button></div>';
    if (!subs.length) { body.innerHTML += '<div class="empty"><span class="empty-ic">📸</span><p class="muted">No result submissions. Use “Declare Winners”.</p></div>'; }
    else {
      body.innerHTML += '<div class="admin-list">' + subs.map(function (m) {
        var t = Store.tournamentById(m.tournamentId);
        var prize = t ? (Store.rankPrize(t, m.rank) + (m.kills || 0) * (t.perKill || 0)) : 0;
        return '<div class="arow">' + (m.screenshot ? '<img class="rthumb" src="' + m.screenshot + '" data-shot="' + m.id + '"/>' : '') +
          '<div class="arow-main"><strong>' + esc(m.inGameName || 'Player') + '</strong> — ' + esc(t ? t.title : '?') +
          '<div class="muted small">Rank #' + m.rank + ' • ' + (m.kills || 0) + ' kills • pays ' + coins(prize) + '</div></div>' +
          '<div class="arow-actions">' + (m.verified ? '<span class="pill pill-live">Paid</span>' :
            '<button class="btn btn-danger btn-sm" data-rej="' + m.id + '">✕</button><button class="btn btn-primary btn-sm" data-ver="' + m.id + '">Pay</button>') + '</div></div>';
      }).join('') + '</div>';
    }
    body.querySelector('#declBtn').addEventListener('click', function () { declareForm(body); });
    body.querySelectorAll('[data-shot]').forEach(function (img) { img.addEventListener('click', function () { UI.openModal({ title: 'Screenshot', bodyHTML: '<img src="' + img.src + '" style="width:100%;border-radius:12px"/>' }); }); });
    body.querySelectorAll('[data-ver]').forEach(function (b) { b.addEventListener('click', function () { payResult(b.getAttribute('data-ver'), body); }); });
    body.querySelectorAll('[data-rej]').forEach(function (b) { b.addEventListener('click', function () {
      UI.confirm({ title: 'Reject result?', danger: true, confirmLabel: 'Reject' }).then(function (ok) { if (!ok) return;
        Store.saveMatches(Store.matches().filter(function (m) { return m.id !== b.getAttribute('data-rej'); })); UI.toast('Rejected.', 'info'); renderResults(body); }); }); });
  }

  function declareForm(body) {
    var open = Store.tournaments();
    var f = frag('<div class="tour-form">' +
      '<div class="field"><label>Contest</label><select id="d_t">' + open.map(function (t) { return '<option value="' + t.id + '">' + esc(t.title) + '</option>'; }).join('') + '</select></div>' +
      '<div id="d_rank"></div></div>');
    function fillRanks() {
      var t = Store.tournamentById(f.querySelector('#d_t').value);
      var regs = Store.regsFor(t.id);
      var opts = '<option value="">— player —</option>' + regs.map(function (r) { return '<option value="' + r.userId + '">' + esc(r.inGameName || r.teamName) + ' (slot ' + r.slotNo + ')</option>'; }).join('');
      f.querySelector('#d_rank').innerHTML = ['🥇 1st', '🥈 2nd', '🥉 3rd'].map(function (lbl, i) {
        return '<div class="form-row"><div class="field"><label>' + lbl + '</label><select class="d_win" data-rank="' + (i + 1) + '">' + opts + '</select></div>' +
          '<div class="field"><label>Kills</label><input class="d_k" type="number" min="0" value="0"/></div></div>';
      }).join('');
    }
    f.querySelector('#d_t').addEventListener('change', fillRanks); fillRanks();
    UI.openModal({ title: '🏆 Declare Winners', node: f, size: 'lg',
      actions: [ { label: 'Cancel', kind: 'ghost' }, { label: 'Pay Out', kind: 'primary', onClick: function () {
        var t = Store.tournamentById(f.querySelector('#d_t').value);
        var wins = f.querySelectorAll('.d_win'), ks = f.querySelectorAll('.d_k'); var any = false;
        wins.forEach(function (sel, idx) {
          var uidv = sel.value; if (!uidv) return; any = true;
          var rank = Number(sel.getAttribute('data-rank')), kills = Number(ks[idx].value) || 0;
          applyResult(t, uidv, rank, kills, null, true);
        });
        if (!any) { UI.toast('Pick at least one winner.', 'warn'); return true; }
        t.status = 'completed'; Store.upsertTournament(t);
        UI.closeModal(); UI.toast('Winners paid! 🪙', 'success'); renderResults(body); if (window.App) App.refreshChrome();
      } } ] });
  }

  function payResult(mid, body) {
    var matches = Store.matches(); var m = matches.find(function (x) { return x.id === mid; }); if (!m || m.verified) return;
    var t = Store.tournamentById(m.tournamentId);
    var prize = Store.rankPrize(t, m.rank) + (m.kills || 0) * (t.perKill || 0);
    UI.confirm({ title: 'Verify & pay?', message: 'Credit ' + UI.num(prize) + ' coins to ' + (m.inGameName || 'player') + '.', confirmLabel: 'Pay ' + UI.num(prize) }).then(function (ok) {
      if (!ok) return;
      m.verified = true; m.verifiedAt = new Date().toISOString(); Store.saveMatches(matches);
      applyResult(t, m.winnerUserId, m.rank, m.kills || 0, prize, false);
      UI.toast(prize > 0 ? prize + ' coins paid! 🪙' : 'Verified.', 'success'); renderResults(body); if (window.App) App.refreshChrome();
    });
  }

  /* Credit prize + update player stats. */
  function applyResult(t, userId, rank, kills, prizeOverride, createMatch) {
    var prize = (typeof prizeOverride === 'number') ? prizeOverride : (Store.rankPrize(t, rank) + kills * (t.perKill || 0));
    var pl = Store.userById(userId); if (!pl) return;
    if (prize > 0) { Store.credit(userId, prize, 'Prize: ' + t.title + ' (#' + rank + ')', { kind: 'prize', tid: t.id, rank: rank });
      pl = Store.userById(userId); pl.totalEarnings = Math.floor(pl.totalEarnings + prize); }
    pl.matchesPlayed = (pl.matchesPlayed || 0) + 1; pl.kills = (pl.kills || 0) + kills; pl.deaths = (pl.deaths || 0) + 1;
    if (rank === 1) pl.tournamentsWon = (pl.tournamentsWon || 0) + 1;
    Store.upsertUser(pl);
    if (createMatch) { var reg = Store.regsFor(t.id).find(function (r) { return r.userId === userId; });
      var mm = Store.matches(); mm.push({ id: Store.uid('m'), tournamentId: t.id, rank: rank, kills: kills, winnerUserId: userId,
        inGameName: reg ? reg.inGameName : pl.username, screenshot: null, verified: true, createdAt: new Date().toISOString() }); Store.saveMatches(mm); }
  }

  /* ---- Withdrawals ---- */
  function renderWithdrawals(body) {
    var wds = Store.transactions().filter(function (t) { return t.meta && t.meta.kind === 'withdrawal'; });
    if (!wds.length) { body.innerHTML = '<div class="empty"><span class="empty-ic">💸</span><p class="muted">No withdrawal requests.</p></div>'; return; }
    body.innerHTML = '<div class="admin-list">' + wds.map(function (w) {
      var u = Store.userById(w.userId);
      return '<div class="arow"><div class="arow-main"><strong>' + coins(w.amount) + '</strong> → ' + esc(w.meta.upi) +
        '<div class="muted small">' + esc(u ? u.username : 'user') + ' • ' + UI.fmtDateTime(w.date) + '</div></div>' +
        '<div class="arow-actions">' + (w.status === 'pending' ? '<button class="btn btn-danger btn-sm" data-wr="' + w.id + '">Reject</button><button class="btn btn-primary btn-sm" data-wa="' + w.id + '">Approve</button>' :
          '<span class="pill pill-' + (w.status === 'success' ? 'live' : 'done') + '">' + w.status + '</span>') + '</div></div>';
    }).join('') + '</div>';
    body.querySelectorAll('[data-wa]').forEach(function (b) { b.addEventListener('click', function () { resolveWd(b.getAttribute('data-wa'), true, body); }); });
    body.querySelectorAll('[data-wr]').forEach(function (b) { b.addEventListener('click', function () { resolveWd(b.getAttribute('data-wr'), false, body); }); });
  }
  function resolveWd(id, approve, body) {
    UI.confirm({ title: approve ? 'Approve payout?' : 'Reject & refund?', danger: !approve, confirmLabel: approve ? 'Approve' : 'Reject' }).then(function (ok) {
      if (!ok) return; var txns = Store.transactions(); var tx = txns.find(function (x) { return x.id === id; }); if (!tx || tx.status !== 'pending') return;
      if (approve) { tx.status = 'success'; Store.saveTransactions(txns); UI.toast('Payout approved.', 'success'); }
      else { tx.status = 'failed'; Store.saveTransactions(txns); Store.credit(tx.userId, tx.amount, 'Refund: withdrawal rejected', { kind: 'refund' }); UI.toast('Rejected & refunded.', 'info'); }
      renderWithdrawals(body);
    });
  }

  /* ---- Users ---- */
  function renderUsers(body) {
    body.innerHTML = '<div class="admin-list">' + Store.users().map(function (u) {
      return '<div class="arow"><span class="lb-av">' + esc(u.username.slice(0, 1).toUpperCase()) + '</span>' +
        '<div class="arow-main"><strong>' + esc(u.username) + '</strong> ' + (u.role === 'admin' ? '<span class="pill pill-live">admin</span>' : '') +
        '<div class="muted small">📱 ' + esc(u.mobile) + ' • UID ' + esc(u.freeFireUID) + ' • bal ' + coins(u.balance) + ' • 🏆 ' + u.tournamentsWon + '</div></div>' +
        '<div class="arow-actions"><button class="btn btn-ghost btn-sm" data-adj="' + u.id + '">± Coins</button></div></div>';
    }).join('') + '</div>';
    body.querySelectorAll('[data-adj]').forEach(function (b) { b.addEventListener('click', function () { adjust(b.getAttribute('data-adj'), body); }); });
  }
  function adjust(uid, body) {
    var u = Store.userById(uid);
    var f = frag('<div class="money-form"><div class="reg-bal">' + esc(u.username) + ' — ' + coins(u.balance) + '</div>' +
      '<div class="field"><label>Coins (negative to deduct)</label><input id="aj" type="number" placeholder="e.g. 100 or -50"/><span class="field-err"></span></div>' +
      '<div class="field"><label>Note</label><input id="ajn" value="Admin adjustment"/></div></div>');
    UI.openModal({ title: 'Adjust Coins', node: f, actions: [ { label: 'Cancel', kind: 'ghost' }, { label: 'Apply', kind: 'primary', onClick: function () {
      var amt = Number(f.querySelector('#aj').value); if (!amt) { UI.fieldError(f.querySelector('#aj'), 'Non-zero amount.'); return true; }
      var note = f.querySelector('#ajn').value.trim() || 'Admin adjustment';
      if (amt > 0) Store.credit(uid, amt, note, { kind: 'admin' });
      else { var user = Store.userById(uid); if (user.balance + amt < 0) { UI.fieldError(f.querySelector('#aj'), 'Would go negative.'); return true; } Store.debit(uid, -amt, note, { kind: 'admin' }); }
      UI.closeModal(); UI.toast('Balance adjusted.', 'success'); renderUsers(body); if (window.App) App.refreshChrome();
    } } ] });
  }

  /* ---- Settings ---- */
  function renderSettings(body) {
    var s = Store.settings();
    body.innerHTML = '<div class="tour-form settings-form">' +
      '<div class="form-row"><div class="field"><label>Platform commission %</label><input id="s_comm" type="number" min="0" max="90" value="' + (s.commissionPercent || 20) + '"/></div>' +
        '<div class="field"><label>₹ per Coin</label><input id="s_rate" type="number" min="0.01" step="0.01" value="' + (s.coinPerRupee || 1) + '"/></div></div>' +
      '<div class="form-row"><div class="field"><label>1st %</label><input id="s_p1" type="number" value="' + ((s.split && s.split.first) || 50) + '"/></div>' +
        '<div class="field"><label>2nd %</label><input id="s_p2" type="number" value="' + ((s.split && s.split.second) || 30) + '"/></div>' +
        '<div class="field"><label>3rd %</label><input id="s_p3" type="number" value="' + ((s.split && s.split.third) || 20) + '"/></div></div>' +
      '<div class="form-row"><div class="field"><label>Min add (₹)</label><input id="s_mina" type="number" value="' + (s.minAdd || 10) + '"/></div>' +
        '<div class="field"><label>Min withdraw (coins)</label><input id="s_minw" type="number" value="' + (s.minWithdraw || 50) + '"/></div></div>' +
      '<div class="form-row"><div class="field"><label>Support mobile</label><input id="s_sup" value="' + esc(s.supportMobile || '') + '"/></div>' +
        '<div class="field"><label>Signup bonus (coins)</label><input id="s_bonus" type="number" value="' + (s.signupBonus || 0) + '"/></div></div>' +
      '<div class="form-row"><div class="field"><label>Admin mobile</label><input id="s_amob" value="' + esc(s.adminMobile || '') + '"/></div>' +
        '<div class="field"><label>Admin password</label><input id="s_apw" value="' + esc(s.adminPassword || '') + '"/></div></div>' +
      '<button class="btn btn-primary btn-block" id="saveS">💾 Save Settings</button>' +
      '<button class="btn btn-danger btn-block" id="resetAll" style="margin-top:10px">⚠️ Reset ALL data (demo)</button>' +
    '</div>';
    body.querySelector('#saveS').addEventListener('click', function () {
      var p1 = Number(body.querySelector('#s_p1').value) || 0, p2 = Number(body.querySelector('#s_p2').value) || 0, p3 = Number(body.querySelector('#s_p3').value) || 0;
      if (p1 + p2 + p3 > 100) { UI.toast('Prize split can’t exceed 100%.', 'warn'); return; }
      var ns = Object.assign({}, s, {
        commissionPercent: Math.max(0, Math.min(90, Number(body.querySelector('#s_comm').value) || 0)),
        coinPerRupee: Math.max(0.01, Number(body.querySelector('#s_rate').value) || 1),
        split: { first: p1, second: p2, third: p3 },
        minAdd: Math.max(1, Number(body.querySelector('#s_mina').value) || 10),
        minWithdraw: Math.max(1, Number(body.querySelector('#s_minw').value) || 50),
        supportMobile: body.querySelector('#s_sup').value.trim(),
        signupBonus: Math.max(0, Number(body.querySelector('#s_bonus').value) || 0),
        adminMobile: body.querySelector('#s_amob').value.trim(),
        adminPassword: body.querySelector('#s_apw').value.trim() || s.adminPassword,
      });
      Store.saveSettings(ns); Store.ensureAdmin(); UI.toast('Settings saved.', 'success'); if (window.App) App.refreshChrome();
    });
    body.querySelector('#resetAll').addEventListener('click', function () {
      UI.confirm({ title: 'Reset everything?', message: 'Wipes all users, contests, wallets. Cannot be undone.', danger: true, confirmLabel: 'Reset' }).then(function (ok) {
        if (!ok) return; Store.resetAll(); sessionStorage.clear(); UI.toast('All data reset.', 'info'); location.hash = '#/'; location.reload();
      });
    });
  }

  window.Admin = { panel: panel };
})();
