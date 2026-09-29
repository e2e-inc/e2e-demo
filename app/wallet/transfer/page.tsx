'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { type FundingChoice, FundingPicker } from '@/components/funding-picker';
import { Icon } from '@/components/icon';
import { AmountDisplay, Keypad } from '@/components/keypad';
import { Chip, ErrorText, Header, Pill, Screen } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { href } from '@/lib/href';
import {
  applyKeypadKey,
  formatCents,
  instantFee,
  parseAmount,
} from '@/lib/money';
import { useFundingSources, useRefreshMoney } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { colors, spacing } from '@/lib/theme';

type Speed = 'instant' | 'standard';

export default function Transfer() {
  const router = useRouter();
  const { profile, setProfile } = useSession();
  const refresh = useRefreshMoney();
  const sources = useFundingSources();
  const [amountText, setAmountText] = useState('');
  const [speed, setSpeed] = useState<Speed>('standard');
  const [chosen, setFunding] = useState<FundingChoice | null>(null);
  const defaultSource =
    sources.data?.fundingSources.find((entry) => entry.isDefault) ??
    sources.data?.fundingSources[0];
  const funding: FundingChoice | null =
    chosen ??
    (defaultSource
      ? {
          kind: 'source',
          source: defaultSource,
        }
      : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const balance = profile?.balanceCents ?? 0;
  const amountCents = parseAmount(amountText) ?? 0;
  const fee = speed === 'instant' ? instantFee(amountCents) : 0;
  const total = amountCents + fee;
  const source = funding?.kind === 'source' ? funding.source : null;
  const instantBlocked =
    speed === 'instant' && source && source.type !== 'debit_card';
  async function submit() {
    if (!source) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.transferOut({
        amountCents,
        fundingSourceId: source.id,
        speed,
      });
      setProfile(result.profile);
      await refresh();
      router.replace(
        href('/pay/success', {
          kind: 'transfer',
          amount: String(amountCents),
          name: source.institution,
          color: colors.sky,
          id: result.transaction.id,
          title:
            speed === 'instant'
              ? 'Transfer sent instantly'
              : 'Transfer on its way',
          body:
            speed === 'instant'
              ? `${formatCents(amountCents)} is in your ${source.label}. Fee ${formatCents(fee)}.`
              : `${formatCents(amountCents)} will arrive at ${source.label} in 1-3 business days.`,
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not transfer.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      header={<Header title="Transfer to bank" onBack={() => router.back()} />}
      footer={
        <Pill
          label={
            amountCents > 0
              ? `Transfer ${formatCents(amountCents)}`
              : 'Transfer'
          }
          disabled={
            amountCents <= 0 || !source || total > balance || !!instantBlocked
          }
          loading={busy}
          onPress={submit}
          testID="transfer-submit"
        />
      }
    >
      <p className={styles.balance}>Available {formatCents(balance)}</p>
      <AmountDisplay text={amountText} />
      <div className={styles.presets}>
        <Chip
          label="Transfer all"
          onPress={() => setAmountText((balance / 100).toFixed(2))}
        />
        {total > balance && amountCents > 0 ? (
          <p
            style={{
              color: colors.danger,
              fontSize: 13,
              alignSelf: 'center',
            }}
          >
            Exceeds your balance
          </p>
        ) : null}
      </div>

      <div className={styles.speeds}>
        {(
          [
            {
              value: 'instant',
              title: 'Instant',
              body: `1.75% fee (min $0.25) · ${amountCents ? formatCents(fee) : ''} · debit card only`,
              icon: 'flash',
            },
            {
              value: 'standard',
              title: 'Standard',
              body: 'Free · 1-3 business days',
              icon: 'time',
            },
          ] as const
        ).map((option) => {
          const active = speed === option.value;
          return (
            <button
              type="button"
              key={option.value}
              aria-pressed={active}
              aria-label={`${option.title} transfer`}
              data-testid={`speed-${option.value}`}
              onClick={() => setSpeed(option.value)}
              className={twMerge(styles.speed, active && styles.speedActive)}
            >
              <Icon
                name={option.icon}
                size={20}
                color={active ? colors.action : colors.text}
              />
              <div
                className="min-w-0"
                style={{
                  flex: 1,
                }}
              >
                <p className={styles.speedTitle}>{option.title}</p>
                <p className={styles.speedBody}>{option.body}</p>
              </div>
              <Icon
                name={active ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={active ? colors.action : colors.border}
              />
            </button>
          );
        })}
      </div>

      <FundingPicker
        title="To"
        value={funding}
        onChange={setFunding}
        balanceCents={balance}
        allowBalance={false}
        instantOnly={speed === 'instant'}
      />
      {instantBlocked ? (
        <p
          style={{
            color: colors.danger,
            fontSize: 14,
            marginTop: spacing.sm,
          }}
        >
          Instant transfers need a debit card. Pick a card or switch to
          Standard.
        </p>
      ) : null}
      <ErrorText>{error}</ErrorText>
      <div
        style={{
          marginTop: spacing.lg,
        }}
      >
        <Keypad
          onKey={(key) =>
            setAmountText((current) => applyKeypadKey(current, key))
          }
        />
      </div>
    </Screen>
  );
}

const styles = {
  balance: 'text-center text-ink-secondary text-sm mt-2',
  presets: 'flex flex-row justify-center gap-3 mb-4',
  speeds: 'flex flex-col gap-2 mb-2',
  speed:
    'flex flex-row items-center gap-3 bg-card rounded-3xl p-4 border-2 border-transparent w-full cursor-pointer text-left',
  speedActive: 'border-action!',
  speedTitle: 'text-base font-bold text-ink',
  speedBody: 'text-sm text-ink-secondary mt-0.5',
} as const;
