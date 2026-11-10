'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { type FundingChoice, FundingPicker } from '@/components/funding-picker';
import { AmountDisplay, Keypad } from '@/components/keypad';
import { Card, Chip, ErrorText, Header, Pill, Screen } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { href } from '@/lib/href';
import { applyKeypadKey, formatCents, parseAmount } from '@/lib/money';
import { useFundingSources, useRefreshMoney } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

const PRESETS = [2000, 5000, 10000, 25000];

export default function AddMoney() {
  const router = useRouter();
  const { profile, setProfile } = useSession();
  const refresh = useRefreshMoney();
  const sources = useFundingSources();
  const [amountText, setAmountText] = useState('');
  const [chosen, setFunding] = useState<FundingChoice | null>(null);
  const defaultSource =
    sources.data?.fundingSources.find((source) => source.isDefault) ??
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
  const amountCents = parseAmount(amountText) ?? 0;
  async function submit() {
    if (funding?.kind !== 'source') return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.addMoney({
        amountCents,
        fundingSourceId: funding.source.id,
      });
      setProfile(result.profile);
      await refresh();
      router.replace(
        href('/pay/success', {
          kind: 'add',
          amount: String(amountCents),
          name: funding.source.institution,
          color: colors.sky,
          id: result.transaction.id,
          title: `Added ${formatCents(amountCents)}`,
          body: `Your new balance is ${formatCents(result.profile.balanceCents)}.`,
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not add money.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      header={<Header title="Add money" onBack={() => router.back()} />}
      footer={
        <Pill
          label={
            amountCents > 0 ? `Add ${formatCents(amountCents)}` : 'Add money'
          }
          variant="brand"
          disabled={amountCents <= 0 || funding?.kind !== 'source'}
          loading={busy}
          onPress={submit}
          testID="add-money-submit"
        />
      }
    >
      <Card className={styles.amountCard}>
        <p className={styles.balanceLabel}>Current balance</p>
        <p className={styles.balanceValue}>
          {formatCents(profile?.balanceCents ?? 0)}
        </p>
        <div className={styles.divider} />
        <AmountDisplay text={amountText} />
        <div className={styles.presets}>
          {PRESETS.map((preset) => (
            <Chip
              key={preset}
              label={formatCents(preset, {
                compact: true,
              })}
              selected={amountCents === preset}
              onPress={() => setAmountText(String(preset / 100))}
            />
          ))}
        </div>
      </Card>
      <FundingPicker
        title="From"
        value={funding}
        onChange={setFunding}
        balanceCents={profile?.balanceCents ?? 0}
        allowBalance={false}
      />
      <ErrorText>{error}</ErrorText>
      <div className={styles.keypad}>
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
  amountCard: 'mt-2 mb-4 items-center gap-1 p-5 shadow-sm',
  balanceLabel: 'text-xs font-medium uppercase tracking-wide text-ink-tertiary',
  balanceValue: 'text-base font-semibold text-ink-secondary',
  divider: 'my-2 h-px w-full bg-divider',
  presets: 'flex flex-row flex-wrap justify-center gap-2 pt-2',
  keypad: 'mt-4',
} as const;
