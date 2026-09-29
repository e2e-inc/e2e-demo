'use client';

import { useState } from 'react';

import { profilePhotoFor } from '../lib/profile-photos';
import type { Party } from '../lib/types';

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({
  person,
  size = 44,
  emoji,
  color,
  label,
}: {
  person?: Pick<Party, 'displayName' | 'avatarColor'> | null;
  size?: number;
  emoji?: string | null;
  color?: string;
  label?: string;
}) {
  const background = color ?? person?.avatarColor ?? '#CFCFCF';
  const text = emoji ?? initialsOf(label ?? person?.displayName ?? '?');
  const photo = emoji ? undefined : profilePhotoFor(person?.displayName);
  const [failedPhoto, setFailedPhoto] = useState<string | undefined>();
  return (
    <div
      role="img"
      aria-label={person?.displayName ?? label}
      className={styles.circle}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background,
      }}
    >
      <span
        className={styles.text}
        style={{
          fontSize: emoji ? size * 0.5 : size * 0.38,
          lineHeight: 1,
          ...(!emoji ? { color: readableTextColor(background) } : null),
        }}
      >
        {text}
      </span>
      {photo && photo !== failedPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          aria-hidden
          src={photo}
          onError={() => setFailedPhoto(photo)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </div>
  );
}

export function AvatarStack({
  people,
  size = 32,
}: {
  people: Pick<Party, 'displayName' | 'avatarColor'>[];
  size?: number;
}) {
  return (
    <div className="flex flex-row">
      {people.slice(0, 4).map((person, index) => (
        <div
          key={`${person.displayName}-${index}`}
          style={{
            marginLeft: index === 0 ? 0 : -size * 0.3,
            borderRadius: size / 2 + 2,
            borderWidth: 2,
            borderColor: '#FFFFFF',
          }}
        >
          <Avatar person={person} size={size} />
        </div>
      ))}
    </div>
  );
}

export function readableTextColor(hex: string) {
  const match = hex.replace('#', '').match(/.{2}/g);
  if (!match || match.length < 3) return '#000000';
  const [r, g, b] = match.map((part) => Number.parseInt(part, 16));
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#000000' : '#FFFFFF';
}

const styles = {
  circle:
    'relative flex shrink-0 items-center justify-center overflow-hidden select-none',
  text: 'font-bold',
} as const;
