'use client';

import { useRouter } from 'next/navigation';
import type {
  CSSProperties,
  InputHTMLAttributes,
  KeyboardEvent,
  ReactNode,
} from 'react';
import { twMerge } from 'tailwind-merge';

import { colors, spacing } from '../lib/theme';
import { Icon, type IconName } from './icon';

// ---------------------------------------------------------------------------
// Screen scaffolding
// ---------------------------------------------------------------------------

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
  contentStyle,
  header,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: CSSProperties;
  contentStyle?: CSSProperties;
  header?: ReactNode;
  footer?: ReactNode;
}) {
  const body = (
    <div
      className={twMerge(
        styles.column,
        'flex flex-col',
        padded && styles.padded,
        !scroll && 'flex-1',
      )}
      style={contentStyle}
    >
      {children}
    </div>
  );
  return (
    <div className={styles.screen} style={style}>
      {header}
      {scroll ? (
        <div
          data-testid="screen-content"
          className="min-h-0 flex-1 overflow-y-auto"
          style={{ paddingBottom: spacing.xxl }}
        >
          {body}
        </div>
      ) : (
        body
      )}
      {footer ? (
        <div className={styles.footer} style={{ paddingBottom: spacing.lg }}>
          <div className={twMerge(styles.column, 'flex flex-col')}>{footer}</div>
        </div>
      ) : null}
    </div>
  );
}

export function Header({
  title,
  onBack,
  right,
  transparent,
  testID,
}: {
  title?: string;
  onBack?: (() => void) | null;
  right?: ReactNode;
  transparent?: boolean;
  testID?: string;
}) {
  const router = useRouter();
  const showBack = onBack !== null;
  return (
    <div
      className={styles.header}
      style={{
        paddingTop: spacing.sm,
        ...(transparent ? { backgroundColor: 'transparent' } : null),
      }}
      data-testid={testID}
    >
      <div className={twMerge(styles.column, styles.headerRow)}>
        <div className={styles.headerSide}>
          {showBack ? (
            <IconButton
              name="chevron-back"
              accessibilityLabel="Back"
              onPress={onBack ?? (() => router.back())}
            />
          ) : null}
        </div>
        {title ? (
          <h1 className={styles.headerTitle}>{title}</h1>
        ) : (
          <div className="flex-1" />
        )}
        <div className={twMerge(styles.headerSide, 'items-end')}>{right}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export function Title({
  children,
  style,
  className,
  testID,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  testID?: string;
}) {
  return (
    <h2
      className={twMerge(styles.title, className)}
      style={style}
      data-testid={testID}
    >
      {children}
    </h2>
  );
}

export function Subtitle({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <p className={twMerge(styles.subtitle, className)} style={style}>
      {children}
    </p>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className={styles.sectionLabel}>{children}</p>;
}

export function Body({
  children,
  secondary,
  style,
  className,
  testID,
}: {
  children: ReactNode;
  secondary?: boolean;
  style?: CSSProperties;
  className?: string;
  testID?: string;
}) {
  return (
    <p
      className={twMerge(styles.body, className)}
      style={{
        ...(secondary ? { color: colors.textSecondary } : null),
        ...style,
      }}
      data-testid={testID}
    >
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Card({
  children,
  className,
  style,
  onPress,
  testID,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onPress?: () => void;
  testID?: string;
}) {
  if (onPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        className={twMerge(
          styles.card,
          'block w-full cursor-pointer text-left active:opacity-80',
          className,
        )}
        style={style}
        data-testid={testID}
      >
        {children}
      </button>
    );
  }
  return (
    <div
      className={twMerge(styles.card, 'flex flex-col', className)}
      style={style}
      data-testid={testID}
    >
      {children}
    </div>
  );
}

export function Row({
  children,
  style,
  gap = spacing.md,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  gap?: number;
  className?: string;
}) {
  return (
    <div className={twMerge(styles.row, className)} style={{ gap, ...style }}>
      {children}
    </div>
  );
}

export function Divider() {
  return <div className={styles.divider} />;
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type PillVariant =
  'primary' | 'secondary' | 'brand' | 'outline' | 'danger' | 'white';

export function Pill({
  label,
  variant = 'primary',
  compact,
  loading,
  disabled,
  icon,
  className,
  style,
  onPress,
  testID,
  accessibilityLabel,
}: {
  label: string;
  variant?: PillVariant;
  compact?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  className?: string;
  style?: CSSProperties;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const isDisabled = disabled || loading;
  const palette = pillPalette[variant];
  return (
    <button
      type="button"
      aria-label={accessibilityLabel ?? label}
      aria-disabled={!!isDisabled}
      disabled={isDisabled}
      onClick={onPress}
      data-testid={testID}
      className={twMerge(
        styles.pill,
        compact && styles.pillCompact,
        !isDisabled && 'cursor-pointer active:opacity-80',
        className,
      )}
      style={{
        backgroundColor: palette.bg,
        borderColor: palette.border,
        ...(isDisabled ? { opacity: 0.45 } : null),
        ...style,
      }}
    >
      {loading ? (
        <Spinner color={palette.text} />
      ) : (
        <>
          {icon ? (
            <Icon
              name={icon}
              size={18}
              color={palette.text}
              style={{ marginRight: 6 }}
            />
          ) : null}
          <span
            className={twMerge(
              styles.pillLabel,
              compact && styles.pillLabelCompact,
            )}
            style={{ color: palette.text }}
          >
            {label}
          </span>
        </>
      )}
    </button>
  );
}

const pillPalette: Record<
  PillVariant,
  { bg: string; text: string; border: string }
> = {
  primary: { bg: colors.black, text: '#FFFFFF', border: colors.black },
  secondary: { bg: colors.pillGray, text: colors.text, border: colors.pillGray },
  brand: { bg: colors.action, text: '#FFFFFF', border: colors.action },
  outline: { bg: 'transparent', text: colors.action, border: colors.action },
  white: { bg: '#FFFFFF', text: colors.text, border: '#FFFFFF' },
  danger: { bg: colors.dangerSoft, text: colors.danger, border: colors.dangerSoft },
};

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  size = 40,
  filled,
  color,
  testID,
}: {
  name: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
  filled?: boolean;
  color?: string;
  testID?: string;
}) {
  return (
    <button
      type="button"
      aria-label={accessibilityLabel}
      onClick={onPress}
      data-testid={testID}
      className={`${styles.iconButton} cursor-pointer active:opacity-80`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: filled ? colors.black : colors.pillGray,
      }}
    >
      <Icon
        name={name}
        size={size * 0.5}
        color={color ?? (filled ? '#FFFFFF' : colors.text)}
      />
    </button>
  );
}

export function ListRow({
  title,
  subtitle,
  left,
  right,
  onPress,
  chevron,
  testID,
}: {
  title: string;
  subtitle?: string | null;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  testID?: string;
}) {
  const content = (
    <>
      {left}
      <div className="min-w-0 flex-1">
        <p className={twMerge(styles.listTitle, 'truncate')}>{title}</p>
        {subtitle ? (
          <p className={twMerge(styles.listSubtitle, 'line-clamp-2')}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {right}
      {chevron ? (
        <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
      ) : null}
    </>
  );
  if (!onPress) {
    return (
      <div data-testid={testID} className={styles.listRow}>
        {content}
      </div>
    );
  }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => {
        // Like nested RN Pressables: a tap on an inner control shouldn't also
        // trigger the row.
        const inner = (event.target as HTMLElement).closest(
          'button, a, input, [role="button"]',
        );
        if (inner && inner !== event.currentTarget) return;
        onPress();
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPress();
        }
      }}
      data-testid={testID}
      className={`${styles.listRow} w-full cursor-pointer text-left active:opacity-80`}
    >
      {content}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'style' | 'type'
> & {
  onChangeText?: (text: string) => void;
  onSubmitEditing?: () => void;
  testID?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'decimal-pad';
  editable?: boolean;
  style?: CSSProperties;
  inputClassName?: string;
};

function inputAttributes({
  onChangeText,
  onSubmitEditing,
  testID,
  secureTextEntry,
  keyboardType,
  editable,
  inputClassName: _inputClassName,
  style: _style,
  onKeyDown,
  ...rest
}: TextInputProps) {
  void _inputClassName;
  void _style;
  const type = secureTextEntry
    ? 'password'
    : keyboardType === 'email-address'
      ? 'email'
      : 'text';
  const inputMode =
    keyboardType === 'number-pad'
      ? ('numeric' as const)
      : keyboardType === 'decimal-pad'
        ? ('decimal' as const)
        : keyboardType === 'email-address'
          ? ('email' as const)
          : undefined;
  return {
    ...rest,
    type,
    inputMode,
    readOnly: editable === false ? true : rest.readOnly,
    'data-testid': testID,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      onChangeText?.(event.target.value),
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event);
      if (event.key === 'Enter' && onSubmitEditing) {
        event.preventDefault();
        onSubmitEditing();
      }
    },
  };
}

export function Field({
  label,
  error,
  style,
  ...rest
}: { label?: string; error?: string | null } & TextInputProps) {
  return (
    <div style={style}>
      {label ? <p className={styles.fieldLabel}>{label}</p> : null}
      <input
        className={twMerge(styles.field, rest.inputClassName)}
        style={error ? { borderColor: colors.danger } : undefined}
        aria-label={label ?? rest.placeholder}
        {...inputAttributes(rest)}
      />
      {error ? <p className={styles.fieldError}>{error}</p> : null}
    </div>
  );
}

export function SearchField(props: TextInputProps) {
  return (
    <div className={styles.search}>
      <Icon name="search" size={18} color={colors.textSecondary} />
      <input
        className={styles.searchInput}
        autoCapitalize="none"
        autoCorrect="off"
        aria-label={props.placeholder ?? 'Search'}
        {...inputAttributes(props)}
      />
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.segmented} role="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            type="button"
            key={option.value}
            role="tab"
            aria-selected={active}
            aria-label={option.label}
            onClick={() => onChange(option.value)}
            className={twMerge(styles.segment, active && styles.segmentActive)}
          >
            <span
              className={styles.segmentLabel}
              style={active ? { color: '#FFFFFF' } : undefined}
            >
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export function Spinner({
  color = colors.action,
  size = 20,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <span
      role="progressbar"
      aria-label="Loading"
      className="inline-block animate-spin rounded-full border-2"
      style={{
        width: size,
        height: size,
        borderColor: color,
        borderTopColor: 'transparent',
      }}
    />
  );
}

export function Loading() {
  return (
    <div className={styles.center}>
      <Spinner />
    </div>
  );
}

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  body,
  action,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <Icon name={icon} size={26} color={colors.action} />
      </div>
      <p className={styles.emptyTitle}>{title}</p>
      {body ? <p className={styles.emptyBody}>{body}</p> : null}
      {action}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className={styles.fieldError} role="alert">
      {children}
    </p>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  testID?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={!!selected}
      aria-label={label}
      onClick={onPress}
      data-testid={testID}
      className={styles.chip}
      style={
        selected
          ? { backgroundColor: color ?? colors.black, borderColor: color ?? colors.black }
          : undefined
      }
    >
      <span
        className={styles.chipLabel}
        style={selected ? { color: '#FFFFFF' } : undefined}
      >
        {label}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  screen: 'flex min-h-0 flex-1 flex-col bg-canvas',
  column: 'mx-auto w-full max-w-lg',
  padded: 'px-4 pt-2',
  footer: 'px-4 pt-3 bg-canvas',
  header: 'bg-canvas pb-2 px-4',
  headerRow: 'flex flex-row items-center min-h-11',
  headerSide: 'flex w-14 flex-col justify-center',
  headerTitle: 'flex-1 truncate text-center text-base font-semibold text-ink',
  title: 'text-3xl font-bold tracking-tight text-ink leading-tight',
  subtitle: 'text-base text-ink-secondary mt-2 leading-snug',
  sectionLabel:
    'text-sm font-semibold text-ink-secondary uppercase tracking-wider mt-6 mb-2 ml-1',
  body: 'text-base text-ink leading-snug',
  card: 'bg-card rounded-3xl p-4',
  row: 'flex flex-row items-center',
  divider: 'h-px bg-divider my-1',
  pill: 'flex h-12 flex-row items-center justify-center rounded-full border px-5',
  pillCompact: 'h-10 px-4',
  pillLabel: 'text-base font-semibold',
  pillLabelCompact: 'text-sm',
  iconButton: 'flex shrink-0 items-center justify-center',
  listRow: 'flex flex-row items-center gap-3 py-3',
  listTitle: 'text-base font-semibold text-ink',
  listSubtitle: 'text-sm text-ink-secondary mt-0.5',
  fieldLabel: 'text-sm font-semibold text-ink-secondary mb-1.5 ml-0.5',
  field:
    'h-12 w-full rounded-xl border border-field-border bg-card px-3.5 text-base text-ink outline-none placeholder:text-ink-tertiary',
  fieldError: 'text-danger text-sm mt-1.5 ml-0.5',
  search: 'flex h-11 flex-row items-center gap-2 rounded-3xl bg-card px-3.5',
  searchInput:
    'h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-tertiary',
  segmented: 'flex flex-row gap-1 rounded-full bg-pill-gray p-1',
  segment:
    'flex h-9 flex-1 cursor-pointer items-center justify-center rounded-full',
  segmentActive: 'bg-black',
  segmentLabel: 'text-sm font-semibold text-ink',
  center: 'flex flex-1 items-center justify-center p-10',
  empty: 'flex flex-col items-center py-10 px-6',
  emptyIcon:
    'mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-sky-soft',
  emptyTitle: 'text-base font-semibold text-ink',
  emptyBody: 'text-sm text-ink-secondary text-center mt-1.5 mb-3 leading-snug',
  chip: 'flex h-9 cursor-pointer items-center justify-center rounded-full border border-divider bg-card px-3.5',
  chipLabel: 'text-sm font-semibold text-ink',
} as const;
