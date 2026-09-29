export interface ProfileRow {
  user_id: string;
  handle: string;
  display_name: string;
  avatar_color: string;
  bio: string | null;
  verification_status: 'unverified' | 'pending' | 'verified';
  legal_name: string | null;
  date_of_birth: string | null;
  ssn_last4: string | null;
  address: string | null;
  balance_cents: number;
  is_demo: number;
  created_at: string;
}

export interface PersonSummary {
  userId: string;
  handle: string;
  displayName: string;
  avatarColor: string;
  bio: string | null;
  isDemo: boolean;
  isFriend?: boolean;
  friendCount?: number;
}

export function toPerson(row: ProfileRow): PersonSummary {
  return {
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    avatarColor: row.avatar_color,
    bio: row.bio,
    isDemo: row.is_demo === 1,
  };
}

export function toProfile(row: ProfileRow) {
  return {
    ...toPerson(row),
    verificationStatus: row.verification_status,
    balanceCents: row.balance_cents,
    createdAt: row.created_at,
    identity: row.legal_name
      ? {
          legalName: row.legal_name,
          dateOfBirth: row.date_of_birth,
          ssnLast4: row.ssn_last4,
          address: row.address,
        }
      : null,
  };
}

export interface FundingSourceRow {
  id: string;
  user_id: string;
  type: 'bank' | 'debit_card';
  label: string;
  institution: string;
  last4: string;
  is_default: number;
  created_at: string;
}

export function toFundingSource(row: FundingSourceRow) {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    institution: row.institution,
    last4: row.last4,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
  };
}

export interface MerchantRow {
  id: string;
  name: string;
  category: string;
  color: string;
  emoji: string;
  qr_code: string;
  tagline: string;
}

export function toMerchant(row: MerchantRow) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    color: row.color,
    emoji: row.emoji,
    qrCode: row.qr_code,
    tagline: row.tagline,
  };
}

export interface TransactionRow {
  id: string;
  kind: 'payment' | 'add_money' | 'transfer_out' | 'merchant' | 'card_purchase';
  from_user_id: string | null;
  to_user_id: string | null;
  merchant_id: string | null;
  amount_cents: number;
  fee_cents: number;
  note: string;
  emoji: string | null;
  privacy: 'public' | 'friends' | 'private';
  status: 'completed' | 'pending' | 'failed';
  funding_source_id: string | null;
  funding_label: string | null;
  speed: 'instant' | 'standard' | null;
  split_id: string | null;
  request_id: string | null;
  channel: string | null;
  created_at: string;
  from_handle: string | null;
  from_name: string | null;
  from_color: string | null;
  to_handle: string | null;
  to_name: string | null;
  to_color: string | null;
  merchant_name: string | null;
  merchant_color: string | null;
  merchant_emoji: string | null;
  merchant_category: string | null;
}

export const TRANSACTION_SELECT = `
  SELECT t.*,
    pf.handle AS from_handle, pf.display_name AS from_name, pf.avatar_color AS from_color,
    pt.handle AS to_handle, pt.display_name AS to_name, pt.avatar_color AS to_color,
    m.name AS merchant_name, m.color AS merchant_color, m.emoji AS merchant_emoji,
    m.category AS merchant_category
  FROM finance_transaction t
  LEFT JOIN finance_profile pf ON pf.user_id = t.from_user_id
  LEFT JOIN finance_profile pt ON pt.user_id = t.to_user_id
  LEFT JOIN finance_merchant m ON m.id = t.merchant_id
`;

function party(
  userId: string | null,
  handle: string | null,
  name: string | null,
  color: string | null,
) {
  if (!userId || !handle || !name || !color) {
    return null;
  }

  return { userId, handle, displayName: name, avatarColor: color };
}

export function toTransaction(row: TransactionRow) {
  return {
    id: row.id,
    kind: row.kind,
    from: party(
      row.from_user_id,
      row.from_handle,
      row.from_name,
      row.from_color,
    ),
    to: party(row.to_user_id, row.to_handle, row.to_name, row.to_color),
    merchant: row.merchant_id
      ? {
          id: row.merchant_id,
          name: row.merchant_name ?? 'Merchant',
          color: row.merchant_color ?? '#525252',
          emoji: row.merchant_emoji ?? '🏪',
          category: row.merchant_category ?? '',
        }
      : null,
    amountCents: row.amount_cents,
    feeCents: row.fee_cents,
    note: row.note,
    emoji: row.emoji,
    privacy: row.privacy,
    status: row.status,
    fundingLabel: row.funding_label,
    speed: row.speed,
    splitId: row.split_id,
    requestId: row.request_id,
    channel: row.channel,
    createdAt: row.created_at,
  };
}

export interface RequestRow {
  id: string;
  requester_id: string;
  payer_id: string;
  amount_cents: number;
  note: string;
  emoji: string | null;
  privacy: 'public' | 'friends' | 'private';
  split_id: string | null;
  status: 'pending' | 'paid' | 'declined' | 'cancelled';
  transaction_id: string | null;
  created_at: string;
  resolved_at: string | null;
  requester_handle: string;
  requester_name: string;
  requester_color: string;
  payer_handle: string;
  payer_name: string;
  payer_color: string;
}

export const REQUEST_SELECT = `
  SELECT r.*,
    pr.handle AS requester_handle, pr.display_name AS requester_name,
    pr.avatar_color AS requester_color,
    pp.handle AS payer_handle, pp.display_name AS payer_name,
    pp.avatar_color AS payer_color
  FROM finance_request r
  JOIN finance_profile pr ON pr.user_id = r.requester_id
  JOIN finance_profile pp ON pp.user_id = r.payer_id
`;

export function toRequest(row: RequestRow) {
  return {
    id: row.id,
    requester: {
      userId: row.requester_id,
      handle: row.requester_handle,
      displayName: row.requester_name,
      avatarColor: row.requester_color,
    },
    payer: {
      userId: row.payer_id,
      handle: row.payer_handle,
      displayName: row.payer_name,
      avatarColor: row.payer_color,
    },
    amountCents: row.amount_cents,
    note: row.note,
    emoji: row.emoji,
    privacy: row.privacy,
    splitId: row.split_id,
    status: row.status,
    transactionId: row.transaction_id,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

export interface CardRow {
  id: string;
  user_id: string;
  type: 'debit' | 'credit';
  last4: string;
  exp_month: number;
  exp_year: number;
  design: string;
  status: 'active' | 'locked';
  spend_limit_cents: number | null;
  credit_limit_cents: number | null;
  physical_status: 'not_ordered' | 'ordered' | 'shipped' | 'activated';
  created_at: string;
}

export function toCard(row: CardRow) {
  return {
    id: row.id,
    type: row.type,
    last4: row.last4,
    expMonth: row.exp_month,
    expYear: row.exp_year,
    design: row.design,
    status: row.status,
    spendLimitCents: row.spend_limit_cents,
    creditLimitCents: row.credit_limit_cents,
    physicalStatus: row.physical_status,
    createdAt: row.created_at,
  };
}

export interface SplitRow {
  id: string;
  creator_id: string;
  total_cents: number;
  note: string;
  emoji: string | null;
  participant_count: number;
  created_at: string;
}

export function toSplit(row: SplitRow) {
  return {
    id: row.id,
    creatorId: row.creator_id,
    totalCents: row.total_cents,
    note: row.note,
    emoji: row.emoji,
    participantCount: row.participant_count,
    createdAt: row.created_at,
  };
}
