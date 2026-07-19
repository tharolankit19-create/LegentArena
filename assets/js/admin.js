/* =========================================================================
 * LegentArena — Admin panel
 * Create/edit tournaments, verify results (auto prize distribution),
 * manage withdrawals, view users. Gated behind admin role + password.
 * ======================================================================= */
(function () {
  'use strict';

  var esc = UI.esc, money = UI.money;

  function frag(html) { var d = document.createElement('div'); d.innerHTML = html; return d; }

  function gate() {
    // Must be admin-role AND pass a password check per session (sessionStorage).
    var u = Auth.current();
    if (!u || u.role !== 'admin') {
      return { ok: false, node: frag('' +
        '<section class="section"><div class="empty glass"><span class="empty-ic">🔒</span>' +
        '<h2>Admin access only</h2><p class="muted">Log in with an admin account to continue.</p>' +
        '<a href="#/login" class="btn btn-primary btn-sm">Go to login</a></div></section>') };
    }
    if (sessionStorage.getItem('ffth_admin_ok') === '1') return { ok: true };
    return { ok: 'password' };
  }

  function passwordPrompt() {
    var body = frag('' +
      '<div class="admin-lock">' +
        '<div class="lock-ic">🔐</div>' +
        '<p class="muted">Enter the admin password to open the control room.</p>' +
        '<div class="field"><input id="admPw" type="password" placeholder="Admin password" /><span class="field-err"></span></div>' +
      '</div>');
    UI.openModal({
      title: 'Admin Authentication',
      node: body,
      actions: [
        { label: 'Cancel', kind: 'ghost', onClick: function () { location.hash = '#/'; } },
        { label: 'Unlock', kind: 'primary', onClick: function () {
            var i = body.querySelector('#admPw');
            var pw = (window.APP_CONFIG && APP_CONFIG.adminPassword) || 'admin123';
            if (i.value !== pw) { UI.fieldError(i, 'Incorrect password.'); return true; }
            sessionStorage.setItem('ffth_admin_ok', '1');
            UI.closeModal();
            if (window.App) App.route();
          } },
      ],
    });
  }

  function panel() {
    var g = gate();
    if (g.node) return g.node;
    if (g === 'password' || g.ok === 'password') { setTimeout(passwordPrompt, 30); return frag('<section class="section"></section>'); }

    var tab = (location.hash.split('?')[1] || '').replace('tab=', '') || 'tournaments';

    var node = frag('' +
    '<section class="section admin">' +
      '<div class="page-head"><h1 class="page-title">🛠️ Admin Control Room</h1><p class="muted">Manage the arena.</p></div>' +
      statsRow() +
      '<div class="filter-group admin-tabs" id="admTabs">' +
        tabBtn('tournaments', '🎮 Tournaments', tab) +
        tabBtn('results', '📸 Results', tab) +
        tabBtn('withdrawals', '💸 Withdrawals', tab) +
        tabBtn('users', '👥 Users', tab) +
      '</div>' +
      '<div id="admBody"></div>' +
    '</section>');

    node.querySelector('#admTabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tab]'); if (!b) return;
      tab = b.getAttribute('data-tab');
      node.querySelectorAll('#admTabs .fbtn').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      renderTab(node.querySelector('#admBody'), tab);
    });

    renderTab(node.querySelector('#admBody'), tab);
    return node;
  }

  function tabBtn(key, label, active) {
    return '<button class="fbtn ' + (key === active ? 'active' : '') + '" data-tab="' + key + '">' + label + '</button>';
  }

  function statsRow() {
    var users = Store.users().filter(function (u) { return u.role === 'user'; });
    var tours = Store.tournaments();
    var pendingRes = Store.matches().filter(function (m) { return !m.verified; }).length;
    var pendingWd = Store.transactions().filter(function (t) { return t.status === 'pending'; }).length;
    var revenue = Store.transactions().filter(function (t) { return t.type === 'debit' && t.status === 'success' && /^Entry:/.test(t.description); })
      .reduce(function (s, t) { return s + t.amount; }, 0);
    function tile(ic, v, l) { return '<div class="stile glass"><span class="stile-ic">' + ic + '</span><span class="stile-val">' + v + '</span><span class="stile-label muted">' + l + '</span></div>'; }
    return '<div class="grid admin-stats">' +
      tile('👥', users.length, 'Players') +
      tile('🎮', tours.length, 'Tournaments') +
      tile('📸', pendingRes, 'Results pending') +
      tile('💸', pendingWd, 'Withdrawals pending') +
      tile('💰', money(revenue), 'Entry revenue') +
    '</div>';
  }

  function renderTab(body, tab) {
    if (tab === 'tournaments') return renderTournaments(body);
    if (tab === 'results') return renderResults(body);
    if (tab === 'withdrawals') return renderWithdrawals(body);
    if (tab === 'users') return renderUsers(body);
  }

  /* ---- Tournaments management ---- */
  function renderTournaments(body) {
    var tours = Store.tournaments().slice().sort(function (a, b) { return (b.date).localeCompare(a.date); });
    body.innerHTML = '' +
      '<div class="admin-bar"><button class="btn btn-primary btn-sm" id="newTour">＋ New Tournament</button></div>' +
      '<div class="admin-list">' + tours.map(function (t) {
        var filled = Store.registeredCount(t.id);
        return '<div class="admin-row glass">' +
          '<div class="ar-main"><strong>' + esc(t.title) + '</strong>' +
            '<div class="muted small">' + esc(t.type) + ' • ' + UI.fmtDate(t.date) + ' ' + esc(t.time) + ' • ' + filled + '/' + t.maxTeams + ' • ' + money(t.prizePool) + '</div></div>' +
          '<div class="ar-actions">' +
            '<select class="status-sel" data-status="' + t.id + '">' +
              ['upcoming', 'live', 'completed'].map(function (s) { return '<option value="' + s + '"' + (t.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
            '</select>' +
            '<button class="btn btn-ghost btn-sm" data-edit="' + t.id + '">Edit</button>' +
            '<button class="btn btn-danger btn-sm" data-del="' + t.id + '">Delete</button>' +
          '</div>' +
        '</div>';
      }).join('') + '</div>';

    body.querySelector('#newTour').addEventListener('click', function () { tourForm(null, body); });
    body.querySelectorAll('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () { tourForm(b.getAttribute('data-edit'), body); });
    });
    body.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        UI.confirm({ title: 'Delete tournament?', message: 'This cannot be undone.', danger: true, confirmLabel: 'Delete' })
          .then(function (ok) {
            if (!ok) return;
            var id = b.getAttribute('data-del');
            Store.saveTournaments(Store.tournaments().filter(function (t) { return t.id !== id; }));
            UI.toast('Tournament deleted.', 'info');
            renderTournaments(body);
          });
      });
    });
    body.querySelectorAll('[data-status]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var t = Store.tournamentById(sel.getAttribute('data-status'));
        t.status = sel.value; Store.upsertTournament(t);
        UI.toast('Status updated to ' + sel.value + '.', 'success');
      });
    });
  }

  function tourForm(id, body) {
    var t = id ? Store.tournamentById(id) : {
      title: '', date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), time: '20:00',
      entryFee: 30, prizePool: 2000, maxTeams: 48, type: 'Solo', status: 'upcoming', map: 'Bermuda', rules: '',
    };
    var f = frag('' +
      '<div class="tour-form">' +
        '<div class="field"><label>Title</label><input id="f_title" value="' + esc(t.title) + '" /><span class="field-err"></span></div>' +
        '<div class="form-row">' +
          '<div class="field"><label>Date</label><input id="f_date" type="date" value="' + esc(t.date) + '" /></div>' +
          '<div class="field"><label>Time</label><input id="f_time" type="time" value="' + esc(t.time) + '" /></div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="field"><label>Type</label><select id="f_type">' +
            ['Solo', 'Duo', 'Squad'].map(function (x) { return '<option' + (t.type === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="field"><label>Map</label><input id="f_map" value="' + esc(t.map || '') + '" /></div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="field"><label>Entry Fee (₹)</label><input id="f_fee" type="number" min="0" value="' + t.entryFee + '" /></div>' +
          '<div class="field"><label>Prize Pool (₹)</label><input id="f_prize" type="number" min="0" value="' + t.prizePool + '" /></div>' +
          '<div class="field"><label>Max Teams</label><input id="f_max" type="number" min="2" value="' + t.maxTeams + '" /></div>' +
        '</div>' +
        '<div class="field"><label>Status</label><select id="f_status">' +
          ['upcoming', 'live', 'completed'].map(function (x) { return '<option' + (t.status === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label>Rules</label><textarea id="f_rules" rows="3">' + esc(t.rules || '') + '</textarea></div>' +
      '</div>');

    UI.openModal({
      title: id ? '✏️ Edit Tournament' : '＋ New Tournament',
      node: f, size: 'lg',
      actions: [
        { label: 'Cancel', kind: 'ghost' },
        { label: id ? 'Save Changes' : 'Create', kind: 'primary', onClick: function () {
            var title = f.querySelector('#f_title').value.trim();
            if (title.length < 3) { UI.fieldError(f.querySelector('#f_title'), 'Title too short.'); return true; }
            var data = {
              id: id || Store.uid('t'),
              title: title,
              date: f.querySelector('#f_date').value,
              time: f.querySelector('#f_time').value,
              type: f.querySelector('#f_type').value,
              map: f.querySelector('#f_map').value.trim(),
              entryFee: Math.max(0, Number(f.querySelector('#f_fee').value) || 0),
              prizePool: Math.max(0, Number(f.querySelector('#f_prize').value) || 0),
              maxTeams: Math.max(2, Number(f.querySelector('#f_max').value) || 2),
              status: f.querySelector('#f_status').value,
              rules: f.querySelector('#f_rules').value.trim(),
              createdAt: (id && t.createdAt) || new Date().toISOString(),
            };
            Store.upsertTournament(data);
            UI.closeModal();
            UI.toast(id ? 'Tournament updated.' : 'Tournament created!', 'success');
            renderTournaments(body);
          } },
      ],
    });
  }

  /* ---- Result verification (auto prize distribution) ---- */
  function renderResults(body) {
    var matches = Store.matches().slice().sort(function (a, b) { return (a.verified === b.verified) ? 0 : a.verified ? 1 : -1; });
    if (!matches.length) {
      body.innerHTML = '<div class="empty glass"><span class="empty-ic">📸</span><p class="muted">No result submissions yet.</p></div>';
      return;
    }
    body.innerHTML = '<div class="admin-list">' + matches.map(function (m) {
      var t = Store.tournamentById(m.tournamentId);
      var submitter = Store.userById(m.submittedBy);
      var prize = t ? prizeForPlacement(t, m.placement) : 0;
      return '<div class="admin-row glass result-row">' +
        (m.screenshot ? '<img class="result-thumb" src="' + m.screenshot + '" alt="result" data-shot="' + m.id + '" />' : '') +
        '<div class="ar-main">' +
          '<strong>' + esc(submitter ? submitter.username : m.team1) + '</strong> — ' + esc(t ? t.title : 'Unknown') +
          '<div class="muted small">Placement: #' + (m.placement || '?') + ' • Kills: ' + (m.kills || 0) +
            ' • Prize: ' + money(prize) + ' • ' + UI.fmtDateTime(m.createdAt) + '</div>' +
        '</div>' +
        '<div class="ar-actions">' +
          (m.verified
            ? '<span class="pill pill-live">✅ Verified</span>'
            : '<button class="btn btn-danger btn-sm" data-reject="' + m.id + '">Reject</button>' +
              '<button class="btn btn-primary btn-sm" data-verify="' + m.id + '">Verify & Pay</button>') +
        '</div>' +
      '</div>';
    }).join('') + '</div>';

    body.querySelectorAll('[data-shot]').forEach(function (img) {
      img.addEventListener('click', function () {
        UI.openModal({ title: 'Result Screenshot', bodyHTML: '<img src="' + img.src + '" style="width:100%;border-radius:12px" alt="result" />' });
      });
    });
    body.querySelectorAll('[data-verify]').forEach(function (b) {
      b.addEventListener('click', function () { verifyMatch(b.getAttribute('data-verify'), body); });
    });
    body.querySelectorAll('[data-reject]').forEach(function (b) {
      b.addEventListener('click', function () {
        UI.confirm({ title: 'Reject result?', message: 'The submission will be removed.', danger: true, confirmLabel: 'Reject' })
          .then(function (ok) {
            if (!ok) return;
            var id = b.getAttribute('data-reject');
            Store.saveMatches(Store.matches().filter(function (m) { return m.id !== id; }));
            UI.toast('Result rejected.', 'info');
            renderResults(body);
          });
      });
    });
  }

  function prizeForPlacement(t, placement) {
    if (placement === 1) return Math.round(t.prizePool * 0.5);
    if (placement === 2) return Math.round(t.prizePool * 0.3);
    if (placement === 3) return Math.round(t.prizePool * 0.2);
    return 0;
  }

  function verifyMatch(id, body) {
    var matches = Store.matches();
    var m = matches.find(function (x) { return x.id === id; });
    if (!m || m.verified) return;
    var t = Store.tournamentById(m.tournamentId);
    var prize = prizeForPlacement(t, m.placement);

    UI.confirm({
      title: 'Verify & distribute prize?',
      message: 'This credits ' + money(prize) + ' to the player\'s wallet' + (m.placement === 1 ? ' and marks them as a tournament winner.' : '.'),
      confirmLabel: 'Verify & Pay',
    }).then(function (ok) {
      if (!ok) return;
      m.verified = true;
      m.verifiedAt = new Date().toISOString();
      Store.saveMatches(matches);

      var player = Store.userById(m.submittedBy);
      if (player) {
        if (prize > 0) {
          Store.credit(player.id, prize, 'Prize: ' + (t ? t.title : 'Tournament') + ' (#' + m.placement + ')');
          player = Store.userById(player.id);
          player.totalEarnings = Math.round((player.totalEarnings + prize) * 100) / 100;
        }
        player.matchesPlayed = (player.matchesPlayed || 0) + 1;
        player.kills = (player.kills || 0) + (m.kills || 0);
        player.deaths = (player.deaths || 0) + 1;
        if (m.placement === 1) player.tournamentsWon = (player.tournamentsWon || 0) + 1;
        Store.upsertUser(player);
      }
      UI.toast(prize > 0 ? money(prize) + ' paid out to ' + (player ? player.username : 'player') + '!' : 'Result verified.', 'success');
      renderResults(body);
      if (window.App) App.refreshChrome();
    });
  }

  /* ---- Withdrawals ---- */
  function renderWithdrawals(body) {
    var wds = Store.transactions().filter(function (t) { return t.meta && t.meta.kind === 'withdrawal'; });
    if (!wds.length) {
      body.innerHTML = '<div class="empty glass"><span class="empty-ic">💸</span><p class="muted">No withdrawal requests.</p></div>';
      return;
    }
    body.innerHTML = '<div class="admin-list">' + wds.map(function (w) {
      var user = Store.userById(w.userId);
      return '<div class="admin-row glass">' +
        '<div class="ar-main"><strong>' + money(w.amount) + '</strong> → ' + esc(w.meta.upi) +
          '<div class="muted small">' + esc(user ? user.username : 'user') + ' • ' + UI.fmtDateTime(w.date) + '</div></div>' +
        '<div class="ar-actions">' +
          (w.status === 'pending'
            ? '<button class="btn btn-danger btn-sm" data-wreject="' + w.id + '">Reject</button>' +
              '<button class="btn btn-primary btn-sm" data-wapprove="' + w.id + '">Approve Payout</button>'
            : '<span class="pill pill-' + (w.status === 'success' ? 'live' : 'completed') + '">' + w.status + '</span>') +
        '</div>' +
      '</div>';
    }).join('') + '</div>';

    body.querySelectorAll('[data-wapprove]').forEach(function (b) {
      b.addEventListener('click', function () { resolveWithdrawal(b.getAttribute('data-wapprove'), true, body); });
    });
    body.querySelectorAll('[data-wreject]').forEach(function (b) {
      b.addEventListener('click', function () { resolveWithdrawal(b.getAttribute('data-wreject'), false, body); });
    });
  }

  function resolveWithdrawal(txId, approve, body) {
    UI.confirm({
      title: approve ? 'Approve payout?' : 'Reject withdrawal?',
      message: approve ? 'Mark this UPI payout as completed.' : 'The held amount will be refunded to the user\'s wallet.',
      danger: !approve,
      confirmLabel: approve ? 'Approve' : 'Reject & Refund',
    }).then(function (ok) {
      if (!ok) return;
      var txns = Store.transactions();
      var tx = txns.find(function (x) { return x.id === txId; });
      if (!tx || tx.status !== 'pending') return;
      if (approve) {
        tx.status = 'success';
        Store.saveTransactions(txns);
        UI.toast('Payout approved.', 'success');
      } else {
        tx.status = 'failed';
        Store.saveTransactions(txns);
        // refund held funds
        Store.credit(tx.userId, tx.amount, 'Refund: withdrawal rejected');
        UI.toast('Withdrawal rejected and refunded.', 'info');
      }
      renderWithdrawals(body);
    });
  }

  /* ---- Users ---- */
  function renderUsers(body) {
    var users = Store.users();
    body.innerHTML = '<div class="admin-list">' + users.map(function (u) {
      return '<div class="admin-row glass">' +
        '<div class="lb-av">' + esc(u.username.slice(0, 1).toUpperCase()) + '</div>' +
        '<div class="ar-main"><strong>' + esc(u.username) + '</strong> ' +
          (u.role === 'admin' ? '<span class="pill pill-live">admin</span>' : '') +
          '<div class="muted small">📱 ' + esc(u.mobile) + ' • UID ' + esc(u.freeFireUID) +
            ' • Bal ' + money(u.balance) + ' • 🏆 ' + u.tournamentsWon + '</div></div>' +
        '<div class="ar-actions">' +
          '<button class="btn btn-ghost btn-sm" data-credit="' + u.id + '">Adjust ₹</button>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';

    body.querySelectorAll('[data-credit]').forEach(function (b) {
      b.addEventListener('click', function () { adjustBalance(b.getAttribute('data-credit'), body); });
    });
  }

  function adjustBalance(userId, body) {
    var u = Store.userById(userId);
    var f = frag('' +
      '<div class="money-form">' +
        '<div class="reg-wallet">' + esc(u.username) + ' — current: <strong>' + money(u.balance) + '</strong></div>' +
        '<div class="field"><label>Amount (use negative to deduct)</label><input id="adjAmt" type="number" placeholder="e.g. 100 or -50" /><span class="field-err"></span></div>' +
        '<div class="field"><label>Note</label><input id="adjNote" type="text" placeholder="Reason" value="Admin adjustment" /></div>' +
      '</div>');
    UI.openModal({
      title: 'Adjust Balance', node: f,
      actions: [
        { label: 'Cancel', kind: 'ghost' },
        { label: 'Apply', kind: 'primary', onClick: function () {
            var amt = Number(f.querySelector('#adjAmt').value);
            if (!amt) { UI.fieldError(f.querySelector('#adjAmt'), 'Enter a non-zero amount.'); return true; }
            var note = f.querySelector('#adjNote').value.trim() || 'Admin adjustment';
            if (amt > 0) Store.credit(userId, amt, note);
            else {
              var user = Store.userById(userId);
              if (user.balance + amt < 0) { UI.fieldError(f.querySelector('#adjAmt'), 'Would make balance negative.'); return true; }
              Store.debit(userId, -amt, note);
            }
            UI.closeModal();
            UI.toast('Balance adjusted.', 'success');
            renderUsers(body);
            if (window.App) App.refreshChrome();
          } },
      ],
    });
  }

  window.Admin = { panel: panel };
})();
