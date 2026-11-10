---
name: verify-testerpay-next
description: Launch, check, drive, prove, and bug bash TesterPay (testerpay-next), the Next.js 16 Venmo-style demo payments web app, with e2e. Use before claiming a TesterPay UI change works, when asked to verify, screenshot, or record a flow (sign up, pay, request, wallet, cards, businesses, people), or to bug bash it.
---

# Verify TesterPay

Read the e2e skill first (`npx e2e guide` prints it; topics named below are
`npx e2e guide <topic>`). This skill only says what is true of this app. The
config is `e2e.config.ts` (one target, `web`, tests `tests/*.e2e.ts`, the
`member` and `newcomer` credentials); the bug bash uses
`e2e.bugbash.config.ts`, copied from this directory.

## Launch

The target's `app.command` runs `npm run dev -- -p {port} -H 127.0.0.1` on
`http://127.0.0.1:0`. The runner picks a free port, starts `next dev`, waits
for the URL (up to 120 s), and stops it after the run; its log is
`.e2e/logs/app.log`. Nothing to start by hand. Set `APP_URL` to point every
run at a server you started yourself instead (no command is run then).

There is no backend to seed. The Hono + SQLite backend runs inside the page
(`lib/backend`), stored per browser in IndexedDB `demo-finance`, so every
test, every `open_session`, and every explorer starts from an empty database
holding only the seed data (four demo people, eight businesses, the
`PPZ-M-*` store codes). The session token is `localStorage`
`testerpay.session-token`. No env vars are needed beyond the model key
(`AI_GATEWAY_API_KEY`, already read by `gateway()`); `E2E_MEMBER_PASSWORD`
and `E2E_NEWCOMER_PASSWORD` override the credential defaults.

`next dev` in Next.js 16 allows one dev server per directory: two `e2e run`
processes at once, or an MCP session open during `e2e run`, fail the second
with `APP_UNREACHABLE`. Run one at a time, or close the session first (topic
`mcp`, Rules).

## Doctor

```bash
npx e2e list                    # loads the config, starts nothing; exit 0, 26 test-target pairs
npx e2e run tests/smoke.e2e.ts  # model-free; exit 0, 3 tests in about 5 s
```

`tests/smoke.e2e.ts` holds both checks. The signed-out test proves the dev
server starts, the engine runs, and `/` redirects to `/welcome`
(`welcome-sign-up`). The signed-in test consumes the `member` session, so
selecting it runs `tests/account.setup.e2e.ts` (sign up through the UI, pick
the suggested handle `@e2e-member`), restores it, and pins `home-dashboard`
with `balance-amount` reading `$10.00`. `list` failing is the config or a
dependency (`npm install`); `APP_UNREACHABLE` is a second `next dev` in this
directory or a dead start (read `.e2e/logs/app.log`); `LOCATOR_NOT_FOUND`
is the app itself. Running `account.setup.e2e.ts` alone selects no test and
exits `NO_TESTS`. `npx e2e doctor --check-model` also calls the model. Run
Doctor first whenever anything looks off.

## Drive

Live, over the registered `e2e mcp` server (`.mcp.json`, `.cursor/mcp.json`):
`open_session`, `navigate` to the route, `observe`, the verbs, and `locate`
before writing any locator (topic `mcp`). The catalog offers `type_secret`
for `member` and `newcomer`, and no project tools. A session starts signed
out on an empty database: sign up through `/welcome` first (any email and
password; the account exists only in that session's browser). Almost every
test consumes the `member` session, so `open_session {test}` refuses them
with `SESSION_TEST_UNSUPPORTED`; fix those with `run_tests` and the trace
page (topic `debugging`).

Scripted: a test under `tests/`, `{ session: 'member' }` to start signed in
on the home dashboard with $10.00 and no funding sources. The suite's style,
kept by every file: `agent.act` with values in `params` for the path,
`agent.assert`/`agent.waitFor` for what only judgment checks, and exact
`expect` on money and state through `data-testid`s
(`screen.getByTestId('balance-amount')`, `success-title`, `request-status`,
`detail-amount`, `transfer-submit`). Every screen has test ids; the map in
[features/](features/) lists the ones that matter. The default viewport is
desktop (960 px or wider), which shows the sidebar (`desktop-navigation`,
links `Home`, `Cards`, `Activity`, `Friends`, `Businesses`, `Settings`) and
no bottom tab bar; `tab-*` ids exist only below 960 px.

## Evidence

Every run writes `.e2e/report.json`; a failed test gets
`.e2e/results/<test>/trace.md`, `--trace on` gives one to passing tests too,
`--video` records each attempt, `app.screenshot('<name>')` saves a named
frame (topics `running`, `writing-tests`). The next run clears
`.e2e/results/`, Doctor included, so a proof that must outlive it runs with
`--output .e2e/proof/<name>`:

```bash
npx e2e run tests/wallet.e2e.ts --output .e2e/proof/wallet --trace on --video
```

Proof standards:

- Drive the real user path: the sidebar link or the route, the labelled
  control, the confirmation sheet, the success screen. Never write to
  IndexedDB or call `lib/api.ts` from a test.
- Capture the action and the state after it, not only the final screen:
  the success screen, then the detail screen (`View details`), then the
  balance on `/`.
- Side effects live in the in-page SQLite database, which has no reader
  outside the app, so verify them where the app shows them: the home
  `balance-amount`, the Activity history and requests tabs
  (`/activity`, `/activity?tab=requests`), the transaction detail
  (`detail-amount`), the person, card, or funding-source page, and that
  each survives `app.open` of another route (a reload). Money is checked
  with exact `expect`, never only by the agent.
- Nothing is mocked: bank links, card numbers, identity checks, and card
  approvals are simulated by the app itself and accept any well-formed
  input. No email or SMS exists to check.

## Bug bash

Topic `bug-bash` is the procedure. Setup, once per bash:

```bash
cp .agents/skills/verify-testerpay-next/e2e.bugbash.config.ts .   # untracked, in .gitignore
npm run build                                                     # explorers run `next start`
rm -rf .e2e/bugbash && mkdir -p .e2e/bugbash
```

The config spreads `e2e.config.ts`, adds `tests/bugbash/**/*.e2e.ts`,
serves the production build with `next start` on port `0` (each explorer
its own server; `next start` has no one-per-directory lock), and declares
the `default`, `skeptic`, and `fuzzer` personas at 40 steps and model calls
each. Its `context` lists the seed data, the simulated integrations, the fee
and payment limits, and forbids `Reset demo` unless the charter asks.
Rebuild after every source change, or the bash explores stale code.

No accounts to seed: each explorer's database lives in its own browser
context, so explorers never share state. Signed-in charters pass
`--session member`, which runs the setup sign-up first; they can still run
four at a time. The charters are in [features/](features/), one block per
feature, as `slug|target|agent|charter` lines. Put the signed-out ones in
`.e2e/bugbash/charters.txt` and the signed-in ones in
`.e2e/bugbash/charters-member.txt`, then:

```bash
fanout() {  # $1 = charters file, $2 = extra flags
  while IFS='|' read -r slug target agent charter; do
    [ -n "$slug" ] && printf '%s\0%s\0%s\0%s\0' "$slug" "$target" "$agent" "$charter"
  done < "$1" | xargs -0 -n 4 -P 4 sh -c \
    'npx e2e explore "$4" --config e2e.bugbash.config.ts --target "$2" --agent "$3" '"$2"' --output ".e2e/bugbash/$1" --max-steps 6 --video --reporter list,markdown < /dev/null > ".e2e/bugbash/$1.log" 2>&1' _
}
fanout .e2e/bugbash/charters.txt ''
fanout .e2e/bugbash/charters-member.txt '--session member'
```

Read each log's `Findings`, then `run.explore` in
`.e2e/bugbash/<slug>/report.json`: `ended` and the step titles prove the
charter ran (exit `1` is also a run with no step). Triage against the
source; `README.md` says copy and quirks match the original app 1:1, so a
quirk the code writes on purpose is Design. A finding is a bug only once
`tests/bugbash/<slug>.e2e.ts`, tagged `bugbash`, fails with
`ASSERTION_FAILED` on the reported defect (topic `bug-bash`, step 6); run it
with `--config e2e.bugbash.config.ts`. The gating run excludes them:
`npx e2e run --exclude-tag bugbash`.

## Cleanup

The runner stops the `next dev` or `next start` it started; `close_session`
stops the one a session started. A server you started for `APP_URL` is
yours: stop it by its pid, never `pkill node` or `pkill next`. There is no
server-side state to reset; a test's database dies with its browser
context. Remove `.e2e/bugbash/<slug>/` for a charter whose findings were
all rejected, and the copied `e2e.bugbash.config.ts` once the user has the
report. Keep `.e2e/proof/`, `.e2e/report.json`, `.e2e/results/`, and
`.e2e/bugbash/` for cited charters: that is the evidence, and all of it is
gitignored. Do not commit `.e2e/cache/` changes unless asked; CI replays
it.

## Helpers

None. The e2e CLI is the helper, and the bug-bash config is
[e2e.bugbash.config.ts](e2e.bugbash.config.ts).
