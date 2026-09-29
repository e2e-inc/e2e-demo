'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  Fragment,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api, auth, setToken, resetDemo as resetLocalData } from './api';
import { readToken, writeToken } from './token-storage';
import type { AuthUser, Profile } from './types';

type Status = 'loading' | 'signed-out' | 'onboarding' | 'ready';

interface SessionValue {
  status: Status;
  user: AuthUser | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetDemo: () => Promise<void>;
  refresh: () => Promise<void>;
  setProfile: (profile: Profile) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [generation, setGeneration] = useState(0);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfileState] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me.user);
      setProfileState(me.profile);
      setStatus(me.profile ? 'ready' : 'onboarding');
    } catch {
      setToken(null);
      await writeToken(null);
      setUser(null);
      setProfileState(null);
      setStatus('signed-out');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await readToken();
      if (cancelled) return;
      if (!stored) {
        setStatus('signed-out');
        return;
      }
      setToken(stored);
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const adoptToken = useCallback(
    async (token: string | null) => {
      if (!token) {
        throw new Error('Sign-in did not return a session token.');
      }
      setToken(token);
      await writeToken(token);
      queryClient.clear();
      await load();
    },
    [load, queryClient],
  );

  const value = useMemo<SessionValue>(
    () => ({
      status,
      user,
      profile,
      signIn: async (email, password) => {
        const result = await auth.signIn({ email, password });
        await adoptToken(result.token);
      },
      signUp: async (name, email, password) => {
        const result = await auth.signUp({ name, email, password });
        await adoptToken(result.token);
      },
      resetDemo: async () => {
        await queryClient.cancelQueries();
        await resetLocalData();
        setToken(null);
        await writeToken(null);
        queryClient.clear();
        setUser(null);
        setProfileState(null);
        setStatus('signed-out');
        setGeneration((value) => value + 1);
      },
      signOut: async () => {
        try {
          await auth.signOut();
        } catch {
          // The token may already be invalid; clear local state regardless.
        }
        setToken(null);
        await writeToken(null);
        queryClient.clear();
        setUser(null);
        setProfileState(null);
        setStatus('signed-out');
      },
      refresh: load,
      setProfile: (next) => {
        setProfileState(next);
        setStatus('ready');
      },
    }),
    [adoptToken, load, profile, queryClient, status, user],
  );

  return (
    <SessionContext.Provider value={value}>
      <Fragment key={generation}>{children}</Fragment>
    </SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return value;
}
