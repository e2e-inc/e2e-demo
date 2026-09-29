'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Avatar } from '../../../components/avatar';
import {
  type FundingChoice,
  FundingPicker,
} from '../../../components/funding-picker';
import {
  Body,
  Card,
  EmptyState,
  ErrorText,
  Header,
  Loading,
  Pill,
  Screen,
} from '../../../components/ui';
import { api, ApiError } from '../../../lib/api';
import { href } from '../../../lib/href';
import { formatCents, fullDate } from '../../../lib/money';
import { useRefreshMoney, useRequests } from '../../../lib/queries';
import { useSession } from '../../../lib/session';
import { colors, spacing } from '../../../lib/theme';
import { useRouteParams } from '../../../lib/use-route-params';

export default function RequestDetail() {
  const router = useRouter();
  const { id } = useRouteParams<{ id: string }>();
  const { user, profile, refresh: refreshSession } = useSession();
  const requests = useRequests();
  const refresh = useRefreshMoney();
  const [funding, setFunding] = useState<FundingChoice>({ kind: 'balance' });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = [
    ...(requests.data?.incoming ?? []),
    ...(requests.data?.outgoing ?? []),
  ].find((entry) => entry.id === id);

  if (requests.isLoading) {
    return (
      <Screen header={<Header title="Request" />}>
        <Loading />
      </Screen>
    );
  }
  if (!request) {
    return (
      <Screen header={<Header title="Request" />}>
        <EmptyState title="Request not found" />
      </Screen>
    );
  }

  const incoming = request.payer.userId === user?.id;
  const other = incoming ? request.requester : request.payer;

  async function run(action: 'pay' | 'decline' | 'cancel') {
    setBusy(action);
    setError(null);
    try {
      if (action === 'pay') {
        const result = await api.payRequest(
          request!.id,
          funding.kind === 'source' ? funding.source.id : null,
        );
        await Promise.all([refresh(), refreshSession()]);
        router.replace(
          href('/pay/success', {
            kind: 'pay',
            amount: String(request!.amountCents),
            name: other.displayName,
            color: other.avatarColor,
            id: result.transaction.id,
          }),
        );
        return;
      }
      if (action === 'decline') await api.declineRequest(request!.id);
      if (action === 'cancel') await api.cancelRequest(request!.id);
      await refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Something went wrong.',
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen
      header={<Header title="Request" onBack={() => router.back()} />}
      footer={
        request.status === 'pending' ? (
          incoming ? (
            <div className="flex flex-col" style={{ gap: spacing.sm }}>
              <Pill
                label={`Pay ${formatCents(request.amountCents)}`}
                variant="brand"
                loading={busy === 'pay'}
                disabled={!!busy}
                onPress={() => run('pay')}
                testID="request-pay"
              />
              <Pill
                label="Decline"
                variant="secondary"
                loading={busy === 'decline'}
                disabled={!!busy}
                onPress={() => run('decline')}
                testID="request-decline"
              />
            </div>
          ) : (
            <Pill
              label="Cancel request"
              variant="secondary"
              loading={busy === 'cancel'}
              disabled={!!busy}
              onPress={() => run('cancel')}
              testID="request-cancel"
            />
          )
        ) : null
      }
    >
      <div className={styles.hero} data-testid="request-detail">
        <Avatar person={other} size={80} />
        <p className={styles.sentence}>
          {incoming ? (
            <>
              <span style={{ fontWeight: 700 }}>{other.displayName}</span>{' '}
              requested
            </>
          ) : (
            <>
              You requested{' '}
              <span style={{ fontWeight: 700 }}>{other.displayName}</span>
            </>
          )}
        </p>
        <p className={styles.amount}>{formatCents(request.amountCents)}</p>
        {request.note ? (
          <p className={styles.note}>
            {request.emoji ? `${request.emoji} ` : ''}
            {request.note}
          </p>
        ) : null}
        <div
          className={styles.status}
          style={{
            ...(request.status === 'paid'
              ? { backgroundColor: colors.green }
              : null),
            ...(request.status === 'pending'
              ? { backgroundColor: colors.skySoft }
              : null),
          }}
        >
          <p className={styles.statusText} data-testid="request-status">
            {request.status === 'pending'
              ? 'Pending'
              : request.status === 'paid'
                ? `Paid ${request.resolvedAt ? fullDate(request.resolvedAt) : ''}`
                : request.status === 'declined'
                  ? 'Declined'
                  : 'Cancelled'}
          </p>
        </div>
      </div>

      {incoming && request.status === 'pending' ? (
        <FundingPicker
          value={funding}
          onChange={setFunding}
          balanceCents={profile?.balanceCents ?? 0}
          amountCents={request.amountCents}
        />
      ) : null}

      <ErrorText>{error}</ErrorText>

      <Card style={{ marginTop: spacing.lg }}>
        <Body secondary style={{ fontSize: 14 }}>
          Requested {fullDate(request.createdAt)}
          {request.splitId ? ' · Part of a split' : ''}
        </Body>
      </Card>
    </Screen>
  );
}

const styles = {
  hero: 'flex flex-col items-center py-4 gap-2',
  sentence: 'text-lg text-ink mt-2',
  amount: 'text-5xl font-extrabold tracking-tighter text-ink',
  note: 'text-base text-ink text-center',
  status: 'px-3.5 py-1.5 rounded-full bg-pill-gray mt-1',
  statusText: 'font-bold text-sm text-ink',
} as const;
