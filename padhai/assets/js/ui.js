/* UI helpers: DOM building, toasts, modals, formatting (हिंदी). */
(function () {
  const HI_DIGITS = null; // keep Latin digits — students read marks/percentages that way

  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      const v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'style') n.setAttribute('style', v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { n.dataset[d] = v[d]; });
      else n.setAttribute(k, v === true ? '' : v);
    });
    (Array.isArray(children) ? children : children != null ? [children] : [])
      .forEach(function (c) {
        if (c == null || c === false) return;
        n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
      });
    return n;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  /* ---------- formatting ---------- */
  const MONTHS_HI = ['जन','फ़र','मार्च','अप्रैल','मई','जून','जुल','अग','सित','अक्तू','नव','दिस'];
  const DAYS_HI = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'];

  function today() {
    // IST-anchored "today" so the daily log lines up with the student's day
    const d = new Date(Date.now() + (330 + new Date().getTimezoneOffset()) * 60000);
    return d.toISOString().slice(0, 10);
  }
  function dateHi(iso) {
    if (!iso) return '—';
    const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
    if (isNaN(d)) return '—';
    return d.getDate() + ' ' + MONTHS_HI[d.getMonth()] + ' ' + d.getFullYear();
  }
  function dayNameHi(iso) {
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? '' : DAYS_HI[d.getDay()];
  }
  function daysBetween(aIso, bIso) {
    return Math.round((new Date(bIso + 'T00:00:00') - new Date(aIso + 'T00:00:00')) / 86400000);
  }
  function addDays(iso, n) {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function pct(n) { return Math.max(0, Math.min(100, Math.round(n || 0))); }
  function mins(m) {
    m = Math.max(0, Math.round(m || 0));
    const h = Math.floor(m / 60), r = m % 60;
    return h ? (r ? h + ' घं ' + r + ' मि' : h + ' घंटे') : r + ' मिनट';
  }
  function clock(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    const m = Math.floor(sec / 60), s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function bytes(b) {
    if (!b) return '—';
    const u = ['B', 'KB', 'MB', 'GB'];
    let i = 0; b = Number(b);
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return (b >= 10 || i === 0 ? Math.round(b) : b.toFixed(1)) + ' ' + u[i];
  }

  /* ---------- toast ---------- */
  function toast(msg, kind) {
    const root = document.getElementById('toasts');
    const t = el('div', { class: 'toast' + (kind ? ' ' + kind : ''), text: msg });
    root.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .25s, transform .25s';
      t.style.opacity = '0'; t.style.transform = 'translateY(8px)';
      setTimeout(function () { t.remove(); }, 260);
    }, kind === 'err' ? 3800 : 2400);
  }

  /* ---------- modal ---------- */
  function modal(opts) {
    const root = document.getElementById('modals');
    const box = el('div', { class: 'modal' + (opts.wide ? ' wide' : '') });
    const overlay = el('div', { class: 'overlay' }, box);
    if (opts.wide) box.style.maxWidth = '680px';

    function close() { overlay.remove(); document.body.style.overflow = ''; }

    box.appendChild(el('div', { class: 'modal-head' }, [
      el('h3', { text: opts.title || '' }),
      el('button', { class: 'x-btn', text: '×', 'aria-label': 'बंद करें', onclick: close })
    ]));

    const body = el('div', { class: 'modal-body' });
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);
    box.appendChild(body);

    if (opts.actions && opts.actions.length) {
      const foot = el('div', { class: 'modal-foot' });
      opts.actions.forEach(function (a) {
        const btn = el('button', {
          class: 'btn ' + (a.class || ''),
          text: a.label,
          onclick: function () {
            const r = a.onClick ? a.onClick({ close: close, body: body, button: btn }) : undefined;
            if (r !== true) close();      // return true to keep the modal open
          }
        });
        foot.appendChild(btn);
      });
      box.appendChild(foot);
    }

    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay && opts.dismissable !== false) close(); });
    document.addEventListener('keydown', function onKey(e) {
      if (!document.body.contains(overlay)) { document.removeEventListener('keydown', onKey); return; }
      if (e.key === 'Escape' && opts.dismissable !== false) { close(); document.removeEventListener('keydown', onKey); }
    });

    root.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    const first = body.querySelector('input, select, textarea');
    if (first) setTimeout(function () { first.focus(); }, 60);
    return { close: close, body: body };
  }

  function confirm(opts) {
    return new Promise(function (resolve) {
      modal({
        title: opts.title || 'पक्का?',
        body: el('p', { class: 'muted', text: opts.message || '' }),
        dismissable: true,
        actions: [
          { label: opts.cancel || 'रहने दें', class: 'btn-ghost', onClick: function () { resolve(false); } },
          { label: opts.ok || 'हाँ', class: opts.danger ? 'btn-danger' : 'btn-primary', onClick: function () { resolve(true); } }
        ]
      });
    });
  }

  /* ---------- small builders ---------- */
  function chip(text, kind) { return el('span', { class: 'chip' + (kind ? ' chip-' + kind : ''), text: text }); }

  function bar(percent, kind) {
    return el('div', { class: 'bar' + (kind ? ' ' + kind : '') }, el('i', { style: 'width:' + pct(percent) + '%' }));
  }

  function ring(percent, color, label) {
    return el('div', { class: 'ring', style: '--p:' + pct(percent) + ';--c:' + (color || 'var(--brand)') },
      el('span', { text: label != null ? label : pct(percent) + '%' }));
  }

  function stat(value, label, note) {
    return el('div', { class: 'stat' }, [
      el('div', { class: 'stat-v', text: value }),
      el('div', { class: 'stat-l', text: label }),
      note ? el('div', { class: 'stat-note', text: note }) : null
    ]);
  }

  function insight(kind, icon, title, detail) {
    return el('div', { class: 'insight ' + kind }, [
      el('div', { class: 'insight-ic', text: icon }),
      el('div', {}, [
        el('div', { class: 'insight-t', text: title }),
        detail ? el('div', { class: 'insight-d', text: detail }) : null
      ])
    ]);
  }

  function empty(icon, title, detail, action) {
    return el('div', { class: 'empty' }, [
      el('div', { class: 'empty-ic', text: icon }),
      el('h4', { text: title }),
      detail ? el('div', { class: 'small', text: detail }) : null,
      action ? el('div', { class: 'mt16' }, action) : null
    ]);
  }

  function loading(text) {
    return el('div', { class: 'loading' }, el('div', { class: 'center' }, [
      el('span', { class: 'spin' }),
      el('div', { class: 'small dim mt8', text: text || 'लोड हो रहा है…' })
    ]));
  }

  function field(label, control, hint) {
    return el('div', { class: 'field' }, [
      el('label', { class: 'label', text: label }),
      control,
      hint ? el('div', { class: 'tiny dim mt8', text: hint }) : null
    ]);
  }

  function input(attrs) { return el('input', Object.assign({ class: 'input' }, attrs || {})); }
  function select(options, attrs) {
    const s = el('select', Object.assign({ class: 'select' }, attrs || {}));
    options.forEach(function (o) {
      s.appendChild(el('option', { value: o.value, text: o.label, selected: o.selected }));
    });
    return s;
  }

  function showError(inputEl, msg) {
    inputEl.classList.add('bad');
    const next = inputEl.parentNode.querySelector('.err');
    if (next) next.remove();
    inputEl.parentNode.appendChild(el('div', { class: 'err', text: msg }));
  }
  function clearErrors(scope) {
    scope.querySelectorAll('.err').forEach(function (e) { e.remove(); });
    scope.querySelectorAll('.bad').forEach(function (e) { e.classList.remove('bad'); });
  }

  window.UI = {
    el: el, esc: esc, clear: clear,
    today: today, dateHi: dateHi, dayNameHi: dayNameHi, daysBetween: daysBetween, addDays: addDays,
    pct: pct, mins: mins, clock: clock, bytes: bytes,
    toast: toast, modal: modal, confirm: confirm,
    chip: chip, bar: bar, ring: ring, stat: stat, insight: insight,
    empty: empty, loading: loading, field: field, input: input, select: select,
    showError: showError, clearErrors: clearErrors
  };
})();
