# Wallet

Funding sources (banks and debit cards), adding money, and transfers out
of the balance.

## Sub-features

- Banks and cards on `/wallet/funding-sources` (`funding-list`,
  `funding-row-<last4>`, `link-new-source`): link, set default, remove.
- Link on `/wallet/link` (`link-account-number`, `link-submit`): a bank by
  institution and account number, or a debit card by issuer and number.
- Add money on `/wallet/add-money` (`add-money-submit`) from a linked bank.
- Transfer on `/wallet/transfer`: `speed-standard` (free, 1-3 days) or
  `speed-instant` (1.75%, min $0.25, max $25, debit card only), then
  `transfer-submit` (reads `Transfer $X.XX`).

## How to get to it (user POV)

Home quick actions `home-add-money` and `home-transfer`, or the routes.
Signed in as `member`, who starts with no funding sources.

## Driving it with e2e

`tests/core-flows.e2e.ts` "links a bank and adds money";
`tests/wallet.e2e.ts` pins standard and instant transfers and the default
source. Pinned: `balance-amount`, `success-title` (`Added $20.00`),
`transfer-submit`. Detail rows (Type, Speed) come from `agent.extract`.
Live walk: `open_session`, sign up, `navigate /wallet/funding-sources`, tap
`link-new-source`, `observe`.

## Proof

The funding list shows the source ending in its last 4 and which is
`Default`; the balance on `/` is exact (`$30.00` after adding $20; `$4.00`
after a $6 standard transfer; `$5.75` after a $4 instant transfer with the
$0.25 fee); the transfer detail shows `Transfer to bank` and the speed.
Proved on 2026-11-10: `npx e2e run tests/wallet.e2e.ts --output
.e2e/proof/wallet --trace on`, 4 passed.

## Charters

Signed in, with `--session member`:

```
wallet-fees|web|skeptic|Signed in as the member, starting at /wallet/transfer, link an Atlas Card debit card, then set up Instant transfers of $4, $100, and $2,000; check every fee against 1.75% with a $0.25 minimum and $25 maximum, and the balance afterwards
wallet-input|web|fuzzer|Signed in as the member, starting at /wallet/link, link banks and cards with an empty number, letters, 3 digits, 40 digits, spaces and dashes, and a duplicate of an already linked number; report input accepted that should not be, rejected without a clear message, or stored with the wrong last 4
```

## Gotchas

- Links are simulated: any well-formed number is accepted, and institution
  names are free text.
- The Instant option's copy reads `1.75% fee (min $0.25) · · debit card
  only` before an amount is entered (the fee slot is empty) and never
  states the $25 maximum (`app/wallet/transfer/page.tsx`). Both are the
  original app's copy, not new bugs; the fee itself applies the maximum.
- Add money pulls from the default funding source; with none linked there
  is nothing to add from, so link a bank first.
