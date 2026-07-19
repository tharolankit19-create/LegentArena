/* =========================================================================
 * LegentArena — Payments
 * Simulated Razorpay-style checkout. If APP_CONFIG.RAZORPAY.enabled is true
 * AND the real checkout script is present, it hands off to real Razorpay.
 * Otherwise it shows a realistic simulation modal (success/failure).
 * ======================================================================= */
(function () {
  'use strict';

  /**
   * Pay(amount, opts) -> Promise resolving to
   *   { status:'success', paymentId } | { status:'failed', reason } | { status:'cancelled' }
   */
  function Pay(amount, opts) {
    opts = opts || {};
    var cfg = (window.APP_CONFIG && APP_CONFIG.RAZORPAY) || {};

    // Real Razorpay path (only if enabled AND SDK loaded AND a public key set).
    if (cfg.enabled && cfg.keyId && window.Razorpay) {
      return realRazorpay(amount, opts, cfg);
    }
    return simulate(amount, opts);
  }

  function realRazorpay(amount, opts, cfg) {
    return new Promise(function (resolve) {
      // In production you must create an order server-side and pass order_id here.
      var rzp = new window.Razorpay({
        key: cfg.keyId,
        amount: Math.round(amount * 100),
        currency: 'INR',
        name: (window.APP_CONFIG && APP_CONFIG.brand) || 'LegentArena',
        description: opts.description || 'Tournament payment',
        theme: { color: '#ff7a18' },
        handler: function (res) { resolve({ status: 'success', paymentId: res.razorpay_payment_id }); },
        modal: { ondismiss: function () { resolve({ status: 'cancelled' }); } },
      });
      rzp.open();
    });
  }

  function simulate(amount, opts) {
    return new Promise(function (resolve) {
      var UIel = UI.el;
      var body = UIel('div', { class: 'pay' }, [
        UIel('div', { class: 'pay-head' }, [
          UIel('div', { class: 'pay-logo' }, ['🔒']),
          UIel('div', {}, [
            UIel('div', { class: 'pay-brand' }, [(window.APP_CONFIG && APP_CONFIG.brand) || 'LegentArena']),
            UIel('div', { class: 'pay-secure' }, ['Secure checkout • simulated']),
          ]),
        ]),
        UIel('div', { class: 'pay-amount' }, [
          UIel('span', { class: 'pay-amount-label' }, [opts.description || 'Amount payable']),
          UIel('span', { class: 'pay-amount-val' }, [UI.money(amount)]),
        ]),
        UIel('div', { class: 'pay-methods' }, [
          methodRow('📱', 'UPI', 'GPay / PhonePe / Paytm'),
          methodRow('💳', 'Card', 'Visa / Mastercard / RuPay'),
          methodRow('🏦', 'Netbanking', 'All major banks'),
        ]),
        UIel('p', { class: 'pay-note muted' }, ['This is a demo. No real money moves. Choose an outcome below to simulate the gateway response.']),
      ]);

      var m = UI.openModal({
        title: 'Complete Payment',
        node: body,
        actions: [
          { label: 'Simulate Failure', kind: 'danger', onClick: function () {
              finish({ status: 'failed', reason: 'Payment declined by bank (simulated).' });
            } },
          { label: 'Pay ' + UI.money(amount), kind: 'primary', onClick: function () {
              runProcessing();
              return true; // keep modal open; we control closing
            } },
        ],
      });

      var settled = false;
      function finish(result) {
        if (settled) return;
        settled = true;
        UI.closeModal();
        resolve(result);
      }

      function runProcessing() {
        body.innerHTML = '';
        body.appendChild(UIel('div', { class: 'pay-processing' }, [
          UIel('div', { class: 'spinner' }),
          UIel('div', { class: 'pay-proc-text' }, ['Contacting gateway…']),
        ]));
        // hide footer buttons during processing
        var foot = m.overlay.querySelector('.modal-foot');
        if (foot) foot.style.display = 'none';
        setTimeout(function () {
          finish({ status: 'success', paymentId: 'pay_sim_' + Date.now().toString(36) });
        }, 1400);
      }

      function methodRow(icon, name, sub) {
        return UIel('div', { class: 'pay-method' }, [
          UIel('span', { class: 'pay-method-ic' }, [icon]),
          UIel('div', {}, [
            UIel('div', { class: 'pay-method-name' }, [name]),
            UIel('div', { class: 'pay-method-sub muted' }, [sub]),
          ]),
          UIel('span', { class: 'pay-method-dot' }, ['›']),
        ]);
      }
    });
  }

  window.Payments = { Pay: Pay };
})();
