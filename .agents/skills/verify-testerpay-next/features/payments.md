# Pay and request people

Send money to, or ask money from, one of the demo people, with a note, an
emoji, and a visibility, then see it in Activity.

## Sub-features

- Pick a person on `/pay` (`pay-search`), or from the home `Pay or
  request` button or a person's page.
- Amount on the keypad (`keypad`, `key-<digit>`, `amount-display`), a note
  (`pay-note`) with emoji buttons below it, a visibility, the funding
  picker (`funding-picker`, `funding-option-balance`,
  `funding-option-<last4>`), then `Pay` (`submit-pay`) or `Request`
  (`submit-request`).
- A confirmation sheet (`confirm-sheet`, `confirm-submit`) before money
  moves; then `/pay/success` (`success-title`, `success-details`,
  `success-done`).
- The transaction detail on `/activity/[id]` (`transaction-detail`,
  `detail-amount`, `pay-again`, `split-from-detail`) and the feed on
  `/activity`.

## How to get to it (user POV)

Sidebar `Pay or request`, or `/pay`. Signed in as `member`. Ava Chen,
Marcus Reed, Priya Patel, and Leo Alvarez are the searchable people.

## Driving it with e2e

`tests/core-flows.e2e.ts` "pays a person and records the payment" and
"requests money and can cancel the request"; `tests/social.e2e.ts` "pays
privately with a note and emoji". Pinned: `balance-amount`,
`success-title`, `detail-amount` (reads `- $2.00` for a sent payment). The
path itself is `agent.act`; `agent.extract` with a zod schema reads the
detail rows (recipient, amount, note, status, visibility). Live walk:
`open_session`, sign up, `navigate /pay`, type a name into `pay-search`,
tap the person, tap keypad keys, `observe` the confirm sheet.

## Proof

The success screen says `You paid <name>` (or `You requested $X.XX`); the
detail shows the amount, the note with its emoji, the visibility, and
status `Completed`; `balance-amount` on `/` dropped by exactly the amount;
`/activity` lists it.

## Charters

Signed in, with `--session member`:

```
payments-numbers|web|skeptic|Signed in as the member, starting at /pay, pay Ava Chen $3 with a note and request $4 from Marcus Reed; check the confirmation, success screen, transaction detail, Activity feed, and home balance agree on every amount, name, and note
payments-amounts|web|fuzzer|Signed in as the member, starting at /pay, try paying Leo Alvarez $0, $0.001, $10.01 with only $10 in the balance, $5,000.01, and a 300-character note with emoji; report amounts accepted that should not be, rejected without a clear message, or recorded differently than entered
```

## Gotchas

- A single payment is capped at $5,000.00; amounts above the balance need
  a funding source (see [wallet.md](wallet.md)) or are refused.
- Seed people already have balances and bios; their feed items are seed
  data, not the member's activity.
