/* =========================================================================
 * LegentArena — UI utilities: coins, app-bar/screen, toasts, modals, forms
 * ======================================================================= */
(function () {
  'use strict';

  var RUPEE = (window.APP_CONFIG && APP_CONFIG.rupee) || '₹';

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c == null) return; n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function num(n) { return Number(n || 0).toLocaleString('en-IN'); }
  function rupees(n) { return RUPEE + num(n); }

  /* Coin chip: gold coin + number (Coins == ₹ value, 1:1 by default). */
  function coins(n, opts) {
    opts = opts || {};
    return '<span class="coins ' + (opts.cls || '') + '"><span class="coin-ic">' + RUPEE + '</span>' + num(n) + '</span>';
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
    return isNaN(d) ? iso : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
  function fmtDateTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  function startAt(dateStr, timeStr) { return new Date((dateStr || '') + 'T' + (timeStr || '00:00') + ':00'); }
  function timeUntil(dateStr, timeStr) {
    var target = startAt(dateStr, timeStr), diff = target - new Date();
    if (isNaN(target)) return '';
    if (diff <= 0) return 'Started';
    var d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000);
    if (d > 0) return d + 'd ' + h + 'h';
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
  }

  /* ---- Screen builder: navy app-bar + scrollable body ---- */
  function screen(opts) {
    opts = opts || {};
    var bar = el('header', { class: 'appbar' }, [
      opts.back === false ? el('span', { class: 'appbar-spacer' }) :
        el('button', { class: 'appbar-back', 'aria-label': 'Back', onclick: function () {
          if (opts.backTo) location.hash = opts.backTo;
          else if (history.length > 1) history.back();
          else location.hash = '#/';
        } }, ['‹']),
      el('h1', { class: 'appbar-title' }, [opts.title || '']),
      opts.rightNode || el('span', { class: 'appbar-spacer', html: opts.rightHTML || '' }),
    ]);
    var body = el('div', { class: 'screen-body ' + (opts.bodyClass || '') });
    if (opts.node) body.appendChild(opts.node);
    else if (opts.html) body.innerHTML = opts.html;
    var wrap = el('section', { class: 'screen' }, [bar, body]);
    wrap._body = body;
    return wrap;
  }

  /* ---- Toasts ---- */
  function toast(message, type) {
    var root = document.getElementById('toastRoot'); if (!root) return;
    var icon = { success: '✅', error: '⚠️', info: '💡', warn: '🔔', coin: '🪙' }[type || 'info'] || '💡';
    var t = el('div', { class: 'toast toast-' + (type || 'info') }, [
      el('span', { class: 'toast-ic' }, [icon]), el('span', { class: 'toast-msg' }, [message]),
    ]);
    root.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, 3200);
  }

  /* ---- Modal / sheet ---- */
  var active = null;
  function closeModal() {
    if (!active) return;
    active.classList.remove('show');
    var ref = active; setTimeout(function () { ref.remove(); }, 220);
    active = null; document.body.classList.remove('no-scroll');
  }
  function openModal(opts) {
    closeModal(); opts = opts || {};
    var overlay = el('div', { class: 'sheet-overlay' });
    var box = el('div', { class: 'sheet ' + (opts.size === 'lg' ? 'sheet-lg' : '') });
    var head = el('div', { class: 'sheet-head' }, [
      el('div', { class: 'sheet-grip' }),
      el('h3', { class: 'sheet-title' }, [opts.title || '']),
      el('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: closeModal }, ['✕']),
    ]);
    var body = el('div', { class: 'sheet-body' });
    if (opts.node) body.appendChild(opts.node); else if (opts.bodyHTML) body.innerHTML = opts.bodyHTML;
    box.appendChild(head); box.appendChild(body);
    if (opts.actions && opts.actions.length) {
      var foot = el('div', { class: 'sheet-foot' });
      opts.actions.forEach(function (a) {
        foot.appendChild(el('button', { class: 'btn ' + (a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : 'btn-ghost'),
          onclick: function () { var keep = a.onClick ? a.onClick() : false; if (!keep && !a.keep) closeModal(); } }, [a.label]));
      });
      box.appendChild(foot);
    }
    overlay.appendChild(box);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.getElementById('modalRoot').appendChild(overlay);
    document.body.classList.add('no-scroll'); active = overlay;
    requestAnimationFrame(function () { overlay.classList.add('show'); });
    return { overlay: overlay, body: body, close: closeModal };
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  function confirm(opts) {
    return new Promise(function (resolve) {
      openModal({ title: opts.title || 'Are you sure?', bodyHTML: '<p class="muted">' + esc(opts.message || '') + '</p>',
        actions: [
          { label: opts.cancelLabel || 'Cancel', kind: 'ghost', onClick: function () { resolve(false); } },
          { label: opts.confirmLabel || 'Confirm', kind: opts.danger ? 'danger' : 'primary', onClick: function () { resolve(true); } },
        ] });
    });
  }

  var Validate = {
    username: function (v) { return /^[a-zA-Z0-9_.]{3,18}$/.test(v || ''); },
    mobile: function (v) { return /^[6-9]\d{9}$/.test(v || ''); },
    ffuid: function (v) { return /^\d{6,12}$/.test(v || ''); },
    password: function (v) { return (v || '').length >= 6; },
    upi: function (v) { return /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(v || ''); },
    amount: function (v) { return Number(v) > 0 && Number(v) <= 200000; },
  };
  function fieldError(input, msg) { var w = input.closest('.field'); if (!w) return; w.classList.add('has-error'); var e = w.querySelector('.field-err'); if (e) e.textContent = msg || ''; }
  function clearError(input) { var w = input.closest('.field'); if (!w) return; w.classList.remove('has-error'); var e = w.querySelector('.field-err'); if (e) e.textContent = ''; }

  window.UI = {
    el: el, esc: esc, num: num, rupees: rupees, coins: coins,
    fmtDate: fmtDate, fmtDateTime: fmtDateTime, timeUntil: timeUntil, startAt: startAt,
    screen: screen, toast: toast, openModal: openModal, closeModal: closeModal, confirm: confirm,
    Validate: Validate, fieldError: fieldError, clearError: clearError,
  };
})();
