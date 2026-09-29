'use client';

import { useRouter } from 'next/navigation';

import { formatCents, relativeTime, signedCents } from '../lib/money';
import { colors } from '../lib/theme';
import type { Transaction } from '../lib/types';
import { Avatar } from './avatar';
import { Icon } from './icon';

export function describeTransaction(
  transaction: Transaction,
  viewerId: string | null,
) {
  const isSender = transaction.from?.userId === viewerId;
  const isReceiver = transaction.to?.userId === viewerId;
  switch (transaction.kind) {
    case 'add_money':
      return {
        title: transaction.note || 'Added money',
        actor: 'You',
        verb: 'added money from',
        target: transaction.fundingLabel ?? 'a linked account',
        direction: 'in' as const,
        avatar: { emoji: '🏦', color: colors.skySoft },
      };
    case 'transfer_out':
      return {
        title: transaction.note,
        actor: 'You',
        verb: 'transferred to',
        target: transaction.fundingLabel ?? 'your bank',
        direction: 'out' as const,
        avatar: { emoji: '🏦', color: colors.skySoft },
      };
    case 'merchant':
    case 'card_purchase':
      return {
        title: transaction.merchant?.name ?? 'Purchase',
        actor: 'You',
        verb: 'paid',
        target: transaction.merchant?.name ?? 'a merchant',
        direction: 'out' as const,
        avatar: {
          emoji: transaction.merchant?.emoji ?? '🏪',
          color: transaction.merchant?.color ?? colors.pillGray,
        },
      };
    default: {
      const from = isSender
        ? 'You'
        : (transaction.from?.displayName ?? 'Someone');
      const to = isReceiver ? 'you' : (transaction.to?.displayName ?? 'someone');
      return {
        title: `${from} paid ${to}`,
        actor: from,
        verb: 'paid',
        target: to,
        direction: isSender
          ? ('out' as const)
          : isReceiver
            ? ('in' as const)
            : ('none' as const),
        avatar: null,
      };
    }
  }
}

export function FeedItem({
  transaction,
  viewerId,
  showAmount = true,
}: {
  transaction: Transaction;
  viewerId: string | null;
  showAmount?: boolean;
}) {
  const router = useRouter();
  const summary = describeTransaction(transaction, viewerId);
  const amountVisible = showAmount && summary.direction !== 'none';
  const person =
    transaction.kind === 'payment'
      ? transaction.from?.userId === viewerId
        ? transaction.to
        : transaction.from
      : null;
  return (
    <button
      type="button"
      aria-label={`${summary.title}${transaction.note ? `, ${transaction.note}` : ''}`}
      data-testid={`feed-item-${transaction.id}`}
      onClick={() => router.push(`/activity/${transaction.id}`)}
      className={`${styles.card} active:opacity-80`}
    >
      <div className={styles.top}>
        {summary.avatar ? (
          <Avatar
            emoji={summary.avatar.emoji}
            color={summary.avatar.color}
            size={44}
          />
        ) : (
          <Avatar person={person} size={44} />
        )}
        <div className="min-w-0 flex-1">
          <p className={styles.sentence}>
            <span className={styles.name}>{summary.actor}</span>
            <span className={styles.verb}> {summary.verb} </span>
            <span className={styles.name}>{summary.target}</span>
          </p>
          <p className={styles.meta}>
            {relativeTime(transaction.createdAt)}
            {transaction.privacy === 'public'
              ? '  ·  🌎'
              : transaction.privacy === 'friends'
                ? '  ·  👥'
                : '  ·  🔒'}
            {transaction.status === 'pending' ? '  ·  Pending' : ''}
          </p>
        </div>
        {amountVisible ? (
          <span
            className={styles.amount}
            style={
              summary.direction === 'in' ? { color: colors.success } : undefined
            }
          >
            {signedCents(transaction.amountCents, summary.direction)}
          </span>
        ) : (
          <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
        )}
      </div>
      {transaction.note && transaction.kind === 'payment' ? (
        <p className={styles.note}>
          {transaction.emoji ? `${transaction.emoji} ` : ''}
          {transaction.note}
        </p>
      ) : null}
      {transaction.feeCents > 0 ? (
        <p className={styles.meta}>Fee {formatCents(transaction.feeCents)}</p>
      ) : null}
    </button>
  );
}

const styles = {
  card: 'mb-2 block w-full cursor-pointer rounded-3xl bg-card p-4 text-left',
  top: 'flex flex-row items-center gap-3',
  sentence: 'text-lg leading-snug text-ink',
  name: 'font-bold',
  verb: 'text-ink-secondary',
  meta: 'mt-1 whitespace-pre-wrap text-sm text-ink-secondary',
  amount: 'shrink-0 text-base font-bold text-ink',
  note: 'mt-3 text-base leading-snug text-ink',
} as const;
