'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { FeedItem } from '../../../components/feed-item';
import { Icon, type IconName } from '../../../components/icon';
import { PaymentCard } from '../../../components/payment-card';
import {
  Body,
  Card,
  Chip,
  Divider,
  EmptyState,
  Header,
  ListRow,
  Loading,
  Pill,
  Screen,
  SectionLabel,
} from '../../../components/ui';
import { api } from '../../../lib/api';
import { formatCents } from '../../../lib/money';
import { keys, useCards } from '../../../lib/queries';
import { useSession } from '../../../lib/session';
import { cardDesigns, colors, spacing } from '../../../lib/theme';
import type { Card as CardType } from '../../../lib/types';
import { useRouteParams } from '../../../lib/use-route-params';

const LIMITS = [50_000, 100_000, 300_000, 500_000];

export default function CardDetail() {
  const router = useRouter();
  const client = useQueryClient();
  const { id, fresh } = useRouteParams<{
    id: string;
    fresh?: string;
  }>();
  const { profile, user } = useSession();
  const cards = useCards();
  const transactions = useQuery({
    queryKey: ['card-transactions', id],
    queryFn: () => api.cardTransactions(id),
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [showNumber, setShowNumber] = useState(false);
  const card = cards.data?.cards.find((entry) => entry.id === id);
  async function update(
    input: Parameters<typeof api.updateCard>[1],
    key: string,
  ) {
    setBusy(key);
    try {
      await api.updateCard(id, input);
      await client.invalidateQueries({
        queryKey: keys.cards,
      });
    } finally {
      setBusy(null);
    }
  }
  if (cards.isLoading) {
    return (
      <Screen header={<Header title="Card" />}>
        <Loading />
      </Screen>
    );
  }
  if (!card) {
    return (
      <Screen header={<Header title="Card" />}>
        <EmptyState title="Card not found" />
      </Screen>
    );
  }
  const locked = card.status === 'locked';
  return (
    <Screen
      header={
        <Header
          title={card.type === 'credit' ? 'Credit card' : 'Debit card'}
          onBack={() => (fresh ? router.replace('/cards') : router.back())}
        />
      }
    >
      {fresh ? (
        <Card
          style={{
            backgroundColor: colors.green,
            marginBottom: spacing.lg,
          }}
          testID="card-fresh-banner"
        >
          <p
            className="text-ink"
            style={{
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            {card.type === 'credit' ? 'You’re approved!' : 'Your card is ready'}
          </p>
          <Body
            style={{
              fontSize: 14,
              marginTop: 2,
            }}
          >
            {card.type === 'credit'
              ? `Credit limit ${formatCents(card.creditLimitCents ?? 0, {
                  compact: true,
                })}. Use it online right now.`
              : 'Use the virtual card online now, or order a physical card below.'}
          </Body>
        </Card>
      ) : null}

      <PaymentCard card={card} holder={profile?.displayName ?? ''} />

      <div className={styles.quick}>
        <QuickAction
          icon={locked ? 'lock-open' : 'lock-closed'}
          label={locked ? 'Unlock' : 'Lock'}
          active={locked}
          busy={busy === 'lock'}
          testID="card-lock-toggle"
          onPress={() =>
            update(
              {
                status: locked ? 'active' : 'locked',
              },
              'lock',
            )
          }
        />
        <QuickAction
          icon={showNumber ? 'eye-off' : 'eye'}
          label={showNumber ? 'Hide' : 'Show'}
          onPress={() => setShowNumber((current) => !current)}
          testID="card-show-number"
        />
        <QuickAction
          icon="storefront"
          label="Spend"
          onPress={() => router.push('/merchants')}
          testID="card-spend"
        />
      </div>

      {showNumber ? (
        <Card
          style={{
            marginTop: spacing.md,
          }}
          testID="card-details"
        >
          <Body>
            Card number: 4532 88{card.last4.slice(0, 2)} 91{card.last4.slice(2)}{' '}
            {card.last4}
          </Body>
          <Body>
            Expires {String(card.expMonth).padStart(2, '0')}/{card.expYear} ·
            CVV 1{card.last4.slice(-2)}
          </Body>
        </Card>
      ) : null}

      <SectionLabel>Controls</SectionLabel>
      <Card
        style={{
          paddingTop: spacing.xs,
          paddingBottom: spacing.xs,
        }}
      >
        <ListRow
          title="Lock card"
          subtitle={
            locked ? 'Purchases are blocked' : 'Instantly block all purchases'
          }
          right={
            <Switch
              value={locked}
              onValueChange={(next) =>
                update(
                  {
                    status: next ? 'locked' : 'active',
                  },
                  'lock',
                )
              }
              trackColor={{
                true: colors.action,
                false: colors.pillGray,
              }}
              accessibilityLabel="Lock card"
              testID="card-lock-switch"
            />
          }
        />
        {card.type === 'debit' ? (
          <>
            <Divider />
            <div
              style={{
                paddingTop: spacing.md,
                paddingBottom: spacing.md,
              }}
            >
              <p className={styles.controlTitle}>Daily spend limit</p>
              <p className={styles.controlSub}>
                Currently{' '}
                {formatCents(card.spendLimitCents ?? 0, {
                  compact: true,
                })}
              </p>
              <div className={styles.chips}>
                {LIMITS.map((limit) => (
                  <Chip
                    key={limit}
                    label={formatCents(limit, {
                      compact: true,
                    })}
                    selected={card.spendLimitCents === limit}
                    onPress={() =>
                      update(
                        {
                          spendLimitCents: limit,
                        },
                        'limit',
                      )
                    }
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <Divider />
            <ListRow
              title="Credit limit"
              subtitle="Pay your statement from your balance"
              right={
                <p className={styles.value}>
                  {formatCents(card.creditLimitCents ?? 0, {
                    compact: true,
                  })}
                </p>
              }
            />
          </>
        )}
        <Divider />
        <div
          style={{
            paddingTop: spacing.md,
            paddingBottom: spacing.md,
          }}
        >
          <p className={styles.controlTitle}>Card design</p>
          <div className={styles.swatches}>
            {Object.entries(cardDesigns).map(([key, value]) => (
              <button
                type="button"
                key={key}
                aria-label={`${value.label} design`}
                aria-pressed={card.design === key}
                onClick={() =>
                  update(
                    {
                      design: key,
                    },
                    'design',
                  )
                }
                className={twMerge(
                  styles.swatch,
                  card.design === key && styles.swatchActive,
                )}
                style={{
                  backgroundColor: value.to,
                }}
              >
                <div
                  className={styles.swatchBlob}
                  style={{
                    backgroundColor: value.from,
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </Card>

      <SectionLabel>Physical card</SectionLabel>
      <Card className="flex flex-col">
        <PhysicalStatus
          card={card}
          busy={busy === 'physical'}
          onUpdate={(status) =>
            update(
              {
                physicalStatus: status,
              },
              'physical',
            )
          }
        />
      </Card>

      <SectionLabel>Recent purchases</SectionLabel>
      {transactions.isLoading ? (
        <Loading />
      ) : transactions.data?.transactions.length ? (
        transactions.data.transactions.map((transaction) => (
          <FeedItem
            key={transaction.id}
            transaction={transaction}
            viewerId={user?.id ?? null}
          />
        ))
      ) : (
        <Card>
          <Body secondary>
            No purchases yet. Pay a business to see them here.
          </Body>
        </Card>
      )}
    </Screen>
  );
}

/** Web stand-in for React Native's Switch (iOS look, default white thumb). */
function Switch({
  value,
  onValueChange,
  trackColor,
  thumbColor = '#FFFFFF',
  accessibilityLabel,
  testID,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  trackColor: { true: string; false: string };
  thumbColor?: string;
  accessibilityLabel?: string;
  testID?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={accessibilityLabel}
      data-testid={testID}
      onClick={() => onValueChange(!value)}
      className={styles.switchTrack}
      style={{
        backgroundColor: value ? trackColor.true : trackColor.false,
      }}
    >
      <span
        className={styles.switchThumb}
        style={{
          backgroundColor: thumbColor,
          transform: value ? 'translateX(20px)' : 'translateX(0px)',
        }}
      />
    </button>
  );
}

function PhysicalStatus({
  card,
  busy,
  onUpdate,
}: {
  card: CardType;
  busy: boolean;
  onUpdate: (status: 'ordered' | 'activated') => void;
}) {
  if (card.physicalStatus === 'not_ordered') {
    return (
      <>
        <p className={styles.controlTitle}>Want a card in your wallet?</p>
        <p className={styles.controlSub}>Ships free in 5-7 business days.</p>
        <Pill
          label="Order physical card"
          compact
          loading={busy}
          onPress={() => onUpdate('ordered')}
          style={{
            alignSelf: 'flex-start',
            marginTop: spacing.md,
          }}
          testID="card-order-physical"
        />
      </>
    );
  }
  if (card.physicalStatus === 'activated') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <Icon name="checkmark-circle" size={22} color={colors.success} />
        <p className={styles.controlTitle}>Physical card activated</p>
      </div>
    );
  }
  return (
    <>
      <p className={styles.controlTitle}>Your card is on the way</p>
      <p className={styles.controlSub}>Got it already? Activate it here.</p>
      <Pill
        label="Activate card"
        compact
        variant="secondary"
        loading={busy}
        onPress={() => onUpdate('activated')}
        style={{
          alignSelf: 'flex-start',
          marginTop: spacing.md,
        }}
        testID="card-activate-physical"
      />
    </>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  active,
  busy,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  busy?: boolean;
  testID?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      disabled={busy}
      data-testid={testID}
      className={styles.quickItem}
    >
      <div
        className={styles.quickCircle}
        style={
          active
            ? {
                backgroundColor: colors.black,
              }
            : undefined
        }
      >
        <Icon name={icon} size={22} color={active ? '#FFFFFF' : colors.text} />
      </div>
      <span className={styles.quickLabel}>{label}</span>
    </button>
  );
}

const styles = {
  quick: 'flex flex-row justify-center gap-6 mt-4',
  quickItem:
    'flex flex-col items-center gap-1.5 cursor-pointer active:opacity-80 disabled:cursor-default',
  quickCircle:
    'flex w-14 h-14 rounded-full bg-card items-center justify-center',
  quickLabel: 'text-sm font-semibold text-ink',
  controlTitle: 'text-base font-semibold text-ink',
  controlSub: 'text-sm text-ink-secondary mt-0.5',
  chips: 'flex flex-row flex-wrap gap-2 mt-3',
  value: 'text-base font-bold text-ink',
  swatches: 'flex flex-row gap-3 mt-3',
  swatch:
    'block w-10 h-10 shrink-0 cursor-pointer rounded-full overflow-hidden border-2 border-transparent active:opacity-80',
  swatchActive: 'border-action!',
  swatchBlob: 'w-8 h-8 rounded-full ml-3 -mt-2',
  switchTrack:
    'relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200',
  switchThumb:
    'block h-[27px] w-[27px] rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-200',
} as const;
