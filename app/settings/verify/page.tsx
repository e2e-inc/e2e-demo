'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Icon } from '@/components/icon';
import {
  Body,
  Card,
  ErrorText,
  Field,
  Header,
  Pill,
  Screen,
  Subtitle,
  Title,
} from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors, spacing } from '@/lib/theme';
import { useRouteParams } from '@/lib/use-route-params';

export default function VerifyIdentity() {
  const router = useRouter();
  const params = useRouteParams<{
    next?: string;
  }>();
  const { profile, setProfile } = useSession();
  const [legalName, setLegalName] = useState(profile?.displayName ?? '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [ssnLast4, setSsnLast4] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const valid =
    legalName.trim().length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) &&
    /^\d{4}$/.test(ssnLast4) &&
    address.trim().length >= 5;
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.verifyIdentity({
        legalName,
        dateOfBirth,
        ssnLast4,
        address,
      });
      setProfile(result.profile);
      setDone(true);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Verification failed.',
      );
    } finally {
      setBusy(false);
    }
  }
  if (done || profile?.verificationStatus === 'verified') {
    return (
      <Screen
        header={<Header title="Identity" onBack={() => router.back()} />}
        footer={
          <Pill
            label={params.next ? 'Continue to card' : 'Done'}
            testID="verify-done"
            onPress={() =>
              params.next
                ? router.replace(`/cards/new?type=${params.next}`)
                : router.back()
            }
          />
        }
      >
        <div className={styles.center} data-testid="verify-success">
          <div className={styles.badge}>
            <Icon name="shield-checkmark" size={40} color={colors.text} />
          </div>
          <Title
            style={{
              textAlign: 'center',
              marginTop: spacing.lg,
            }}
          >
            You&apos;re verified
          </Title>
          <Subtitle
            style={{
              textAlign: 'center',
            }}
          >
            Cards, bank transfers, and higher limits are unlocked.
          </Subtitle>
        </div>
      </Screen>
    );
  }
  return (
    <Screen
      header={<Header title="Verify identity" onBack={() => router.back()} />}
      footer={
        <Pill
          label="Verify"
          loading={busy}
          disabled={!valid}
          onPress={submit}
          testID="verify-submit"
        />
      }
    >
      <Title>Confirm it&apos;s you</Title>
      <Subtitle>
        Financial rules require us to verify who you are before you can get a
        card or move larger amounts.
      </Subtitle>
      <Card
        style={{
          marginTop: spacing.lg,
          backgroundColor: colors.skySoft,
        }}
      >
        <Body
          style={{
            fontSize: 14,
          }}
        >
          Demo mode: any realistic-looking values are accepted instantly.
          Nothing is checked against real records.
        </Body>
      </Card>
      <div
        className="flex flex-col"
        style={{
          gap: spacing.lg,
          marginTop: spacing.xl,
        }}
      >
        <Field
          label="Legal name"
          value={legalName}
          onChangeText={setLegalName}
          placeholder="Jordan A. Lee"
          testID="verify-name"
        />
        <Field
          label="Date of birth (YYYY-MM-DD)"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="1995-04-12"
          testID="verify-dob"
        />
        <Field
          label="Last 4 of SSN"
          value={ssnLast4}
          onChangeText={(text) =>
            setSsnLast4(text.replace(/\D/g, '').slice(0, 4))
          }
          placeholder="1234"
          keyboardType="number-pad"
          maxLength={4}
          testID="verify-ssn"
        />
        <Field
          label="Street address"
          value={address}
          onChangeText={setAddress}
          placeholder="1 Main St, Springfield"
          testID="verify-address"
        />
        <ErrorText>{error}</ErrorText>
      </div>
      <p className={styles.fine}>
        Your information is encrypted and never shared with friends.
      </p>
    </Screen>
  );
}

const styles = {
  center: 'flex flex-col items-center pt-16',
  badge:
    'flex w-24 h-24 rounded-full bg-green items-center justify-center',
  fine: 'text-xs text-ink-tertiary mt-6 text-center',
} as const;
