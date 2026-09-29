'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  Body,
  Chip,
  ErrorText,
  Field,
  Header,
  Pill,
  Screen,
  Segmented,
  Subtitle,
  Title,
} from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { keys } from '@/lib/queries';
import { spacing } from '@/lib/theme';

type Type = 'bank' | 'debit_card';

const BANKS = [
  'Northwind Bank',
  'Harbor Credit Union',
  'Summit Federal',
  'Meadow Savings',
];
const ISSUERS = [
  'Northwind Bank',
  'Atlas Card',
  'Harbor Credit Union',
  'Cobalt Bank',
];

export default function LinkSource() {
  const router = useRouter();
  const client = useQueryClient();
  const [type, setType] = useState<Type>('bank');
  const [institution, setInstitution] = useState(BANKS[0]);
  const [account, setAccount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const digits = account.replace(/\D/g, '');
  const valid = type === 'bank' ? digits.length >= 8 : digits.length === 16;
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.addFundingSource({
        type,
        institution,
        last4: digits.slice(-4),
      });
      await client.invalidateQueries({
        queryKey: keys.fundingSources,
      });
      router.back();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not link.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      header={<Header title="Link" onBack={() => router.back()} />}
      footer={
        <Pill
          label={type === 'bank' ? 'Link bank account' : 'Link debit card'}
          disabled={!valid}
          loading={busy}
          onPress={submit}
          testID="link-submit"
        />
      }
    >
      <Title>Link a {type === 'bank' ? 'bank' : 'debit card'}</Title>
      <Subtitle>
        This is a simulation — any{' '}
        {type === 'bank' ? '8+ digit account' : '16 digit card'} number works.
      </Subtitle>
      <div
        className="flex flex-col"
        style={{
          marginTop: spacing.xl,
          gap: spacing.lg,
        }}
      >
        <Segmented<Type>
          options={[
            {
              value: 'bank',
              label: 'Bank account',
            },
            {
              value: 'debit_card',
              label: 'Debit card',
            },
          ]}
          value={type}
          onChange={(next) => {
            setType(next);
            setInstitution(next === 'bank' ? BANKS[0] : ISSUERS[0]);
            setAccount('');
          }}
        />
        <div>
          <p className={styles.label}>{type === 'bank' ? 'Bank' : 'Issuer'}</p>
          <div className={styles.chips}>
            {(type === 'bank' ? BANKS : ISSUERS).map((name) => (
              <Chip
                key={name}
                label={name}
                selected={institution === name}
                onPress={() => setInstitution(name)}
              />
            ))}
          </div>
        </div>
        <Field
          label={type === 'bank' ? 'Account number' : 'Card number'}
          placeholder={type === 'bank' ? '000123456789' : '4111 1111 1111 1111'}
          keyboardType="number-pad"
          value={account}
          onChangeText={setAccount}
          testID="link-account-number"
        />
        {type === 'bank' ? (
          <Field
            label="Routing number"
            placeholder="021000021"
            keyboardType="number-pad"
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: spacing.md,
            }}
          >
            <Field
              label="Expiry"
              placeholder="MM/YY"
              style={{
                flex: 1,
                minWidth: 0,
              }}
            />
            <Field
              label="CVV"
              placeholder="123"
              keyboardType="number-pad"
              style={{
                flex: 1,
                minWidth: 0,
              }}
            />
          </div>
        )}
        <ErrorText>{error}</ErrorText>
        <Body
          secondary
          style={{
            fontSize: 13,
          }}
        >
          Instant transfers are only available to debit cards.
        </Body>
      </div>
    </Screen>
  );
}

const styles = {
  label: 'text-sm font-semibold text-ink-secondary mb-2 ml-0.5',
  chips: 'flex flex-row flex-wrap gap-2',
} as const;
