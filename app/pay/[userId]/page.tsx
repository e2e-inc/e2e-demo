'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { Avatar } from '../../../components/avatar';
import {
  type FundingChoice,
  FundingPicker,
} from '../../../components/funding-picker';
import { Icon } from '../../../components/icon';
import { AmountDisplay, Keypad } from '../../../components/keypad';
import { Chip, ErrorText, Header, Pill, Screen } from '../../../components/ui';
import { api, ApiError } from '../../../lib/api';
import { href } from '../../../lib/href';
import { applyKeypadKey, formatCents, parseAmount } from '../../../lib/money';
import { useRefreshMoney } from '../../../lib/queries';
import { useSession } from '../../../lib/session';
import { colors, spacing } from '../../../lib/theme';
import type { Privacy } from '../../../lib/types';
import { useRouteParams } from '../../../lib/use-route-params';

const EMOJI = ['🍕', '☕️', '🍻', '🚕', '🎟️', '🏠', '🎁', '💸'];
const PRIVACY: {
  value: Privacy;
  label: string;
  icon: 'earth' | 'people' | 'lock-closed';
}[] = [
  {
    value: 'public',
    label: 'Public',
    icon: 'earth',
  },
  {
    value: 'friends',
    label: 'Friends',
    icon: 'people',
  },
  {
    value: 'private',
    label: 'Private',
    icon: 'lock-closed',
  },
];

export default function Amount() {
  const router = useRouter();
  const params = useRouteParams<{
    userId: string;
    mode?: string;
    handle?: string;
    name?: string;
    color?: string;
    amount?: string;
    note?: string;
  }>();
  const { profile, setProfile } = useSession();
  const refresh = useRefreshMoney();
  const initialMode = params.mode === 'request' ? 'request' : 'pay';
  const [amountText, setAmountText] = useState(
    params.amount
      ? (Number(params.amount) / 100).toFixed(2).replace(/\.00$/, '')
      : '',
  );
  const [note, setNote] = useState(params.note ?? '');
  const [emoji, setEmoji] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<Privacy>('friends');
  const [funding, setFunding] = useState<FundingChoice>({
    kind: 'balance',
  });
  const [confirming, setConfirming] = useState<'pay' | 'request' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountCents = parseAmount(amountText) ?? 0;
  const valid = amountCents > 0 && amountCents <= 500_000;
  const balance = profile?.balanceCents ?? 0;
  const person = {
    displayName: params.name ?? 'Someone',
    avatarColor: params.color ?? colors.purple,
  };
  async function submit(kind: 'pay' | 'request') {
    setBusy(true);
    setError(null);
    try {
      if (kind === 'pay') {
        const result = await api.pay({
          toUserId: params.userId,
          amountCents,
          note,
          emoji,
          privacy,
          fundingSourceId: funding.kind === 'source' ? funding.source.id : null,
        });
        setProfile(result.profile);
        await refresh();
        router.replace(
          href('/pay/success', {
            kind: 'pay',
            amount: String(amountCents),
            name: person.displayName,
            color: person.avatarColor,
            id: result.transaction.id,
          }),
        );
      } else {
        const result = await api.requestMoney({
          fromUserId: params.userId,
          amountCents,
          note,
          emoji,
          privacy,
        });
        await refresh();
        router.replace(
          href('/pay/success', {
            kind: 'request',
            amount: String(amountCents),
            name: person.displayName,
            color: person.avatarColor,
            requestId: result.request.id,
          }),
        );
      }
    } catch (caught) {
      setConfirming(null);
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Something went wrong. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      scroll
      header={
        <Header
          onBack={() => router.back()}
          right={
            <button
              type="button"
              className="cursor-pointer"
              onClick={() => router.push(`/people/${params.handle}`)}
              aria-label="View profile"
            >
              <Avatar person={person} size={36} />
            </button>
          }
        />
      }
      footer={
        confirming ? (
          <div className={styles.confirm} data-testid="confirm-sheet">
            <p className={styles.confirmTitle}>
              {confirming === 'pay' ? 'Pay' : 'Request'}{' '}
              {formatCents(amountCents)} {confirming === 'pay' ? 'to' : 'from'}{' '}
              {person.displayName}
            </p>
            <p className={styles.confirmBody}>
              {note ? `“${note}”  ·  ` : ''}
              {PRIVACY.find((option) => option.value === privacy)?.label}
              {confirming === 'pay'
                ? `  ·  ${funding.kind === 'balance' ? 'Balance' : funding.source.label}`
                : ''}
            </p>
            <div
              className="flex flex-row"
              style={{
                gap: spacing.sm,
                marginTop: spacing.md,
              }}
            >
              <Pill
                label="Back"
                variant="secondary"
                onPress={() => setConfirming(null)}
                disabled={busy}
                style={{
                  flex: 1,
                }}
              />
              <Pill
                label={
                  confirming === 'pay' ? 'Confirm payment' : 'Send request'
                }
                variant={confirming === 'pay' ? 'brand' : 'primary'}
                onPress={() => submit(confirming)}
                loading={busy}
                testID="confirm-submit"
                style={{
                  flex: 2,
                }}
              />
            </div>
          </div>
        ) : (
          <div
            className="flex flex-row"
            style={{
              gap: spacing.sm,
            }}
          >
            <Pill
              label="Request"
              variant={initialMode === 'request' ? 'primary' : 'secondary'}
              disabled={!valid}
              testID="submit-request"
              onPress={() => setConfirming('request')}
              style={{
                flex: 1,
              }}
            />
            <Pill
              label="Pay"
              variant={initialMode === 'pay' ? 'brand' : 'secondary'}
              disabled={!valid}
              testID="submit-pay"
              onPress={() => setConfirming('pay')}
              style={{
                flex: 1,
              }}
            />
          </div>
        )
      }
    >
      <div className={styles.person}>
        <p className={styles.personName}>{person.displayName}</p>
        <p className={styles.personHandle}>@{params.handle}</p>
      </div>

      <AmountDisplay text={amountText} />

      <div className={styles.noteCard}>
        <input
          type="text"
          placeholder="What's it for?"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={styles.noteInput}
          maxLength={120}
          aria-label="Note"
          data-testid="pay-note"
        />
        <div className={styles.emojiRow}>
          {EMOJI.map((item) => (
            <button
              type="button"
              key={item}
              aria-label={`Emoji ${item}`}
              onClick={() =>
                setEmoji((current) => (current === item ? null : item))
              }
              className={twMerge(
                styles.emoji,
                emoji === item && styles.emojiSelected,
              )}
            >
              <span
                style={{
                  fontSize: 20,
                }}
              >
                {item}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.privacyRow}>
        {PRIVACY.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={privacy === option.value}
            onPress={() => setPrivacy(option.value)}
          />
        ))}
        <Icon
          name={
            PRIVACY.find((option) => option.value === privacy)?.icon ?? 'people'
          }
          size={16}
          color={colors.textSecondary}
        />
      </div>

      {initialMode === 'pay' || confirming === 'pay' ? (
        <div
          style={{
            marginTop: spacing.md,
          }}
        >
          <FundingPicker
            value={funding}
            onChange={setFunding}
            balanceCents={balance}
            amountCents={amountCents}
          />
        </div>
      ) : null}

      <ErrorText>{error}</ErrorText>

      <div
        style={{
          marginTop: spacing.lg,
        }}
      >
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
  person: 'flex flex-col items-center mb-2',
  personName: 'text-xl font-bold text-ink',
  personHandle: 'text-sm text-ink-secondary mt-0.5',
  noteCard: 'bg-card rounded-3xl p-3 mt-2',
  noteInput:
    'w-full bg-transparent outline-none placeholder:text-ink-tertiary text-base text-ink px-1 py-2 min-h-10',
  emojiRow: 'flex flex-row flex-wrap gap-1.5 mt-2',
  emoji:
    'flex cursor-pointer w-10 h-10 rounded-full items-center justify-center bg-canvas',
  emojiSelected: 'bg-sky-soft! border-2! border-action!',
  privacyRow: 'flex flex-row items-center gap-2 mt-3',
  confirm: 'shadow-xl bg-card rounded-4xl p-4',
  confirmTitle: 'text-lg font-bold text-ink',
  confirmBody: 'text-sm text-ink-secondary mt-1 whitespace-pre-wrap',
} as const;
