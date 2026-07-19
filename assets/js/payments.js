/* =========================================================================
 * LegentArena — Payments (Razorpay-style, simulated by default)
 * Charges REAL rupees; the wallet credits COINS (1 Coin = ₹coinPerRupee).
 * If APP_CONFIG.RAZORPAY.enabled && SDK present -> real Razorpay.
 * ======================================================================= */
(function () {
  'use strict';

  function Pay(rupees, opts) {
    opts = opts || {};
    var cfg = (window.APP_CONFIG && APP_CONFIG.RAZORPAY) || {};
    if (cfg.enabled && cfg.keyId && window.Razorpay) return realRazorpay(rupees, opts, cfg);
    return simulate(rupees, opts);
  }

  function realRazorpay(rupees, opts, cfg) {
    return new Promise(function (resolve) {
      var rzp = new window.Razorpay({
        key: cfg.keyId, amount: Math.round(rupees * 100), currency: 'INR',
        name: (window.APP_CONFIG && APP_CONFIG.brand) || 'LegentArena',
        description: opts.description || 'Add Coins', theme: { color: '#2f7bff' },
        handler: function (res) { resolve({ status: 'success', paymentId: res.razorpay_payment_id }); },
        modal: { ondismiss: function () { resolve({ status: 'cancelled' }); } },
      });
      rzp.open();
    });
  }

  function simulate(rupees, opts) {
    return new Promise(function (resolve) {
      var E = UI.el;
      var body = E('div', { class: 'pay' }, [
        E('div', { class: 'pay-head' }, [
          E('div', { class: 'pay-logo' }, ['🔒']),
          E('div', {}, [
            E('div', { class: 'pay-brand' }, [(window.APP_CONFIG && APP_CONFIG.brand) || 'LegentArena']),
            E('div', { class: 'pay-secure' }, ['UPI / Card / Netbanking • 100% secure']),
          ]),
        ]),
        E('div', { class: 'pay-amount' }, [
          E('span', { class: 'pay-amount-label' }, [opts.description || 'Amount payable']),
          E('span', { class: 'pay-amount-val' }, [UI.rupees(rupees)]),
        ]),
        E('div', { class: 'pay-methods' }, [
          row('📱', 'UPI', 'GPay / PhonePe / Paytm'),
          row('💳', 'Card', 'Visa / Mastercard / RuPay'),
          row('🏦', 'Netbanking', 'All major banks'),
        ]),
        E('p', { class: 'pay-note muted' }, ['Demo gateway — no real money moves. Choose an outcome to simulate the bank response.']),
      ]);

      var m = UI.openModal({
        title: 'Pay ' + UI.rupees(rupees), node: body,
        actions: [
          { label: 'Fail', kind: 'danger', onClick: function () { finish({ status: 'failed', reason: 'Payment declined by bank (simulated).' }); } },
          { label: 'Pay Now', kind: 'primary', onClick: function () { processing(); return true; } },
        ],
      });

      var settled = false;
      function finish(r) { if (settled) return; settled = true; UI.closeModal(); resolve(r); }
      function processing() {
        body.innerHTML = '';
        body.appendChild(E('div', { class: 'pay-processing' }, [E('div', { class: 'spinner' }), E('div', { class: 'pay-proc-text' }, ['Contacting bank…'])]));
        var foot = m.overlay.querySelector('.sheet-foot'); if (foot) foot.style.display = 'none';
        setTimeout(function () { finish({ status: 'success', paymentId: 'pay_sim_' + Date.now().toString(36) }); }, 1300);
      }
      function row(ic, name, sub) {
        return E('div', { class: 'pay-method' }, [
          E('span', { class: 'pay-method-ic' }, [ic]),
          E('div', {}, [E('div', { class: 'pay-method-name' }, [name]), E('div', { class: 'pay-method-sub muted' }, [sub])]),
          E('span', { class: 'pay-method-dot' }, ['›']),
        ]);
      }
    });
  }

  window.Payments = { Pay: Pay };
})();
