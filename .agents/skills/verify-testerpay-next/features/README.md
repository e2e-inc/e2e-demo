# Feature map

One file per user-facing feature of TesterPay, from the member's point of
view. Each names the tests that pin it, the handles that matter, the proof,
and its bug-bash charters. Every test except the signed-out ones starts from
the `member` session (`tests/account.setup.e2e.ts`): handle `@e2e-member`,
$10.00 balance, no funding sources, two pending incoming requests.

Locators are the app's `data-testid`s, read from the source. Ones marked
"pinned" are used by a passing test; `locate` the rest over MCP before
writing them.

| Feature | Route | Test | Status |
| --- | --- | --- | --- |
| [Account and onboarding](account.md) | `/welcome`, `/sign-up`, `/sign-in`, `/onboarding/handle`, `/settings` | `tests/smoke.e2e.ts`, `tests/account.setup.e2e.ts`, `tests/account.e2e.ts`, `tests/core-flows.e2e.ts` | tested |
| [Pay and request people](payments.md) | `/pay`, `/pay/[userId]`, `/pay/success`, `/activity/[id]` | `tests/core-flows.e2e.ts`, `tests/social.e2e.ts` | tested |
| [Requests and split](requests.md) | `/activity?tab=requests`, `/requests/[id]`, `/split/new` | `tests/core-flows.e2e.ts`, `tests/social.e2e.ts` | tested |
| [Wallet](wallet.md) | `/wallet/add-money`, `/wallet/funding-sources`, `/wallet/link`, `/wallet/transfer` | `tests/core-flows.e2e.ts`, `tests/wallet.e2e.ts` | tested |
| [Cards and identity](cards.md) | `/cards`, `/cards/new`, `/cards/[id]`, `/settings/verify` | `tests/cards.e2e.ts`, `tests/core-flows.e2e.ts` | tested |
| [Businesses and QR](businesses.md) | `/merchants`, `/merchants/[id]`, `/qr`, `/qr?tab=scan`, `/qr/request` | `tests/merchants.e2e.ts`, `tests/social.e2e.ts` | tested |
| [People and profile](people.md) | `/people`, `/people/[handle]`, `/profile`, `/settings/edit-profile` | `tests/social.e2e.ts` | tested |

Not mapped yet: the home feed's `pay-again` and `split-from-detail`
shortcuts on `/activity/[id]` (reachable from Payments), and the mobile
layout below 960 px (bottom tab bar `tab-*`, `tab-pay`). Map them when a
change touches them.
