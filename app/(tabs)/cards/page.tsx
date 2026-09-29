'use client';

import { useRouter } from 'next/navigation';

import { Icon } from '../../../components/icon';
import { PaymentCard } from '../../../components/payment-card';
import {
  Body,
  Card,
  Loading,
  Pill,
  Screen,
  SectionLabel,
  Subtitle,
  Title,
} from '../../../components/ui';
import { formatCents } from '../../../lib/money';
import { useCards } from '../../../lib/queries';
import { useSession } from '../../../lib/session';
import { colors, spacing } from '../../../lib/theme';

export default function Cards() {
  const router = useRouter();
  const { profile } = useSession();
  const cards = useCards();
  const debit = cards.data?.cards.find((card) => card.type === 'debit');
  const credit = cards.data?.cards.find((card) => card.type === 'credit');
  const verified = profile?.verificationStatus === 'verified';

  return (
    <Screen contentStyle={{ paddingTop: spacing.md }}>
      <Title>Cards</Title>
      <Subtitle>Spend your balance anywhere, in-store or online.</Subtitle>

      {cards.isLoading ? (
        <Loading />
      ) : (
        <>
          <SectionLabel>Debit</SectionLabel>
          {debit ? (
            <button
              type="button"
              onClick={() => router.push(`/cards/${debit.id}`)}
              aria-label="Manage debit card"
              data-testid="open-debit-card"
              className={styles.cardButton}
            >
              <PaymentCard card={debit} holder={profile?.displayName ?? ''} />
              <div className={styles.cardMeta}>
                <Body secondary style={{ fontSize: 14 }}>
                  {debit.status === 'locked' ? 'Locked' : 'Active'} · Spend
                  limit{' '}
                  {formatCents(debit.spendLimitCents ?? 0, {
                    compact: true,
                  })}
                  /day
                </Body>
                <Icon
                  name="chevron-forward"
                  size={18}
                  color={colors.textTertiary}
                />
              </div>
            </button>
          ) : (
            <OfferCard
              color={colors.sky}
              title="TesterPay Debit Card"
              body="Spend your balance anywhere. No fees, no credit check, instant virtual card."
              cta="Get the debit card"
              testID="get-debit-card"
              onPress={() =>
                router.push(
                  verified
                    ? '/cards/new?type=debit'
                    : '/settings/verify?next=debit',
                )
              }
            />
          )}

          <SectionLabel>Credit</SectionLabel>
          {credit ? (
            <button
              type="button"
              onClick={() => router.push(`/cards/${credit.id}`)}
              aria-label="Manage credit card"
              data-testid="open-credit-card"
              className={styles.cardButton}
            >
              <PaymentCard card={credit} holder={profile?.displayName ?? ''} />
              <div className={styles.cardMeta}>
                <Body secondary style={{ fontSize: 14 }}>
                  {credit.status === 'locked' ? 'Locked' : 'Active'} · Limit{' '}
                  {formatCents(credit.creditLimitCents ?? 0, {
                    compact: true,
                  })}
                </Body>
                <Icon
                  name="chevron-forward"
                  size={18}
                  color={colors.textTertiary}
                />
              </div>
            </button>
          ) : (
            <OfferCard
              color={colors.lime}
              title="TesterPay Credit Card"
              body="3% back on your top spend category. Pay your bill straight from your balance."
              cta="Apply in 60 seconds"
              testID="apply-credit-card"
              onPress={() =>
                router.push(
                  verified
                    ? '/cards/new?type=credit'
                    : '/settings/verify?next=credit',
                )
              }
            />
          )}
        </>
      )}
    </Screen>
  );
}

function OfferCard({
  color,
  title,
  body,
  cta,
  onPress,
  testID,
}: {
  color: string;
  title: string;
  body: string;
  cta: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Card className="flex flex-col" style={{ backgroundColor: color }}>
      <p className={styles.offerTitle}>{title}</p>
      <p className={styles.offerBody}>{body}</p>
      <Pill
        label={cta}
        variant="primary"
        compact
        onPress={onPress}
        testID={testID}
        style={{
          alignSelf: 'flex-start',
          marginTop: spacing.lg,
        }}
      />
    </Card>
  );
}

const styles = {
  cardButton: 'block w-full text-left',
  cardMeta: 'flex flex-row justify-between items-center px-1 pt-3',
  offerTitle: 'text-xl font-extrabold tracking-tight text-ink',
  offerBody: 'text-sm text-ink opacity-80 mt-1.5 leading-snug',
} as const;
