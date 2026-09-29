'use client';

import { usePathname, useRouter } from 'next/navigation';

import { colors } from '../lib/theme';
import { useDesktop } from '../lib/use-desktop';
import { Icon, type IconName } from './icon';

const TABS: {
  name: string;
  href: string;
  active: IconName;
  inactive: IconName;
  label: string;
}[] = [
  { name: 'index', href: '/', active: 'home', inactive: 'home-outline', label: 'Home' },
  { name: 'cards', href: '/cards', active: 'card', inactive: 'card-outline', label: 'Cards' },
  { name: 'activity', href: '/activity', active: 'list', inactive: 'list-outline', label: 'Activity' },
  {
    name: 'profile',
    href: '/profile',
    active: 'person-circle',
    inactive: 'person-circle-outline',
    label: 'Me',
  },
];

export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const desktop = useDesktop();
  if (desktop) return null;
  const renderTab = (tab: (typeof TABS)[number]) => {
    const focused = pathname === tab.href;
    return (
      <button
        type="button"
        key={tab.name}
        role="tab"
        aria-selected={focused}
        aria-label={tab.label}
        data-testid={`tab-${tab.name}`}
        onClick={() => {
          if (!focused) router.push(tab.href);
        }}
        className={styles.tab}
      >
        <Icon
          name={focused ? tab.active : tab.inactive}
          size={24}
          color={focused ? colors.action : colors.textSecondary}
        />
        <span
          className={styles.label}
          style={{ color: focused ? colors.action : colors.textSecondary }}
        >
          {tab.label}
        </span>
      </button>
    );
  };
  return (
    <div className={styles.bar} style={{ paddingBottom: 10 }}>
      <div className={styles.inner} role="tablist">
        {TABS.slice(0, 2).map(renderTab)}
        <button
          type="button"
          aria-label="Pay or request"
          data-testid="tab-pay"
          onClick={() => router.push('/pay')}
          className={`${styles.payButton} active:opacity-80`}
        >
          <Icon name="swap-horizontal" size={28} color="#FFFFFF" />
        </button>
        {TABS.slice(2).map(renderTab)}
      </div>
    </div>
  );
}

const styles = {
  bar: 'shrink-0 bg-white border-t border-divider pt-2',
  inner: 'mx-auto flex w-full max-w-lg flex-row items-center',
  tab: 'flex flex-1 cursor-pointer flex-col items-center gap-1 py-1',
  label: 'text-xs font-semibold',
  payButton:
    'mx-2 -mt-6 flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-action shadow-lg shadow-action/30',
} as const;
