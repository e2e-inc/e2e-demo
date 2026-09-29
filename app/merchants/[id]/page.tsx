'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Avatar } from '../../../components/avatar';
import {
  type FundingChoice,
  FundingPicker,
} from '../../../components/funding-picker';
import { AmountDisplay, Keypad } from '../../../components/keypad';
import {
  Body,
  Card,
  ErrorText,
  Header,
  Loading,
  Pill,
  Screen,
  Segmented,
} from '../../../components/ui';
import { api, ApiError } from '../../../lib/api';
import { href } from '../../../lib/href';
import { applyKeypadKey, formatCents, parseAmount } from '../../../lib/money';
import { useRefreshMoney } from '../../../lib/queries';
import { useSession } from '../../../lib/session';
import { spacing } from '../../../lib/theme';
import { useRouteParams } from '../../../lib/use-route-params';

type Channel = 'in_store' | 'online';

const CART = [
  { name: 'House special', cents: 1450 },
  { name: 'Seasonal side', cents: 650 },
  { name: 'Sparkling water', cents: 300 },
];

export default function MerchantDetail() {
  const router = useRouter();
  const { id } = useRouteParams<{ id: string }>();
  const { profile, setProfile } = useSession();
  const refresh = useRefreshMoney();
  const merchant = useQuery({
    queryKey: ['merchant', id],
    queryFn: () => api.merchant(id),
  });
  const [channel, setChannel] = useState<Channel>('in_store');
  const [amountText, setAmountText] = useState('');
  const [funding, setFunding] = useState<FundingChoice>({ kind: 'balance' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartTotal = CART.reduce((sum, item) => sum + item.cents, 0);
  const amountCents =
    channel === 'online' ? cartTotal : (parseAmount(amountText) ?? 0);
  const data = merchant.data?.merchant;

  async function submit() {
    if (!data) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.payMerchant(data.id, {
        amountCents,
        channel,
        fundingSourceId: funding.kind === 'source' ? funding.source.id : null,
        note: channel === 'online' ? `${data.name} order` : data.name,
      });
      setProfile(result.profile);
      await refresh();
      router.replace(
        href('/pay/success', {
          kind: 'merchant',
          amount: String(amountCents),
          name: data.name,
          color: data.color,
          id: result.transaction.id,
          body:
            channel === 'online'
              ? 'Your order is confirmed. A receipt is in your activity.'
              : 'Show this screen to the cashier. You’re all set.',
        }),
      );
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Payment failed.');
    } finally {
      setBusy(false);
    }
  }

  if (merchant.isLoading || !data) {
    return (
      <Screen header={<Header title="Business" />}>
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen
      header={<Header title={data.name} onBack={() => router.back()} />}
      footer={
        <Pill
          label={
            amountCents > 0
              ? `Pay ${formatCents(amountCents)}${channel === 'online' ? ' · Checkout' : ''}`
              : 'Enter an amount'
          }
          variant="brand"
          disabled={amountCents <= 0}
          loading={busy}
          onPress={submit}
          testID="merchant-pay-submit"
        />
      }
    >
      <div
        className={styles.hero}
        style={{ backgroundColor: data.color }}
        data-testid="merchant-hero"
      >
        <Avatar emoji={data.emoji} color="rgba(255,255,255,0.85)" size={64} />
        <p className={styles.heroName}>{data.name}</p>
        <p className={styles.heroTag}>{data.tagline}</p>
        <p className={styles.heroCode}>Store code {data.qrCode}</p>
      </div>

      <div style={{ marginTop: spacing.lg }}>
        <Segmented<Channel>
          options={[
            { value: 'in_store', label: 'Pay in store' },
            { value: 'online', label: 'Online checkout' },
          ]}
          value={channel}
          onChange={setChannel}
        />
      </div>

      {channel === 'in_store' ? (
        <>
          <Body
            secondary
            style={{ textAlign: 'center', marginTop: spacing.lg, fontSize: 14 }}
          >
            Enter the amount on the register
          </Body>
          <AmountDisplay text={amountText} />
        </>
      ) : (
        <Card
          className="flex flex-col"
          style={{ marginTop: spacing.lg }}
          testID="merchant-cart"
        >
          <p className={styles.cartTitle}>Your order</p>
          {CART.map((item) => (
            <div key={item.name} className={styles.cartRow}>
              <p className={styles.cartItem}>{item.name}</p>
              <p className={styles.cartItem}>{formatCents(item.cents)}</p>
            </div>
          ))}
          <div className={[styles.cartRow, styles.cartTotal].join(' ')}>
            <p className={styles.cartTotalText}>Total</p>
            <p className={styles.cartTotalText}>{formatCents(cartTotal)}</p>
          </div>
          <div className={styles.checkoutBadge}>
            <p className={styles.checkoutBadgeText}>Checkout with testerpay</p>
          </div>
        </Card>
      )}

      <div style={{ marginTop: spacing.lg }}>
        <FundingPicker
          value={funding}
          onChange={setFunding}
          balanceCents={profile?.balanceCents ?? 0}
          amountCents={amountCents}
        />
      </div>
      <ErrorText>{error}</ErrorText>

      {channel === 'in_store' ? (
        <div style={{ marginTop: spacing.lg }}>
          <Keypad
            onKey={(key) =>
              setAmountText((current) => applyKeypadKey(current, key))
            }
          />
        </div>
      ) : null}
    </Screen>
  );
}

const styles = {
  hero: 'flex flex-col rounded-3xl p-6 items-center gap-1.5',
  heroName: 'text-2xl font-extrabold tracking-tight text-ink mt-2',
  heroTag: 'text-sm text-ink opacity-80 text-center',
  heroCode: 'text-xs font-bold text-ink opacity-70 mt-1 tracking-widest',
  cartTitle: 'text-base font-bold text-ink mb-2',
  cartRow: 'flex flex-row justify-between py-2',
  cartItem: 'text-sm text-ink',
  cartTotal: 'border-t border-t-divider mt-1 pt-3',
  cartTotalText: 'text-base font-bold text-ink',
  checkoutBadge: 'self-start bg-action rounded-full px-3.5 py-2 mt-3',
  checkoutBadgeText: 'text-white font-bold text-sm',
} as const;
