'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

import { Avatar } from '../../components/avatar';
import {
  Body,
  Card,
  ErrorText,
  Field,
  Header,
  Pill,
  Screen,
  Segmented,
} from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { href } from '../../lib/href';
import { useSession } from '../../lib/session';
import { colors, spacing } from '../../lib/theme';
import type { QrResolution } from '../../lib/types';
import { useRouteParams } from '../../lib/use-route-params';

type Tab = 'code' | 'scan';

export default function Qr() {
  const router = useRouter();
  const params = useRouteParams<{ tab?: string }>();
  const { profile } = useSession();
  const [tab, setTab] = useState<Tab>(params.tab === 'scan' ? 'scan' : 'code');
  const [manual, setManual] = useState('');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handled, setHandled] = useState(false);
  const myCode = useQuery({ queryKey: ['qr', 'mine'], queryFn: api.myQr });

  async function resolve(code: string) {
    if (resolving || handled) return;
    setResolving(true);
    setError(null);
    try {
      const result: QrResolution = await api.resolveQr(code.trim());
      setHandled(true);
      if (result.type === 'merchant') {
        router.replace(`/merchants/${result.merchant.id}`);
        return;
      }
      router.replace(
        href('/pay/[userId]', {
          userId: result.person.userId,
          mode: 'pay',
          handle: result.person.handle,
          name: result.person.displayName,
          color: result.person.avatarColor,
          amount: result.amountCents ? String(result.amountCents) : undefined,
          note: result.note ?? undefined,
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not read that code.',
      );
      setTimeout(() => setHandled(false), 1200);
    } finally {
      setResolving(false);
    }
  }

  return (
    <Screen header={<Header title="Scan & pay" onBack={() => router.back()} />}>
      <Segmented<Tab>
        options={[
          { value: 'code', label: 'My code' },
          { value: 'scan', label: 'Scan' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'code' ? (
        <Card className={styles.codeCard} testID="my-qr-card">
          <Avatar person={profile} size={64} />
          <p className={styles.name}>{profile?.displayName}</p>
          <p className={styles.handle}>@{profile?.handle}</p>
          <div className={styles.qrWrap}>
            {myCode.data ? (
              <QRCodeSVG
                value={myCode.data.code}
                size={200}
                fgColor={colors.text}
                bgColor="#FFFFFF"
              />
            ) : null}
          </div>
          <Body secondary style={{ textAlign: 'center', fontSize: 14 }}>
            Friends can scan this to pay you or request money.
          </Body>
          <p className={styles.rawCode} data-testid="my-qr-code">
            {myCode.data?.code}
          </p>
          <div
            className="flex flex-row"
            style={{ gap: spacing.sm, marginTop: spacing.lg }}
          >
            <Pill
              label="Request a set amount"
              variant="secondary"
              compact
              onPress={() => router.push('/qr/request')}
              testID="qr-request-amount"
            />
          </div>
        </Card>
      ) : (
        <div
          className="flex flex-col"
          style={{ marginTop: spacing.lg, gap: spacing.lg }}
        >
          <Card
            className="flex flex-col"
            style={{ alignItems: 'center', gap: spacing.sm }}
          >
            <p className={styles.name}>Camera scanning is mobile-only</p>
            <Body secondary style={{ textAlign: 'center', fontSize: 14 }}>
              Paste a code below to pay a person or business.
            </Body>
          </Card>

          <Card>
            <Field
              label="Enter a code or @handle"
              placeholder="PPZ-M-BLOOM or @ava-chen"
              autoCapitalize="none"
              autoCorrect="off"
              value={manual}
              onChangeText={setManual}
              onSubmitEditing={() => resolve(manual)}
              testID="qr-manual-input"
            />
            <ErrorText>{error}</ErrorText>
            <Pill
              label="Continue"
              compact
              loading={resolving}
              disabled={manual.trim().length < 2}
              onPress={() => resolve(manual)}
              style={{ marginTop: spacing.md }}
              testID="qr-manual-submit"
            />
          </Card>
          <Body secondary style={{ fontSize: 13, textAlign: 'center' }}>
            Try PPZ-M-BLOOM, PPZ-M-TAQ or any friend&apos;s handle.
          </Body>
        </div>
      )}
    </Screen>
  );
}

const styles = {
  codeCard: 'flex flex-col items-center mt-4 py-6',
  name: 'text-xl font-bold text-ink mt-2',
  handle: 'text-sm text-ink-secondary mt-0.5',
  qrWrap: 'p-4 bg-white rounded-3xl my-4 border border-divider',
  rawCode: 'text-xs text-ink-tertiary mt-2 select-all',
} as const;
