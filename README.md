# 🔥 LegentArena — Free Fire Tournament Hub

A complete, mobile-first **Free Fire esports tournament web app**. Players register,
join Solo/Duo/Squad cups, pay entry from an in-app wallet, submit match results, and
get prizes paid straight to their wallet after admin verification. Runs entirely in
the browser using **localStorage** — no backend required.

> Independent fan project. Not affiliated with, endorsed by, or sponsored by Garena / Free Fire.

## ✨ Features

- **Landing page** — hero, live-match banner, prize totals, upcoming tournaments, CTAs.
- **Auth** — register (username, mobile, Free Fire UID, password) & login, with full validation.
- **Tournament dashboard** — search + filter by mode/status, live slot counters ("45/100 filled"), countdowns.
- **Registration flow** — pick tournament → team name → pay from wallet or simulated gateway → confirmation.
- **Wallet** — balance, transaction history, add money, withdraw to UPI (admin-approved payouts).
- **Leaderboard** — ranked by earnings / wins / K-D, animated podium, "YOU" highlight.
- **Knockout brackets** — auto-generated single-elimination visualization.
- **Result submission** — upload a screenshot + placement/kills for admin review.
- **Admin panel** (password-gated) — create/edit/delete tournaments, verify results with
  **automatic prize distribution**, approve/reject withdrawals, view users, adjust balances.
- **Design** — dark gaming theme, orange/yellow neon, glassmorphism, smooth animations,
  fully responsive with a mobile bottom tab bar.

## 🚀 Run it

It's a static site — no build step.

```bash
# Option A: just open the file
open index.html            # macOS  (or double-click it)

# Option B: serve it (recommended)
python3 -m http.server 8080
# then visit http://localhost:8080
```

Deploy the folder as-is to any static host (Vercel, Netlify, GitHub Pages, Cloudflare Pages).

## 🔑 Demo logins

| Role   | Username / login | Password    |
|--------|------------------|-------------|
| Player | `GhostSniper`    | `player123` |
| Admin  | `admin`          | `admin123`  |

The admin panel also asks for an admin password (`admin123`) once per session.
Change both in `assets/js/config.js`.

## 🧱 Data model (localStorage)

| Key                  | Shape |
|----------------------|-------|
| `ffth_users`         | `{id, username, mobile, freeFireUID, password, balance, tournamentsWon, totalEarnings, kills, deaths, matchesPlayed, role}` |
| `ffth_tournaments`   | `{id, title, date, time, entryFee, prizePool, maxTeams, type, status, map, rules}` |
| `ffth_registrations` | `{id, userId, tournamentId, teamName, paymentStatus, registeredAt}` |
| `ffth_transactions`  | `{id, userId, amount, type, status, description, date}` |
| `ffth_matches`       | `{id, tournamentId, round, team1, team2, winner, placement, kills, screenshot, verified}` |

Demo data seeds automatically on first load. To reset: clear site data / localStorage.

## 💳 Payments (Razorpay-ready)

By default, payments are **simulated** with a realistic checkout modal (success/failure),
so the whole flow works with zero backend.

To wire real Razorpay later:

1. In `assets/js/config.js` set `RAZORPAY.enabled = true` and `RAZORPAY.keyId` to your
   **public** key id (`rzp_live_...`).
2. Add the checkout SDK to `index.html`:
   `<script src="https://checkout.razorpay.com/v1/checkout.js"></script>`
3. Create orders **server-side** and verify **webhooks** on your server. Copy `.env.example`
   → `.env` for the secret keys and webhook URL.

> ⚠️ **Security:** Never put secret keys in front-end code. A Razorpay `key_secret`,
> a webhook secret, or a Supabase `service_role` / `sb_secret_...` key must live only on a
> server you control. Anything in this repo ships to the browser and is fully public.

## 📁 Structure

```
index.html
assets/
  css/styles.css        # theme, glassmorphism, responsive
  js/
    config.js           # runtime config (public keys only)
    store.js            # localStorage data layer + seed
    ui.js               # toasts, modals, formatting, validation
    auth.js             # register/login/session
    payments.js         # simulated + real Razorpay checkout
    pages.js            # user-facing pages
    admin.js            # admin panel
    app.js              # hash router + nav chrome
```
