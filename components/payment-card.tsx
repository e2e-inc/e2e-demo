import { cardDesigns } from '../lib/theme';
import type { Card } from '../lib/types';
import { Icon } from './icon';

export function PaymentCard({
  card,
  holder,
  compact,
}: {
  card: Pick<Card, 'type' | 'last4' | 'expMonth' | 'expYear' | 'design' | 'status'>;
  holder: string;
  compact?: boolean;
}) {
  const design = cardDesigns[card.design] ?? cardDesigns.sky;
  const textColor = design.text;
  return (
    <div
      className={[styles.card, compact && styles.compact].filter(Boolean).join(' ')}
      style={{ backgroundColor: design.to }}
      role="img"
      aria-label={`${card.type} card ending in ${card.last4}`}
      data-testid={`payment-card-${card.type}`}
    >
      <div className={styles.blob} style={{ backgroundColor: design.from }} />
      <div
        className={styles.blobSmall}
        style={{ backgroundColor: design.from, opacity: 0.6 }}
      />
      <div className={styles.top}>
        <span className={styles.wordmark} style={{ color: textColor }}>
          testerpay
        </span>
        <span className={styles.type} style={{ color: textColor }}>
          {card.type === 'credit' ? 'CREDIT' : 'DEBIT'}
        </span>
      </div>
      {card.status === 'locked' ? (
        <div className={styles.lockBadge}>
          <Icon name="lock-closed" size={12} color="#FFFFFF" />
          <span className={styles.lockText}>Locked</span>
        </div>
      ) : null}
      <div className={styles.bottom}>
        <div className="min-w-0">
          <p className={styles.number} style={{ color: textColor }}>
            •••• •••• •••• {card.last4}
          </p>
          <p className={styles.holder} style={{ color: textColor }}>
            {holder.toUpperCase()}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className={styles.expLabel} style={{ color: textColor }}>
            EXP
          </span>
          <span className={styles.exp} style={{ color: textColor }}>
            {String(card.expMonth).padStart(2, '0')}/
            {String(card.expYear).slice(-2)}
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: 'relative flex aspect-3/2 w-full flex-col justify-between overflow-hidden rounded-3xl p-5',
  compact: 'p-4 rounded-2xl',
  blob: 'absolute -right-24 -top-28 h-64 w-64 rounded-full opacity-80',
  blobSmall: 'absolute -left-10 -bottom-16 h-36 w-36 rounded-full',
  top: 'relative flex flex-row items-center justify-between',
  wordmark: 'text-xl font-extrabold tracking-tight',
  type: 'text-xs font-bold tracking-widest opacity-80',
  lockBadge:
    'relative flex flex-row items-center gap-1 self-start rounded-full bg-black/50 px-2.5 py-1',
  lockText: 'text-xs font-bold text-white',
  bottom: 'relative flex flex-row items-end justify-between',
  number: 'text-base font-semibold tracking-widest',
  holder: 'mt-1.5 truncate text-xs font-semibold tracking-wider opacity-90',
  expLabel: 'text-xs font-bold tracking-widest opacity-80',
  exp: 'mt-0.5 text-sm font-semibold',
} as const;
