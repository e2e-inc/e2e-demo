'use client';

import { useEffect, useState } from 'react';

import { Avatar } from '../../../components/avatar';
import {
  Body,
  ErrorText,
  Field,
  Header,
  Pill,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import { api } from '../../../lib/api';
import { useSession } from '../../../lib/session';
import { colors, spacing } from '../../../lib/theme';

function suggestHandle(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30);
}

export default function ChooseHandle() {
  const { user, setProfile, signOut } = useSession();
  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [handle, setHandle] = useState(suggestHandle(user?.name ?? ''));
  const [checked, setChecked] = useState<{
    handle: string;
    available: boolean;
    reason: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const normalized = handle.trim().toLowerCase();

  useEffect(() => {
    if (normalized.length < 3) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await api.handleAvailable(normalized);
        if (!cancelled) setChecked({ ...result, handle: normalized });
      } catch {
        // Leave the previous result in place; the submit call reports errors.
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalized]);

  const availability: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' =
    normalized.length < 3
      ? normalized
        ? 'invalid'
        : 'idle'
      : checked?.handle !== normalized
        ? 'checking'
        : checked.available
          ? 'available'
          : checked.reason === 'taken'
            ? 'taken'
            : 'invalid';

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const result = await api.createProfile({
        handle: handle.trim(),
        displayName: displayName.trim(),
      });
      setProfile(result.profile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  const hint =
    availability === 'available'
      ? `@${handle.trim().toLowerCase()} is available`
      : availability === 'taken'
        ? 'That handle is taken'
        : availability === 'invalid'
          ? '3-30 letters, numbers, or dashes'
          : availability === 'checking'
            ? 'Checking…'
            : ' ';

  return (
    <Screen
      header={
        <Header
          title="Your profile"
          onBack={null}
          right={
            <button
              type="button"
              onClick={signOut}
              style={{ color: colors.action, fontWeight: 600 }}
            >
              Sign out
            </button>
          }
        />
      }
      footer={
        <Pill
          label="Continue"
          testID="handle-submit"
          loading={busy}
          disabled={availability !== 'available' || displayName.trim().length < 2}
          onPress={submit}
        />
      }
    >
      <div
        className="flex flex-col items-center"
        style={{ marginTop: spacing.lg, marginBottom: spacing.lg }}
      >
        <Avatar
          person={{ displayName: displayName || '?', avatarColor: colors.purple }}
          size={88}
        />
      </div>
      <Title style={{ textAlign: 'center' }}>Pick your handle</Title>
      <Subtitle style={{ textAlign: 'center' }}>
        Friends pay you with it, so make it easy to remember.
      </Subtitle>
      <div className="flex flex-col" style={{ gap: spacing.lg, marginTop: spacing.xl }}>
        <Field
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Jordan Lee"
          testID="handle-display-name"
        />
        <div>
          <Field
            label="Handle"
            value={handle}
            onChangeText={(text) => setHandle(text.replace(/^@/, ''))}
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="jordan-lee"
            testID="handle-input"
          />
          <Body
            style={{
              fontSize: 14,
              marginTop: 6,
              marginLeft: 2,
              whiteSpace: 'pre',
              color:
                availability === 'available'
                  ? colors.success
                  : availability === 'taken' || availability === 'invalid'
                    ? colors.danger
                    : colors.textSecondary,
            }}
            testID="handle-hint"
          >
            {hint}
          </Body>
        </div>
        <ErrorText>{error}</ErrorText>
      </div>
    </Screen>
  );
}
