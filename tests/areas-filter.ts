import { join, relative, sep } from 'node:path';
import type { TestFilter } from 'e2e';

/**
 * The test tags each route of the app reaches, by path from the project root.
 * A file matching several prefixes reaches the tags of all of them. A change to
 * any file no prefix matches, such as `components/`, `lib/`, the home screen, or
 * a test, leaves nothing out, so the decision filter judges it.
 */
const AREAS: Readonly<Record<string, readonly string[]>> = {
  'app/(auth)/': ['auth'],
  'app/onboarding/': ['auth'],
  'app/(tabs)/profile/': ['auth', 'social'],
  'app/settings/page.tsx': ['auth', 'wallet'],
  'app/settings/edit-profile/': ['social'],
  'app/settings/verify/': ['cards'],
  'app/(tabs)/cards/': ['cards'],
  'app/cards/': ['cards'],
  'app/wallet/': ['wallet', 'merchants'],
  'app/pay/': ['payments', 'social'],
  'app/pay/success/': ['requests', 'split', 'wallet', 'merchants'],
  'app/people/': ['social', 'payments'],
  'app/requests/': ['requests', 'social'],
  'app/split/': ['split'],
  'app/merchants/': ['merchants'],
  'app/qr/': ['social', 'merchants'],
  'app/(tabs)/activity/': ['requests', 'split'],
  'app/activity/': ['payments', 'requests', 'split', 'wallet', 'merchants', 'social'],
  // Docs the app never loads reach no test.
  'docs/': [],
  'README.md': [],
  'AGENTS.md': [],
  'CLAUDE.md': [],
};
/** Every tag an area reaches; a test without one, such as the `doctor` checks, always runs. */
const AREA_TAGS: ReadonlySet<string> = new Set(Object.values(AREAS).flat());

/** Leaves out the tests whose areas the change can't reach; runs before the decision filter so the model judges fewer tests. */
export const areas = {
  name: 'areas',
  filter(tests, { changes, projectRoot }) {
    const reached = new Set<string>();
    for (const file of changes.files) {
      const path = relative(projectRoot, join(changes.root, file)).split(sep).join('/');
      const matched = Object.keys(AREAS).filter((prefix) => path.startsWith(prefix));
      if (matched.length === 0) return { exclude: {}, note: `${file} is in no area, so areas leaves nothing out` };
      for (const prefix of matched) for (const tag of AREAS[prefix] ?? []) reached.add(tag);
    }
    const exclude: Record<string, string> = {};
    for (const test of tests) {
      const tags = test.tags.filter((tag) => AREA_TAGS.has(tag));
      if (tags.length > 0 && !tags.some((tag) => reached.has(tag))) exclude[test.id] = `the change reaches none of ${tags.join(', ')}`;
    }
    const note = reached.size > 0 ? `the change reaches ${[...reached].sort().join(', ')}` : 'the change reaches no area';
    return { exclude, note };
  },
} satisfies TestFilter;
