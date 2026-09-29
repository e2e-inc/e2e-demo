'use client';

import { useRouter } from 'next/navigation';

import { Avatar } from '../../../components/avatar';
import { Pill } from '../../../components/ui';
import { spacing } from '../../../lib/theme';
import { useDesktop } from '../../../lib/use-desktop';

const STORIES = [
  { name: 'Ava Chen', color: '#9969FA', text: 'paid Marcus for Taco Tuesday 🌮' },
  { name: 'Priya Patel', color: '#42E69F', text: 'split the cabin with 4 people 🏕️' },
  { name: 'Leo Alvarez', color: '#4BB4FF', text: 'requested $12 for tickets 🎸' },
];

export default function Welcome() {
  const router = useRouter();
  const desktop = useDesktop();
  const stories = (
    <div className={styles.stories}>
      {STORIES.map((story) => (
        <div key={story.name} className={styles.story}>
          <Avatar
            person={{ displayName: story.name, avatarColor: story.color }}
            size={36}
          />
          <p className={styles.storyText}>
            <span className="font-bold">{story.name}</span> {story.text}
          </p>
        </div>
      ))}
    </div>
  );
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-brand"
      style={{ paddingTop: spacing.xl }}
    >
      <div
        className={
          desktop
            ? 'mx-auto flex w-full max-w-6xl flex-1 flex-row items-center gap-16 px-12 py-16'
            : styles.screen
        }
      >
        <div className={desktop ? 'flex-1' : styles.column}>
          <p className={styles.wordmark}>testerpay</p>
          <h1
            className={
              desktop
                ? 'mt-8 text-7xl font-extrabold leading-none tracking-tighter text-white'
                : styles.headline
            }
          >
            Pay friends.
            <br />
            Split anything.
          </h1>
          <p className={styles.sub}>
            Send, request, and split money with the people you actually hang out
            with.
          </p>
          {!desktop ? stories : null}
        </div>

        <div
          className={
            desktop
              ? 'flex max-w-md flex-1 flex-col gap-6'
              : `${styles.column} ${styles.actions}`
          }
          style={{ paddingBottom: spacing.lg }}
        >
          {desktop ? stories : null}
          {desktop ? (
            <p className="text-2xl font-bold text-white">Life happens together.</p>
          ) : null}
          <Pill
            label="Create account"
            variant="white"
            testID="welcome-sign-up"
            onPress={() => router.push('/sign-up')}
          />
          <button
            type="button"
            className={styles.signInText}
            onClick={() => router.push('/sign-in')}
            role="link"
            data-testid="welcome-sign-in"
          >
            Already have an account? <span className="font-bold">Sign in</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  screen: 'flex flex-1 flex-col justify-between bg-brand',
  column: 'mx-auto w-full max-w-lg px-4',
  wordmark: 'text-3xl font-extrabold tracking-tighter text-white',
  headline: 'mt-8 text-5xl leading-none font-extrabold tracking-tighter text-white',
  sub: 'mt-4 text-lg leading-snug text-white/90',
  stories: 'mt-8 flex flex-col gap-2',
  story: 'flex flex-row items-center gap-3 rounded-3xl bg-white p-3',
  storyText: 'min-w-0 flex-1 truncate text-sm text-ink',
  actions: 'flex flex-col gap-4 pt-8',
  signInText: 'py-2 text-center text-base text-white',
} as const;
