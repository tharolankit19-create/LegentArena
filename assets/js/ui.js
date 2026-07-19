/* =========================================================================
 * LegentArena — UI utilities: toasts, modals, formatting, validation
 * ======================================================================= */
(function () {
  'use strict';

  var CUR = (window.APP_CONFIG && APP_CONFIG.currency) || '₹';

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') node.addEventListener(k.slice(2), attrs[k]);
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  /* Escape user content before injecting into HTML strings. */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(n) {
    var v = Number(n || 0);
    return CUR + v.toLocaleString('en-IN', { maximumFractionDigits: v % 1 ? 2 : 0 });
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function fmtDateTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function timeUntil(dateStr, timeStr) {
    var target = new Date((dateStr || '') + 'T' + (timeStr || '00:00') + ':00');
    var diff = target - new Date();
    if (isNaN(target)) return '';
    if (diff <= 0) return 'Started';
    var d = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    if (d > 0) return 'in ' + d + 'd ' + h + 'h';
    if (h > 0) return 'in ' + h + 'h ' + m + 'm';
    return 'in ' + m + 'm';
  }

  /* ---- Toasts ---- */
  function toast(message, type) {
    var root = document.getElementById('toastRoot');
    if (!root) return;
    var icon = { success: '✅', error: '⚠️', info: '💡', warn: '🔔' }[type || 'info'] || '💡';
    var t = el('div', { class: 'toast toast-' + (type || 'info') }, [
      el('span', { class: 'toast-ic' }, [icon]),
      el('span', { class: 'toast-msg' }, [message]),
    ]);
    root.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 300);
    }, 3400);
  }

  /* ---- Modal ---- */
  var activeModal = null;

  function closeModal() {
    if (!activeModal) return;
    activeModal.classList.remove('show');
    var ref = activeModal;
    setTimeout(function () { ref.remove(); }, 220);
    activeModal = null;
    document.body.classList.remove('no-scroll');
  }

  /**
   * openModal({ title, bodyHTML, node, actions:[{label,kind,onClick,keep}], size })
   * Returns the overlay element. bodyHTML is trusted app-generated markup.
   */
  function openModal(opts) {
    closeModal();
    opts = opts || {};
    var overlay = el('div', { class: 'modal-overlay' });
    var box = el('div', { class: 'modal glass ' + (opts.size === 'lg' ? 'modal-lg' : '') });

    var head = el('div', { class: 'modal-head' }, [
      el('h3', { class: 'modal-title' }, [opts.title || '']),
      el('button', { class: 'modal-x', 'aria-label': 'Close', onclick: closeModal }, ['✕']),
    ]);
    var body = el('div', { class: 'modal-body' });
    if (opts.node) body.appendChild(opts.node);
    else if (opts.bodyHTML) body.innerHTML = opts.bodyHTML;

    box.appendChild(head);
    box.appendChild(body);

    if (opts.actions && opts.actions.length) {
      var foot = el('div', { class: 'modal-foot' });
      opts.actions.forEach(function (a) {
        foot.appendChild(el('button', {
          class: 'btn ' + (a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : 'btn-ghost'),
          onclick: function () {
            var keep = a.onClick ? a.onClick() : false;
            if (!keep && !a.keep) closeModal();
          },
        }, [a.label]));
      });
      box.appendChild(foot);
    }

    overlay.appendChild(box);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.getElementById('modalRoot').appendChild(overlay);
    document.body.classList.add('no-scroll');
    activeModal = overlay;
    requestAnimationFrame(function () { overlay.classList.add('show'); });
    return { overlay: overlay, body: body, close: closeModal };
  }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  /* ---- Confirm dialog ---- */
  function confirm(opts) {
    return new Promise(function (resolve) {
      openModal({
        title: opts.title || 'Are you sure?',
        bodyHTML: '<p class="muted">' + esc(opts.message || '') + '</p>',
        actions: [
          { label: opts.cancelLabel || 'Cancel', kind: 'ghost', onClick: function () { resolve(false); } },
          { label: opts.confirmLabel || 'Confirm', kind: opts.danger ? 'danger' : 'primary', onClick: function () { resolve(true); } },
        ],
      });
    });
  }

  /* ---- Validation helpers ---- */
  var Validate = {
    username: function (v) { return /^[a-zA-Z0-9_]{3,16}$/.test(v || ''); },
    mobile: function (v) { return /^[6-9]\d{9}$/.test(v || ''); },
    ffuid: function (v) { return /^\d{6,12}$/.test(v || ''); },
    password: function (v) { return (v || '').length >= 6; },
    upi: function (v) { return /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(v || ''); },
    amount: function (v) { return Number(v) > 0 && Number(v) <= 100000; },
  };

  function fieldError(input, msg) {
    var wrap = input.closest('.field');
    if (!wrap) return;
    wrap.classList.add('has-error');
    var e = wrap.querySelector('.field-err');
    if (e) e.textContent = msg || '';
  }
  function clearError(input) {
    var wrap = input.closest('.field');
    if (!wrap) return;
    wrap.classList.remove('has-error');
    var e = wrap.querySelector('.field-err');
    if (e) e.textContent = '';
  }

  window.UI = {
    el: el, esc: esc, money: money, fmtDate: fmtDate, fmtDateTime: fmtDateTime,
    timeUntil: timeUntil, toast: toast, openModal: openModal, closeModal: closeModal,
    confirm: confirm, Validate: Validate, fieldError: fieldError, clearError: clearError,
  };
})();
