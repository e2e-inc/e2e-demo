'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, Suspense, useEffect } from 'react';

import { useSession } from '../lib/session';
import { useDesktop } from '../lib/use-desktop';
import { DesktopNav } from './desktop-nav';
import { Spinner } from './ui';

type Status = ReturnType<typeof useSession>['status'];

const AUTH_ROUTES = ['/welcome', '/sign-in', '/sign-up'];

/**
 * Mirrors the Expo `Stack.Protected` guards: each session status can only see
 * its own group of routes, and anything else lands on that group's first screen.
 */
function redirectFor(status: Status, pathname: string): string | null {
  if (status === 'loading') return null;
  if (status === 'signed-out')
    return AUTH_ROUTES.includes(pathname) ? null : '/welcome';
  if (status === 'onboarding')
    return pathname === '/onboarding/handle' ? null : '/onboarding/handle';
  if (AUTH_ROUTES.includes(pathname) || pathname.startsWith('/onboarding'))
    return '/';
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const desktop = useDesktop();
  const pathname = usePathname();
  const router = useRouter();
  const target = redirectFor(status, pathname);

  useEffect(() => {
    if (target) router.replace(target);
  }, [router, target]);

  if (status === 'loading' || target) {
    return (
      <div className={styles.splash} data-testid="splash">
        <p className={styles.wordmark}>testerpay</p>
        <div style={{ marginTop: 24 }}>
          <Spinner color="#FFFFFF" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-dvh flex-row">
      {desktop && status === 'ready' ? <DesktopNav /> : null}
      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        <Suspense fallback={null}>{children}</Suspense>
      </div>
    </div>
  );
}

const styles = {
  splash: 'flex h-dvh flex-col items-center justify-center bg-brand',
  wordmark: 'text-4xl font-extrabold tracking-tighter text-white',
} as const;
