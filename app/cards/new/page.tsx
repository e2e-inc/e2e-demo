'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { PaymentCard } from '../../../components/payment-card';
import {
  Body,
  Card,
  ErrorText,
  Header,
  Pill,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import { api, ApiError } from '../../../lib/api';
import { keys } from '../../../lib/queries';
import { useSession } from '../../../lib/session';
import { cardDesigns, spacing } from '../../../lib/theme';
import { useRouteParams } from '../../../lib/use-route-params';

export default function NewCard() {
  const router = useRouter();
  const client = useQueryClient();
  const { profile } = useSession();
  const params = useRouteParams<{
    type?: string;
  }>();
  const type = params.type === 'credit' ? 'credit' : 'debit';
  const [design, setDesign] = useState(type === 'credit' ? 'midnight' : 'sky');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.issueCard({
        type,
        design,
      });
      await client.invalidateQueries({
        queryKey: keys.cards,
      });
      router.replace(`/cards/${result.card.id}?fresh=1`);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not issue card.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      header={
        <Header
          title={type === 'credit' ? 'Apply for credit' : 'Get your debit card'}
          onBack={() => router.back()}
        />
      }
      footer={
        <Pill
          label={type === 'credit' ? 'Submit application' : 'Create my card'}
          disabled={!agreed}
          loading={busy}
          onPress={submit}
          testID="card-issue-submit"
        />
      }
    >
      <PaymentCard
        card={{
          type,
          last4: '••••',
          expMonth: 12,
          expYear: 2030,
          design,
          status: 'active',
        }}
        holder={profile?.displayName ?? ''}
      />
      <Title
        style={{
          marginTop: spacing.xl,
        }}
      >
        {type === 'credit' ? 'Instant decision, no hard pull' : 'Pick a design'}
      </Title>
      <Subtitle>
        {type === 'credit'
          ? `As a verified member you're pre-approved for a $3,000 limit. Pay your bill from your balance any time.`
          : 'Your virtual card is ready right away. Order a physical one later from the card screen.'}
      </Subtitle>

      <div className={styles.designs}>
        {Object.entries(cardDesigns).map(([key, value]) => (
          <button
            type="button"
            key={key}
            aria-label={`${value.label} design`}
            aria-pressed={design === key}
            onClick={() => setDesign(key)}
            className={twMerge(
              styles.swatch,
              design === key && styles.swatchActive,
            )}
            style={{
              backgroundColor: value.to,
            }}
          >
            <div
              className={styles.swatchBlob}
              style={{
                backgroundColor: value.from,
              }}
            />
          </button>
        ))}
      </div>

      <Card
        style={{
          marginTop: spacing.xl,
        }}
      >
        <button
          type="button"
          onClick={() => setAgreed((current) => !current)}
          role="checkbox"
          aria-checked={agreed}
          aria-label="Agree to cardholder terms"
          data-testid="card-agree"
          className={styles.agree}
        >
          <div
            className={twMerge(styles.checkbox, agreed && styles.checkboxOn)}
          >
            {agreed ? (
              <span
                style={{
                  color: '#FFF',
                  fontWeight: 800,
                }}
              >
                ✓
              </span>
            ) : null}
          </div>
          <Body
            style={{
              flex: 1,
              fontSize: 15,
            }}
          >
            I agree to the cardholder agreement and understand this is a demo
            card with simulated transactions.
          </Body>
        </button>
      </Card>
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}

const styles = {
  designs: 'flex flex-row gap-3 mt-4',
  swatch:
    'block w-12 h-12 shrink-0 cursor-pointer rounded-full overflow-hidden border-2 border-transparent active:opacity-80',
  swatchActive: 'border-action!',
  swatchBlob: 'w-10 h-10 rounded-full ml-3.5 -mt-2.5',
  agree:
    'flex w-full cursor-pointer flex-row items-center gap-3 text-left active:opacity-80',
  checkbox:
    'flex w-6 h-6 shrink-0 rounded-lg border-2 border-field-border items-center justify-center',
  checkboxOn: 'bg-action! border-action!',
} as const;
