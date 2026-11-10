# Cards and identity

A debit card and a credit card, both behind a one-time identity check.

## Sub-features

- Cards tab (`/cards`): `get-debit-card`, `apply-credit-card`, and once
  issued `open-debit-card`, `open-credit-card` (with the limit and state),
  plus `payment-card-<type>` art.
- Identity on `/settings/verify` (`verify-name`, `verify-dob`,
  `verify-ssn`, `verify-address`, `verify-submit`, `verify-success`,
  `verify-done`); reached from either card or the home `verify-banner`.
- Issue on `/cards/new`: design choice (Midnight and others), cardholder
  terms (`card-agree`), `card-issue-submit`. Credit is approved with a
  $3,000 limit.
- Card page `/cards/[id]`: `card-details`, `card-show-number`, daily spend
  limit (`card-spend`), `card-order-physical`,
  `card-activate-physical`, lock (`card-lock-switch`, role `switch`
  named `Lock card`), `card-fresh-banner` after issue.

## How to get to it (user POV)

Sidebar `Cards`, or `/cards`. Signed in as `member` (unverified at start).
Identity input that passes: date of birth `1990-08-21`, SSN last 4 `5678`,
street `42 Elm Street`.

## Driving it with e2e

`tests/cards.e2e.ts` pins credit approval and debit controls;
`tests/core-flows.e2e.ts` "verifies identity and creates a debit card".
Pinned: `open-credit-card` (`Limit $3,000`), `open-debit-card` (`Locked ·
Spend limit $1,000/day`), `screen.getByRole('switch', 'Lock card')`,
`screen.getByText('Currently $1,000')`. The Midnight art is checked with
`agent.assert(..., { vision: true })`. Live walk: `open_session`, sign up,
`navigate /cards`, tap `get-debit-card`, `observe` the verify form.

## Proof

`/cards` shows the open card with its exact state line; the profile shows
the identity as verified; a locked card says purchases are blocked and
stays locked after a reload.

## Charters

Signed in, with `--session member`:

```
cards-flow|web|skeptic|Signed in as the member, starting at /cards, verify identity, get the debit card, set a spend limit, order and activate the physical card, lock it, then apply for the credit card, reloading /cards and the profile after each; report card state that is lost, stale, or inconsistent between screens
identity-input|web|fuzzer|Signed in as the member, starting at /settings/verify, submit the form empty, with a future and a 1900 date of birth, a 3-digit and a lettered SSN, and a 300-character unicode address; report validation that is missing or wrong
```

## Gotchas

- Identity, approval, and card numbers are simulated: any well-formed
  input verifies, and credit is always approved at $3,000.
- Verification is one-time per account: the second card skips the form.
