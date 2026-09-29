import { localBackend, LOCAL_URL } from './backend/client';

import type {
  AuthUser,
  Card,
  FundingSource,
  Merchant,
  PaymentRequest,
  Person,
  Privacy,
  Profile,
  QrResolution,
  Split,
  Transaction,
} from './types';

export const API_URL = LOCAL_URL;
export const resetDemo = () => localBackend.reset();
const APP = `${API_URL}/v1/apps/finance`;
const AUTH = `${API_URL}/v1/auth`;

let token: string | null = null;

export function setToken(next: string | null) {
  token = next;
}

export function getToken() {
  return token;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(
  url: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<{ data: T; response: Response }> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.json !== undefined) headers['Content-Type'] = 'application/json';

  const response = await localBackend.fetch(url, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = data?.error ?? data;
    throw new ApiError(
      error?.code ?? 'REQUEST_FAILED',
      error?.message ?? `Request failed (${response.status})`,
      response.status,
    );
  }

  return { data: data as T, response };
}

async function app<T>(path: string, init?: RequestInit & { json?: unknown }) {
  const { data } = await request<T>(`${APP}${path}`, init);
  return data;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

interface AuthResponse {
  token: string | null;
  user: AuthUser;
}

async function authCall(path: string, json: unknown): Promise<AuthResponse> {
  const { data, response } = await request<AuthResponse>(`${AUTH}${path}`, {
    method: 'POST',
    json,
  });
  const headerToken = response.headers.get('set-auth-token');
  return { ...data, token: headerToken ?? data.token ?? null };
}

export const auth = {
  signUp: (input: { email: string; password: string; name: string }) =>
    authCall('/sign-up/email', input),
  signIn: (input: { email: string; password: string }) =>
    authCall('/sign-in/email', input),
  signOut: () => request(`${AUTH}/sign-out`, { method: 'POST', json: {} }),
};

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

export const api = {
  me: () => app<{ user: AuthUser; profile: Profile | null }>('/me'),
  handleAvailable: (handle: string) =>
    app<{ handle: string; available: boolean; reason: string | null }>(
      `/handles/${encodeURIComponent(handle)}/available`,
    ),
  createProfile: (input: { handle: string; displayName: string }) =>
    app<{ profile: Profile }>('/profile', { method: 'POST', json: input }),
  updateProfile: (input: {
    displayName?: string;
    bio?: string;
    avatarColor?: string;
  }) => app<{ profile: Profile }>('/profile', { method: 'PATCH', json: input }),
  verifyIdentity: (input: {
    legalName: string;
    dateOfBirth: string;
    ssnLast4: string;
    address: string;
  }) =>
    app<{ profile: Profile }>('/identity/verify', {
      method: 'POST',
      json: input,
    }),

  people: (q: string) =>
    app<{ people: Person[] }>(`/people?q=${encodeURIComponent(q)}`),
  person: (handle: string) =>
    app<{ person: Person; transactions: Transaction[] }>(
      `/people/${encodeURIComponent(handle)}`,
    ),
  friends: () => app<{ friends: Person[]; suggestions: Person[] }>('/friends'),
  addFriend: (userId: string) =>
    app<{ person: Person }>(`/friends/${userId}`, { method: 'POST' }),
  removeFriend: (userId: string) =>
    app<{ removed: boolean }>(`/friends/${userId}`, { method: 'DELETE' }),

  feed: (scope: 'friends' | 'public' | 'mine') =>
    app<{ transactions: Transaction[] }>(`/feed?scope=${scope}`),
  transaction: (id: string) =>
    app<{ transaction: Transaction }>(`/transactions/${id}`),

  pay: (input: {
    toUserId: string;
    amountCents: number;
    note: string;
    emoji?: string | null;
    privacy: Privacy;
    fundingSourceId?: string | null;
  }) =>
    app<{ transaction: Transaction; profile: Profile }>('/payments', {
      method: 'POST',
      json: input,
    }),
  requestMoney: (input: {
    fromUserId: string;
    amountCents: number;
    note: string;
    emoji?: string | null;
    privacy: Privacy;
  }) =>
    app<{ request: PaymentRequest }>('/requests', {
      method: 'POST',
      json: input,
    }),
  requests: () =>
    app<{ incoming: PaymentRequest[]; outgoing: PaymentRequest[] }>(
      '/requests',
    ),
  payRequest: (id: string, fundingSourceId?: string | null) =>
    app<{ request: PaymentRequest; transaction: Transaction }>(
      `/requests/${id}/pay`,
      { method: 'POST', json: { fundingSourceId } },
    ),
  declineRequest: (id: string) =>
    app<{ request: PaymentRequest }>(`/requests/${id}/decline`, {
      method: 'POST',
    }),
  cancelRequest: (id: string) =>
    app<{ request: PaymentRequest }>(`/requests/${id}/cancel`, {
      method: 'POST',
    }),

  createSplit: (input: {
    totalCents: number;
    note: string;
    emoji?: string | null;
    participantUserIds: string[];
    includeSelf: boolean;
    shares?: { userId: string; amountCents: number }[];
    privacy: Privacy;
  }) =>
    app<{ split: Split; requests: PaymentRequest[] }>('/splits', {
      method: 'POST',
      json: input,
    }),
  split: (id: string) =>
    app<{ split: Split; requests: PaymentRequest[] }>(`/splits/${id}`),

  myQr: () => app<{ code: string; handle: string }>('/qr/mine'),
  qrToken: (input: {
    mode: 'pay' | 'request';
    amountCents?: number | null;
    note?: string;
  }) =>
    app<{ code: string; token: string }>('/qr/tokens', {
      method: 'POST',
      json: input,
    }),
  resolveQr: (code: string) =>
    app<QrResolution>(`/qr/resolve?code=${encodeURIComponent(code)}`),

  fundingSources: () =>
    app<{ fundingSources: FundingSource[] }>('/funding-sources'),
  addFundingSource: (input: {
    type: 'bank' | 'debit_card';
    institution: string;
    last4: string;
    label?: string;
  }) =>
    app<{ fundingSource: FundingSource }>('/funding-sources', {
      method: 'POST',
      json: input,
    }),
  removeFundingSource: (id: string) =>
    app<{ removed: boolean }>(`/funding-sources/${id}`, { method: 'DELETE' }),
  setDefaultFundingSource: (id: string) =>
    app<{ updated: boolean }>(`/funding-sources/${id}/default`, {
      method: 'POST',
    }),
  addMoney: (input: { amountCents: number; fundingSourceId: string }) =>
    app<{ transaction: Transaction; profile: Profile }>('/balance/add', {
      method: 'POST',
      json: input,
    }),
  transferOut: (input: {
    amountCents: number;
    fundingSourceId: string;
    speed: 'instant' | 'standard';
  }) =>
    app<{ transaction: Transaction; profile: Profile }>('/balance/transfer', {
      method: 'POST',
      json: input,
    }),

  merchants: () => app<{ merchants: Merchant[] }>('/merchants'),
  merchant: (id: string) => app<{ merchant: Merchant }>(`/merchants/${id}`),
  payMerchant: (
    id: string,
    input: {
      amountCents: number;
      channel: 'in_store' | 'online';
      fundingSourceId?: string | null;
      note?: string;
    },
  ) =>
    app<{ transaction: Transaction; profile: Profile }>(
      `/merchants/${id}/pay`,
      { method: 'POST', json: input },
    ),

  cards: () => app<{ cards: Card[] }>('/cards'),
  issueCard: (input: { type: 'debit' | 'credit'; design?: string }) =>
    app<{ card: Card }>('/cards', { method: 'POST', json: input }),
  updateCard: (
    id: string,
    input: {
      status?: 'active' | 'locked';
      spendLimitCents?: number;
      design?: string;
      physicalStatus?: 'ordered' | 'activated';
    },
  ) => app<{ card: Card }>(`/cards/${id}`, { method: 'PATCH', json: input }),
  cardTransactions: (id: string) =>
    app<{ transactions: Transaction[] }>(`/cards/${id}/transactions`),
};
