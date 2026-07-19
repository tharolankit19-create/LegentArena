/* =========================================================================
 * LegentArena — Screens (mobile-first). Every money number is computed from
 * real records via Store. Heavy FOMO, simple to understand.
 * ======================================================================= */
(function () {
  'use strict';

  var esc = UI.esc, coins = UI.coins, rupees = UI.rupees, num = UI.num;

  function frag(html) { var d = document.createElement('div'); d.innerHTML = html; return d; }
  function typeChip(t) { return '<span class="chip chip-' + t.toLowerCase() + '">' + esc(t) + '</span>'; }
  function statusPill(s) {
    if (s === 'live') return '<span class="pill pill-live"><span class="dot"></span>LIVE</span>';
    if (s === 'completed') return '<span class="pill pill-done">RESULT</span>';
    return '';
  }
  function iso(t) { return (t.date || '') + 'T' + (t.time || '00:00') + ':00'; }

  /* ---- Slot bar with FOMO ---- */
  function slotBar(t) {
    var joined = Store.joinedCount(t.id), left = Math.max(0, t.maxTeams - joined);
    var pct = Math.min(100, Math.round((joined / t.maxTeams) * 100));
    var hot = left > 0 && left <= Math.max(3, Math.ceil(t.maxTeams * 0.25));
    var label = left === 0 ? '<span class="slot-full">🚫 Slots Full</span>'
      : hot ? '<span class="slot-hot">🔥 Only ' + left + ' left!</span>'
      : '<span class="slot-left">' + left + ' spots left</span>';
    return '<div class="slots">' +
      '<div class="slots-top"><span class="slots-count">' + joined + '/' + t.maxTeams + ' joined</span>' + label + '</div>' +
      '<div class="slots-track"><div class="slots-fill' + (hot || left === 0 ? ' hot' : '') + '" style="width:' + pct + '%"></div></div>' +
    '</div>';
  }

  /* ---- Contest card ---- */
  function contestCard(t) {
    var live = Store.livePool(t), full = Store.fullPool(t);
    var left = Store.slotsLeft(t);
    var joinable = t.status !== 'completed' && left > 0;
    var perKill = t.perKill > 0 ? '<span class="mini-tag">💀 ' + coins(t.perKill) + '/kill</span>' : '';
    return '' +
    '<article class="ccard" data-open="' + t.id + '">' +
      '<div class="ccard-top">' +
        '<div class="ccard-badges">' + typeChip(t.type) + statusPill(t.status) + '</div>' +
        (t.status === 'upcoming' ? '<span class="ccard-time" data-deadline="' + iso(t) + '">⏱ …</span>' : '') +
      '</div>' +
      '<h3 class="ccard-title">' + esc(t.title) + '</h3>' +
      '<div class="ccard-sub">📅 ' + UI.fmtDate(t.date) + ' • 🕘 ' + esc(t.time) + ' • 🗺️ ' + esc(t.map || '—') + '</div>' +
      '<div class="ccard-pool">' +
        '<div class="pool-main"><span class="pool-label">PRIZE POOL</span><span class="pool-val">' + coins(live) + '</span>' +
          (t.poolMode !== 'fixed' && full > live ? '<span class="pool-up">grows to ' + coins(full) + ' when full</span>' : '') + '</div>' +
        '<div class="pool-side">' + perKill + '<span class="mini-tag">🎟️ Entry ' + (t.entryFee ? coins(t.entryFee) : 'FREE') + '</span></div>' +
      '</div>' +
      slotBar(t) +
      '<div class="ccard-actions">' +
        '<button class="btn btn-ghost btn-sm" data-view="' + t.id + '">Details</button>' +
        '<button class="btn btn-primary btn-sm ' + (joinable ? 'glow' : '') + '" data-join="' + t.id + '"' + (joinable ? '' : ' disabled') + '>' +
          (t.status === 'completed' ? 'View Result' : left === 0 ? 'Full' : 'JOIN NOW') + '</button>' +
      '</div>' +
    '</article>';
  }

  function wireCards(root) {
    root.querySelectorAll('[data-view]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); location.hash = '#/contest/' + b.getAttribute('data-view'); }); });
    root.querySelectorAll('[data-join]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation();
      var t = Store.tournamentById(b.getAttribute('data-join'));
      if (t && t.status === 'completed') location.hash = '#/contest/' + t.id; else Pages.startRegistration(b.getAttribute('data-join')); }); });
    root.querySelectorAll('[data-open]').forEach(function (c) { c.addEventListener('click', function (e) { if (e.target.closest('button')) return; location.hash = '#/contest/' + c.getAttribute('data-open'); }); });
  }

  /* ---- FOMO strip: real all-time payout + open contests ---- */
  function fomoStrip() {
    var paid = Store.transactions().filter(function (x) { return x.meta && x.meta.kind === 'prize'; })
      .reduce(function (s, x) { return s + x.amount; }, 0);
    var open = Store.tournaments().filter(function (t) { return t.status !== 'completed' && Store.slotsLeft(t) > 0; }).length;
    var live = Store.tournaments().filter(function (t) { return t.status === 'live'; }).length;
    return '<div class="fomo">' +
      '<div class="fomo-item"><span class="fomo-val">' + coins(paid) + '</span><span class="fomo-label">paid to players</span></div>' +
      '<div class="fomo-item"><span class="fomo-val">' + open + '</span><span class="fomo-label">open contests</span></div>' +
      '<div class="fomo-item"><span class="fomo-val">' + (live || open) + '</span><span class="fomo-label">' + (live ? 'live now' : 'filling now') + '</span></div>' +
    '</div>';
  }

  /* =====================================================================
   * HOME
   * ================================================================== */
  function home() {
    var user = Auth.current();
    var tours = Store.tournaments().slice().sort(function (a, b) {
      var order = { live: 0, upcoming: 1, completed: 2 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return (a.date + a.time).localeCompare(b.date + b.time);
    });

    var node = UI.screen({
      title: 'LegentArena', back: false,
      rightHTML: user ? '<a href="#/wallet" class="bal-chip">' + coins(user.balance) + '</a>' : '<a href="#/login" class="bal-chip login">Login</a>',
    });
    var body = node._body;

    var state = { type: 'all' };
    body.innerHTML = '' +
      '<div class="hero-banner">' +
        '<div class="hero-flame">🔥</div>' +
        '<div class="hero-copy"><h2>Play Free Fire.<br>Win Real Cash.</h2>' +
          '<p>Join daily Solo, Duo & Squad contests. Winnings hit your wallet instantly.</p></div>' +
      '</div>' +
      fomoStrip() +
      (user ? '' : '<a href="#/register" class="cta-join glow">🎮 Create Free Account & Play →</a>') +
      '<div class="filter-row" id="typeFilter">' +
        '<button class="fbtn active" data-type="all">All</button>' +
        '<button class="fbtn" data-type="Solo">Solo</button>' +
        '<button class="fbtn" data-type="Duo">Duo</button>' +
        '<button class="fbtn" data-type="Squad">Squad</button>' +
        '<div class="search-mini"><input id="homeSearch" type="search" placeholder="🔍 Search"/></div>' +
      '</div>' +
      '<div class="clist" id="clist"></div>';

    var listEl = body.querySelector('#clist');
    var q = '';
    function apply() {
      var list = tours.filter(function (t) {
        var mt = state.type === 'all' || t.type === state.type;
        var mq = !q || (t.title + ' ' + (t.map || '')).toLowerCase().indexOf(q.toLowerCase()) !== -1;
        return mt && mq;
      });
      listEl.innerHTML = list.length ? list.map(contestCard).join('')
        : '<div class="empty"><span class="empty-ic">🎮</span><p>No contests here yet. Check back soon!</p></div>';
      wireCards(listEl);
      if (window.App) App.tickCountdowns();
    }
    body.querySelector('#typeFilter').addEventListener('click', function (e) {
      var b = e.target.closest('[data-type]'); if (!b) return;
      state.type = b.getAttribute('data-type');
      body.querySelectorAll('#typeFilter .fbtn').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active'); apply();
    });
    body.querySelector('#homeSearch').addEventListener('input', function (e) { q = e.target.value; apply(); });
    apply();
    return node;
  }

  /* =====================================================================
   * CONTEST DETAIL
   * ================================================================== */
  function contestDetail(id) {
    var t = Store.tournamentById(id);
    if (!t) return UI.screen({ title: 'Contest', html: emptyBox('Contest not found.', '#/', 'Go Home') });

    var user = Auth.current();
    var live = Store.livePool(t), full = Store.fullPool(t);
    var left = Store.slotsLeft(t);
    var myReg = user && Store.regsFor(t.id).find(function (r) { return r.userId === user.id; });
    var joinable = t.status !== 'completed' && left > 0 && !myReg;
    var split = Store.settings().split || { first: 50, second: 30, third: 20 };
    var results = Store.matches().filter(function (m) { return m.tournamentId === t.id && m.verified; }).sort(function (a, b) { return a.rank - b.rank; });

    var node = UI.screen({ title: t.type + ' Contest', backTo: '#/' });
    var body = node._body;

    body.innerHTML = '' +
      '<div class="detail-hero">' +
        '<div class="ccard-badges">' + typeChip(t.type) + statusPill(t.status) +
          (t.status === 'upcoming' ? '<span class="ccard-time" data-deadline="' + iso(t) + '">⏱ …</span>' : '') + '</div>' +
        '<h2>' + esc(t.title) + '</h2>' +
        '<div class="detail-sub">📅 ' + UI.fmtDate(t.date) + ' • 🕘 ' + esc(t.time) + ' • 🗺️ ' + esc(t.map || '—') + '</div>' +
      '</div>' +

      '<div class="pool-hero">' +
        '<span class="pool-hero-label">TOTAL PRIZE POOL</span>' +
        '<span class="pool-hero-val">' + coins(live) + '</span>' +
        (t.poolMode !== 'fixed' && full > live ? '<span class="pool-hero-up">Grows up to ' + coins(full) + ' as slots fill 🔥</span>' : '') +
      '</div>' +

      '<div class="info-grid">' +
        infoTile('🎟️', t.entryFee ? coins(t.entryFee) : 'FREE', 'Entry') +
        infoTile('👥', t.maxTeams, 'Total Slots') +
        infoTile('💀', t.perKill > 0 ? coins(t.perKill) : '—', 'Per Kill') +
        infoTile('🏆', num(Store.joinedCount(t.id)), 'Joined') +
      '</div>' +

      slotBarBlock(t) +

      '<div class="card-block"><h4 class="blk-title">💰 Winnings Breakdown</h4>' +
        '<div class="prize-rows">' +
          prizeRow('🥇', '1st Rank', Store.rankPrize(t, 1), split.first) +
          prizeRow('🥈', '2nd Rank', Store.rankPrize(t, 2), split.second) +
          prizeRow('🥉', '3rd Rank', Store.rankPrize(t, 3), split.third) +
          (t.perKill > 0 ? '<div class="prize-row"><span class="pr-ic">💀</span><span class="pr-name">Per Kill Bonus</span><span class="pr-val">' + coins(t.perKill) + '</span></div>' : '') +
        '</div>' +
        '<p class="pool-note muted">Prize pool = total entries − ' + Store.commissionOf(t) + '% platform fee. It rises live as players join.</p>' +
      '</div>' +

      (myReg ? roomBlock(t, myReg) : '') +

      (results.length ? '<div class="card-block"><h4 class="blk-title">🏆 Results</h4>' + results.map(function (m) {
        return '<div class="prize-row"><span class="pr-ic">' + (m.rank === 1 ? '🥇' : m.rank === 2 ? '🥈' : m.rank === 3 ? '🥉' : '🎯') + '</span>' +
          '<span class="pr-name">' + esc(m.inGameName || 'Player') + ' <span class="muted small">• ' + (m.kills || 0) + ' kills</span></span>' +
          '<span class="pr-val">' + coins(Store.rankPrize(t, m.rank) + (m.kills || 0) * (t.perKill || 0)) + '</span></div>';
      }).join('') + '</div>' : '') +

      '<div class="card-block"><h4 class="blk-title">📋 Rules</h4><p class="rules">' + esc(t.rules || 'Standard rules apply.') + '</p></div>' +
      '<div style="height:80px"></div>';

    // sticky bottom bar
    var bar = frag('<div class="action-bar">' +
      '<button class="btn btn-ghost" id="viewJoinings">👥 Joinings (' + Store.joinedCount(t.id) + ')</button>' +
      (myReg
        ? '<button class="btn btn-primary" id="myEntry">✅ Joined • Slot ' + myReg.slotNo + '</button>'
        : '<button class="btn btn-primary ' + (joinable ? 'glow' : '') + '" id="joinBtn"' + (joinable ? '' : ' disabled') + '>' +
            (t.status === 'completed' ? 'Ended' : left === 0 ? 'Slots Full' : 'JOIN • ' + (t.entryFee ? rupees(t.entryFee) : 'FREE')) + '</button>') +
    '</div>').firstChild;
    node.appendChild(bar);

    bar.querySelector('#viewJoinings').addEventListener('click', function () { location.hash = '#/joinings/' + t.id; });
    var jb = bar.querySelector('#joinBtn'); if (jb) jb.addEventListener('click', function () { Pages.startRegistration(t.id); });
    var me = bar.querySelector('#myEntry'); if (me) me.addEventListener('click', function () { location.hash = '#/joinings/' + t.id; });

    if (window.App) App.tickCountdowns();
    return node;
  }

  function infoTile(ic, val, label) { return '<div class="itile"><span class="itile-ic">' + ic + '</span><span class="itile-val">' + val + '</span><span class="itile-label">' + label + '</span></div>'; }
  function prizeRow(ic, name, val, pct) { return '<div class="prize-row"><span class="pr-ic">' + ic + '</span><span class="pr-name">' + name + ' <span class="muted small">' + pct + '%</span></span><span class="pr-val">' + coins(val) + '</span></div>'; }
  function slotBarBlock(t) { return '<div class="card-block">' + slotBar(t) + '</div>'; }
  function roomBlock(t, reg) {
    var hasRoom = t.roomId || t.roomPass;
    return '<div class="card-block room-block">' +
      '<h4 class="blk-title">🎮 Match Room</h4>' +
      '<div class="room-your">Your slot: <strong>#' + reg.slotNo + '</strong> • IGN: <strong>' + esc(reg.inGameName) + '</strong></div>' +
      (hasRoom
        ? '<div class="room-creds"><div class="room-cred"><span>Room ID</span><strong>' + esc(t.roomId || '—') + '</strong></div>' +
          '<div class="room-cred"><span>Password</span><strong>' + esc(t.roomPass || '—') + '</strong></div></div>'
        : '<p class="muted small">Room ID & password appear here ~10 min before start. Keep this page open. 🔔</p>') +
      (t.status !== 'completed' ? '<button class="btn btn-ghost btn-block btn-sm" id="submitResultBtn2" data-t="' + t.id + '">📸 Submit My Result</button>' : '') +
    '</div>';
  }

  /* =====================================================================
   * ALL JOININGS
   * ================================================================== */
  function joinings(id) {
    var t = Store.tournamentById(id);
    if (!t) return UI.screen({ title: 'Joinings', html: emptyBox('Contest not found.', '#/', 'Go Home') });
    var user = Auth.current();
    var regs = Store.regsFor(t.id).slice().sort(function (a, b) { return a.slotNo - b.slotNo; });

    var node = UI.screen({ title: 'All Joinings', backTo: '#/contest/' + t.id });
    node._body.innerHTML = '' +
      '<div class="join-head"><strong>' + esc(t.title) + '</strong><span class="muted small">' + regs.length + '/' + t.maxTeams + ' slots filled</span></div>' +
      '<div class="jtable">' +
        '<div class="jrow jhead"><span>Slot</span><span>Pos</span><span>In-Game Name</span><span>Game ID</span></div>' +
        (regs.length ? regs.map(function (r) {
          var mine = user && r.userId === user.id;
          return '<div class="jrow' + (mine ? ' jmine' : '') + '"><span>' + r.slotNo + '</span><span>' + esc(r.position || 'A') + '</span>' +
            '<span class="jname">' + esc(r.inGameName || r.teamName) + (mine ? ' <span class="you-tag">YOU</span>' : '') + '</span>' +
            '<span class="jid">' + esc(r.inGameId || '—') + '</span></div>';
        }).join('') : '<div class="empty"><p>No one has joined yet. Be the first! 🔥</p></div>') +
      '</div>' +
      '<div style="height:80px"></div>';

    var bar = frag('<div class="action-bar">' +
      (user && Store.isRegistered(user.id, t.id)
        ? '<button class="btn btn-primary" id="jResult">📸 Submit Result</button>'
        : '<button class="btn btn-primary glow" id="jJoin"' + (Store.slotsLeft(t) > 0 && t.status !== 'completed' ? '' : ' disabled') + '>JOIN NOW</button>') +
    '</div>').firstChild;
    node.appendChild(bar);
    var jj = bar.querySelector('#jJoin'); if (jj) jj.addEventListener('click', function () { Pages.startRegistration(t.id); });
    var jr = bar.querySelector('#jResult'); if (jr) jr.addEventListener('click', function () { Pages.submitResult(t.id); });
    return node;
  }

  /* =====================================================================
   * REGISTRATION
   * ================================================================== */
  function startRegistration(id) {
    if (!Auth.requireAuth()) return;
    var t = Store.tournamentById(id); if (!t) return;
    if (t.status === 'completed') { UI.toast('This contest has ended.', 'warn'); return; }
    var user = Store.userById(Auth.current().id);
    if (Store.isRegistered(user.id, t.id)) { UI.toast('You already joined this contest.', 'info'); location.hash = '#/joinings/' + t.id; return; }
    if (Store.slotsLeft(t) <= 0) { UI.toast('Slots are full.', 'warn'); return; }

    var needSquad = t.type !== 'Solo';
    var body = frag('' +
      '<div class="reg-flow">' +
        '<div class="reg-sum"><div class="reg-sum-title">' + esc(t.title) + '</div>' +
          '<div class="reg-sum-meta">' + esc(t.type) + ' • ' + UI.fmtDate(t.date) + ' ' + esc(t.time) + '</div>' +
          '<div class="reg-sum-fee"><span>Entry Fee</span><strong>' + (t.entryFee ? coins(t.entryFee) : 'FREE') + '</strong></div></div>' +
        '<div class="field"><label>In-Game Name (IGN)</label><input id="rIgn" maxlength="20" value="' + esc(user.username) + '"/><span class="field-err"></span></div>' +
        '<div class="field"><label>Free Fire UID</label><input id="rUid" inputmode="numeric" value="' + esc(user.freeFireUID || '') + '" placeholder="Your in-game ID"/><span class="field-err"></span></div>' +
        (needSquad ? '<div class="field"><label>Team Name</label><input id="rTeam" maxlength="20" value="' + esc(user.username) + ' Squad"/><span class="field-err"></span></div>' : '') +
        '<div class="reg-bal">Wallet: <strong>' + coins(user.balance) + '</strong>' +
          (t.entryFee > user.balance ? ' <span class="reg-low">• Low balance</span>' : '') + '</div>' +
        (t.entryFee > user.balance
          ? '<p class="reg-warn">You need ' + coins(t.entryFee - user.balance) + ' more. <a href="#/wallet" id="regAdd">Add Coins →</a></p>'
          : '<p class="muted small">' + coins(t.entryFee) + ' will be deducted from your wallet.</p>') +
      '</div>');

    var addLink = body.querySelector('#regAdd');
    UI.openModal({
      title: '🎟️ Join Contest', node: body,
      actions: [
        { label: 'Cancel', kind: 'ghost' },
        { label: t.entryFee ? 'Confirm & Pay ' + coins(t.entryFee) : 'Confirm (Free)', kind: 'primary', onClick: function () {
            var ign = body.querySelector('#rIgn'), uidI = body.querySelector('#rUid');
            var ignV = (ign.value || '').trim(), uidV = (uidI.value || '').trim();
            var team = needSquad ? (body.querySelector('#rTeam').value || '').trim() : ignV;
            var ok = true;
            if (ignV.length < 2) { UI.fieldError(ign, 'Enter your in-game name.'); ok = false; }
            if (!UI.Validate.ffuid(uidV)) { UI.fieldError(uidI, 'Enter a valid UID (6–12 digits).'); ok = false; }
            if (!ok) return true;
            if (t.entryFee > 0 && user.balance < t.entryFee) {
              UI.closeModal(); UI.toast('Add coins to join.', 'warn'); location.hash = '#/wallet'; return true;
            }
            confirmJoin(t, user, { ign: ignV, uid: uidV, team: team });
            return true;
          } },
      ],
    });
    if (addLink) addLink.addEventListener('click', UI.closeModal);
  }

  function confirmJoin(t, user, info) {
    user = Store.userById(user.id);
    function complete() {
      var slotNo = Store.nextSlotNo(t.id);
      var regs = Store.registrations();
      regs.push({ id: Store.uid('r'), userId: user.id, tournamentId: t.id, teamName: info.team,
        inGameName: info.ign, inGameId: info.uid, slotNo: slotNo, position: 'A',
        paymentStatus: 'paid', registeredAt: new Date().toISOString() });
      Store.saveRegistrations(regs);
      // persist IGN/UID to profile for next time
      user.freeFireUID = info.uid; Store.upsertUser(user);
      UI.closeModal();
      registrationSuccess(t, slotNo);
      if (window.App) App.refreshChrome();
    }
    if (t.entryFee > 0) {
      var res = Store.debit(user.id, t.entryFee, 'Entry: ' + t.title, { kind: 'entry', tid: t.id });
      if (!res) { UI.toast('Payment failed — low balance.', 'error'); return; }
    }
    complete();
  }

  function registrationSuccess(t, slotNo) {
    UI.openModal({
      title: '', node: frag('<div class="success">' +
        '<div class="success-check">🎉</div><h2>You\'re In!</h2>' +
        '<p class="muted">Joined <strong>' + esc(t.title) + '</strong></p>' +
        '<div class="success-slot">Your Slot<br><strong>#' + slotNo + '</strong></div>' +
        '<p class="muted small">Room ID & password will appear on the contest page before start. Get that Booyah! 🔥</p></div>'),
      actions: [ { label: 'View Joinings', kind: 'ghost', onClick: function () { location.hash = '#/joinings/' + t.id; } },
        { label: 'Done', kind: 'primary', onClick: function () { if (window.App) App.route(); } } ],
    });
  }

  /* =====================================================================
   * RESULT SUBMISSION
   * ================================================================== */
  function submitResult(tid) {
    if (!Auth.requireAuth()) return;
    var t = Store.tournamentById(tid), user = Auth.current();
    var reg = Store.regsFor(tid).find(function (r) { return r.userId === user.id; });
    var body = frag('' +
      '<div class="result-form">' +
        '<p class="muted small">Upload your result screenshot. Admin verifies & credits your winnings.</p>' +
        '<div class="field"><label>Your Rank</label><select id="rRank">' +
          '<option value="1">🥇 #1 Booyah</option><option value="2">🥈 #2</option><option value="3">🥉 #3</option><option value="0">Other</option></select></div>' +
        '<div class="field"><label>Kills</label><input id="rKills" type="number" min="0" max="60" value="0"/></div>' +
        '<div class="field"><label>Screenshot</label><input id="rShot" type="file" accept="image/*"/><span class="field-err"></span><div id="shotPrev" class="shot-prev"></div></div>' +
      '</div>');
    var shot = null;
    body.querySelector('#rShot').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      if (f.size > 3 * 1024 * 1024) { UI.toast('Max 3MB image.', 'warn'); e.target.value = ''; return; }
      var rd = new FileReader(); rd.onload = function () { shot = rd.result; body.querySelector('#shotPrev').innerHTML = '<img src="' + shot + '"/>'; }; rd.readAsDataURL(f);
    });
    UI.openModal({ title: '📸 Submit Result', node: body,
      actions: [ { label: 'Cancel', kind: 'ghost' },
        { label: 'Submit for Review', kind: 'primary', onClick: function () {
            var rank = Number(body.querySelector('#rRank').value), kills = Number(body.querySelector('#rKills').value) || 0;
            if (!shot) { UI.toast('Attach a screenshot.', 'warn'); return true; }
            var m = Store.matches();
            m.push({ id: Store.uid('m'), tournamentId: tid, rank: rank, kills: kills, winnerUserId: user.id,
              inGameName: reg ? reg.inGameName : user.username, screenshot: shot, verified: false, createdAt: new Date().toISOString() });
            Store.saveMatches(m);
            UI.closeModal(); UI.toast('Result submitted! Admin will review it.', 'success');
          } } ] });
  }

  /* =====================================================================
   * MY CONTESTS
   * ================================================================== */
  function myContests() {
    if (!Auth.requireAuth()) return UI.screen({ title: 'My Contests', back: false });
    var user = Auth.current();
    var regs = Store.registrations().filter(function (r) { return r.userId === user.id && r.paymentStatus === 'paid'; });
    var subs = Store.matches().filter(function (m) { return m.winnerUserId === user.id; });
    var node = UI.screen({ title: 'My Contests', back: false });
    var cards = regs.map(function (r) {
      var t = Store.tournamentById(r.tournamentId); if (!t) return '';
      var sub = subs.find(function (m) { return m.tournamentId === t.id; });
      var tag = sub ? (sub.verified ? '<span class="pill pill-live">WON ' + coins(Store.rankPrize(t, sub.rank) + (sub.kills || 0) * (t.perKill || 0)) + '</span>' : '<span class="pill pill-review">⏳ Review</span>') : '';
      return '<article class="ccard" data-open="' + t.id + '"><div class="ccard-top"><div class="ccard-badges">' + typeChip(t.type) + statusPill(t.status) + tag + '</div>' +
        (t.status === 'upcoming' ? '<span class="ccard-time" data-deadline="' + iso(t) + '">⏱ …</span>' : '') + '</div>' +
        '<h3 class="ccard-title">' + esc(t.title) + '</h3>' +
        '<div class="ccard-sub">Slot #' + r.slotNo + ' • IGN ' + esc(r.inGameName) + ' • 📅 ' + UI.fmtDate(t.date) + ' ' + esc(t.time) + '</div>' +
        '<div class="ccard-actions"><button class="btn btn-ghost btn-sm" data-view="' + t.id + '">Details</button>' +
          '<button class="btn btn-primary btn-sm" data-jn="' + t.id + '">Joinings</button></div></article>';
    }).join('');
    node._body.innerHTML = regs.length ? '<div class="clist">' + cards + '</div>'
      : emptyBox('You haven\'t joined any contest yet.', '#/', 'Browse Contests');
    node._body.querySelectorAll('[data-jn]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); location.hash = '#/joinings/' + b.getAttribute('data-jn'); }); });
    wireCards(node._body);
    if (window.App) App.tickCountdowns();
    return node;
  }

  /* =====================================================================
   * WALLET
   * ================================================================== */
  function wallet() {
    if (!Auth.requireAuth()) return UI.screen({ title: 'Wallet', back: false });
    var user = Auth.current();
    var txns = Store.transactions().filter(function (x) { return x.userId === user.id; });
    var node = UI.screen({ title: 'My Wallet', back: false });
    var rows = txns.length ? txns.map(function (x) {
      var up = x.type === 'credit';
      var st = x.status === 'pending' ? ' <span class="tx-pending">pending</span>' : x.status === 'failed' ? ' <span class="tx-failed">failed</span>' : '';
      return '<div class="txn"><div class="txn-ic ' + (up ? 'up' : 'down') + '">' + (up ? '↓' : '↑') + '</div>' +
        '<div class="txn-body"><div class="txn-desc">' + esc(x.description) + st + '</div><div class="txn-date muted">' + UI.fmtDateTime(x.date) + '</div></div>' +
        '<div class="txn-amt ' + (up ? 'up' : 'down') + '">' + (up ? '+' : '−') + num(x.amount) + '</div></div>';
    }).join('') : '<div class="empty"><p class="muted">No transactions yet.</p></div>';

    node._body.innerHTML = '' +
      '<div class="wallet-card">' +
        '<span class="wallet-label">Balance</span>' +
        '<div class="wallet-bal">' + coins(user.balance) + '</div>' +
        '<div class="wallet-note">1 Coin = ' + rupees(Store.settings().coinPerRupee || 1) + ' • withdrawable to UPI</div>' +
        '<div class="wallet-actions"><button class="btn btn-primary" id="addBtn">＋ Add Coins</button>' +
          '<button class="btn btn-ghost" id="wdBtn">↑ Withdraw</button></div>' +
      '</div>' +
      '<div class="wallet-mini"><div><span class="wm-val">' + coins(user.totalEarnings) + '</span><span class="wm-l">Total won</span></div>' +
        '<div><span class="wm-val">' + user.tournamentsWon + '</span><span class="wm-l">Wins</span></div>' +
        '<div><span class="wm-val">' + user.matchesPlayed + '</span><span class="wm-l">Played</span></div></div>' +
      '<h4 class="blk-title" style="margin-top:20px">Transaction History</h4><div class="txns">' + rows + '</div>';

    node._body.querySelector('#addBtn').addEventListener('click', addMoney);
    node._body.querySelector('#wdBtn').addEventListener('click', withdraw);
    return node;
  }

  function addMoney() {
    var user = Auth.current(); var s = Store.settings(); var rate = s.coinPerRupee || 1; var min = s.minAdd || 10;
    var body = frag('<div class="money-form">' +
      '<div class="amount-quick">' + [50, 100, 250, 500].map(function (a) { return '<button class="qbtn" data-amt="' + a + '">＋' + a + '</button>'; }).join('') + '</div>' +
      '<div class="field"><label>Enter amount (₹)</label><input id="amtIn" type="number" min="' + min + '" placeholder="min ₹' + min + '"/><span class="field-err"></span></div>' +
      '<div class="conv" id="conv">You get <strong>0 Coins</strong></div>' +
      '<p class="muted small">Pay via UPI/Card. Coins credit instantly (demo gateway).</p></div>');
    function upd() { var v = Number(body.querySelector('#amtIn').value) || 0; body.querySelector('#conv').innerHTML = 'You get <strong>' + num(Math.floor(v / rate)) + ' Coins</strong>'; }
    body.querySelectorAll('.qbtn').forEach(function (b) { b.addEventListener('click', function () { body.querySelector('#amtIn').value = b.getAttribute('data-amt'); upd(); }); });
    body.querySelector('#amtIn').addEventListener('input', upd);
    UI.openModal({ title: '＋ Add Coins', node: body,
      actions: [ { label: 'Cancel', kind: 'ghost' }, { label: 'Proceed to Pay', kind: 'primary', onClick: function () {
        var input = body.querySelector('#amtIn'); var rup = Number(input.value);
        if (!(rup >= min)) { UI.fieldError(input, 'Minimum ₹' + min + '.'); return true; }
        if (!UI.Validate.amount(rup)) { UI.fieldError(input, 'Enter a valid amount.'); return true; }
        UI.closeModal();
        Payments.Pay(rup, { description: 'Add Coins' }).then(function (r) {
          if (r.status === 'success') { var c = Math.floor(rup / rate); Store.credit(user.id, c, 'Added ' + c + ' coins (' + UI.rupees(rup) + ')', { kind: 'add' });
            UI.toast(c + ' coins added! 🪙', 'coin'); if (window.App) { App.refreshChrome(); App.route(); } }
          else if (r.status === 'failed') UI.toast(r.reason || 'Payment failed.', 'error'); else UI.toast('Payment cancelled.', 'info');
        });
        return true;
      } } ] });
  }

  function withdraw() {
    var user = Store.userById(Auth.current().id); var s = Store.settings(); var min = s.minWithdraw || 50;
    var body = frag('<div class="money-form">' +
      '<div class="reg-bal">Withdrawable: <strong>' + coins(user.balance) + '</strong></div>' +
      '<div class="field"><label>UPI ID</label><input id="upiIn" placeholder="yourname@okhdfc"/><span class="field-err"></span></div>' +
      '<div class="field"><label>Coins to withdraw</label><input id="wAmt" type="number" min="' + min + '" placeholder="min ' + min + '"/><span class="field-err"></span></div>' +
      '<p class="muted small">Withdrawals are reviewed by admin, then paid to your UPI within 24h.</p></div>');
    UI.openModal({ title: '↑ Withdraw to UPI', node: body,
      actions: [ { label: 'Cancel', kind: 'ghost' }, { label: 'Request Withdrawal', kind: 'primary', onClick: function () {
        var upi = body.querySelector('#upiIn'), amtI = body.querySelector('#wAmt'), amt = Number(amtI.value), ok = true;
        if (!UI.Validate.upi(upi.value)) { UI.fieldError(upi, 'Enter a valid UPI ID.'); ok = false; }
        if (!(amt >= min)) { UI.fieldError(amtI, 'Minimum ' + min + ' coins.'); ok = false; }
        else if (amt > user.balance) { UI.fieldError(amtI, 'More than your balance.'); ok = false; }
        if (!ok) return true;
        var u = Store.userById(user.id); u.balance = Math.floor(u.balance - amt); Store.upsertUser(u);
        Store.addTransaction({ id: Store.uid('tx'), userId: user.id, amount: amt, type: 'debit', status: 'pending',
          description: 'Withdraw to ' + upi.value, date: new Date().toISOString(), meta: { kind: 'withdrawal', upi: upi.value } });
        UI.closeModal(); UI.toast('Withdrawal requested. Awaiting approval.', 'success');
        if (window.App) { App.refreshChrome(); App.route(); }
        return true;
      } } ] });
  }

  /* =====================================================================
   * LEADERBOARD
   * ================================================================== */
  function leaderboard() {
    var period = 'weekly';
    var node = UI.screen({ title: 'Leaderboard', back: false });
    var body = node._body;
    body.innerHTML = '<div class="lb-tabs" id="lbTabs">' +
      '<button class="lbtab active" data-p="weekly">Weekly</button>' +
      '<button class="lbtab" data-p="monthly">Monthly</button>' +
      '<button class="lbtab" data-p="fulltime">Fulltime</button></div><div id="lbBody"></div>';

    function since(p) { var d = new Date(); if (p === 'weekly') d.setDate(d.getDate() - 7); else if (p === 'monthly') d.setMonth(d.getMonth() - 1); else return 0; return d.getTime(); }
    function kd(u) { return u.deaths ? (u.kills / u.deaths) : u.kills; }

    function render() {
      var players = Store.users().filter(function (u) { return u.role === 'user'; });
      var sinceMs = since(period);
      var ranked = players.map(function (u) {
        var win = period === 'fulltime' ? u.totalEarnings : Store.earningsSince(u.id, sinceMs);
        return { u: u, win: win };
      }).filter(function (r) { return period === 'fulltime' || r.win > 0; })
        .sort(function (a, b) { return b.win - a.win; });
      if (period === 'fulltime') ranked.sort(function (a, b) { return b.win - a.win; });

      var me = Auth.current();
      var top = ranked.slice(0, 3);
      var podium = ranked.length ? '<div class="podium">' + [top[1], top[0], top[2]].map(function (r, i) {
        var place = i === 0 ? 2 : i === 1 ? 1 : 3; if (!r) return '<div class="pod pod-' + place + ' pod-empty"></div>';
        return '<div class="pod pod-' + place + '"><div class="pod-medal">' + ({1:'🥇',2:'🥈',3:'🥉'}[place]) + '</div>' +
          '<div class="pod-av">' + esc(r.u.username.slice(0, 1).toUpperCase()) + '</div>' +
          '<div class="pod-name">' + esc(r.u.username) + '</div><div class="pod-val">' + coins(r.win) + '</div></div>';
      }).join('') + '</div>' : '';

      var rows = ranked.map(function (r, i) {
        var mine = me && r.u.id === me.id;
        return '<div class="lb-row' + (mine ? ' lb-me' : '') + '"><span class="lb-rank rank-' + (i + 1) + '">' + (i + 1) + '</span>' +
          '<span class="lb-av">' + esc(r.u.username.slice(0, 1).toUpperCase()) + '</span>' +
          '<div class="lb-info"><div class="lb-name">' + esc(r.u.username) + (mine ? ' <span class="you-tag">YOU</span>' : '') + '</div>' +
          '<div class="lb-sub muted">🏆 ' + r.u.tournamentsWon + ' wins • 🎯 ' + kd(r.u).toFixed(2) + ' K/D</div></div>' +
          '<span class="lb-val">' + coins(r.win) + '</span></div>';
      }).join('');

      body.querySelector('#lbBody').innerHTML = ranked.length ? podium + '<div class="lb-list">' + rows + '</div>'
        : '<div class="empty"><span class="empty-ic">🏆</span><p class="muted">No winnings in this period yet. Be the first on the board!</p></div>';
    }
    body.querySelector('#lbTabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-p]'); if (!b) return; period = b.getAttribute('data-p');
      body.querySelectorAll('.lbtab').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); render();
    });
    render();
    return node;
  }

  /* =====================================================================
   * MENU
   * ================================================================== */
  function menu() {
    if (!Auth.requireAuth()) return UI.screen({ title: 'Menu', back: false });
    var u = Auth.current();
    var kd = u.deaths ? (u.kills / u.deaths).toFixed(2) : String(u.kills);
    var node = UI.screen({ title: 'Menu', back: false });
    function item(href, ic, label, right) { return '<a href="' + href + '" class="menu-item"><span class="mi-ic">' + ic + '</span><span class="mi-label">' + label + '</span>' + (right || '<span class="mi-arrow">›</span>') + '</a>'; }
    node._body.innerHTML = '' +
      '<div class="menu-profile"><div class="mp-av">' + esc(u.username.slice(0, 1).toUpperCase()) + '</div>' +
        '<div class="mp-name">' + esc(u.username) + (u.role === 'admin' ? ' <span class="pill pill-live">ADMIN</span>' : '') + '</div>' +
        '<div class="mp-mob muted">📱 ' + esc(u.mobile) + '</div></div>' +
      '<div class="menu-stats"><div><span class="ms-val">' + u.matchesPlayed + '</span><span class="ms-l">Played</span></div>' +
        '<div><span class="ms-val">' + u.kills + '</span><span class="ms-l">Kills</span></div>' +
        '<div><span class="ms-val">' + coins(u.totalEarnings) + '</span><span class="ms-l">Earned</span></div></div>' +
      '<div class="menu-list">' +
        item('#/wallet', '🪙', 'My Wallet', '<span class="mi-right">' + coins(u.balance) + '</span>') +
        item('#/my-contests', '🎟️', 'My Contests') +
        item('#/statistics', '📊', 'My Statistics') +
        item('#/leaderboard', '🏆', 'Top Players') +
        (u.role === 'admin' ? item('#/admin', '🛠️', 'Admin Panel') : '') +
        item('#/how', 'ℹ️', 'How It Works') +
        item('#/contact', '🎧', 'Contact Us') +
        item('#/faq', '❓', 'FAQ') +
        item('#/legal', '📜', 'Rules · Privacy · Terms') +
      '</div>' +
      '<button class="btn btn-danger btn-block" id="logoutBtn2" style="margin-top:16px">Logout</button>' +
      '<p class="disclaimer">🔞 18+ only. Skill-based gaming. Play responsibly. Not available where prohibited by law. Coins are for in-app contest entry.</p>';
    node._body.querySelector('#logoutBtn2').addEventListener('click', function () { Auth.logout(); UI.toast('Logged out.', 'info'); location.hash = '#/'; if (window.App) App.refreshChrome(); });
    return node;
  }

  /* ---- Statistics ---- */
  function statistics() {
    if (!Auth.requireAuth()) return UI.screen({ title: 'Statistics', back: false });
    var u = Auth.current();
    var kd = u.deaths ? (u.kills / u.deaths).toFixed(2) : String(u.kills);
    var joined = Store.registrations().filter(function (r) { return r.userId === u.id && r.paymentStatus === 'paid'; }).length;
    var node = UI.screen({ title: 'My Statistics', backTo: '#/menu' });
    function tile(ic, v, l) { return '<div class="itile"><span class="itile-ic">' + ic + '</span><span class="itile-val">' + v + '</span><span class="itile-label">' + l + '</span></div>'; }
    node._body.innerHTML = '<div class="info-grid stat-grid">' +
      tile('🎮', joined, 'Contests Joined') + tile('🏆', u.tournamentsWon, 'Wins') +
      tile('💀', u.kills, 'Total Kills') + tile('🎯', kd, 'K/D Ratio') +
      tile('🪙', coins(u.totalEarnings), 'Total Winnings') + tile('📊', u.matchesPlayed, 'Matches Played') +
    '</div>';
    return node;
  }

  /* ---- Content pages ---- */
  function contentScreen(title, html, backTo) { return UI.screen({ title: title, backTo: backTo || '#/menu', html: '<div class="content">' + html + '</div>' }); }
  function howItWorks() {
    return contentScreen('How It Works',
      '<ol class="how-steps">' +
      '<li><b>Create account</b> — sign up with your mobile & Free Fire UID.</li>' +
      '<li><b>Add coins</b> — add money via UPI; ₹ converts to Coins (1 Coin = ₹1).</li>' +
      '<li><b>Join a contest</b> — pick Solo/Duo/Squad, pay entry from coins, get your slot.</li>' +
      '<li><b>Play the match</b> — Room ID & password show on the contest page before start.</li>' +
      '<li><b>Submit result</b> — upload your screenshot after the match.</li>' +
      '<li><b>Win & withdraw</b> — admin verifies, winnings hit your wallet, withdraw to UPI.</li>' +
      '</ol><p class="muted small">Prize pool = total entries − platform fee. It grows as more players join.</p>');
  }
  function faq() {
    var s = Store.settings();
    return contentScreen('FAQ',
      qa('How is the prize pool decided?', 'Pool = (players × entry fee) minus a ' + (s.commissionPercent || 20) + '% platform fee. More joins = bigger pool.') +
      qa('When do I get the Room ID?', 'It appears on the contest page about 10 minutes before the start time.') +
      qa('How fast are withdrawals?', 'Requests are reviewed by admin and paid to your UPI, usually within 24 hours.') +
      qa('What are Coins?', '1 Coin = ' + rupees(s.coinPerRupee || 1) + '. You add coins to join contests and withdraw winnings to UPI.') +
      qa('What if someone hacks?', 'Report with proof. Cheaters are banned and entry is refunded to fair players.'));
  }
  function qa(q, a) { return '<div class="qa"><div class="qa-q">Q. ' + esc(q) + '</div><div class="qa-a muted">' + esc(a) + '</div></div>'; }
  function contact() {
    var s = Store.settings();
    return contentScreen('Contact Us',
      '<p>Need help? Reach our support team:</p>' +
      '<div class="contact-row">📱 <a href="tel:' + esc(s.supportMobile || '') + '">' + esc(s.supportMobile || '—') + '</a></div>' +
      '<div class="contact-row">💬 <a href="https://wa.me/91' + esc(s.supportMobile || '') + '">WhatsApp support</a></div>' +
      '<p class="muted small">Support hours: 10 AM – 10 PM IST, all days.</p>');
  }
  function about() {
    return contentScreen('About', '<p><b>' + esc((APP_CONFIG.brand)) + '</b> is a skill-based Free Fire tournament platform for Indian gamers. Compete daily, climb the leaderboard, and win real rewards.</p>');
  }
  function legal() {
    return contentScreen('Rules · Privacy · Terms',
      '<h4>Fair Play</h4><p class="muted">No emulators, hacks, teaming or panels. Violations = permanent ban.</p>' +
      '<h4>Privacy</h4><p class="muted">We store only what\'s needed to run contests. Demo build keeps data in your browser (localStorage).</p>' +
      '<h4>Terms</h4><p class="muted">18+ only. Skill-based gaming. Coins are for in-app contest entry. Winnings withdrawable to UPI subject to verification. Not available where prohibited by law.</p>');
  }

  /* =====================================================================
   * AUTH SCREENS
   * ================================================================== */
  function loginPage() {
    if (Auth.isLoggedIn()) { location.hash = '#/'; return UI.screen({ title: '', back: false }); }
    var node = UI.screen({ title: 'Login', backTo: '#/' });
    node._body.innerHTML = '<div class="auth">' +
      '<div class="auth-logo">🔥</div><h2 class="auth-h">Welcome back</h2><p class="muted">Login to join contests & win.</p>' +
      '<div class="field"><label>Mobile number</label><input id="li_id" inputmode="numeric" placeholder="10-digit mobile"/><span class="field-err"></span></div>' +
      '<div class="field"><label>Password</label><input id="li_pw" type="password" placeholder="••••••"/><span class="field-err"></span></div>' +
      '<button class="btn btn-primary btn-block btn-lg" id="loginBtn">Login</button>' +
      '<p class="auth-alt">New here? <a href="#/register">Create account →</a></p>' +
      '<div class="auth-demo">Demo — Player: <code>9800000001 / player123</code> · Admin: <code>8955005076 / admin@123</code></div></div>';
    function go() {
      var i = node._body.querySelector('#li_id'), p = node._body.querySelector('#li_pw');
      UI.clearError(i); UI.clearError(p);
      if (!i.value.trim()) { UI.fieldError(i, 'Enter your mobile.'); return; }
      if (!p.value) { UI.fieldError(p, 'Enter password.'); return; }
      var res = Auth.login(i.value.trim(), p.value);
      if (!res.ok) { UI.fieldError(p, res.error); return; }
      UI.toast('Welcome, ' + res.user.username + '! 🔥', 'success');
      location.hash = res.user.role === 'admin' ? '#/admin' : '#/'; if (window.App) App.refreshChrome();
    }
    node._body.querySelector('#loginBtn').addEventListener('click', go);
    node._body.querySelector('#li_pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    return node;
  }
  function registerPage() {
    if (Auth.isLoggedIn()) { location.hash = '#/'; return UI.screen({ title: '', back: false }); }
    var node = UI.screen({ title: 'Create Account', backTo: '#/' });
    node._body.innerHTML = '<div class="auth">' +
      '<div class="auth-logo">🔥</div><h2 class="auth-h">Join the Arena</h2><p class="muted">Register & get your first Booyah paid.</p>' +
      '<div class="field"><label>Username</label><input id="rg_user" placeholder="3–18 chars"/><span class="field-err"></span></div>' +
      '<div class="field"><label>Mobile number</label><input id="rg_mob" inputmode="numeric" placeholder="10-digit mobile"/><span class="field-err"></span></div>' +
      '<div class="field"><label>Free Fire UID</label><input id="rg_uid" inputmode="numeric" placeholder="In-game ID"/><span class="field-err"></span></div>' +
      '<div class="field"><label>Password</label><input id="rg_pw" type="password" placeholder="min 6 chars"/><span class="field-err"></span></div>' +
      '<button class="btn btn-primary btn-block btn-lg" id="regBtn">Create Account</button>' +
      '<p class="auth-alt">Already registered? <a href="#/login">Login →</a></p></div>';
    node._body.querySelector('#regBtn').addEventListener('click', function () {
      var f = { user: node._body.querySelector('#rg_user'), mob: node._body.querySelector('#rg_mob'), uid: node._body.querySelector('#rg_uid'), pw: node._body.querySelector('#rg_pw') };
      Object.keys(f).forEach(function (k) { UI.clearError(f[k]); });
      var ok = true;
      if (!UI.Validate.username(f.user.value.trim())) { UI.fieldError(f.user, '3–18 letters/numbers/._'); ok = false; }
      if (!UI.Validate.mobile(f.mob.value.trim())) { UI.fieldError(f.mob, 'Valid 10-digit mobile.'); ok = false; }
      if (!UI.Validate.ffuid(f.uid.value.trim())) { UI.fieldError(f.uid, 'Valid UID (6–12 digits).'); ok = false; }
      if (!UI.Validate.password(f.pw.value)) { UI.fieldError(f.pw, 'Min 6 characters.'); ok = false; }
      if (!ok) return;
      var res = Auth.register({ username: f.user.value.trim(), mobile: f.mob.value.trim(), freeFireUID: f.uid.value.trim(), password: f.pw.value });
      if (!res.ok) { UI.fieldError(f.mob, res.error); UI.toast(res.error, 'error'); return; }
      UI.toast('Welcome to LegentArena! 🔥', 'success'); location.hash = '#/'; if (window.App) App.refreshChrome();
    });
    return node;
  }

  function emptyBox(msg, href, label) {
    return '<div class="empty"><span class="empty-ic">🤔</span><p class="muted">' + esc(msg) + '</p><a href="' + href + '" class="btn btn-primary btn-sm">' + esc(label) + '</a></div>';
  }

  window.Pages = {
    home: home, contestDetail: contestDetail, joinings: joinings, myContests: myContests,
    wallet: wallet, leaderboard: leaderboard, menu: menu, statistics: statistics,
    howItWorks: howItWorks, faq: faq, contact: contact, about: about, legal: legal,
    loginPage: loginPage, registerPage: registerPage,
    startRegistration: startRegistration, submitResult: submitResult,
  };
})();
