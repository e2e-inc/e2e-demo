'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { formatCents } from '../lib/money';
import { useFundingSources } from '../lib/queries';
import { colors } from '../lib/theme';
import type { FundingSource } from '../lib/types';
import { Icon } from './icon';

export type FundingChoice =
  | { kind: 'balance' }
  | { kind: 'source'; source: FundingSource };

export function fundingLabel(choice: FundingChoice, balanceCents: number) {
  return choice.kind === 'balance'
    ? `TesterPay balance · ${formatCents(balanceCents)}`
    : choice.source.label;
}

/**
 * Compact "Pay with" selector. `allowBalance=false` is used for add-money and
 * transfer flows where the balance itself is the counterpart.
 */
export function FundingPicker({
  value,
  onChange,
  balanceCents,
  allowBalance = true,
  amountCents,
  title = 'Pay with',
  instantOnly,
}: {
  value: FundingChoice | null;
  onChange: (choice: FundingChoice) => void;
  balanceCents: number;
  allowBalance?: boolean;
  amountCents?: number;
  title?: string;
  instantOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const sources = useFundingSources();
  const list = (sources.data?.fundingSources ?? []).filter(
    (source) => !instantOnly || source.type === 'debit_card',
  );
  const shortfall =
    value?.kind === 'balance' &&
    amountCents !== undefined &&
    amountCents > balanceCents;
  return (
    <div className={styles.wrap}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`${title}: ${value ? fundingLabel(value, balanceCents) : 'Choose'}`}
        aria-expanded={open}
        data-testid="funding-picker"
        className={styles.row}
      >
        <div className={styles.icon}>
          <Icon
            name={
              value?.kind === 'source' && value.source.type === 'bank'
                ? 'business'
                : 'wallet'
            }
            size={18}
            color={colors.text}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className={styles.label}>{title}</p>
          <p className={styles.value}>
            {value ? fundingLabel(value, balanceCents) : 'Choose a bank or card'}
          </p>
          {shortfall ? (
            <p className={styles.warning}>
              Not enough balance — pick a bank or card to cover the rest.
            </p>
          ) : null}
        </div>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </button>

      {open ? (
        <div className={styles.options}>
          {allowBalance ? (
            <Option
              label={`TesterPay balance · ${formatCents(balanceCents)}`}
              selected={value?.kind === 'balance'}
              onPress={() => {
                onChange({ kind: 'balance' });
                setOpen(false);
              }}
              testID="funding-option-balance"
            />
          ) : null}
          {list.map((source) => (
            <Option
              key={source.id}
              label={source.label}
              selected={value?.kind === 'source' && value.source.id === source.id}
              onPress={() => {
                onChange({ kind: 'source', source });
                setOpen(false);
              }}
              testID={`funding-option-${source.last4}`}
            />
          ))}
          <Option
            label={instantOnly ? 'Link a debit card' : 'Link a bank or card'}
            icon="add"
            onPress={() => router.push('/wallet/link')}
            testID="funding-option-link"
          />
        </div>
      ) : null}
    </div>
  );
}

function Option({
  label,
  selected,
  onPress,
  icon,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: 'add';
  testID: string;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={!!selected}
      aria-label={label}
      data-testid={testID}
      className={`${styles.option} active:opacity-70`}
    >
      {icon ? <Icon name={icon} size={18} color={colors.action} /> : null}
      <span
        className={styles.optionLabel}
        style={icon ? { color: colors.action } : undefined}
      >
        {label}
      </span>
      {selected ? <Icon name="checkmark" size={18} color={colors.action} /> : null}
    </button>
  );
}

const styles = {
  wrap: 'overflow-hidden rounded-3xl bg-card',
  row: 'flex w-full cursor-pointer flex-row items-center gap-3 p-4 text-left',
  icon: 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pill-gray',
  label: 'text-xs font-semibold uppercase text-ink-secondary',
  value: 'mt-0.5 truncate text-sm font-semibold text-ink',
  warning: 'mt-1 text-sm text-danger',
  options: 'border-t border-divider py-1',
  option: 'flex w-full cursor-pointer flex-row items-center gap-2 px-4 py-3 text-left',
  optionLabel: 'flex-1 text-sm text-ink',
} as const;
