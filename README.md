# 🔥 LegentArena — Free Fire Contest App

A **mobile-first Free Fire tournament app** for Indian gamers. Players join daily
Solo / Duo / Squad contests, pay entry using **Coins**, get a slot, play the match,
submit their result, and receive **winnings straight to their wallet** — withdrawable
to UPI. Runs entirely in the browser on **localStorage** (no backend needed), and every
money figure is **computed from real records** (no hardcoded/fake numbers).

> Independent fan project. Not affiliated with, endorsed by, or sponsored by Garena / Free Fire.
> 🔞 18+ · skill-based · play responsibly · not for use where prohibited by law.

## 💰 How the economy works (all admin-editable)

- **Coins** are the in-app currency. `1 Coin = ₹1` by default (legal-safety wrapper —
  the wallet shows Coins, not cash). Add money via UPI → Coins; withdraw Coins → UPI.
- **Prize pool is dynamic and real:** `pool = (players joined × entry fee) − commission`.
  Default commission (**your profit**) is **20%**, editable in **Admin → Settings**
  (globally, or per-contest). The pool visibly **grows as slots fill** (FOMO).
- **Winnings split:** 1st **50%**, 2nd **30%**, 3rd **20%** of the distributable pool,
  plus optional **per-kill** bonus. All editable in Settings.
- **Automatic payout:** when the admin declares/verifies a result, winnings are credited
  to the player's wallet instantly and their stats update.

Example: 40 players × ₹30 entry = ₹1,200 collected → 20% (₹240) is your profit →
₹960 prize pool → 1st ₹480, 2nd ₹288, 3rd ₹192.

## ✨ Features

- **Home** — hero, real FOMO strip (coins paid to players, open/live contests), search +
  Solo/Duo/Squad filters, live contest cards with **rising prize pool**, **live countdowns**,
  and **"only N slots left"** urgency.
- **Contest detail** — big live pool, info tiles, hot slot bar, winnings breakdown, rules,
  match Room ID/password (for joined players), sticky Join bar.
- **Registration** — captures In-Game Name + Free Fire UID, assigns a **slot number**,
  pays entry from Coins (or nudges to add Coins).
- **All Joinings** — Slot / Pos / In-Game Name / Game ID table (like popular tourney apps).
- **Wallet** — Coin balance, add Coins (simulated Razorpay), withdraw to UPI, full history.
- **Leaderboard** — Weekly / Monthly / Fulltime, ranked by real winnings, animated podium.
- **My Contests, Statistics, Menu** — profile, K/D, earnings, How-it-works, FAQ, Contact, Legal.
- **Admin panel** (mobile `8955005076`) — Settings (commission, coin rate, split, mins,
  support no.), contest CRUD, publish Room ID/password, **declare winners → auto payout**,
  approve/reject withdrawals, manage users & balances, reset demo data.
- **Design** — navy + electric-blue + gold-coin theme, app-shell with bottom tab bar,
  smooth animations. Premium and FOMO-driven, but clear enough for first-time users.

## 🚀 Run it

Static site, no build step:

```bash
open index.html                 # or double-click
# or serve (recommended):
python3 -m http.server 8080     # http://localhost:8080
```

Deploy the folder to any static host (Vercel, Netlify, GitHub Pages, Cloudflare Pages).

## 🔑 Demo logins

| Role   | Mobile        | Password    |
|--------|---------------|-------------|
| Player | `9800000001`  | `player123` |
| Admin  | `8955005076`  | `admin@123` |

The admin panel asks for the admin password (`admin@123`) once per session.
Change the admin mobile/password and all economy settings in **Admin → Settings**.

## 🧱 Data model (localStorage)

| Key                  | Notable fields |
|----------------------|----------------|
| `ffth_users`         | id, username, mobile, freeFireUID, password, **balance (coins)**, tournamentsWon, totalEarnings, kills, deaths, matchesPlayed, role |
| `ffth_tournaments`   | id, title, date, time, entryFee, perKill, maxTeams, type, status, map, rules, poolMode, guaranteedPool, commissionOverride, roomId, roomPass |
| `ffth_registrations` | id, userId, tournamentId, teamName, inGameName, inGameId, slotNo, position, paymentStatus |
| `ffth_transactions`  | id, userId, amount (coins), type, status, description, date, meta |
| `ffth_matches`       | id, tournamentId, rank, kills, winnerUserId, inGameName, screenshot, verified |
| `ffth_settings`      | commissionPercent, coinPerRupee, split, minAdd, minWithdraw, adminMobile, adminPassword, supportMobile, signupBonus |

## 💳 Real payments later (Razorpay)

Payments are **simulated** by default (works with zero backend). To go live:

1. `assets/js/config.js` → `RAZORPAY.enabled = true`, set `RAZORPAY.keyId` (PUBLIC key id).
2. Add `<script src="https://checkout.razorpay.com/v1/checkout.js"></script>` to `index.html`.
3. Create orders **server-side** and verify **webhooks** on your server. Use `.env.example`
   for the secret keys / webhook URL.

> ⚠️ **Security:** Never put secret keys in front-end code. A Razorpay `key_secret`,
> a webhook secret, or a Supabase `service_role` / `sb_secret_...` key must live only on
> a server you control. Everything in this repo ships to the browser and is public.

## 📁 Structure

```
index.html                # app shell + bottom nav
assets/
  css/styles.css          # navy/blue + gold-coin mobile theme
  js/
    config.js             # economy defaults + public keys only
    store.js              # localStorage + coin economy + live pool math
    ui.js                 # coins, app-bar/screen, toasts, sheets, validation
    auth.js               # mobile login/register
    payments.js           # simulated + real Razorpay
    pages.js              # all user screens
    admin.js              # admin panel (settings, contests, results, payouts)
    app.js                # router, bottom nav, live countdowns
```
