/* =========================================================================
 * LegentArena — runtime configuration
 * -------------------------------------------------------------------------
 * SECURITY: Never place secret keys (Supabase service_role / sb_secret_...,
 * Razorpay key_secret, webhook secrets) in front-end code. Anything here
 * ships to the browser and is fully public. Only the Razorpay *public*
 * key_id (rzp_live_... / rzp_test_...) is safe to expose.
 *
 * To go live with real payments later:
 *   1. Set RAZORPAY.enabled = true
 *   2. Set RAZORPAY.keyId to your PUBLIC key id
 *   3. Add the Razorpay checkout script to index.html:
 *        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
 *   4. Run order-creation + webhook verification on a SERVER (never here).
 *
 * While disabled, the app uses a fully simulated payment modal so the whole
 * flow works with zero backend.
 * ======================================================================= */
window.APP_CONFIG = {
  brand: 'LegentArena',
  currency: '₹',

  // Starting demo values
  newUserBonus: 0,          // credited to a new wallet on signup
  adminPassword: 'admin123', // demo admin gate (change for real use)

  RAZORPAY: {
    enabled: false,                 // flip to true when you wire a backend
    keyId: '',                      // PUBLIC key id only (rzp_..._...)
    // The webhook URL / secret live on YOUR server, never in this file.
    // webhookUrl: 'https://your-api.example.com/razorpay/webhook',
  },

  // Optional Supabase sync (client uses the *publishable/anon* key only).
  // Leave disabled to run purely on localStorage.
  SUPABASE: {
    enabled: false,
    url: '',
    anonKey: '',   // publishable anon key ONLY — never a service_role/sb_secret key
  },
};
