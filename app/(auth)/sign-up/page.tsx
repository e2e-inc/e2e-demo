'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
import { useSession } from '../../../lib/session';
import { spacing } from '../../../lib/theme';

export default function SignUp() {
  const router = useRouter();
  const { signUp } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid =
    name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && password.length >= 8;

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await signUp(name.trim(), email.trim().toLowerCase(), password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign up.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      header={<Header title="Create account" onBack={() => router.back()} />}
      footer={
        <>
          <Pill
            label="Continue"
            testID="sign-up-submit"
            loading={busy}
            disabled={!valid}
            onPress={submit}
          />
          <Body
            secondary
            style={{ fontSize: 13, textAlign: 'center', marginTop: spacing.md }}
          >
            Demo accounts stay on this device. Use a sample email and password.
          </Body>
        </>
      }
    >
      <Title>Let&apos;s get you set up</Title>
      <Subtitle>Your name is how friends will find you.</Subtitle>
      <div className="flex flex-col" style={{ gap: spacing.lg, marginTop: spacing.xl }}>
        <Field
          label="Full name"
          placeholder="Jordan Lee"
          autoComplete="name"
          value={name}
          onChangeText={setName}
          testID="sign-up-name"
        />
        <Field
          label="Email"
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          testID="sign-up-email"
        />
        <Field
          label="Password"
          placeholder="At least 8 characters"
          secureTextEntry
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={valid ? submit : undefined}
          testID="sign-up-password"
        />
        <ErrorText>{error}</ErrorText>
      </div>
    </Screen>
  );
}
