'use client';

import type { ReactNode } from 'react';

import type { Person } from '../lib/types';
import { Avatar } from './avatar';
import { ListRow } from './ui';

export function PersonRow({
  person,
  onPress,
  right,
  selected,
  testID,
}: {
  person: Person;
  onPress?: () => void;
  right?: ReactNode;
  selected?: boolean;
  testID?: string;
}) {
  return (
    <ListRow
      title={person.displayName}
      subtitle={`@${person.handle}`}
      onPress={onPress}
      testID={testID ?? `person-${person.handle}`}
      left={
        <div className="relative">
          <Avatar person={person} size={44} />
          {selected ? <div className={styles.check} /> : null}
        </div>
      }
      right={right}
    />
  );
}

export function HandleText({ handle }: { handle: string }) {
  return <span className={styles.handle}>@{handle}</span>;
}

const styles = {
  handle: 'text-ink-secondary text-sm',
  check:
    'absolute -right-0.5 -bottom-0.5 mr-1 h-4 w-4 rounded-full border-2 border-white bg-action',
} as const;
