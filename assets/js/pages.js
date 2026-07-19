/* =========================================================================
 * LegentArena — Page renderers (user-facing)
 * Each renderer returns a DOM node mounted by the router in app.js.
 * ======================================================================= */
(function () {
  'use strict';

  var esc = UI.esc, money = UI.money;

  function frag(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d;
  }

  function typeBadge(t) { return '<span class="chip chip-' + t.toLowerCase() + '">' + esc(t) + '</span>'; }

  function statusPill(status) {
    var map = { upcoming: 'Upcoming', live: '● Live', completed: 'Completed' };
    return '<span class="pill pill-' + status + '">' + (map[status] || status) + '</span>';
  }

  function slotBar(filled, max) {
    var pct = Math.min(100, Math.round((filled / max) * 100));
    var hot = pct >= 80;
    return '' +
      '<div class="slots">' +
        '<div class="slots-top">' +
          '<span class="slots-count">' + filled + '/' + max + ' slots ' + (pct >= 100 ? 'FULL' : 'filled') + '</span>' +
          (hot && pct < 100 ? '<span class="slots-hot">🔥 Filling fast</span>' : '') +
        '</div>' +
        '<div class="slots-track"><div class="slots-fill' + (hot ? ' hot' : '') + '" style="width:' + pct + '%"></div></div>' +
      '</div>';
  }

  /* ---- Tournament card ---- */
  function tournamentCard(t) {
    var filled = Store.registeredCount(t.id);
    var full = filled >= t.maxTeams;
    var when = UI.timeUntil(t.date, t.time);
    return '' +
    '<article class="tcard glass" data-tour="' + t.id + '">' +
      '<div class="tcard-glow"></div>' +
      '<div class="tcard-head">' +
        '<div class="tcard-badges">' + typeBadge(t.type) + statusPill(t.status) + '</div>' +
        (t.status === 'upcoming' && when ? '<span class="tcard-countdown">⏱ ' + esc(when) + '</span>' : '') +
      '</div>' +
      '<h3 class="tcard-title">' + esc(t.title) + '</h3>' +
      '<div class="tcard-meta">' +
        '<span>📅 ' + UI.fmtDate(t.date) + '</span>' +
        '<span>🕘 ' + esc(t.time) + '</span>' +
        '<span>🗺️ ' + esc(t.map || '—') + '</span>' +
      '</div>' +
      '<div class="tcard-prizes">' +
        '<div class="prize-box"><span class="prize-label">Prize Pool</span><span class="prize-val glow-text">' + money(t.prizePool) + '</span></div>' +
        '<div class="prize-box"><span class="prize-label">Entry</span><span class="prize-val">' + (t.entryFee ? money(t.entryFee) : 'FREE') + '</span></div>' +
      '</div>' +
      slotBar(filled, t.maxTeams) +
      '<div class="tcard-actions">' +
        '<button class="btn btn-ghost btn-sm" data-view="' + t.id + '">Details</button>' +
        '<button class="btn btn-primary btn-sm" data-join="' + t.id + '"' + (full || t.status === 'completed' ? ' disabled' : '') + '>' +
          (t.status === 'completed' ? 'Ended' : full ? 'Full' : t.status === 'live' ? 'Join Live' : 'Join') +
        '</button>' +
      '</div>' +
    '</article>';
  }

  function wireCards(root) {
    root.querySelectorAll('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { location.hash = '#/tournament/' + b.getAttribute('data-view'); });
    });
    root.querySelectorAll('[data-join]').forEach(function (b) {
      b.addEventListener('click', function () { Pages.startRegistration(b.getAttribute('data-join')); });
    });
    root.querySelectorAll('.tcard').forEach(function (c) {
      c.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        location.hash = '#/tournament/' + c.getAttribute('data-tour');
      });
    });
  }

  /* =====================================================================
   * LANDING
   * ================================================================== */
  function landing() {
    var tours = Store.tournaments();
    var upcoming = tours.filter(function (t) { return t.status === 'upcoming' || t.status === 'live'; })
      .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    var totalPrize = tours.reduce(function (s, t) { return s + t.prizePool; }, 0);
    var totalPlayers = Store.users().filter(function (u) { return u.role === 'user'; }).length;
    var liveCount = tours.filter(function (t) { return t.status === 'live'; }).length;

    var featured = upcoming.slice(0, 6).map(tournamentCard).join('');

    var node = frag('' +
    '<section class="hero">' +
      '<div class="hero-inner">' +
        '<div class="hero-tag">🔥 Season Live • ' + liveCount + ' match' + (liveCount === 1 ? '' : 'es') + ' running now</div>' +
        '<h1 class="hero-title">Free Fire<br><span class="glow-text">Tournament Hub</span></h1>' +
        '<p class="hero-sub">Enter daily Solo, Duo & Squad cups. Real brackets, instant slots, and prizes paid straight to your wallet. Your Booyah has a paycheck.</p>' +
        '<div class="hero-cta">' +
          '<a href="#/tournaments" class="btn btn-primary btn-lg pulse">🎮 Join a Tournament</a>' +
          '<a href="#/leaderboard" class="btn btn-ghost btn-lg">🏆 View Leaderboard</a>' +
        '</div>' +
        '<div class="hero-stats">' +
          '<div class="stat"><span class="stat-val glow-text">' + money(totalPrize) + '</span><span class="stat-label">Prizes on the line</span></div>' +
          '<div class="stat"><span class="stat-val">' + totalPlayers + '+</span><span class="stat-label">Registered players</span></div>' +
          '<div class="stat"><span class="stat-val">' + tours.length + '</span><span class="stat-label">Active cups</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="hero-orb" aria-hidden="true"></div>' +
    '</section>' +

    '<section class="section">' +
      '<div class="section-head">' +
        '<h2 class="section-title">🎯 Upcoming Tournaments</h2>' +
        '<a href="#/tournaments" class="section-link">See all →</a>' +
      '</div>' +
      '<div class="grid tcards">' + (featured || '<p class="muted">No tournaments yet. Check back soon.</p>') + '</div>' +
    '</section>' +

    '<section class="section">' +
      '<div class="steps">' +
        '<div class="step glass"><span class="step-n">1</span><h4>Register</h4><p class="muted">Sign up with your Free Fire UID in seconds.</p></div>' +
        '<div class="step glass"><span class="step-n">2</span><h4>Pay entry</h4><p class="muted">Add money to your wallet & join any cup.</p></div>' +
        '<div class="step glass"><span class="step-n">3</span><h4>Drop & win</h4><p class="muted">Play the match, upload your result screenshot.</p></div>' +
        '<div class="step glass"><span class="step-n">4</span><h4>Get paid</h4><p class="muted">Admin verifies, prize hits your wallet instantly.</p></div>' +
      '</div>' +
    '</section>' +

    '<section class="section cta-band glass">' +
      '<h2>Ready to prove you\'re the best?</h2>' +
      '<p class="muted">Slots fill fast every night. Lock yours before it\'s gone.</p>' +
      '<a href="#/tournaments" class="btn btn-primary btn-lg">Browse Tournaments</a>' +
    '</section>');

    wireCards(node);
    return node;
  }

  /* =====================================================================
   * TOURNAMENTS LIST (search + filter)
   * ================================================================== */
  function tournaments() {
    var state = { q: '', type: 'all', status: 'all' };

    var node = frag('' +
    '<section class="section">' +
      '<div class="page-head">' +
        '<h1 class="page-title">🎮 Tournaments</h1>' +
        '<p class="muted">Find your battleground. Filter by mode and status.</p>' +
      '</div>' +
      '<div class="filters glass">' +
        '<div class="search"><span>🔍</span><input id="tSearch" type="search" placeholder="Search tournaments, maps…" /></div>' +
        '<div class="filter-group" id="typeFilter">' +
          '<button class="fbtn active" data-type="all">All</button>' +
          '<button class="fbtn" data-type="Solo">Solo</button>' +
          '<button class="fbtn" data-type="Duo">Duo</button>' +
          '<button class="fbtn" data-type="Squad">Squad</button>' +
        '</div>' +
        '<div class="filter-group" id="statusFilter">' +
          '<button class="fbtn active" data-status="all">Any</button>' +
          '<button class="fbtn" data-status="live">Live</button>' +
          '<button class="fbtn" data-status="upcoming">Upcoming</button>' +
          '<button class="fbtn" data-status="completed">Past</button>' +
        '</div>' +
      '</div>' +
      '<div class="grid tcards" id="tourGrid"></div>' +
    '</section>');

    var grid = node.querySelector('#tourGrid');

    function apply() {
      var list = Store.tournaments().filter(function (t) {
        var matchesQ = !state.q ||
          (t.title + ' ' + (t.map || '') + ' ' + t.type).toLowerCase().indexOf(state.q.toLowerCase()) !== -1;
        var matchesType = state.type === 'all' || t.type === state.type;
        var matchesStatus = state.status === 'all' || t.status === state.status;
        return matchesQ && matchesType && matchesStatus;
      }).sort(function (a, b) {
        var order = { live: 0, upcoming: 1, completed: 2 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return (a.date + a.time).localeCompare(b.date + b.time);
      });

      grid.innerHTML = list.length
        ? list.map(tournamentCard).join('')
        : '<div class="empty glass"><span class="empty-ic">🔍</span><p>No tournaments match your filters.</p></div>';
      wireCards(grid);
    }

    node.querySelector('#tSearch').addEventListener('input', function (e) { state.q = e.target.value; apply(); });
    node.querySelector('#typeFilter').addEventListener('click', function (e) {
      var b = e.target.closest('[data-type]'); if (!b) return;
      state.type = b.getAttribute('data-type');
      setActive(node.querySelector('#typeFilter'), b); apply();
    });
    node.querySelector('#statusFilter').addEventListener('click', function (e) {
      var b = e.target.closest('[data-status]'); if (!b) return;
      state.status = b.getAttribute('data-status');
      setActive(node.querySelector('#statusFilter'), b); apply();
    });

    function setActive(group, btn) {
      group.querySelectorAll('.fbtn').forEach(function (x) { x.classList.remove('active'); });
      btn.classList.add('active');
    }

    apply();
    return node;
  }

  /* =====================================================================
   * TOURNAMENT DETAIL
   * ================================================================== */
  function tournamentDetail(id) {
    var t = Store.tournamentById(id);
    if (!t) return frag('<section class="section"><div class="empty glass"><p>Tournament not found.</p><a href="#/tournaments" class="btn btn-primary btn-sm">Back to tournaments</a></div></section>');

    var filled = Store.registeredCount(t.id);
    var full = filled >= t.maxTeams;
    var user = Auth.current();
    var myReg = user && Store.registrations().find(function (r) {
      return r.userId === user.id && r.tournamentId === t.id && r.paymentStatus === 'paid';
    });
    var perKill = t.type === 'Squad' ? '₹20 / kill bonus' : '';

    var node = frag('' +
    '<section class="section detail">' +
      '<a href="#/tournaments" class="back-link">← All tournaments</a>' +
      '<div class="detail-grid">' +
        '<div class="detail-main glass">' +
          '<div class="tcard-badges">' + typeBadge(t.type) + statusPill(t.status) +
            (t.status === 'upcoming' ? '<span class="tcard-countdown">⏱ ' + esc(UI.timeUntil(t.date, t.time)) + '</span>' : '') + '</div>' +
          '<h1 class="detail-title">' + esc(t.title) + '</h1>' +
          '<div class="detail-meta">' +
            '<div><span class="dm-label">Date</span><span class="dm-val">' + UI.fmtDate(t.date) + '</span></div>' +
            '<div><span class="dm-label">Time</span><span class="dm-val">' + esc(t.time) + '</span></div>' +
            '<div><span class="dm-label">Map</span><span class="dm-val">' + esc(t.map || '—') + '</span></div>' +
            '<div><span class="dm-label">Mode</span><span class="dm-val">' + esc(t.type) + '</span></div>' +
          '</div>' +
          '<h3 class="detail-h">📋 Rules & Format</h3>' +
          '<p class="detail-rules">' + esc(t.rules || 'Standard rules apply.') + (perKill ? ' • ' + perKill : '') + '</p>' +
          '<h3 class="detail-h">🏆 Bracket</h3>' +
          '<div class="detail-bracket-link"><a href="#/brackets/' + t.id + '" class="btn btn-ghost btn-sm">View knockout bracket →</a></div>' +
        '</div>' +

        '<aside class="detail-side">' +
          '<div class="glass side-card">' +
            '<div class="side-prize"><span class="prize-label">Total Prize Pool</span><span class="side-prize-val glow-text">' + money(t.prizePool) + '</span></div>' +
            '<div class="side-row"><span>Entry fee</span><strong>' + (t.entryFee ? money(t.entryFee) : 'FREE') + '</strong></div>' +
            '<div class="side-row"><span>Mode</span><strong>' + esc(t.type) + '</strong></div>' +
            slotBar(filled, t.maxTeams) +
            (myReg
              ? '<div class="reg-done">✅ You\'re registered as <strong>' + esc(myReg.teamName) + '</strong></div>' +
                '<button class="btn btn-ghost btn-block" id="submitResultBtn">📸 Submit Result</button>'
              : '<button class="btn btn-primary btn-block btn-lg" id="joinBtn"' + (full || t.status === 'completed' ? ' disabled' : '') + '>' +
                  (t.status === 'completed' ? 'Tournament ended' : full ? 'Slots full' : 'Join for ' + (t.entryFee ? money(t.entryFee) : 'FREE')) +
                '</button>') +
          '</div>' +
          '<div class="glass side-card prize-split">' +
            '<h4>💰 Prize Split (top 3)</h4>' +
            '<div class="split-row"><span>🥇 1st</span><strong>' + money(Math.round(t.prizePool * 0.5)) + '</strong></div>' +
            '<div class="split-row"><span>🥈 2nd</span><strong>' + money(Math.round(t.prizePool * 0.3)) + '</strong></div>' +
            '<div class="split-row"><span>🥉 3rd</span><strong>' + money(Math.round(t.prizePool * 0.2)) + '</strong></div>' +
          '</div>' +
        '</aside>' +
      '</div>' +
    '</section>');

    var joinBtn = node.querySelector('#joinBtn');
    if (joinBtn) joinBtn.addEventListener('click', function () { Pages.startRegistration(t.id); });
    var srBtn = node.querySelector('#submitResultBtn');
    if (srBtn) srBtn.addEventListener('click', function () { Pages.submitResult(t.id); });
    return node;
  }

  /* =====================================================================
   * REGISTRATION FLOW
   * ================================================================== */
  function startRegistration(id) {
    if (!Auth.requireAuth()) return;
    var t = Store.tournamentById(id);
    if (!t) return;
    if (t.status === 'completed') { UI.toast('This tournament has ended.', 'warn'); return; }

    var user = Auth.current();
    var already = Store.registrations().find(function (r) {
      return r.userId === user.id && r.tournamentId === t.id && r.paymentStatus === 'paid';
    });
    if (already) { UI.toast('You are already registered for this tournament.', 'info'); return; }
    if (Store.registeredCount(t.id) >= t.maxTeams) { UI.toast('Slots are full.', 'warn'); return; }

    var defaultTeam = t.type === 'Solo' ? user.username : user.username + ' Squad';
    var body = frag('' +
      '<div class="reg-flow">' +
        '<div class="reg-summary">' +
          '<div class="reg-summary-title">' + esc(t.title) + '</div>' +
          '<div class="reg-summary-meta">' + esc(t.type) + ' • ' + UI.fmtDate(t.date) + ' ' + esc(t.time) + '</div>' +
          '<div class="reg-fee"><span>Entry fee</span><strong>' + (t.entryFee ? money(t.entryFee) : 'FREE') + '</strong></div>' +
        '</div>' +
        '<div class="field">' +
          '<label>' + (t.type === 'Solo' ? 'In-game Name' : 'Team Name') + '</label>' +
          '<input id="teamName" type="text" maxlength="24" value="' + esc(defaultTeam) + '" />' +
          '<span class="field-err"></span>' +
        '</div>' +
        '<div class="reg-wallet">Wallet balance: <strong>' + money(user.balance) + '</strong></div>' +
        (t.entryFee > user.balance
          ? '<p class="reg-warn">⚠️ Low balance — you can pay directly via the gateway, or <a href="#/wallet">add money to your wallet</a> first.</p>'
          : '<p class="muted reg-payfrom">Entry fee will be paid from your wallet.</p>') +
      '</div>');

    UI.openModal({
      title: '🎟️ Join Tournament',
      node: body,
      actions: [
        { label: 'Cancel', kind: 'ghost' },
        { label: t.entryFee ? 'Proceed to Pay' : 'Confirm (Free)', kind: 'primary', onClick: function () {
            var teamInput = body.querySelector('#teamName');
            var team = (teamInput.value || '').trim();
            if (team.length < 2) { UI.fieldError(teamInput, 'Enter a valid name (min 2 chars).'); return true; }
            confirmRegistration(t, user, team);
            return true; // we manage closing
          } },
      ],
    });
  }

  function confirmRegistration(t, user, team) {
    // Re-fetch user for fresh balance.
    user = Store.userById(user.id);

    function finalize(paymentInfo) {
      Store.registrations().length; // no-op keep
      var regs = Store.registrations();
      regs.push({
        id: Store.uid('r'), userId: user.id, tournamentId: t.id, teamName: team,
        paymentStatus: 'paid', registeredAt: new Date().toISOString(),
        paymentId: paymentInfo && paymentInfo.paymentId,
      });
      Store.saveRegistrations(regs);
      if (t.entryFee > 0) {
        Store.addTransaction({
          id: Store.uid('tx'), userId: user.id, amount: t.entryFee, type: 'debit',
          status: 'success', description: 'Entry: ' + t.title, date: new Date().toISOString(),
        });
      }
      UI.closeModal();
      Pages.registrationSuccess(t, team);
      if (window.App) App.refreshChrome();
    }

    if (t.entryFee === 0) { finalize(null); return; }

    // Prefer wallet if sufficient; else go to gateway.
    if (user.balance >= t.entryFee) {
      UI.closeModal();
      UI.confirm({
        title: 'Confirm payment',
        message: 'Pay ' + money(t.entryFee) + ' from your wallet to join "' + t.title + '"?',
        confirmLabel: 'Pay ' + money(t.entryFee),
      }).then(function (ok) {
        if (!ok) return;
        var updated = Store.debit(user.id, t.entryFee, 'Entry: ' + t.title);
        if (!updated) { UI.toast('Payment failed — insufficient balance.', 'error'); return; }
        // debit already logged a txn; register without double logging
        var regs = Store.registrations();
        regs.push({
          id: Store.uid('r'), userId: user.id, tournamentId: t.id, teamName: team,
          paymentStatus: 'paid', registeredAt: new Date().toISOString(),
        });
        Store.saveRegistrations(regs);
        Pages.registrationSuccess(t, team);
        if (window.App) App.refreshChrome();
      });
      return;
    }

    // Gateway path
    UI.closeModal();
    Payments.Pay(t.entryFee, { description: 'Entry: ' + t.title }).then(function (res) {
      if (res.status === 'success') finalize(res);
      else if (res.status === 'failed') UI.toast(res.reason || 'Payment failed.', 'error');
      else UI.toast('Payment cancelled.', 'info');
    });
  }

  function registrationSuccess(t, team) {
    UI.openModal({
      title: '',
      node: frag('' +
        '<div class="success-modal">' +
          '<div class="success-check">✅</div>' +
          '<h2>You\'re In!</h2>' +
          '<p class="muted">Registered for <strong>' + esc(t.title) + '</strong> as <strong>' + esc(team) + '</strong>.</p>' +
          '<div class="success-meta">📅 ' + UI.fmtDate(t.date) + ' • 🕘 ' + esc(t.time) + ' • 🗺️ ' + esc(t.map || '') + '</div>' +
          '<p class="muted small">Room ID & password will be shared here before the match. Good luck — get that Booyah! 🔥</p>' +
        '</div>'),
      actions: [
        { label: 'View My Matches', kind: 'ghost', onClick: function () { location.hash = '#/my-tournaments'; } },
        { label: 'Done', kind: 'primary' },
      ],
    });
  }

  /* =====================================================================
   * RESULT SUBMISSION
   * ================================================================== */
  function submitResult(tournamentId) {
    if (!Auth.requireAuth()) return;
    var t = Store.tournamentById(tournamentId);
    var user = Auth.current();
    var body = frag('' +
      '<div class="result-form">' +
        '<p class="muted">Upload a screenshot of your match result. Admin will verify it and credit any prize to your wallet.</p>' +
        '<div class="field">' +
          '<label>Placement</label>' +
          '<select id="rPlace">' +
            '<option value="1">🥇 #1 — Booyah</option>' +
            '<option value="2">🥈 #2</option>' +
            '<option value="3">🥉 #3</option>' +
            '<option value="0">Other</option>' +
          '</select>' +
        '</div>' +
        '<div class="field">' +
          '<label>Kills</label>' +
          '<input id="rKills" type="number" min="0" max="60" value="0" />' +
        '</div>' +
        '<div class="field">' +
          '<label>Result screenshot</label>' +
          '<input id="rShot" type="file" accept="image/*" />' +
          '<span class="field-err"></span>' +
          '<div id="shotPreview" class="shot-preview"></div>' +
        '</div>' +
      '</div>');

    var shotData = null;
    body.querySelector('#rShot').addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (!f) return;
      if (f.size > 3 * 1024 * 1024) { UI.toast('Image too large (max 3MB).', 'warn'); e.target.value = ''; return; }
      var reader = new FileReader();
      reader.onload = function () {
        shotData = reader.result;
        body.querySelector('#shotPreview').innerHTML = '<img src="' + shotData + '" alt="result preview" />';
      };
      reader.readAsDataURL(f);
    });

    UI.openModal({
      title: '📸 Submit Match Result',
      node: body,
      actions: [
        { label: 'Cancel', kind: 'ghost' },
        { label: 'Submit for Review', kind: 'primary', onClick: function () {
            var place = Number(body.querySelector('#rPlace').value);
            var kills = Number(body.querySelector('#rKills').value) || 0;
            if (!shotData) { UI.toast('Please attach a screenshot.', 'warn'); return true; }
            var matches = Store.matches();
            matches.push({
              id: Store.uid('m'), tournamentId: tournamentId, round: 'Final',
              team1: user.username, team2: null, winner: place === 1 ? user.username : null,
              placement: place, kills: kills, submittedBy: user.id,
              screenshot: shotData, verified: false, createdAt: new Date().toISOString(),
            });
            Store.saveMatches(matches);
            UI.closeModal();
            UI.toast('Result submitted! Admin will review it shortly.', 'success');
          } },
      ],
    });
  }

  /* =====================================================================
   * MY TOURNAMENTS
   * ================================================================== */
  function myTournaments() {
    if (!Auth.requireAuth()) return frag('<section class="section"></section>');
    var user = Auth.current();
    var regs = Store.registrations().filter(function (r) { return r.userId === user.id && r.paymentStatus === 'paid'; });
    var mySubs = Store.matches().filter(function (m) { return m.submittedBy === user.id; });

    var cards = regs.map(function (r) {
      var t = Store.tournamentById(r.tournamentId);
      if (!t) return '';
      var sub = mySubs.find(function (m) { return m.tournamentId === t.id; });
      var resultTag = sub
        ? (sub.verified ? '<span class="pill pill-live">✅ Verified</span>' : '<span class="pill pill-upcoming">⏳ Under review</span>')
        : '';
      return '' +
      '<article class="mycard glass">' +
        '<div class="mycard-top">' + typeBadge(t.type) + statusPill(t.status) + resultTag + '</div>' +
        '<h3>' + esc(t.title) + '</h3>' +
        '<div class="mycard-meta muted">📅 ' + UI.fmtDate(t.date) + ' • 🕘 ' + esc(t.time) + ' • Team: <strong>' + esc(r.teamName) + '</strong></div>' +
        '<div class="mycard-actions">' +
          '<a href="#/tournament/' + t.id + '" class="btn btn-ghost btn-sm">Details</a>' +
          '<a href="#/brackets/' + t.id + '" class="btn btn-ghost btn-sm">Bracket</a>' +
          (t.status !== 'completed' && !sub ? '<button class="btn btn-primary btn-sm" data-result="' + t.id + '">Submit Result</button>' : '') +
        '</div>' +
      '</article>';
    }).join('');

    var node = frag('' +
    '<section class="section">' +
      '<div class="page-head"><h1 class="page-title">🎯 My Matches</h1><p class="muted">Everything you\'ve registered for.</p></div>' +
      (regs.length ? '<div class="grid mycards">' + cards + '</div>'
        : '<div class="empty glass"><span class="empty-ic">🎮</span><p>You haven\'t joined any tournaments yet.</p><a href="#/tournaments" class="btn btn-primary btn-sm">Browse tournaments</a></div>') +
    '</section>');

    node.querySelectorAll('[data-result]').forEach(function (b) {
      b.addEventListener('click', function () { Pages.submitResult(b.getAttribute('data-result')); });
    });
    return node;
  }

  /* =====================================================================
   * BRACKETS (knockout visualization)
   * ================================================================== */
  function brackets(id) {
    var t = Store.tournamentById(id);
    if (!t) return frag('<section class="section"><div class="empty glass"><p>Tournament not found.</p></div></section>');

    // Build a demo 8-team knockout from registered team names (or placeholders).
    var teams = Store.registrations()
      .filter(function (r) { return r.tournamentId === id && r.paymentStatus === 'paid'; })
      .map(function (r) { return r.teamName; });
    while (teams.length < 8) teams.push('TBD ' + (teams.length + 1));
    teams = teams.slice(0, 8);

    function seedWinner(a, b, i) { return (i % 2 === 0 ? a : b); }
    var qf = [[teams[0], teams[1]], [teams[2], teams[3]], [teams[4], teams[5]], [teams[6], teams[7]]];
    var sfWinners = qf.map(function (m, i) { return seedWinner(m[0], m[1], i); });
    var sf = [[sfWinners[0], sfWinners[1]], [sfWinners[2], sfWinners[3]]];
    var finalW = [seedWinner(sf[0][0], sf[0][1], 0), seedWinner(sf[1][0], sf[1][1], 1)];

    function matchBox(pair, wl) {
      return '<div class="bx">' +
        '<div class="bx-team' + (wl === 0 ? ' bx-win' : '') + '">' + esc(pair[0]) + '</div>' +
        '<div class="bx-team' + (wl === 1 ? ' bx-win' : '') + '">' + esc(pair[1]) + '</div>' +
      '</div>';
    }

    var node = frag('' +
    '<section class="section">' +
      '<a href="#/tournament/' + t.id + '" class="back-link">← ' + esc(t.title) + '</a>' +
      '<div class="page-head"><h1 class="page-title">🏆 Knockout Bracket</h1><p class="muted">' + esc(t.type) + ' • single elimination</p></div>' +
      '<div class="bracket-scroll">' +
        '<div class="bracket">' +
          '<div class="bround"><span class="bround-label">Quarterfinals</span>' +
            qf.map(function (m) { return matchBox(m); }).join('') + '</div>' +
          '<div class="bround"><span class="bround-label">Semifinals</span>' +
            sf.map(function (m) { return matchBox(m); }).join('') + '</div>' +
          '<div class="bround"><span class="bround-label">Final</span>' +
            matchBox(finalW) + '</div>' +
          '<div class="bround bround-champ"><span class="bround-label">Champion</span>' +
            '<div class="champ-box glass">🥇 ' + esc(seedWinner(finalW[0], finalW[1], 0)) + '</div></div>' +
        '</div>' +
      '</div>' +
      '<p class="muted small" style="margin-top:16px">Bracket is auto-generated for demo. Admins finalize real matchups after check-in.</p>' +
    '</section>');
    return node;
  }

  /* =====================================================================
   * WALLET
   * ================================================================== */
  function wallet() {
    if (!Auth.requireAuth()) return frag('<section class="section"></section>');
    var user = Auth.current();
    var txns = Store.transactions().filter(function (x) { return x.userId === user.id; });

    var rows = txns.length ? txns.map(function (x) {
      var sign = x.type === 'credit' ? '+' : '-';
      return '<div class="txn">' +
        '<div class="txn-ic ' + (x.type === 'credit' ? 'up' : 'down') + '">' + (x.type === 'credit' ? '↓' : '↑') + '</div>' +
        '<div class="txn-body"><div class="txn-desc">' + esc(x.description) + '</div>' +
          '<div class="txn-date muted">' + UI.fmtDateTime(x.date) + '</div></div>' +
        '<div class="txn-amt ' + (x.type === 'credit' ? 'up' : 'down') + '">' + sign + money(x.amount).replace((APP_CONFIG.currency||'₹'), (APP_CONFIG.currency||'₹')) + '</div>' +
      '</div>';
    }).join('') : '<div class="empty glass"><p class="muted">No transactions yet.</p></div>';

    var node = frag('' +
    '<section class="section">' +
      '<div class="page-head"><h1 class="page-title">💰 Wallet</h1></div>' +
      '<div class="wallet-card glass">' +
        '<div class="wallet-bg"></div>' +
        '<span class="wallet-label">Available Balance</span>' +
        '<div class="wallet-balance glow-text">' + money(user.balance) + '</div>' +
        '<div class="wallet-actions">' +
          '<button class="btn btn-primary" id="addMoneyBtn">＋ Add Money</button>' +
          '<button class="btn btn-ghost" id="withdrawBtn">↑ Withdraw to UPI</button>' +
        '</div>' +
        '<div class="wallet-mini">🏆 Won: <strong>' + user.tournamentsWon + '</strong> • Earnings: <strong>' + money(user.totalEarnings) + '</strong></div>' +
      '</div>' +
      '<h3 class="section-title" style="margin-top:28px">Transaction History</h3>' +
      '<div class="txns">' + rows + '</div>' +
    '</section>');

    node.querySelector('#addMoneyBtn').addEventListener('click', addMoneyModal);
    node.querySelector('#withdrawBtn').addEventListener('click', withdrawModal);
    return node;
  }

  function addMoneyModal() {
    var user = Auth.current();
    var body = frag('' +
      '<div class="money-form">' +
        '<div class="amount-quick">' +
          [50, 100, 250, 500].map(function (a) { return '<button class="qbtn" data-amt="' + a + '">' + money(a) + '</button>'; }).join('') +
        '</div>' +
        '<div class="field"><label>Amount</label>' +
          '<input id="amtInput" type="number" min="1" max="100000" placeholder="Enter amount" />' +
          '<span class="field-err"></span></div>' +
        '<p class="muted small">Money is added to your in-app wallet via the payment gateway (simulated).</p>' +
      '</div>');

    body.querySelectorAll('.qbtn').forEach(function (b) {
      b.addEventListener('click', function () { body.querySelector('#amtInput').value = b.getAttribute('data-amt'); });
    });

    UI.openModal({
      title: '＋ Add Money',
      node: body,
      actions: [
        { label: 'Cancel', kind: 'ghost' },
        { label: 'Proceed to Pay', kind: 'primary', onClick: function () {
            var input = body.querySelector('#amtInput');
            var amt = Number(input.value);
            if (!UI.Validate.amount(amt)) { UI.fieldError(input, 'Enter an amount between ₹1 and ₹1,00,000.'); return true; }
            UI.closeModal();
            Payments.Pay(amt, { description: 'Add money to wallet' }).then(function (res) {
              if (res.status === 'success') {
                Store.credit(user.id, amt, 'Added money to wallet');
                UI.toast('₹' + amt + ' added to your wallet!', 'success');
                if (window.App) { App.refreshChrome(); App.route(); }
              } else if (res.status === 'failed') UI.toast(res.reason || 'Payment failed.', 'error');
              else UI.toast('Payment cancelled.', 'info');
            });
            return true; // we manage modal transitions ourselves
          } },
      ],
    });
  }

  function withdrawModal() {
    var user = Store.userById(Auth.current().id);
    var body = frag('' +
      '<div class="money-form">' +
        '<div class="reg-wallet">Available: <strong>' + money(user.balance) + '</strong></div>' +
        '<div class="field"><label>UPI ID</label>' +
          '<input id="upiInput" type="text" placeholder="yourname@upi" />' +
          '<span class="field-err"></span></div>' +
        '<div class="field"><label>Amount</label>' +
          '<input id="wAmt" type="number" min="1" placeholder="Enter amount" />' +
          '<span class="field-err"></span></div>' +
        '<p class="muted small">Withdrawal requests are reviewed by an admin before payout.</p>' +
      '</div>');

    UI.openModal({
      title: '↑ Withdraw to UPI',
      node: body,
      actions: [
        { label: 'Cancel', kind: 'ghost' },
        { label: 'Request Withdrawal', kind: 'primary', onClick: function () {
            var upi = body.querySelector('#upiInput');
            var amtI = body.querySelector('#wAmt');
            var amt = Number(amtI.value);
            var ok = true;
            if (!UI.Validate.upi(upi.value)) { UI.fieldError(upi, 'Enter a valid UPI ID (e.g. name@okhdfc).'); ok = false; }
            if (!UI.Validate.amount(amt)) { UI.fieldError(amtI, 'Enter a valid amount.'); ok = false; }
            else if (amt > user.balance) { UI.fieldError(amtI, 'Amount exceeds your balance.'); ok = false; }
            if (!ok) return true;

            // Hold funds by debiting now; admin approves/rejects the pending request.
            var u = Store.userById(user.id);
            u.balance = Math.round((u.balance - amt) * 100) / 100;
            Store.upsertUser(u);
            Store.addTransaction({
              id: Store.uid('tx'), userId: user.id, amount: amt, type: 'debit',
              status: 'pending', description: 'Withdrawal to ' + upi.value, date: new Date().toISOString(),
              meta: { upi: upi.value, kind: 'withdrawal' },
            });
            UI.closeModal();
            UI.toast('Withdrawal requested. Awaiting admin approval.', 'success');
            if (window.App) { App.refreshChrome(); App.route(); }
          } },
      ],
    });
  }

  /* =====================================================================
   * LEADERBOARD
   * ================================================================== */
  function leaderboard() {
    var metric = 'earnings';
    var node = frag('' +
    '<section class="section">' +
      '<div class="page-head"><h1 class="page-title">🏆 Leaderboard</h1><p class="muted">The best of the arena. Climb the ranks.</p></div>' +
      '<div class="filter-group lb-tabs" id="lbTabs">' +
        '<button class="fbtn active" data-metric="earnings">💰 Earnings</button>' +
        '<button class="fbtn" data-metric="wins">🏅 Wins</button>' +
        '<button class="fbtn" data-metric="kd">🎯 K/D</button>' +
      '</div>' +
      '<div id="lbBody"></div>' +
    '</section>');

    function kd(u) { return u.deaths ? Math.round((u.kills / u.deaths) * 100) / 100 : u.kills; }

    function render() {
      var players = Store.users().filter(function (u) { return u.role === 'user'; });
      players.sort(function (a, b) {
        if (metric === 'wins') return b.tournamentsWon - a.tournamentsWon;
        if (metric === 'kd') return kd(b) - kd(a);
        return b.totalEarnings - a.totalEarnings;
      });

      var me = Auth.current();
      var top3 = players.slice(0, 3);
      var podium = top3.length >= 1 ? '<div class="podium">' +
        podEl(top3[1], 2) + podEl(top3[0], 1) + podEl(top3[2], 3) + '</div>' : '';

      var rows = players.map(function (u, i) {
        var val = metric === 'wins' ? u.tournamentsWon + ' wins'
          : metric === 'kd' ? kd(u).toFixed(2) + ' K/D'
          : money(u.totalEarnings);
        var mine = me && u.id === me.id;
        return '<div class="lb-row' + (mine ? ' lb-me' : '') + '">' +
          '<span class="lb-rank rank-' + (i + 1) + '">' + (i + 1) + '</span>' +
          '<span class="lb-av">' + esc(u.username.slice(0, 1).toUpperCase()) + '</span>' +
          '<div class="lb-info"><div class="lb-name">' + esc(u.username) + (mine ? ' <span class="lb-you">YOU</span>' : '') + '</div>' +
            '<div class="lb-sub muted">🏆 ' + u.tournamentsWon + ' • 🎯 ' + kd(u).toFixed(2) + ' K/D</div></div>' +
          '<span class="lb-val glow-text">' + val + '</span>' +
        '</div>';
      }).join('');

      node.querySelector('#lbBody').innerHTML = podium +
        (players.length ? '<div class="lb-list glass">' + rows + '</div>'
          : '<div class="empty glass"><p class="muted">No ranked players yet.</p></div>');
    }

    function podEl(u, place) {
      if (!u) return '<div class="pod pod-' + place + ' pod-empty"></div>';
      var medal = { 1: '🥇', 2: '🥈', 3: '🥉' }[place];
      var val = metric === 'wins' ? u.tournamentsWon + ' wins'
        : metric === 'kd' ? kd(u).toFixed(2) : money(u.totalEarnings);
      return '<div class="pod pod-' + place + '">' +
        '<div class="pod-medal">' + medal + '</div>' +
        '<div class="pod-av">' + esc(u.username.slice(0, 1).toUpperCase()) + '</div>' +
        '<div class="pod-name">' + esc(u.username) + '</div>' +
        '<div class="pod-val glow-text">' + val + '</div>' +
        '<div class="pod-stand">' + place + '</div>' +
      '</div>';
    }

    node.querySelector('#lbTabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-metric]'); if (!b) return;
      metric = b.getAttribute('data-metric');
      node.querySelectorAll('#lbTabs .fbtn').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      render();
    });

    render();
    return node;
  }

  /* =====================================================================
   * AUTH PAGES
   * ================================================================== */
  function loginPage() {
    if (Auth.isLoggedIn()) { location.hash = '#/'; return frag('<section></section>'); }
    var node = frag('' +
    '<section class="section auth-section">' +
      '<div class="auth-card glass">' +
        '<div class="auth-logo">🔥</div>' +
        '<h1 class="auth-title">Welcome back</h1>' +
        '<p class="muted">Log in to join tournaments and track your wins.</p>' +
        '<div class="field"><label>Username or Mobile</label><input id="li_id" type="text" autocomplete="username" placeholder="e.g. GhostSniper or 98xxxxxxxx" /><span class="field-err"></span></div>' +
        '<div class="field"><label>Password</label><input id="li_pw" type="password" autocomplete="current-password" placeholder="••••••" /><span class="field-err"></span></div>' +
        '<button class="btn btn-primary btn-block btn-lg" id="loginBtn">Log In</button>' +
        '<p class="auth-alt">New here? <a href="#/register">Create an account →</a></p>' +
        '<div class="auth-demo"><strong>Demo logins</strong><br>Player: <code>GhostSniper / player123</code><br>Admin: <code>admin / admin123</code></div>' +
      '</div>' +
    '</section>');

    function doLogin() {
      var idI = node.querySelector('#li_id'), pwI = node.querySelector('#li_pw');
      UI.clearError(idI); UI.clearError(pwI);
      if (!idI.value.trim()) { UI.fieldError(idI, 'Enter your username or mobile.'); return; }
      if (!pwI.value) { UI.fieldError(pwI, 'Enter your password.'); return; }
      var res = Auth.login(idI.value, pwI.value);
      if (!res.ok) { UI.fieldError(pwI, res.error); return; }
      UI.toast('Welcome back, ' + res.user.username + '! 🔥', 'success');
      location.hash = res.user.role === 'admin' ? '#/admin' : '#/';
      if (window.App) App.refreshChrome();
    }
    node.querySelector('#loginBtn').addEventListener('click', doLogin);
    node.querySelector('#li_pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
    return node;
  }

  function registerPage() {
    if (Auth.isLoggedIn()) { location.hash = '#/'; return frag('<section></section>'); }
    var node = frag('' +
    '<section class="section auth-section">' +
      '<div class="auth-card glass">' +
        '<div class="auth-logo">🔥</div>' +
        '<h1 class="auth-title">Create your account</h1>' +
        '<p class="muted">Register with your Free Fire UID and start winning.</p>' +
        '<div class="field"><label>Username</label><input id="rg_user" type="text" placeholder="3–16 letters/numbers" /><span class="field-err"></span></div>' +
        '<div class="field"><label>Mobile number</label><input id="rg_mob" type="tel" inputmode="numeric" placeholder="10-digit mobile" /><span class="field-err"></span></div>' +
        '<div class="field"><label>Free Fire UID</label><input id="rg_uid" type="text" inputmode="numeric" placeholder="Your in-game UID" /><span class="field-err"></span></div>' +
        '<div class="field"><label>Password</label><input id="rg_pw" type="password" placeholder="min 6 characters" /><span class="field-err"></span></div>' +
        '<button class="btn btn-primary btn-block btn-lg" id="regBtn">Create Account</button>' +
        '<p class="auth-alt">Already have an account? <a href="#/login">Log in →</a></p>' +
      '</div>' +
    '</section>');

    node.querySelector('#regBtn').addEventListener('click', function () {
      var f = {
        user: node.querySelector('#rg_user'), mob: node.querySelector('#rg_mob'),
        uid: node.querySelector('#rg_uid'), pw: node.querySelector('#rg_pw'),
      };
      Object.keys(f).forEach(function (k) { UI.clearError(f[k]); });
      var ok = true;
      if (!UI.Validate.username(f.user.value.trim())) { UI.fieldError(f.user, '3–16 letters, numbers or _ only.'); ok = false; }
      if (!UI.Validate.mobile(f.mob.value.trim())) { UI.fieldError(f.mob, 'Enter a valid 10-digit Indian mobile.'); ok = false; }
      if (!UI.Validate.ffuid(f.uid.value.trim())) { UI.fieldError(f.uid, 'Enter a valid UID (6–12 digits).'); ok = false; }
      if (!UI.Validate.password(f.pw.value)) { UI.fieldError(f.pw, 'Password must be at least 6 characters.'); ok = false; }
      if (!ok) return;

      var res = Auth.register({
        username: f.user.value.trim(), mobile: f.mob.value.trim(),
        freeFireUID: f.uid.value.trim(), password: f.pw.value,
      });
      if (!res.ok) { UI.fieldError(f.user, res.error); UI.toast(res.error, 'error'); return; }
      UI.toast('Account created — welcome to the arena! 🔥', 'success');
      location.hash = '#/tournaments';
      if (window.App) App.refreshChrome();
    });
    return node;
  }

  /* =====================================================================
   * PROFILE
   * ================================================================== */
  function profile() {
    if (!Auth.requireAuth()) return frag('<section class="section"></section>');
    var u = Auth.current();
    var kd = u.deaths ? (u.kills / u.deaths).toFixed(2) : String(u.kills);
    var regCount = Store.registrations().filter(function (r) { return r.userId === u.id && r.paymentStatus === 'paid'; }).length;

    var node = frag('' +
    '<section class="section">' +
      '<div class="profile-hero glass">' +
        '<div class="profile-av">' + esc(u.username.slice(0, 1).toUpperCase()) + '</div>' +
        '<div class="profile-id">' +
          '<h1>' + esc(u.username) + (u.role === 'admin' ? ' <span class="pill pill-live">ADMIN</span>' : '') + '</h1>' +
          '<div class="muted">UID: ' + esc(u.freeFireUID) + ' • 📱 ' + esc(u.mobile) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="grid profile-stats">' +
        statTile('💰', money(u.balance), 'Wallet') +
        statTile('🏆', u.tournamentsWon, 'Tournaments won') +
        statTile('💵', money(u.totalEarnings), 'Total earnings') +
        statTile('🎯', kd, 'K/D ratio') +
        statTile('🎮', regCount, 'Joined') +
        statTile('🔫', u.kills, 'Total kills') +
      '</div>' +
      '<div class="profile-actions">' +
        '<a href="#/wallet" class="btn btn-ghost">Wallet</a>' +
        '<a href="#/my-tournaments" class="btn btn-ghost">My Matches</a>' +
        (u.role === 'admin' ? '<a href="#/admin" class="btn btn-ghost">🛠️ Admin</a>' : '') +
        '<button class="btn btn-danger" id="logoutBtn2">Log Out</button>' +
      '</div>' +
    '</section>');

    node.querySelector('#logoutBtn2').addEventListener('click', function () {
      Auth.logout(); UI.toast('Logged out.', 'info'); location.hash = '#/'; if (window.App) App.refreshChrome();
    });
    return node;

    function statTile(ic, val, label) {
      return '<div class="stile glass"><span class="stile-ic">' + ic + '</span><span class="stile-val">' + val + '</span><span class="stile-label muted">' + label + '</span></div>';
    }
  }

  window.Pages = {
    landing: landing, tournaments: tournaments, tournamentDetail: tournamentDetail,
    myTournaments: myTournaments, wallet: wallet, leaderboard: leaderboard,
    loginPage: loginPage, registerPage: registerPage, profile: profile, brackets: brackets,
    startRegistration: startRegistration, submitResult: submitResult,
    registrationSuccess: registrationSuccess,
  };
})();
