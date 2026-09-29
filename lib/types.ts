export type Privacy = 'public' | 'friends' | 'private';

export interface Party {
  userId: string;
  handle: string;
  displayName: string;
  avatarColor: string;
}

export interface Person extends Party {
  bio: string | null;
  isDemo: boolean;
  isFriend?: boolean;
}

export interface Profile extends Person {
  verificationStatus: 'unverified' | 'pending' | 'verified';
  balanceCents: number;
  createdAt: string;
  identity: {
    legalName: string;
    dateOfBirth: string | null;
    ssnLast4: string | null;
    address: string | null;
  } | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface Merchant {
  id: string;
  name: string;
  category: string;
  color: string;
  emoji: string;
  qrCode: string;
  tagline: string;
}

export interface Transaction {
  id: string;
  kind: 'payment' | 'add_money' | 'transfer_out' | 'merchant' | 'card_purchase';
  from: Party | null;
  to: Party | null;
  merchant: {
    id: string;
    name: string;
    color: string;
    emoji: string;
    category: string;
  } | null;
  amountCents: number;
  feeCents: number;
  note: string;
  emoji: string | null;
  privacy: Privacy;
  status: 'completed' | 'pending' | 'failed';
  fundingLabel: string | null;
  speed: 'instant' | 'standard' | null;
  splitId: string | null;
  requestId: string | null;
  channel: string | null;
  createdAt: string;
}

export interface PaymentRequest {
  id: string;
  requester: Party;
  payer: Party;
  amountCents: number;
  note: string;
  emoji: string | null;
  privacy: Privacy;
  splitId: string | null;
  status: 'pending' | 'paid' | 'declined' | 'cancelled';
  transactionId: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface Split {
  id: string;
  creatorId: string;
  totalCents: number;
  note: string;
  emoji: string | null;
  participantCount: number;
  createdAt: string;
}

export interface FundingSource {
  id: string;
  type: 'bank' | 'debit_card';
  label: string;
  institution: string;
  last4: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Card {
  id: string;
  type: 'debit' | 'credit';
  last4: string;
  expMonth: number;
  expYear: number;
  design: string;
  status: 'active' | 'locked';
  spendLimitCents: number | null;
  creditLimitCents: number | null;
  physicalStatus: 'not_ordered' | 'ordered' | 'shipped' | 'activated';
  createdAt: string;
}

export type QrResolution =
  | { type: 'merchant'; merchant: Merchant }
  | {
      type: 'person';
      person: Person;
      mode: 'pay' | 'request';
      amountCents: number | null;
      note: string | null;
    };
