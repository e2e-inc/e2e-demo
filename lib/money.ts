const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const wholeFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatCents(cents: number, options?: { compact?: boolean }) {
  if (options?.compact && cents % 100 === 0) {
    return wholeFormatter.format(cents / 100);
  }
  return formatter.format(cents / 100);
}

export function signedCents(cents: number, direction: 'in' | 'out' | 'none') {
  const base = formatCents(Math.abs(cents));
  if (direction === 'in') return `+ ${base}`;
  if (direction === 'out') return `- ${base}`;
  return base;
}

/**
 * Parses a keypad string like "12.5" or "0.75" into integer cents. Returns
 * null when the text is not a valid amount.
 */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (!cleaned || cleaned === '.') return null;
  const [whole, fraction = ''] = cleaned.split('.');
  if (fraction.length > 2) return null;
  const cents =
    Number.parseInt(whole || '0', 10) * 100 +
    Number.parseInt(fraction.padEnd(2, '0') || '0', 10);
  return Number.isFinite(cents) ? cents : null;
}

/**
 * Applies a keypad key to the current amount text, keeping the text a valid
 * partial amount (max 2 decimals, max $5,000, no leading zeros).
 */
export function applyKeypadKey(current: string, key: string): string {
  if (key === 'backspace') {
    return current.slice(0, -1);
  }
  if (key === '.') {
    if (current.includes('.')) return current;
    return current === '' ? '0.' : `${current}.`;
  }
  if (!/^\d$/.test(key)) return current;

  const [whole, fraction] = current.split('.');
  if (fraction !== undefined) {
    if (fraction.length >= 2) return current;
    return `${current}${key}`;
  }
  if (whole === '0') return key;
  if (whole.length >= 4) return current;
  return `${current}${key}`;
}

export function formatKeypadDisplay(text: string) {
  if (!text) return '0';
  const [whole, fraction] = text.split('.');
  const wholeFormatted = Number.parseInt(whole || '0', 10).toLocaleString(
    'en-US',
  );
  return fraction === undefined
    ? wholeFormatted
    : `${wholeFormatted}.${fraction}`;
}

export function relativeTime(iso: string, now = Date.now()) {
  const normalized = iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`;
  const then = new Date(normalized).getTime();
  const seconds = Math.max(0, Math.round((now - then) / 1000));

  if (seconds < 60) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(normalized).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function fullDate(iso: string) {
  const normalized = iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`;
  return new Date(normalized).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Splits a total evenly; remainder cents go to the first participants. */
export function splitEvenly(totalCents: number, count: number) {
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, index) =>
    index < remainder ? base + 1 : base,
  );
}

/** Instant transfer fee: 1.75%, min $0.25, max $25. Mirrors the backend. */
export function instantFee(amountCents: number) {
  return Math.min(2500, Math.max(25, Math.round(amountCents * 0.0175)));
}
