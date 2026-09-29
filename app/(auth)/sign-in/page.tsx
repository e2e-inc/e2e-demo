'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  ErrorText,
  Field,
  Header,
  Pill,
  Screen,
  Subtitle,
  Title,
} from '../../../components/ui';
import { useSession } from '../../../lib/session';
import { spacing } from '../../../lib/theme';

export default function SignIn() {
  const router = useRouter();
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message.replace(
              /^Invalid email or password.*/i,
              'Wrong email or password.',
            )
          : 'Could not sign in.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      header={<Header title="Sign in" onBack={() => router.back()} />}
      footer={
        <Pill
          label="Sign in"
          testID="sign-in-submit"
          loading={busy}
          disabled={!email || !password}
          onPress={submit}
        />
      }
    >
      <Title>Welcome back</Title>
      <Subtitle>Sign in with the email you used to create your account.</Subtitle>
      <div className="flex flex-col" style={{ gap: spacing.lg, marginTop: spacing.xl }}>
        <Field
          label="Email"
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          testID="sign-in-email"
        />
        <Field
          label="Password"
          placeholder="Your password"
          secureTextEntry
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          testID="sign-in-password"
        />
        <ErrorText>{error}</ErrorText>
      </div>
    </Screen>
  );
}
