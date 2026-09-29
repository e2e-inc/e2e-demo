'use client';

import { formatKeypadDisplay } from '../lib/money';
import { colors } from '../lib/theme';
import { Icon } from './icon';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'];

export function Keypad({ onKey }: { onKey: (key: string) => void }) {
  return (
    <div className={styles.grid} data-testid="keypad">
      {KEYS.map((key) => (
        <button
          type="button"
          key={key}
          aria-label={key === 'backspace' ? 'Delete' : key}
          data-testid={`key-${key}`}
          onClick={() => onKey(key)}
          className={`${styles.key} active:bg-pill-gray`}
        >
          {key === 'backspace' ? (
            <Icon name="backspace-outline" size={26} color={colors.text} />
          ) : (
            <span className={styles.keyLabel}>{key}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function AmountDisplay({
  text,
  color = colors.text,
}: {
  text: string;
  color?: string;
}) {
  const display = formatKeypadDisplay(text);
  const long = display.length > 7;
  return (
    <div className={styles.amountRow} aria-label={`Amount ${display}`}>
      <span
        className={styles.currency}
        style={{ color, fontSize: long ? 28 : 34, lineHeight: 1.2 }}
        data-testid="amount-currency"
      >
        $
      </span>
      <span
        className={styles.amount}
        style={{ color, fontSize: long ? 52 : 64, lineHeight: 1.15 }}
        data-testid="amount-display"
      >
        {display}
      </span>
    </div>
  );
}

const styles = {
  grid: 'flex flex-row flex-wrap justify-between',
  key: 'mb-1 flex h-16 w-1/3 cursor-pointer items-center justify-center rounded-full',
  keyLabel: 'text-3xl font-medium text-ink',
  amountRow: 'flex flex-row items-start justify-center py-2',
  currency: 'mt-2.5 mr-0.5 font-semibold',
  amount: 'font-bold tracking-tighter',
} as const;
