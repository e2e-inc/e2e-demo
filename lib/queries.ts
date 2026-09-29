import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './api';

export const keys = {
  feed: (scope: string) => ['feed', scope] as const,
  requests: ['requests'] as const,
  friends: ['friends'] as const,
  people: (q: string) => ['people', q] as const,
  fundingSources: ['funding-sources'] as const,
  cards: ['cards'] as const,
  merchants: ['merchants'] as const,
  transaction: (id: string) => ['transaction', id] as const,
  split: (id: string) => ['split', id] as const,
  person: (handle: string) => ['person', handle] as const,
};

export function useFeed(scope: 'friends' | 'public' | 'mine') {
  return useQuery({
    queryKey: keys.feed(scope),
    queryFn: () => api.feed(scope),
  });
}

export function useRequests() {
  return useQuery({ queryKey: keys.requests, queryFn: api.requests });
}

export function useFriends() {
  return useQuery({ queryKey: keys.friends, queryFn: api.friends });
}

export function usePeople(q: string) {
  return useQuery({ queryKey: keys.people(q), queryFn: () => api.people(q) });
}

export function useFundingSources() {
  return useQuery({
    queryKey: keys.fundingSources,
    queryFn: api.fundingSources,
  });
}

export function useCards() {
  return useQuery({ queryKey: keys.cards, queryFn: api.cards });
}

export function useMerchants() {
  return useQuery({ queryKey: keys.merchants, queryFn: api.merchants });
}

/** Invalidates every money-related query after a mutation. */
export function useRefreshMoney() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['feed'] }),
      client.invalidateQueries({ queryKey: keys.requests }),
      client.invalidateQueries({ queryKey: ['transaction'] }),
      client.invalidateQueries({ queryKey: ['split'] }),
      client.invalidateQueries({ queryKey: ['person'] }),
      client.invalidateQueries({ queryKey: keys.cards }),
    ]);
}
