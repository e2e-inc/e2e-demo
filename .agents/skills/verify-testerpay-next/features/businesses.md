# Businesses and QR

Paying the eight seeded businesses in store or online, by list or store
code, and the member's own QR codes.

## Sub-features

- Businesses list `/merchants` (`merchant-<id>`) and page
  `/merchants/[id]` (`merchant-hero`, `merchant-cart`, in store or
  `Online checkout`, `merchant-pay-submit` reading `Pay $X.XX ·
  Checkout`).
- A shortfall warning and the funding picker cover the rest from a bank
  (balance first, then the source).
- Scan tab `/qr?tab=scan`: type a store code (`qr-manual-input`,
  `qr-manual-submit`), e.g. `PPZ-M-TAQ` for La Esquina Taqueria; unknown
  codes are rejected.
- My code `/qr` (`my-qr-card`, `my-qr-code`) and a request code with a
  set amount (`qr-request-amount`, `/qr/request`, `qr-request-create`,
  `qr-request-card`, `qr-request-code`, `qr-request-done`).

## How to get to it (user POV)

Sidebar `Businesses`; home `home-qr` for QR. Signed in as `member`. Store
codes: `PPZ-M-BLOOM`, `-TAQ`, `-PEDAL`, `-NOODLE`, `-VINYL`, `-FARM`,
`-LUMEN`, `-RIDGE`.

## Driving it with e2e

`tests/merchants.e2e.ts` pins in-store, online with a bank, store code,
and unknown code; `tests/social.e2e.ts` "creates a QR code that requests a
set amount". Pinned: `merchant-pay-submit`, `balance-amount`. Detail rows
(Type `Business payment`, Channel, Funding) come from `agent.extract`.
Live walk: `open_session`, sign up, `navigate /qr?tab=scan`, type into
`qr-manual-input`, `observe`.

## Proof

Success says `You paid <business>`; the detail shows Channel `In store` or
`Online checkout` and Funding `TesterPay balance` or `Balance + <bank>
••<last4>`; the balance on `/` is exact (`$5.50` after $4.50; `$0.00`
after a $24.00 order with $10.00 on hand).

## Charters

Signed in, with `--session member`:

```
merchants-checkout|web|skeptic|Signed in as the member, starting at /merchants, pay Bloom Coffee Roasters in store and then check out a Noodle Theory online order the balance cannot cover; check the cart, the split between balance and bank, the detail rows, and the home balance agree to the cent
qr-codes|web|fuzzer|Signed in as the member, starting at /qr?tab=scan, enter store codes in lowercase, with spaces, with a missing prefix, unknown, empty, and 300 characters, then on /qr create a request code for $0, $0.001, and $5,000.01; report codes or amounts accepted or rejected wrongly
```

## Gotchas

- There is no camera: the scan tab works through the typed store code.
- The businesses, their menus, and their codes are seed data.
