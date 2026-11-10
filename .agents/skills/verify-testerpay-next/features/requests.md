# Requests and split

Incoming and outgoing money requests, and splitting a bill into requests.

## Sub-features

- Incoming requests on the home `requests-inbox`
  (`inbox-request-<id>`): open, pay (`request-pay`), or decline
  (`request-decline`).
- Outgoing requests on `/activity?tab=requests` (`request-row-<id>`):
  open and cancel (`request-cancel`). `request-status` shows `Pending`,
  `Paid`, `Declined`, or `Cancelled`.
- Split on `/split/new`: amount (`split-next-amount`), people
  (`split-search`, `split-person-<handle>`, `split-include-self`,
  `split-next-people`), note (`split-note`), send (`split-submit`). Split
  evenly (remainder cents go one each to the first participants) or by
  custom amounts, where the member's share is what the others' leave.

## How to get to it (user POV)

Home `requests-inbox` for incoming, sidebar `Activity` then the requests
tab for outgoing, `/split/new` for a split (also `split-from-detail` on a
transaction). Signed in as `member`, who starts with two incoming
requests: Movie snacks $6.00 from Marcus Reed and Dinner last week from Ava
Chen.

## Driving it with e2e

`tests/core-flows.e2e.ts` "requests money and can cancel the request",
"pays a pending incoming request", "splits a bill into requests";
`tests/social.e2e.ts` "declines the incoming request". Pinned:
`request-status`, `balance-amount`. Live walk: `open_session`, sign up,
`navigate /`, tap the Movie snacks `inbox-request-*`, `observe`.

## Proof

`request-status` reads the new state; a paid request moves the balance
(`$10.00` to `$4.00` for Movie snacks) and shows in Activity; a split's
success says `the $12.00 bill was split 2 ways`, and each other
participant's share is a pending request on `/activity?tab=requests` (the
member's own share creates no request).

## Charters

Signed in, with `--session member`:

```
requests-state|web|skeptic|Signed in as the member, starting at /, pay the Movie snacks request, decline the Dinner last week request, then request $5 from Priya Patel and cancel it, reloading and revisiting home and Activity after each; report requests whose status, amount, or balance effect is stale, duplicated, or inconsistent
split-math|web|skeptic|Signed in as the member, starting at /split/new, split $10.00 three ways with yourself, Ava Chen, and Marcus Reed, then $0.05 between two people; check every share and the requests it creates add up to the bill to the cent
```

## Gotchas

- The two seeded incoming requests are seed data, not bugs, and exist
  only once per account: a test that pays one leaves it gone.
- Declining or cancelling moves no money by design.
