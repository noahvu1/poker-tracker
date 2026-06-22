# Poker Ledger

A personal poker session tracker. Log buy-ins, cash-outs, and time played; see
your net, win streak, win/loss record, and hourly rate update automatically.
No build tools, no dependencies — just HTML, CSS, and JavaScript.

## Running it in VS Code

1. Open the `poker-tracker` folder in VS Code.
2. Easiest option: install the **Live Server** extension (by Ritwick Dey),
   then right-click `index.html` → **Open with Live Server**. This gives you
   auto-reload while you tweak styles.
3. Alternative: just double-click `index.html` to open it straight in your
   browser. Everything works the same — the only thing Live Server adds is
   auto-reload.

That's it. No `npm install`, no server required.

## How your data is stored

Sessions are saved in your browser's `localStorage`, under the key
`pokerLedger.sessions.v1`. That means:

- Your data persists across visits, even after closing the tab or restarting
  your computer.
- It's tied to **one browser on one device**. Opening the site in a
  different browser, in incognito mode, or on your phone starts a fresh,
  empty ledger.
- Clearing your browser's site data/cache will erase it. If you want a
  backup, open DevTools → Application → Local Storage, copy the value for
  `pokerLedger.sessions.v1`, and save it somewhere safe.

If you ever want this to follow you across devices, that requires a real
backend (e.g. Firebase or Supabase's free tiers both work well for a
project this size) — happy to help wire that up if you want to take it
further.

## Editing a session

Click the pencil icon on any row in **Session History**. It loads that
session back into the form above, the button changes to **Update Session**,
and you can hit **Cancel Edit** to back out without saving. This covers
both "I typo'd a number" and "I played a second session later the same day."

## The date field

The date defaults to today automatically — you never have to type it for a
same-day entry. It's still an editable field, though, so you can backdate a
session you forgot to log, or log two sessions on the same day.

## Starting net (carrying over a balance)

The first time you open the site, a card asks for a **Starting Net** — if
you're moving over from a notes app or another tracker, enter what you're
already up or down (e.g. `922`, or `-150` if you're stuck). Leave it at `0`
if you're starting completely fresh.

That number gets folded into the **Lifetime Net** shown at the top, but
nowhere else: your Hourly Rate, Win Streak, and Win/Loss record are all
calculated purely from the sessions you actually log here. So a starting
balance can never throw off your real hourly rate.

You can change it any time — click **"Edit"** next to the Lifetime Net
number.

## The visitor counter

The pill in the top right tries to count real visits from everyone who
opens the page, using [CountAPI](https://countapi.xyz) — a free, no-signup
hit-counter. It's wired up in `script.js` under `trackVisit()`.

Two things worth knowing:

1. **It only counts real visitors once the site is actually live on the
   web** (see Deploying below). Opening `index.html` from your own computer
   only ever counts as visits from you.
2. **Free counter APIs occasionally go down.** If the request fails for any
   reason, the counter quietly falls back to a local, this-browser-only
   count and the footer note tells you that's what's happening, instead of
   showing a fake or stale number.

Before you deploy, open `script.js` and change this line to something
unique to you (so your count doesn't collide with someone else's):

```js
const VISIT_NAMESPACE = 'poker-ledger-change-me';
```

If you want something more bulletproof for a resume link, swap in
[GoatCounter](https://www.goatcounter.com/) or
[Plausible](https://plausible.io/) — both have generous free tiers and a
real analytics dashboard, at the cost of a quick account signup.

## Deploying it (so it has a real link for your resume)

Easiest free options, in order of simplicity:

- **GitHub Pages** — push this folder to a GitHub repo, then turn on Pages
  in the repo settings. You get a free `yourname.github.io/poker-tracker`
  link.
- **Netlify Drop** — go to [app.netlify.com/drop](https://app.netlify.com/drop)
  and drag the `poker-tracker` folder in. Instant live URL, no account
  strictly required.
- **Vercel** — similar to Netlify, works well if you ever want to add a
  real backend later.

## Customizing the look

All colors, fonts, and spacing are defined as CSS variables at the top of
`styles.css` under `:root`. Swap `--gold`, `--win`, `--loss`, etc. to
re-theme the whole site without touching markup.

Fonts used: **Fraunces** (headlines), **Space Grotesk** (body/numbers), and
**Caveat** (the handwritten accents) — all loaded free from Google Fonts.

## File structure

```
poker-tracker/
├── index.html   structure & content
├── styles.css   design system (colors, type, layout)
├── script.js    data, stats math, rendering, form logic, visit counter
└── README.md    this file
```
