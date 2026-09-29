'use client';

import { useRouter } from 'next/navigation';

import { Icon } from '@/components/icon';
import { ResetDemo } from '@/components/reset-demo';
import {
  Body,
  Card,
  Divider,
  Header,
  ListRow,
  Screen,
  SectionLabel,
} from '@/components/ui';
import { useSession } from '@/lib/session';
import { colors, spacing } from '@/lib/theme';

export default function Settings() {
  const router = useRouter();
  const { profile, user, resetDemo } = useSession();
  const verified = profile?.verificationStatus === 'verified';
  return (
    <Screen header={<Header title="Settings" onBack={() => router.back()} />}>
      <SectionLabel>Profile</SectionLabel>
      <Card
        style={{
          paddingTop: spacing.xs,
          paddingBottom: spacing.xs,
        }}
      >
        <ListRow
          title="Edit profile"
          subtitle="Name, bio, avatar color"
          chevron
          onPress={() => router.push('/settings/edit-profile')}
          testID="settings-edit-profile"
        />
        <Divider />
        <ListRow
          title="Identity verification"
          subtitle={
            verified
              ? `Verified as ${profile?.identity?.legalName ?? profile?.displayName}`
              : 'Required for cards and higher limits'
          }
          chevron={!verified}
          onPress={verified ? undefined : () => router.push('/settings/verify')}
          testID="settings-verify"
          right={
            <div
              className={styles.badge}
              style={
                verified
                  ? {
                      backgroundColor: colors.green,
                    }
                  : undefined
              }
            >
              <Icon
                name={verified ? 'shield-checkmark' : 'alert-circle'}
                size={14}
                color={colors.text}
              />
              <span className={styles.badgeText}>
                {verified ? 'Verified' : 'Pending'}
              </span>
            </div>
          }
        />
      </Card>

      <SectionLabel>Money</SectionLabel>
      <Card
        style={{
          paddingTop: spacing.xs,
          paddingBottom: spacing.xs,
        }}
      >
        <ListRow
          title="Banks and cards"
          chevron
          onPress={() => router.push('/wallet/funding-sources')}
        />
        <Divider />
        <ListRow
          title="Default privacy"
          subtitle="Friends can see your payments"
          right={<span className={styles.value}>Friends</span>}
        />
      </Card>

      <SectionLabel>About</SectionLabel>
      <Card>
        <Body
          secondary
          style={{
            fontSize: 13,
          }}
        >
          Account {user?.email}
          <br />
          TesterPay demo · every dollar here is pretend.
        </Body>
      </Card>
      <ResetDemo onReset={resetDemo} />
    </Screen>
  );
}

const styles = {
  badge:
    'flex flex-row items-center gap-1 bg-yellow px-2.5 py-1 rounded-full shrink-0',
  badgeText: 'text-xs font-bold text-ink',
  value: 'text-ink-secondary text-sm',
} as const;
