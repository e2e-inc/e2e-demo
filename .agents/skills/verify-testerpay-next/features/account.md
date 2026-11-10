# Account and onboarding

A local-only account: sign up, pick a handle, sign out and back in, reset
the demo. Route access per session status is enforced client-side in
`components/app-shell.tsx`.

## Sub-features

- Welcome (`/welcome`): `Sign up` and `Sign in`. Signed out, every other
  route redirects here.
- Sign up (`/sign-up`): full name, email, password. Success lands on
  `/onboarding/handle`, and every other route redirects there until a
  handle is chosen.
- Handle (`/onboarding/handle`): suggested from the name (`@e2e-member is
  available`), editable, then the home dashboard with $10.00.
- Sign in (`/sign-in`): a wrong password shows the alert
  `Email or password is incorrect` and explains accounts are local to this
  device. Signed in, auth routes redirect to `/`.
- Sign out from `/profile` (`sign-out`); `Reset demo` on `/settings` wipes
  the database after a native confirm dialog and lands on `/welcome`.

## How to get to it (user POV)

Open the app signed out. Sign out is on the profile (sidebar `Your
profile`), Reset demo on `Settings`. Accounts: `member` (made by the setup
test) and `newcomer` (made by `tests/account.e2e.ts`), both in
`e2e.config.ts`; fill passwords with `type_secret` or
`credentials.user(name).password`.

## Driving it with e2e

`tests/smoke.e2e.ts` pins the redirect and the restored session;
`tests/account.setup.e2e.ts` pins sign-up with exact steps;
`tests/account.e2e.ts` pins a custom handle and Reset demo;
`tests/core-flows.e2e.ts` "signs out and signs back in". Pinned:
`welcome-sign-up`, `welcome-sign-in`, `sign-up-submit`, `handle-hint`,
`handle-submit`, `balance-amount`, `home-dashboard`,
`screen.getByLabel('Full name' | 'Email' | 'Password')`,
`screen.getByRole('alert')`. From source: `sign-in-email`,
`sign-in-password`, `sign-in-submit`, `handle-input`,
`handle-display-name`, `sign-out`, `reset-demo`. Live walk: `open_session`,
`navigate /welcome`, tap `Sign up`, fill, `type_secret` the password, submit,
`observe` the handle screen.

## Proof

URL `/` with `balance-amount` reading `$10.00` and the profile showing the
name and `@handle`. Signed out: URL `/welcome`, and
`localStorage['testerpay.session-token']` is gone
(`browser.evaluate`). Reset: the old credentials then fail with the alert.

## Charters

```
account-onboarding|web|default|Starting at /welcome, sign up as a first-time member and pick a handle until the home dashboard shows; report anything confusing, broken, or inconsistent, including the balance and the name on the profile
account-input|web|fuzzer|Starting at /sign-up, submit the form empty, with an invalid email, a 300-character name, unicode and emoji, and leading spaces, then on the handle screen try uppercase, @-prefixed, 1-character, 31-character, and underscore handles; report validation that is missing, wrong, or silently changes the value
```

Signed in, with `--session member`:

```
account-signout|web|skeptic|Signed in as the member, starting at /profile, sign out, go back, reload, and sign back in with a wrong then the right password; report state that survives sign out or errors that are missing or misleading
```

## Gotchas

- A brief `splash` screen (the wordmark and a spinner) shows while the
  session loads and while a redirect is pending; it is not a hang.
- An account exists only in the browser that made it. A "user not found"
  in a fresh session or explorer is by design.
- Never press Reset demo outside a test that asks for it: it ends the run
  signed out with no account.
