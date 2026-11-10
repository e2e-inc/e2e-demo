# People and profile

Finding people, friending them, and the member's own profile.

## Sub-features

- `/people`: `people-search`, `friends-list`, `suggestions-list`,
  `friend-toggle-<handle>`.
- A person `/people/[handle]` (`person-profile`, `person-friend-toggle`,
  `person-pay`, `person-request`).
- Profile `/profile` (`profile-name`, `profile-handle`, `profile-edit`)
  and edit `/settings/edit-profile` (`edit-profile-name`,
  `edit-profile-bio`, `edit-profile-save`); also from `/settings`
  (`settings-edit-profile`).

## How to get to it (user POV)

Sidebar `Friends` for people, `Your profile` for the profile, `Settings`
for edit. Signed in as `member`. Handles are the names in
kebab case: `ava-chen`, `marcus-reed`, `priya-patel`, `leo-alvarez`,
`nia-okafor`, `sam-torres`, `jules-kim`, `hana-sato`, `theo-brooks`,
`zoe-martin`.

## Driving it with e2e

`tests/social.e2e.ts` "edits the display name and bio" and "adds and
removes a friend". Pinned: `profile-handle` (stays `@e2e-member` after a
name change). Live walk: `open_session`, sign up, `navigate /people`, type
into `people-search`, `observe`.

## Proof

The profile shows the new name and bio after `app.open('/profile')`, with
the handle unchanged; a friend appears in `friends-list` on a fresh visit
to `/people` and is gone after unfriending.

## Charters

Signed in, with `--session member`:

```
people-friends|web|skeptic|Signed in as the member, starting at /people, search for each demo person, add Priya Patel and Leo Alvarez as friends, unfriend one from her profile page, reloading /people after each; report friend state that is stale or inconsistent between the list and the profile
profile-input|web|fuzzer|Signed in as the member, starting at /settings/edit-profile, save the name empty, with 300 characters, unicode and emoji, and leading spaces, and the bio with 2,000 characters and line breaks; report validation that is missing or a saved value that differs from what was typed
```

## Gotchas

- The demo people's bios, balances, and verified badges are seed data.
- The handle is chosen once at onboarding; editing the display name does
  not change it, by design.
