'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PersonRow } from '../../components/person-row';
import {
  Card,
  EmptyState,
  Header,
  Loading,
  Pill,
  Screen,
  SearchField,
  SectionLabel,
} from '../../components/ui';
import { api } from '../../lib/api';
import { useFriends, usePeople } from '../../lib/queries';
import { spacing } from '../../lib/theme';
import type { Person } from '../../lib/types';

export default function People() {
  const router = useRouter();
  const client = useQueryClient();
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const friends = useFriends();
  const search = usePeople(query.trim());
  const searching = query.trim().length > 0;

  async function toggleFriend(person: Person) {
    setBusyId(person.userId);
    try {
      if (person.isFriend) await api.removeFriend(person.userId);
      else await api.addFriend(person.userId);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['friends'] }),
        client.invalidateQueries({ queryKey: ['people'] }),
        client.invalidateQueries({ queryKey: ['feed'] }),
      ]);
    } finally {
      setBusyId(null);
    }
  }

  const renderRow = (person: Person) => (
    <PersonRow
      key={person.userId}
      person={person}
      onPress={() => router.push(`/people/${person.handle}`)}
      right={
        <Pill
          label={person.isFriend ? 'Friends' : 'Add'}
          variant={person.isFriend ? 'secondary' : 'primary'}
          compact
          loading={busyId === person.userId}
          onPress={() => toggleFriend(person)}
          testID={`friend-toggle-${person.handle}`}
          style={{ height: 34, paddingLeft: 14, paddingRight: 14 }}
        />
      }
    />
  );

  return (
    <Screen header={<Header title="People" onBack={() => router.back()} />}>
      <SearchField
        placeholder="Search by name or @handle"
        value={query}
        onChangeText={setQuery}
        testID="people-search"
      />
      {searching ? (
        <>
          <SectionLabel>Results</SectionLabel>
          {search.isLoading ? (
            <Loading />
          ) : search.data?.people.length ? (
            <Card style={{ paddingTop: spacing.xs, paddingBottom: spacing.xs }}>
              {search.data.people.map(renderRow)}
            </Card>
          ) : (
            <EmptyState
              icon="search-outline"
              title="No one matches"
              body="Check the spelling or try a handle."
            />
          )}
        </>
      ) : friends.isLoading ? (
        <Loading />
      ) : (
        <>
          <SectionLabel>
            Friends ({friends.data?.friends.length ?? 0})
          </SectionLabel>
          {friends.data?.friends.length ? (
            <Card
              style={{ paddingTop: spacing.xs, paddingBottom: spacing.xs }}
              testID="friends-list"
            >
              {friends.data.friends.map(renderRow)}
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon="people-outline"
                title="No friends yet"
                body="Add a few people below to start paying and splitting."
              />
            </Card>
          )}
          {friends.data?.suggestions.length ? (
            <>
              <SectionLabel>People you may know</SectionLabel>
              <Card
                style={{ paddingTop: spacing.xs, paddingBottom: spacing.xs }}
                testID="suggestions-list"
              >
                {friends.data.suggestions.map(renderRow)}
              </Card>
            </>
          ) : null}
          <div style={{ height: spacing.xl }} />
        </>
      )}
    </Screen>
  );
}
