'use client';

import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

import { AmountDisplay, Keypad } from '../../../components/keypad';
import {
  Body,
  Card,
  ErrorText,
  Header,
  Pill,
  Screen,
} from '../../../components/ui';
import { api, ApiError } from '../../../lib/api';
import { applyKeypadKey, formatCents, parseAmount } from '../../../lib/money';
import { colors, spacing } from '../../../lib/theme';

export default function QrRequest() {
  const router = useRouter();
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountCents = parseAmount(amountText) ?? 0;

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.qrToken({ mode: 'request', amountCents, note });
      setCode(result.code);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not create code.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (code) {
    return (
      <Screen
        header={<Header title="Request code" onBack={() => router.back()} />}
        footer={
          <Pill
            label="Done"
            onPress={() => router.back()}
            testID="qr-request-done"
          />
        }
      >
        <Card className={styles.center} testID="qr-request-card">
          <p className={styles.amount}>{formatCents(amountCents)}</p>
          {note ? <p className={styles.note}>{note}</p> : null}
          <div className={styles.qrWrap}>
            <QRCodeSVG
              value={code}
              size={200}
              fgColor={colors.text}
              bgColor="#FFFFFF"
            />
          </div>
          <Body secondary style={{ textAlign: 'center', fontSize: 14 }}>
            Anyone who scans this pays you exactly {formatCents(amountCents)}.
            Expires in 24 hours.
          </Body>
          <p className={styles.raw} data-testid="qr-request-code">
            {code}
          </p>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <Header title="Request with a code" onBack={() => router.back()} />
      }
      footer={
        <Pill
          label="Create code"
          disabled={amountCents <= 0}
          loading={busy}
          onPress={generate}
          testID="qr-request-create"
        />
      }
    >
      <AmountDisplay text={amountText} />
      <div className={styles.noteCard}>
        <input
          type="text"
          placeholder="What's it for? (optional)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={styles.noteInput}
          aria-label="Note"
        />
      </div>
      <ErrorText>{error}</ErrorText>
      <div style={{ marginTop: spacing.lg }}>
        <Keypad
          onKey={(key) =>
            setAmountText((current) => applyKeypadKey(current, key))
          }
        />
      </div>
    </Screen>
  );
}

const styles = {
  center: 'flex flex-col items-center mt-4 py-6',
  amount: 'text-4xl font-extrabold tracking-tighter text-ink',
  note: 'text-base text-ink-secondary mt-1',
  qrWrap: 'p-4 rounded-3xl my-4 border border-divider',
  raw: 'text-xs text-ink-tertiary mt-2 select-all',
  noteCard: 'bg-card rounded-3xl p-3 mt-2',
  noteInput:
    'w-full bg-transparent text-base text-ink px-1 min-h-10 outline-none placeholder:text-ink-tertiary',
} as const;
