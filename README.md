# TesterPay (Next.js)

A Next.js 16 rebuild of the TesterPay demo (`~/testerarmy/demos/apps/finance`), a Venmo-style
payments app used as a QA target.

```bash
npm install
npm run dev   # http://localhost:3000
```

## How it works

- **No network backend.** The original Hono + SQLite backend runs in the browser
  (`lib/backend`). Data is stored per visitor in IndexedDB (`demo-finance`), with Web Locks
  keeping tabs in sync. It needs HTTPS or localhost.
- `lib/api.ts` calls the local backend at `https://demo.local`. No request ever leaves the page.
- The session token lives in `localStorage` (`testerpay.session-token`). Route access by session
  status is enforced client-side in `components/app-shell.tsx`, which mirrors Expo's
  `Stack.Protected` groups.
- UI, copy, `data-testid`s, query params, validation and known quirks match the original 1:1.
  The desktop sidebar layout switches on at a width of 960px or more.
- "Reset demo" in Settings restores the seed data.

## Visual regression tests

The e2e screenshot suite covers welcome, sign-in, sign-up, home, cards, activity,
profile, people, merchants, and settings at 390 × 844 and 1440 × 1000 in Chromium. It uses the real
browser-local backend with a seeded account, fixed time, UTC/en-US, local copies
of the demo portraits, and disabled animations. No AI provider credentials are needed.
e2e masks password inputs in screenshots, so their internal appearance is excluded.

```bash
npx e2e-web install chromium  # once after installing dependencies
npm run test:visual           # compare all 20 screenshots
npm run test:visual -- --grep 'mobile home'  # select one screen
npm run test:visual:update    # explicitly replace baselines after reviewing UI changes
```

Commit the reviewed PNGs under `tests/visual/baselines/<os>-<arch>/` alongside UI
changes. Rendering depends on OS fonts and browser versions, so keep baseline
generation and comparison on the same platform and installed Chromium version.
The initial baselines are for macOS ARM64; another platform needs its own reviewed
baseline set. CI refuses baseline updates and fails when baselines are missing.

Comparisons ignore anti-aliasing differences and use a per-pixel color threshold
of 0.1, with zero other changed pixels allowed. Tests wait for data, fonts, images,
and two matching captures. These are viewport screenshots; content below scrollable
areas is outside this initial coverage.

Failures keep actual, expected, and highlighted diff PNGs under
`.e2e/visual/artifacts/`; the error gives their paths. The report is
`.e2e/visual/report.json`. Visual tests use `e2e.visual.config.ts`; the existing
functional suite continues to use `e2e.config.ts`. `APP_URL` can point visual tests
at an already-running local instance instead of starting Next.js automatically.
Use the configured output directory so the screenshot helper can resolve artifacts.

`tests/visual/fixtures/portraits/` contains copies of the demo's Unsplash images for
stable tests. Their source URLs are listed in `lib/profile-photos.ts`.
