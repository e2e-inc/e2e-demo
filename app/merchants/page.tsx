'use client';

import { useRouter } from 'next/navigation';

import { Avatar } from '../../components/avatar';
import { Header, Loading, Screen, Subtitle, Title } from '../../components/ui';
import { useMerchants } from '../../lib/queries';

export default function Merchants() {
  const router = useRouter();
  const merchants = useMerchants();
  return (
    <Screen
      header={<Header title="Pay a business" onBack={() => router.back()} />}
    >
      <Title>Businesses near you</Title>
      <Subtitle>
        Pay in-store by scanning their code, or check out online.
      </Subtitle>
      {merchants.isLoading ? (
        <Loading />
      ) : (
        <div className={styles.grid}>
          {merchants.data?.merchants.map((merchant) => (
            <button
              type="button"
              key={merchant.id}
              aria-label={merchant.name}
              data-testid={`merchant-${merchant.id}`}
              onClick={() => router.push(`/merchants/${merchant.id}`)}
              className={`${styles.tile} active:opacity-80`}
            >
              <div className={styles.tileContent}>
                <Avatar
                  emoji={merchant.emoji}
                  color={merchant.color}
                  size={52}
                />
                <p className={styles.name}>{merchant.name}</p>
                <p className={styles.category}>{merchant.category}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </Screen>
  );
}

const styles = {
  grid: '-m-1 flex flex-row flex-wrap mt-5',
  tile: 'w-1/2 p-1 cursor-pointer text-left',
  tileContent: 'flex flex-col bg-card rounded-3xl p-4 gap-2',
  name: 'text-base font-bold text-ink mt-1 line-clamp-2',
  category: 'text-sm text-ink-secondary',
} as const;
