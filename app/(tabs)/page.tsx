'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Avatar } from '../../components/avatar';
import { FeedItem } from '../../components/feed-item';
import { Icon, type IconName } from '../../components/icon';
import {
  Card,
  EmptyState,
  IconButton,
  Loading,
  Pill,
  Segmented,
} from '../../components/ui';
import { formatCents } from '../../lib/money';
import { useFeed, useRequests } from '../../lib/queries';
import { useSession } from '../../lib/session';
import { colors, spacing } from '../../lib/theme';
import { useDesktop } from '../../lib/use-desktop';

type Scope = 'friends' | 'public';

const QUICK_ACTIONS: {
  label: string;
  icon: IconName;
  href: string;
  testID: string;
}[] = [
  {
    label: 'Pay',
    icon: 'arrow-up',
    href: '/pay?mode=pay',
    testID: 'quick-pay',
  },
  {
    label: 'Request',
    icon: 'arrow-down',
    href: '/pay?mode=request',
    testID: 'quick-request',
  },
  {
    label: 'Split',
    icon: 'people',
    href: '/split/new',
    testID: 'quick-split',
  },
  {
    label: 'Scan',
    icon: 'qr-code',
    href: '/qr',
    testID: 'quick-scan',
  },
];

export default function Home() {
  const router = useRouter();
  const desktop = useDesktop();
  const { profile, user } = useSession();
  const [scope, setScope] = useState<Scope>('friends');
  const feed = useFeed(scope);
  const requests = useRequests();
  const pending =
    requests.data?.incoming.filter((request) => request.status === 'pending') ??
    [];

  return (
    <div className={styles.screen}>
      <div
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ paddingBottom: 40 }}
      >
        <div
          className={
            desktop ? 'mx-auto w-full max-w-6xl px-6 py-6' : styles.column
          }
          style={{ paddingTop: spacing.sm }}
        >
          <div className={styles.topBar}>
            {desktop ? (
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-ink">
                  Welcome back
                  {profile ? `, ${profile.displayName.split(' ')[0]}` : ''}
                </h1>
                <p className="mt-2 text-base text-ink-secondary">
                  Your money. Your people. All in one place.
                </p>
              </div>
            ) : (
              <p className={styles.wordmark}>testerpay</p>
            )}
            <div className="flex flex-row" style={{ gap: spacing.sm }}>
              <IconButton
                name="search"
                accessibilityLabel="Find people"
                testID="home-search"
                onPress={() => router.push('/people')}
              />
              <IconButton
                name="qr-code-outline"
                accessibilityLabel="Show my code"
                testID="home-qr"
                onPress={() => router.push('/qr')}
              />
            </div>
          </div>

          <div
            className={desktop ? 'mt-6 flex flex-row items-start gap-6' : ''}
            data-testid="home-dashboard"
          >
            <div className={desktop ? 'w-80' : ''}>
              <Card className={styles.balanceCard} testID="balance-card">
                <p className={styles.balanceLabel}>TesterPay balance</p>
                <p className={styles.balance} data-testid="balance-amount">
                  {formatCents(profile?.balanceCents ?? 0)}
                </p>
                <div className={styles.balanceActions}>
                  <Pill
                    label="Add money"
                    variant="secondary"
                    compact
                    icon="add"
                    testID="home-add-money"
                    onPress={() => router.push('/wallet/add-money')}
                    style={{ flex: 1 }}
                  />
                  <Pill
                    label="Transfer"
                    variant="secondary"
                    compact
                    icon="arrow-forward"
                    testID="home-transfer"
                    onPress={() => router.push('/wallet/transfer')}
                    style={{ flex: 1 }}
                  />
                </div>
              </Card>

              <div className={styles.quickRow}>
                {QUICK_ACTIONS.map((action) => (
                  <button
                    type="button"
                    key={action.label}
                    aria-label={action.label}
                    data-testid={action.testID}
                    onClick={() => router.push(action.href)}
                    className={
                      desktop
                        ? 'flex w-16 flex-col items-center gap-1.5'
                        : styles.quick
                    }
                  >
                    <span className={styles.quickCircle}>
                      <Icon name={action.icon} size={22} color={colors.text} />
                    </span>
                    <span className={styles.quickLabel}>{action.label}</span>
                  </button>
                ))}
              </div>

              {profile && profile.verificationStatus !== 'verified' ? (
                <Card
                  className={styles.verifyCard}
                  onPress={() => router.push('/settings/verify')}
                  testID="verify-banner"
                >
                  <span
                    className="flex flex-row items-center"
                    style={{ gap: spacing.md }}
                  >
                    <span className={styles.verifyIcon}>
                      <Icon
                        name="shield-checkmark"
                        size={22}
                        color={colors.text}
                      />
                    </span>
                    <span className="flex flex-col" style={{ flex: 1 }}>
                      <span className={styles.verifyTitle}>
                        Verify your identity
                      </span>
                      <span className={styles.verifyBody}>
                        Unlock cards, higher limits, and bank transfers.
                      </span>
                    </span>
                    <Icon
                      name="chevron-forward"
                      size={18}
                      color={colors.text}
                    />
                  </span>
                </Card>
              ) : null}

              {pending.length > 0 ? (
                <Card style={{ marginTop: spacing.sm }} testID="requests-inbox">
                  <div className={styles.inboxHeader}>
                    <p className={styles.sectionTitle}>
                      {pending.length} request{pending.length === 1 ? '' : 's'}{' '}
                      for you
                    </p>
                    <button
                      type="button"
                      role="link"
                      className={styles.link}
                      onClick={() => router.push('/activity?tab=requests')}
                    >
                      See all
                    </button>
                  </div>
                  {pending.slice(0, 2).map((request) => (
                    <button
                      type="button"
                      key={request.id}
                      className={styles.inboxRow}
                      data-testid={`inbox-request-${request.id}`}
                      onClick={() => router.push(`/requests/${request.id}`)}
                    >
                      <Avatar person={request.requester} size={40} />
                      <span
                        className="flex min-w-0 flex-col"
                        style={{ flex: 1 }}
                      >
                        <span className={styles.inboxName}>
                          {request.requester.displayName}{' '}
                          <span
                            style={{
                              color: colors.textSecondary,
                              fontWeight: 400,
                            }}
                          >
                            requested
                          </span>
                        </span>
                        <span className={styles.inboxNote}>
                          {request.emoji ? `${request.emoji} ` : ''}
                          {request.note}
                        </span>
                      </span>
                      <span className={styles.inboxAmount}>
                        {formatCents(request.amountCents)}
                      </span>
                    </button>
                  ))}
                </Card>
              ) : null}
            </div>
            <div
              className={
                desktop ? 'min-w-0 flex-1 rounded-3xl bg-white p-6' : ''
              }
            >
              {desktop ? (
                <p className="mb-4 text-xl font-bold text-ink">Your circle</p>
              ) : null}
              <div className={desktop ? 'mb-3' : styles.feedHeader}>
                <Segmented<Scope>
                  options={[
                    {
                      value: 'friends',
                      label: 'Friends',
                    },
                    {
                      value: 'public',
                      label: 'Everyone',
                    },
                  ]}
                  value={scope}
                  onChange={setScope}
                />
              </div>

              {feed.isLoading ? (
                <Loading />
              ) : feed.data?.transactions.length ? (
                feed.data.transactions.map((transaction) => (
                  <FeedItem
                    key={transaction.id}
                    transaction={transaction}
                    viewerId={user?.id ?? null}
                  />
                ))
              ) : (
                <EmptyState
                  icon="people-outline"
                  title="Your feed is quiet"
                  body="Add friends to see what they're up to, or make the first move."
                  action={
                    <Pill
                      label="Find friends"
                      compact
                      variant="secondary"
                      onPress={() => router.push('/people')}
                    />
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  screen: 'flex min-h-0 flex-1 flex-col bg-canvas',
  column: 'mx-auto w-full max-w-lg px-4',
  topBar: 'flex flex-row items-center justify-between py-2',
  wordmark: 'text-2xl font-extrabold tracking-tighter text-brand',
  balanceCard: 'mt-2',
  balanceLabel: 'text-sm text-ink-secondary font-medium',
  balance: 'text-5xl font-bold tracking-tighter mt-1 text-ink',
  balanceActions: 'flex flex-row gap-2 mt-4',
  quickRow: 'flex flex-row justify-between mt-4 mb-2 px-2',
  quick: 'flex flex-col items-center gap-1.5 w-20',
  quickCircle:
    'flex w-14 h-14 rounded-full bg-card items-center justify-center',
  quickLabel: 'text-sm font-semibold text-ink',
  verifyCard: 'bg-lime mt-2',
  verifyIcon:
    'flex w-11 h-11 shrink-0 rounded-full bg-white/70 items-center justify-center',
  verifyTitle: 'text-base font-bold text-ink',
  verifyBody: 'text-sm text-ink opacity-80 mt-0.5',
  inboxHeader: 'flex flex-row justify-between items-center mb-2',
  sectionTitle: 'text-base font-bold text-ink',
  link: 'text-action font-semibold text-sm',
  inboxRow:
    'flex w-full flex-row items-center gap-3 py-2 text-left',
  inboxName: 'text-sm font-bold text-ink',
  inboxNote: 'truncate text-sm text-ink-secondary mt-0.5',
  inboxAmount: 'text-base font-bold text-ink',
  feedHeader: 'mt-6 mb-3',
  pill: 'rounded-full',
} as const;
