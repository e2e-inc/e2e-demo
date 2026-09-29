'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Avatar } from '../../../components/avatar';
import { Icon } from '../../../components/icon';
import { AmountDisplay, Keypad } from '../../../components/keypad';
import { PersonRow } from '../../../components/person-row';
import {
  Card,
  ErrorText,
  Header,
  Loading,
  Pill,
  Screen,
  SearchField,
  SectionLabel,
  Segmented,
} from '../../../components/ui';
import { api, ApiError } from '../../../lib/api';
import { href } from '../../../lib/href';
import {
  applyKeypadKey,
  formatCents,
  parseAmount,
  splitEvenly,
} from '../../../lib/money';
import { useFriends, usePeople, useRefreshMoney } from '../../../lib/queries';
import { useSession } from '../../../lib/session';
import { colors, spacing } from '../../../lib/theme';
import type { Person } from '../../../lib/types';
import { useRouteParams } from '../../../lib/use-route-params';

type Step = 'amount' | 'people' | 'review';
type Method = 'even' | 'custom';

export default function NewSplit() {
  const router = useRouter();
  const params = useRouteParams<{
    amount?: string;
    note?: string;
  }>();
  const { profile } = useSession();
  const refresh = useRefreshMoney();
  const [step, setStep] = useState<Step>(params.amount ? 'people' : 'amount');
  const [amountText, setAmountText] = useState(
    params.amount
      ? (Number(params.amount) / 100).toFixed(2).replace(/\.00$/, '')
      : '',
  );
  const [note, setNote] = useState(params.note ?? '');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Person[]>([]);
  const [includeSelf, setIncludeSelf] = useState(true);
  const [method, setMethod] = useState<Method>('even');
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const friends = useFriends();
  const search = usePeople(query.trim());
  const totalCents = parseAmount(amountText) ?? 0;
  const count = selected.length + (includeSelf ? 1 : 0);
  const evenShares = useMemo(
    () => (count > 0 ? splitEvenly(totalCents, count) : []),
    [count, totalCents],
  );
  const customShares = selected.map(
    (person) => parseAmount(custom[person.userId] ?? '') ?? 0,
  );
  const customTotal = customShares.reduce((sum, share) => sum + share, 0);
  const myCustomShare = totalCents - customTotal;
  const customValid =
    customShares.every((share) => share > 0) &&
    (includeSelf ? myCustomShare > 0 : customTotal === totalCents);
  function toggle(person: Person) {
    setSelected((current) =>
      current.some((entry) => entry.userId === person.userId)
        ? current.filter((entry) => entry.userId !== person.userId)
        : [...current, person],
    );
  }
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.createSplit({
        totalCents,
        note: note || 'Split',
        participantUserIds: selected.map((person) => person.userId),
        includeSelf,
        privacy: 'friends',
        shares:
          method === 'custom'
            ? selected.map((person, index) => ({
                userId: person.userId,
                amountCents: customShares[index],
              }))
            : undefined,
      });
      await refresh();
      router.replace(
        href('/pay/success', {
          kind: 'split',
          amount: String(totalCents),
          name:
            selected.length === 1
              ? selected[0].displayName
              : `${selected.length} people`,
          color: colors.purple,
          title: `Split ${formatCents(totalCents)} ${selected.length + (includeSelf ? 1 : 0)} ways`,
          body: `${selected.map((person) => person.displayName.split(' ')[0]).join(', ')} will each get a request.`,
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not create split.',
      );
    } finally {
      setBusy(false);
    }
  }
  const list = query.trim() ? search.data?.people : friends.data?.friends;
  return (
    <Screen
      header={
        <Header
          title={
            step === 'amount'
              ? 'Split a bill'
              : step === 'people'
                ? 'Who was there?'
                : 'Review split'
          }
          onBack={() =>
            step === 'amount'
              ? router.back()
              : setStep(step === 'people' ? 'amount' : 'people')
          }
        />
      }
      footer={
        step === 'amount' ? (
          <Pill
            label="Next"
            disabled={totalCents <= 0}
            onPress={() => setStep('people')}
            testID="split-next-amount"
          />
        ) : step === 'people' ? (
          <Pill
            label={
              selected.length
                ? `Next (${selected.length} selected)`
                : 'Pick at least one person'
            }
            disabled={selected.length === 0}
            onPress={() => setStep('review')}
            testID="split-next-people"
          />
        ) : (
          <Pill
            label={`Send ${selected.length} request${selected.length === 1 ? '' : 's'}`}
            variant="brand"
            loading={busy}
            disabled={method === 'custom' && !customValid}
            onPress={submit}
            testID="split-submit"
          />
        )
      }
    >
      {step === 'amount' ? (
        <>
          <AmountDisplay text={amountText} />
          <div className={styles.noteCard}>
            <input
              type="text"
              placeholder="What was the bill for?"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={styles.noteInput}
              aria-label="Note"
              data-testid="split-note"
            />
          </div>
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
        </>
      ) : null}

      {step === 'people' ? (
        <>
          <SearchField
            placeholder="Search friends"
            value={query}
            onChangeText={setQuery}
            testID="split-search"
          />
          {selected.length ? (
            <div className={styles.selectedRow}>
              {selected.map((person) => (
                <button
                  type="button"
                  key={person.userId}
                  className="relative cursor-pointer"
                  onClick={() => toggle(person)}
                  aria-label={`Remove ${person.displayName}`}
                >
                  <Avatar person={person} size={44} />
                  <div className={styles.remove}>
                    <Icon name="close" size={12} color="#FFFFFF" />
                  </div>
                </button>
              ))}
            </div>
          ) : null}
          <SectionLabel>{query.trim() ? 'Results' : 'Friends'}</SectionLabel>
          {(query.trim() ? search.isLoading : friends.isLoading) ? (
            <Loading />
          ) : (
            <Card
              style={{
                paddingTop: spacing.xs,
                paddingBottom: spacing.xs,
              }}
            >
              {(list ?? []).map((person) => {
                const isSelected = selected.some(
                  (entry) => entry.userId === person.userId,
                );
                return (
                  <PersonRow
                    key={person.userId}
                    person={person}
                    selected={isSelected}
                    onPress={() => toggle(person)}
                    testID={`split-person-${person.handle}`}
                    right={
                      <Icon
                        name={
                          isSelected ? 'checkmark-circle' : 'ellipse-outline'
                        }
                        size={24}
                        color={isSelected ? colors.action : colors.border}
                      />
                    }
                  />
                );
              })}
              {!list?.length ? (
                <p
                  style={{
                    color: colors.textSecondary,
                    padding: spacing.md,
                  }}
                >
                  No one found.
                </p>
              ) : null}
            </Card>
          )}
        </>
      ) : null}

      {step === 'review' ? (
        <>
          <div
            className="flex flex-col"
            style={{
              alignItems: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <p className={styles.total}>{formatCents(totalCents)}</p>
            <p
              style={{
                color: colors.textSecondary,
              }}
            >
              {note || 'Split'} · {count} people
            </p>
          </div>
          <Segmented<Method>
            options={[
              {
                value: 'even',
                label: 'Split evenly',
              },
              {
                value: 'custom',
                label: 'Custom amounts',
              },
            ]}
            value={method}
            onChange={setMethod}
          />
          <Card
            style={{
              marginTop: spacing.lg,
              paddingTop: spacing.xs,
              paddingBottom: spacing.xs,
            }}
          >
            <button
              type="button"
              className={`${styles.shareRow} w-full cursor-pointer text-left`}
              onClick={() => setIncludeSelf((current) => !current)}
              aria-label="Include yourself"
              data-testid="split-include-self"
            >
              <Avatar person={profile} size={40} />
              <span className={styles.shareName}>You</span>
              <span className={styles.shareAmount}>
                {includeSelf
                  ? formatCents(
                      method === 'even'
                        ? evenShares[0]
                        : Math.max(myCustomShare, 0),
                    )
                  : 'Not included'}
              </span>
              <Icon
                name={includeSelf ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={includeSelf ? colors.action : colors.border}
              />
            </button>
            {selected.map((person, index) => (
              <div key={person.userId} className={styles.shareRow}>
                <Avatar person={person} size={40} />
                <p className={`${styles.shareName} min-w-0 truncate`}>
                  {person.displayName}
                </p>
                {method === 'even' ? (
                  <p className={styles.shareAmount}>
                    {formatCents(evenShares[index + (includeSelf ? 1 : 0)])}
                  </p>
                ) : (
                  <div className={styles.customField}>
                    <span
                      style={{
                        color: colors.textSecondary,
                      }}
                    >
                      $
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={custom[person.userId] ?? ''}
                      onChange={(event) => {
                        const text = event.target.value;
                        setCustom((current) => ({
                          ...current,
                          [person.userId]: text,
                        }));
                      }}
                      placeholder="0.00"
                      className={styles.customInput}
                      aria-label={`${person.displayName} share`}
                    />
                  </div>
                )}
              </div>
            ))}
          </Card>
          {method === 'custom' && !customValid ? (
            <p
              style={{
                color: colors.danger,
                marginTop: spacing.sm,
                fontSize: 14,
              }}
            >
              Shares must add up to {formatCents(totalCents)}
              {includeSelf ? ' (your share is the remainder).' : '.'}
            </p>
          ) : null}
          <ErrorText>{error}</ErrorText>
        </>
      ) : null}
    </Screen>
  );
}

const styles = {
  noteCard: 'bg-card rounded-3xl p-3 mt-2',
  noteInput:
    'w-full bg-transparent outline-none placeholder:text-ink-tertiary text-base text-ink px-1 min-h-10',
  selectedRow: 'flex flex-row gap-3 mt-4 flex-wrap',
  remove:
    'absolute -right-1 -top-1 flex w-4 h-4 rounded-full bg-black items-center justify-center',
  total: 'text-5xl font-extrabold tracking-tighter text-ink',
  shareRow: 'flex flex-row items-center gap-3 py-2.5',
  shareName: 'flex-1 text-base font-semibold text-ink',
  shareAmount: 'text-base font-bold text-ink',
  customField:
    'flex flex-row items-center gap-1 bg-canvas rounded-xl px-2.5 h-10 w-28 shrink-0',
  customInput:
    'min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-tertiary text-base font-semibold text-ink',
} as const;
