'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useSession } from '../lib/session';
import { colors } from '../lib/theme';
import { Avatar } from './avatar';
import { Icon, type IconName } from './icon';
import { Pill } from './ui';

const links = [
  { label: 'Home', href: '/', icon: 'home-outline' },
  { label: 'Cards', href: '/cards', icon: 'card-outline' },
  { label: 'Activity', href: '/activity', icon: 'list-outline' },
  { label: 'Friends', href: '/people', icon: 'people-outline' },
  { label: 'Businesses', href: '/merchants', icon: 'storefront-outline' },
  { label: 'Settings', href: '/settings', icon: 'settings-outline' },
] satisfies { label: string; href: string; icon: IconName }[];

export function DesktopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useSession();

  return (
    <nav
      className="w-60 shrink-0 overflow-y-auto border-r border-divider bg-white"
      data-testid="desktop-navigation"
    >
      <div className="flex min-h-full flex-col gap-8 p-5">
        <Link
          href="/"
          className="px-3 py-3 text-3xl font-extrabold tracking-tighter text-brand"
        >
          testerpay
        </Link>
        <div className="flex flex-col gap-2">
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== '/' && pathname.startsWith(`${link.href}/`));
            return (
              <Link
                key={link.label}
                href={link.href}
                aria-label={link.label}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-row items-center gap-3 rounded-xl px-4 py-3 hover:bg-sky-soft ${active ? 'bg-sky-soft' : ''}`}
              >
                <Icon
                  name={link.icon}
                  size={22}
                  color={active ? colors.action : colors.textSecondary}
                />
                <span
                  className={`text-base font-semibold ${active ? 'text-action' : 'text-ink-secondary'}`}
                >
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>
        <Pill
          label="Pay or request"
          variant="brand"
          icon="swap-horizontal"
          onPress={() => router.push('/pay')}
        />
        <div className="flex-1" />
        <Link
          href="/profile"
          aria-label="Your profile"
          className="flex flex-row items-center gap-3 rounded-xl p-2 hover:bg-canvas"
        >
          <Avatar person={profile} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">
              {profile?.displayName}
            </p>
            <p className="truncate text-xs text-ink-secondary">
              @{profile?.handle}
            </p>
          </div>
        </Link>
      </div>
    </nav>
  );
}
