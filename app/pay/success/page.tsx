'use client';

import { useRouter } from 'next/navigation';

import { Avatar } from '../../../components/avatar';
import { Icon } from '../../../components/icon';
import { Pill, Screen } from '../../../components/ui';
import { formatCents } from '../../../lib/money';
import { colors, spacing } from '../../../lib/theme';
import { useRouteParams } from '../../../lib/use-route-params';

export default function Success() {
  const router = useRouter();
  const params = useRouteParams<{
    kind: string;
    amount: string;
    name: string;
    color?: string;
    id?: string;
    requestId?: string;
    title?: string;
    body?: string;
  }>();
  const amount = formatCents(Number(params.amount ?? 0));
  const title =
    params.title ??
    (params.kind === 'request'
      ? `You requested ${amount}`
      : params.kind === 'merchant'
        ? `You paid ${params.name}`
        : params.kind === 'split'
          ? `Split sent`
          : `You paid ${params.name}`);
  const body =
    params.body ??
    (params.kind === 'request'
      ? `${params.name} will see your request right away.`
      : params.kind === 'split'
        ? `${params.name} will get a request for their share.`
        : `${params.name} has the money. That was easy.`);
  function done() {
    router.replace('/');
  }
  return (
    <Screen
      scroll={false}
      style={{ backgroundColor: colors.action }}
      contentStyle={{ display: 'flex', flexDirection: 'column' }}
      footer={
        <div className="flex flex-col" style={{ gap: spacing.sm }}>
          {params.id ? (
            <Pill
              label="View details"
              variant="secondary"
              testID="success-details"
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderColor: 'transparent',
              }}
              onPress={() => {
                router.replace(`/activity/${params.id}`);
              }}
            />
          ) : null}
          <Pill
            label="Done"
            variant="white"
            testID="success-done"
            onPress={done}
          />
        </div>
      }
    >
      <div className={styles.center} data-testid="success-screen">
        <div className={styles.badge}>
          <Icon name="checkmark" size={40} color={colors.action} />
        </div>
        <div className={styles.avatar}>
          <Avatar
            person={{
              displayName: params.name ?? '',
              avatarColor: params.color ?? colors.purple,
            }}
            size={72}
          />
        </div>
        <p className={styles.amount}>{amount}</p>
        <p className={styles.title} data-testid="success-title">
          {title}
        </p>
        <p className={styles.body}>{body}</p>
      </div>
    </Screen>
  );
}

const styles = {
  center: 'flex flex-1 flex-col items-center justify-center pb-10',
  badge: 'flex w-20 h-20 rounded-full bg-white items-center justify-center',
  avatar: '-mt-7 ml-16 border-2 border-action rounded-full',
  amount: 'text-white text-5xl font-extrabold tracking-tighter mt-4',
  title: 'text-white text-xl font-bold mt-2 text-center',
  body: 'text-white/90 text-base mt-2 text-center px-6',
} as const;
