'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Avatar } from '../../../components/avatar';
import { FeedItem } from '../../../components/feed-item';
import {
  Card,
  EmptyState,
  ListRow,
  Loading,
  Screen,
  SectionLabel,
  Segmented,
  Title,
} from '../../../components/ui';
import { formatCents, relativeTime } from '../../../lib/money';
import { useFeed, useRequests } from '../../../lib/queries';
import { useSession } from '../../../lib/session';
import { colors, spacing } from '../../../lib/theme';
import type { PaymentRequest } from '../../../lib/types';
import { useRouteParams } from '../../../lib/use-route-params';

type Tab = 'history' | 'requests';

const STATUS_LABEL: Record<PaymentRequest['status'], string> = {
  pending: 'Pending',
  paid: 'Paid',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

export default function Activity() {
  const params = useRouteParams<{
    tab?: string;
  }>();
  const router = useRouter();
  const { user } = useSession();
  const [tabOverride, setTab] = useState<Tab | null>(null);
  const tab: Tab =
    tabOverride ?? (params.tab === 'requests' ? 'requests' : 'history');
  const feed = useFeed('mine');
  const requests = useRequests();
  const incoming = requests.data?.incoming ?? [];
  const outgoing = requests.data?.outgoing ?? [];

  function RequestRow({
    request,
    incomingSide,
  }: {
    request: PaymentRequest;
    incomingSide: boolean;
  }) {
    const other = incomingSide ? request.requester : request.payer;
    const subtitle = `${request.emoji ? `${request.emoji} ` : ''}${request.note || 'No note'} · ${relativeTime(request.createdAt)}`;
    return (
      <ListRow
        title={
          incomingSide
            ? `${other.displayName} requested`
            : `You requested ${other.displayName}`
        }
        subtitle={subtitle}
        left={<Avatar person={other} size={44} />}
        onPress={() => router.push(`/requests/${request.id}`)}
        testID={`request-row-${request.id}`}
        right={
          <div className="flex flex-col" style={{ alignItems: 'flex-end' }}>
            <p className={styles.amount}>{formatCents(request.amountCents)}</p>
            <p
              className={styles.status}
              style={{
                ...(request.status === 'pending'
                  ? { color: colors.action }
                  : null),
                ...(request.status === 'paid'
                  ? { color: colors.success }
                  : null),
              }}
            >
              {STATUS_LABEL[request.status]}
            </p>
          </div>
        }
      />
    );
  }

  return (
    <Screen contentStyle={{ paddingTop: spacing.md }}>
      <Title>Activity</Title>
      <div style={{ marginTop: spacing.lg, marginBottom: spacing.md }}>
        <Segmented<Tab>
          options={[
            {
              value: 'history',
              label: 'History',
            },
            {
              value: 'requests',
              label: `Requests${incoming.filter((r) => r.status === 'pending').length ? ` (${incoming.filter((r) => r.status === 'pending').length})` : ''}`,
            },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'history' ? (
        feed.isLoading ? (
          <Loading />
        ) : feed.data?.transactions.length ? (
          feed.data.transactions.map((transaction) => (
            <FeedItem
              key={transaction.id}
              transaction={transaction}
              viewerId={user?.id ?? null}
            />
          ))
        ) : (
          <EmptyState
            icon="receipt-outline"
            title="No activity yet"
            body="Payments, deposits, and transfers will show up here."
          />
        )
      ) : requests.isLoading ? (
        <Loading />
      ) : (
        <>
          <SectionLabel>For you</SectionLabel>
          <Card
            style={{ paddingTop: spacing.xs, paddingBottom: spacing.xs }}
          >
            {incoming.length ? (
              incoming.map((request) => (
                <RequestRow key={request.id} request={request} incomingSide />
              ))
            ) : (
              <p className={styles.emptyText}>
                Nobody is asking you for money.
              </p>
            )}
          </Card>
          <SectionLabel>You asked</SectionLabel>
          <Card
            style={{ paddingTop: spacing.xs, paddingBottom: spacing.xs }}
          >
            {outgoing.length ? (
              outgoing.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  incomingSide={false}
                />
              ))
            ) : (
              <p className={styles.emptyText}>
                Requests you send will show up here.
              </p>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = {
  amount: 'text-base font-bold text-ink',
  status: 'text-xs font-semibold text-ink-secondary mt-0.5',
  emptyText: 'text-ink-secondary py-3 text-sm',
} as const;
