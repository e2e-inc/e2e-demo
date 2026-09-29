'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PersonRow } from '../../components/person-row';
import {
  Card,
  EmptyState,
  Header,
  IconButton,
  Loading,
  Screen,
  SearchField,
  SectionLabel,
  Segmented,
} from '../../components/ui';
import { href } from '../../lib/href';
import { useFriends, usePeople } from '../../lib/queries';
import { colors, spacing } from '../../lib/theme';
import type { Person } from '../../lib/types';
import { useRouteParams } from '../../lib/use-route-params';

type Mode = 'pay' | 'request';

export default function PickPerson() {
  const router = useRouter();
  const params = useRouteParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(
    params.mode === 'request' ? 'request' : 'pay',
  );
  const [query, setQuery] = useState('');
  const friends = useFriends();
  const search = usePeople(query.trim());
  const searching = query.trim().length > 0;

  function choose(person: Person) {
    router.push(
      href('/pay/[userId]', {
        userId: person.userId,
        mode,
        handle: person.handle,
        name: person.displayName,
        color: person.avatarColor,
      }),
    );
  }

  const list = searching ? search.data?.people : friends.data?.friends;
  const loading = searching ? search.isLoading : friends.isLoading;

  return (
    <Screen
      header={
        <Header
          title={mode === 'pay' ? 'Pay' : 'Request'}
          onBack={() => router.back()}
          right={
            <IconButton
              name="qr-code-outline"
              accessibilityLabel="Scan a code"
              onPress={() => router.push('/qr?tab=scan')}
            />
          }
        />
      }
    >
      <Segmented<Mode>
        options={[
          { value: 'pay', label: 'Pay' },
          { value: 'request', label: 'Request' },
        ]}
        value={mode}
        onChange={setMode}
      />
      <div style={{ marginTop: spacing.lg }}>
        <SearchField
          placeholder="Name or @handle"
          value={query}
          onChangeText={setQuery}
          autoFocus
          testID="pay-search"
        />
      </div>

      <SectionLabel>{searching ? 'Results' : 'Friends'}</SectionLabel>
      {loading ? (
        <Loading />
      ) : list?.length ? (
        <Card style={{ paddingTop: spacing.xs, paddingBottom: spacing.xs }}>
          {list.map((person) => (
            <PersonRow
              key={person.userId}
              person={person}
              onPress={() => choose(person)}
            />
          ))}
        </Card>
      ) : (
        <EmptyState
          icon="search-outline"
          title={searching ? 'No one matches' : 'No friends yet'}
          body={
            searching
              ? 'Try a different name or handle.'
              : 'Search for anyone by name or @handle.'
          }
        />
      )}

      {!searching && friends.data?.suggestions.length ? (
        <>
          <SectionLabel>People you may know</SectionLabel>
          <Card style={{ paddingTop: spacing.xs, paddingBottom: spacing.xs }}>
            {friends.data.suggestions.map((person) => (
              <PersonRow
                key={person.userId}
                person={person}
                onPress={() => choose(person)}
              />
            ))}
          </Card>
        </>
      ) : null}
      <p
        style={{
          color: colors.textTertiary,
          fontSize: 12,
          textAlign: 'center',
          marginTop: spacing.xl,
        }}
      >
        Payments are simulated. No real money moves.
      </p>
    </Screen>
  );
}
