'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { type FundingChoice, FundingPicker } from '@/components/funding-picker';
import { AmountDisplay, Keypad } from '@/components/keypad';
import { Chip, ErrorText, Header, Pill, Screen } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { href } from '@/lib/href';
import { applyKeypadKey, formatCents, parseAmount } from '@/lib/money';
import { useFundingSources, useRefreshMoney } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { colors, spacing } from '@/lib/theme';

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
      <p className={styles.balance}>
        Current balance {formatCents(profile?.balanceCents ?? 0)}
      </p>
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
      <FundingPicker
        title="From"
        value={funding}
        onChange={setFunding}
        balanceCents={profile?.balanceCents ?? 0}
        allowBalance={false}
      />
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
  presets: 'flex flex-row justify-center gap-2 mb-4 flex-wrap',
} as const;
