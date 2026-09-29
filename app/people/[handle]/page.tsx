'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Avatar } from '../../../components/avatar';
import { FeedItem } from '../../../components/feed-item';
import {
  EmptyState,
  Header,
  Loading,
  Pill,
  Screen,
  SectionLabel,
} from '../../../components/ui';
import { api } from '../../../lib/api';
import { href } from '../../../lib/href';
import { keys } from '../../../lib/queries';
import { useSession } from '../../../lib/session';
import { useRouteParams } from '../../../lib/use-route-params';

export default function PersonProfile() {
  const router = useRouter();
  const client = useQueryClient();
  const { handle } = useRouteParams<{
    handle: string;
  }>();
  const { user } = useSession();
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: keys.person(handle),
    queryFn: () => api.person(handle),
  });
  const person = query.data?.person;
  async function toggleFriend() {
    if (!person) return;
    setBusy(true);
    try {
      if (person.isFriend) await api.removeFriend(person.userId);
      else await api.addFriend(person.userId);
      await Promise.all([
        client.invalidateQueries({
          queryKey: keys.person(handle),
        }),
        client.invalidateQueries({
          queryKey: ['friends'],
        }),
        client.invalidateQueries({
          queryKey: ['people'],
        }),
        client.invalidateQueries({
          queryKey: ['feed'],
        }),
      ]);
    } finally {
      setBusy(false);
    }
  }
  if (query.isLoading) {
    return (
      <Screen header={<Header title="Profile" />}>
        <Loading />
      </Screen>
    );
  }
  if (!person) {
    return (
      <Screen header={<Header title="Profile" />}>
        <EmptyState title="No one has that handle" />
      </Screen>
    );
  }
  const go = (mode: 'pay' | 'request') =>
    router.push(
      href('/pay/[userId]', {
        userId: person.userId,
        mode,
        handle: person.handle,
        name: person.displayName,
        color: person.avatarColor,
      }),
    );
  return (
    <Screen
      header={
        <Header title={`@${person.handle}`} onBack={() => router.back()} />
      }
    >
      <div className={styles.hero} data-testid="person-profile">
        <Avatar person={person} size={96} />
        <p className={styles.name}>{person.displayName}</p>
        <p className={styles.handle}>@{person.handle}</p>
        {person.bio ? <p className={styles.bio}>{person.bio}</p> : null}
        <div className={styles.actions}>
          <Pill
            label="Pay"
            variant="brand"
            compact
            onPress={() => go('pay')}
            style={{
              flex: 1,
            }}
            testID="person-pay"
          />
          <Pill
            label="Request"
            compact
            onPress={() => go('request')}
            style={{
              flex: 1,
            }}
            testID="person-request"
          />
          <Pill
            label={person.isFriend ? 'Friends ✓' : 'Add friend'}
            variant={person.isFriend ? 'secondary' : 'outline'}
            compact
            loading={busy}
            onPress={toggleFriend}
            testID="person-friend-toggle"
            style={{
              flex: 1,
            }}
          />
        </div>
      </div>

      <SectionLabel>Between you two</SectionLabel>
      {query.data?.transactions.length ? (
        query.data.transactions.map((transaction) => (
          <FeedItem
            key={transaction.id}
            transaction={transaction}
            viewerId={user?.id ?? null}
          />
        ))
      ) : (
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="No payments yet"
          body={`Pay or request ${person.displayName.split(' ')[0]} to get things started.`}
        />
      )}
    </Screen>
  );
}

const styles = {
  hero: 'flex flex-col items-center py-4',
  name: 'text-2xl font-extrabold tracking-tight mt-3 text-ink',
  handle: 'text-sm text-ink-secondary mt-1',
  bio: 'text-sm text-ink mt-2 text-center',
  actions: 'flex flex-row gap-2 mt-4 w-full',
} as const;
