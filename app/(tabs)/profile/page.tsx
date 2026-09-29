'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Avatar } from '../../../components/avatar';
import { Icon, type IconName } from '../../../components/icon';
import {
  Card,
  Divider,
  ListRow,
  Pill,
  Screen,
  SectionLabel,
} from '../../../components/ui';
import { formatCents } from '../../../lib/money';
import { useSession } from '../../../lib/session';
import { colors, spacing } from '../../../lib/theme';

export default function Profile() {
  const router = useRouter();
  const { profile, user, signOut } = useSession();
  const [copied, setCopied] = useState(false);

  async function copyHandle() {
    if (!profile) return;
    await navigator.clipboard.writeText(`@${profile.handle}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const rows: {
    icon: IconName;
    title: string;
    subtitle?: string;
    href: string;
    testID: string;
  }[] = [
    {
      icon: 'people-outline',
      title: 'Friends',
      subtitle: 'Find and manage people',
      href: '/people',
      testID: 'profile-friends',
    },
    {
      icon: 'business-outline',
      title: 'Banks and cards',
      subtitle: 'Linked funding sources',
      href: '/wallet/funding-sources',
      testID: 'profile-funding',
    },
    {
      icon: 'storefront-outline',
      title: 'Pay a business',
      subtitle: 'In-store or online checkout',
      href: '/merchants',
      testID: 'profile-merchants',
    },
    {
      icon: 'qr-code-outline',
      title: 'My code',
      subtitle: 'Get paid with a QR code',
      href: '/qr',
      testID: 'profile-qr',
    },
    {
      icon: 'settings-outline',
      title: 'Settings',
      subtitle: 'Profile, identity, privacy',
      href: '/settings',
      testID: 'profile-settings',
    },
  ];

  return (
    <Screen contentStyle={{ paddingTop: spacing.md }}>
      <div className={styles.hero}>
        <Avatar person={profile} size={96} />
        <p className={styles.name} data-testid="profile-name">
          {profile?.displayName}
        </p>
        <button
          type="button"
          className={styles.handle}
          onClick={copyHandle}
          data-testid="profile-handle"
        >
          @{profile?.handle} {copied ? '· Copied' : ''}
        </button>
        {profile?.bio ? <p className={styles.bio}>{profile.bio}</p> : null}
        <div className={styles.badges}>
          <div
            className={styles.badge}
            style={
              profile?.verificationStatus === 'verified'
                ? { backgroundColor: colors.green }
                : undefined
            }
          >
            <Icon
              name={
                profile?.verificationStatus === 'verified'
                  ? 'shield-checkmark'
                  : 'shield-outline'
              }
              size={14}
              color={colors.text}
            />
            <span className={styles.badgeText}>
              {profile?.verificationStatus === 'verified'
                ? 'Verified'
                : 'Not verified'}
            </span>
          </div>
          <div className={styles.badge}>
            <span className={styles.badgeText}>
              {formatCents(profile?.balanceCents ?? 0)} balance
            </span>
          </div>
        </div>
        <Pill
          label="Edit profile"
          variant="secondary"
          compact
          testID="profile-edit"
          onPress={() => router.push('/settings/edit-profile')}
          style={{ marginTop: spacing.lg }}
        />
      </div>

      <SectionLabel>Account</SectionLabel>
      <Card style={{ paddingTop: spacing.xs, paddingBottom: spacing.xs }}>
        {rows.map((row, index) => (
          <div key={row.title}>
            {index > 0 ? <Divider /> : null}
            <ListRow
              title={row.title}
              subtitle={row.subtitle}
              chevron
              testID={row.testID}
              onPress={() => router.push(row.href)}
              left={
                <div className={styles.rowIcon}>
                  <Icon name={row.icon} size={20} color={colors.text} />
                </div>
              }
            />
          </div>
        ))}
      </Card>

      <p className={styles.email}>Signed in as {user?.email}</p>
      <Pill
        label="Sign out"
        variant="danger"
        onPress={signOut}
        testID="sign-out"
        className="w-full"
      />
    </Screen>
  );
}

const styles = {
  hero: 'flex flex-col items-center py-4',
  name: 'text-2xl font-extrabold tracking-tight mt-3 text-ink',
  handle: 'text-base text-ink-secondary mt-1',
  bio: 'text-sm text-ink mt-2 text-center',
  badges: 'flex flex-row gap-2 mt-3',
  badge: 'flex flex-row items-center gap-1.5 bg-card px-3 py-1.5 rounded-full',
  badgeText: 'text-sm font-semibold text-ink',
  rowIcon:
    'flex w-10 h-10 shrink-0 rounded-full bg-pill-gray items-center justify-center',
  email: 'text-center text-ink-secondary text-sm mt-6 mb-3',
} as const;
