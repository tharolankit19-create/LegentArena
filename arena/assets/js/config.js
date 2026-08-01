/* =========================================================================
 * LegentArena — runtime configuration
 * -------------------------------------------------------------------------
 * SECURITY: Never place secret keys (Supabase service_role / sb_secret_...,
 * Razorpay key_secret, webhook secrets) in front-end code. Anything here
 * ships to the browser and is fully public. Only the Razorpay *public*
 * key_id (rzp_live_... / rzp_test_...) is safe to expose.
 *
 * Economy defaults below seed the editable Settings the first time the app
 * runs. After that, an admin changes them from Admin → Settings and those
 * saved values win. Editing this file only affects a fresh install.
 * ======================================================================= */
window.APP_CONFIG = {
  brand: 'LegentArena',
  rupee: '₹',

  // ---- Economy (seeded into editable Settings on first run) ----
  defaults: {
    commissionPercent: 20,   // platform profit as % of entry collection
    coinPerRupee: 1,         // 1 Coin = ₹1  (add ₹100 -> 100 Coins)
    adminMobile: '8955005076',
    adminPassword: 'admin@123', // change after first login
    supportMobile: '8955005076',
    supportUpi: 'legentarena@upi',
    minAdd: 10,              // min coins to add
    minWithdraw: 50,         // min coins to withdraw
    signupBonus: 0,          // welcome coins
    split: { first: 50, second: 30, third: 20 }, // % of distributable pool
  },

  RAZORPAY: {
    enabled: false,          // flip true only with a real backend
    keyId: '',               // PUBLIC key id only (rzp_..._...)
    // webhook URL / secret live on YOUR server, never in this file.
  },

  SUPABASE: {
    enabled: false,
    url: '',
    anonKey: '',             // publishable anon key ONLY — never sb_secret/service_role
  },
};
