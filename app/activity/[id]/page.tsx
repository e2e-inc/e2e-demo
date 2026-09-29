'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { Avatar } from '../../../components/avatar';
import { describeTransaction } from '../../../components/feed-item';
import {
  Card,
  Divider,
  EmptyState,
  Header,
  Loading,
  Pill,
  Screen,
} from '../../../components/ui';
import { api } from '../../../lib/api';
import { href } from '../../../lib/href';
import { formatCents, fullDate, signedCents } from '../../../lib/money';
import { keys } from '../../../lib/queries';
import { useSession } from '../../../lib/session';
import { colors, spacing } from '../../../lib/theme';
import { useRouteParams } from '../../../lib/use-route-params';

export default function TransactionDetail() {
  const router = useRouter();
  const { id } = useRouteParams<{ id: string }>();
  const { user } = useSession();
  const query = useQuery({
    queryKey: keys.transaction(id),
    queryFn: () => api.transaction(id),
  });

  if (query.isLoading) {
    return (
      <Screen header={<Header title="Details" />}>
        <Loading />
      </Screen>
    );
  }
  const transaction = query.data?.transaction;
  if (!transaction) {
    return (
      <Screen header={<Header title="Details" />}>
        <EmptyState
          title="Not found"
          body="This transaction is no longer available."
        />
      </Screen>
    );
  }

  const summary = describeTransaction(transaction, user?.id ?? null);
  const counterpart =
    transaction.kind === 'payment'
      ? transaction.from?.userId === user?.id
        ? transaction.to
        : transaction.from
      : null;
  const canPayAgain = counterpart && transaction.from?.userId === user?.id;

  const rows: [string, string][] = [
    [
      'Status',
      transaction.status === 'completed'
        ? 'Completed'
        : transaction.status === 'pending'
          ? 'Pending'
          : 'Failed',
    ],
    ['Date', fullDate(transaction.createdAt)],
    ['Type', typeLabel(transaction.kind)],
  ];
  if (transaction.fundingLabel) rows.push(['Funding', transaction.fundingLabel]);
  if (transaction.feeCents > 0)
    rows.push(['Fee', formatCents(transaction.feeCents)]);
  if (transaction.speed)
    rows.push([
      'Speed',
      transaction.speed === 'instant' ? 'Instant' : 'Standard (1-3 days)',
    ]);
  if (transaction.channel)
    rows.push([
      'Channel',
      transaction.channel === 'online' ? 'Online checkout' : 'In store',
    ]);
  if (transaction.kind === 'payment') {
    rows.push([
      'Visibility',
      transaction.privacy === 'public'
        ? 'Public'
        : transaction.privacy === 'friends'
          ? 'Friends'
          : 'Private',
    ]);
  }
  rows.push(['Reference', transaction.id.slice(0, 8).toUpperCase()]);

  return (
    <Screen header={<Header title="Details" onBack={() => router.back()} />}>
      <div className={styles.hero} data-testid="transaction-detail">
        {summary.avatar ? (
          <Avatar
            emoji={summary.avatar.emoji}
            color={summary.avatar.color}
            size={72}
          />
        ) : (
          <Avatar person={counterpart} size={72} />
        )}
        <p className={styles.sentence}>
          <span style={{ fontWeight: 700 }}>{summary.actor}</span>{' '}
          {summary.verb}{' '}
          <span style={{ fontWeight: 700 }}>{summary.target}</span>
        </p>
        <p
          className={styles.amount}
          style={
            summary.direction === 'in' ? { color: colors.success } : undefined
          }
          data-testid="detail-amount"
        >
          {signedCents(transaction.amountCents, summary.direction)}
        </p>
        {transaction.note && transaction.kind === 'payment' ? (
          <p className={styles.note}>
            {transaction.emoji ? `${transaction.emoji} ` : ''}
            {transaction.note}
          </p>
        ) : null}
      </div>

      {counterpart ? (
        <div className={styles.actions}>
          {canPayAgain ? (
            <Pill
              label="Pay again"
              compact
              testID="pay-again"
              onPress={() =>
                router.push(
                  href('/pay/[userId]', {
                    userId: counterpart.userId,
                    mode: 'pay',
                    handle: counterpart.handle,
                    name: counterpart.displayName,
                    color: counterpart.avatarColor,
                    amount: String(transaction.amountCents),
                    note: transaction.note,
                  }),
                )
              }
            />
          ) : (
            <Pill
              label="Pay back"
              compact
              onPress={() =>
                router.push(
                  href('/pay/[userId]', {
                    userId: counterpart.userId,
                    mode: 'pay',
                    handle: counterpart.handle,
                    name: counterpart.displayName,
                    color: counterpart.avatarColor,
                  }),
                )
              }
            />
          )}
          <Pill
            label="Split"
            compact
            variant="secondary"
            testID="split-from-detail"
            onPress={() =>
              router.push(
                href('/split/new', {
                  amount: String(transaction.amountCents),
                  note: transaction.note,
                }),
              )
            }
          />
          <Pill
            label="Profile"
            compact
            variant="secondary"
            onPress={() => router.push(`/people/${counterpart.handle}`)}
          />
        </div>
      ) : null}

      <Card
        style={{
          marginTop: spacing.xl,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
        }}
      >
        {rows.map(([label, value], index) => (
          <div key={label}>
            {index > 0 ? <Divider /> : null}
            <div className={styles.row}>
              <p className={styles.rowLabel}>{label}</p>
              <p className={styles.rowValue}>{value}</p>
            </div>
          </div>
        ))}
      </Card>
    </Screen>
  );
}

function typeLabel(kind: string) {
  switch (kind) {
    case 'add_money':
      return 'Added to balance';
    case 'transfer_out':
      return 'Transfer to bank';
    case 'merchant':
      return 'Business payment';
    case 'card_purchase':
      return 'Card purchase';
    default:
      return 'Payment';
  }
}

const styles = {
  hero: 'flex flex-col items-center py-4 gap-2',
  sentence: 'text-lg text-ink text-center mt-2',
  amount: 'text-5xl font-extrabold tracking-tighter text-ink',
  note: 'text-base text-ink text-center',
  actions: 'flex flex-row justify-center gap-2 flex-wrap',
  row: 'flex flex-row justify-between py-3 gap-3',
  rowLabel: 'text-ink-secondary text-sm',
  rowValue: 'text-ink text-sm font-semibold shrink text-right',
} as const;
