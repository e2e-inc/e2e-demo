'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { Icon } from '@/components/icon';
import {
  Body,
  Card,
  Divider,
  EmptyState,
  Header,
  IconButton,
  ListRow,
  Loading,
  Pill,
  Screen,
} from '@/components/ui';
import { api } from '@/lib/api';
import { keys, useFundingSources } from '@/lib/queries';
import { colors, spacing } from '@/lib/theme';

export default function FundingSources() {
  const router = useRouter();
  const client = useQueryClient();
  const sources = useFundingSources();
  async function remove(id: string) {
    await api.removeFundingSource(id);
    await client.invalidateQueries({
      queryKey: keys.fundingSources,
    });
  }
  async function makeDefault(id: string) {
    await api.setDefaultFundingSource(id);
    await client.invalidateQueries({
      queryKey: keys.fundingSources,
    });
  }
  const list = sources.data?.fundingSources ?? [];
  return (
    <Screen
      header={<Header title="Banks and cards" onBack={() => router.back()} />}
      footer={
        <Pill
          label="Link a bank or card"
          icon="add"
          onPress={() => router.push('/wallet/link')}
          testID="link-new-source"
        />
      }
    >
      <Body
        secondary
        style={{
          marginTop: spacing.sm,
        }}
      >
        Use these to add money, transfer out, or cover payments when your
        balance runs short.
      </Body>
      {sources.isLoading ? (
        <Loading />
      ) : list.length ? (
        <Card
          style={{
            marginTop: spacing.lg,
            paddingTop: spacing.xs,
            paddingBottom: spacing.xs,
          }}
          testID="funding-list"
        >
          {list.map((source, index) => (
            <div key={source.id}>
              {index > 0 ? <Divider /> : null}
              <ListRow
                title={source.label}
                subtitle={`${source.type === 'bank' ? 'Bank account' : 'Debit card'}${source.isDefault ? ' · Default' : ''}`}
                testID={`funding-row-${source.last4}`}
                left={
                  <div className={styles.icon}>
                    <Icon
                      name={source.type === 'bank' ? 'business' : 'card'}
                      size={20}
                      color={colors.text}
                    />
                  </div>
                }
                right={
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: spacing.sm,
                    }}
                  >
                    {!source.isDefault ? (
                      <button
                        type="button"
                        onClick={() => makeDefault(source.id)}
                        className={styles.link}
                      >
                        Make default
                      </button>
                    ) : null}
                    <IconButton
                      name="trash-outline"
                      size={36}
                      accessibilityLabel={`Remove ${source.label}`}
                      onPress={() => remove(source.id)}
                    />
                  </div>
                }
              />
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState
          icon="business-outline"
          title="Nothing linked yet"
          body="Link a bank account or debit card to move money in and out."
        />
      )}
    </Screen>
  );
}

const styles = {
  icon: 'flex shrink-0 w-11 h-11 rounded-full bg-pill-gray items-center justify-center',
  link: 'cursor-pointer text-action font-semibold text-sm self-center',
} as const;
