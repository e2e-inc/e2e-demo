'use client';

import { useParams, useSearchParams } from 'next/navigation';

/**
 * Next.js equivalent of Expo Router's `useLocalSearchParams`: merges dynamic
 * route segments with query string values.
 */
export function useRouteParams<
  T extends Record<string, string | undefined> = Record<string, string | undefined>,
>(): T {
  const params = useParams<Record<string, string | string[]>>();
  const search = useSearchParams();
  const merged: Record<string, string | undefined> = {};
  search.forEach((value, key) => {
    merged[key] = value;
  });
  for (const [key, value] of Object.entries(params ?? {})) {
    merged[key] = decodeURIComponent(Array.isArray(value) ? value[0] : value);
  }
  return merged as T;
}
