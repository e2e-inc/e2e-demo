'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { Avatar } from '@/components/avatar';
import { ErrorText, Field, Header, Pill, Screen } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';
import { spacing } from '@/lib/theme';

const COLORS = [
  '#9969FA',
  '#FB5E1B',
  '#42E69F',
  '#4BB4FF',
  '#E074FF',
  '#FCBA1E',
  '#3F34EE',
  '#D52B9C',
];

export default function EditProfile() {
  const router = useRouter();
  const { profile, setProfile } = useSession();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [color, setColor] = useState(profile?.avatarColor ?? COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.updateProfile({
        displayName,
        bio,
        avatarColor: color,
      });
      setProfile(result.profile);
      router.back();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      header={<Header title="Edit profile" onBack={() => router.back()} />}
      footer={
        <Pill
          label="Save"
          loading={busy}
          disabled={displayName.trim().length < 2}
          onPress={save}
          testID="edit-profile-save"
        />
      }
    >
      <div
        className="flex flex-col"
        style={{
          alignItems: 'center',
          marginTop: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <Avatar
          person={{
            displayName: displayName || '?',
            avatarColor: color,
          }}
          size={96}
        />
        <p className={styles.handle}>@{profile?.handle}</p>
      </div>
      <div className={styles.swatches}>
        {COLORS.map((option) => (
          <button
            type="button"
            key={option}
            aria-label={`Color ${option}`}
            aria-pressed={color === option}
            onClick={() => setColor(option)}
            className={twMerge(
              styles.swatch,
              color === option && styles.swatchActive,
            )}
            style={{
              backgroundColor: option,
            }}
          />
        ))}
      </div>
      <div
        className="flex flex-col"
        style={{
          gap: spacing.lg,
          marginTop: spacing.xl,
        }}
      >
        <Field
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          testID="edit-profile-name"
        />
        <Field
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Something short and sweet"
          maxLength={80}
          testID="edit-profile-bio"
        />
        <ErrorText>{error}</ErrorText>
      </div>
    </Screen>
  );
}

const styles = {
  handle: 'text-ink-secondary mt-2',
  swatches: 'flex flex-row justify-center flex-wrap gap-3',
  swatch: 'w-9 h-9 rounded-full border-2 border-transparent cursor-pointer',
  swatchActive: 'border-black!',
} as const;
