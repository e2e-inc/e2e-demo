import type { Database } from '../../local/database';
import { Hono } from 'hono';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import type { WorkerContext } from '../../env';
import { requireAccount } from '../../middleware/auth';
import { requireMembership } from '../../middleware/membership';
import {
  type CardRow,
  type FundingSourceRow,
  type MerchantRow,
  type ProfileRow,
  REQUEST_SELECT,
  type RequestRow,
  type SplitRow,
  TRANSACTION_SELECT,
  type TransactionRow,
  toCard,
  toFundingSource,
  toMerchant,
  toPerson,
  toProfile,
  toRequest,
  toSplit,
  toTransaction,
} from './db';
import {
  DEFAULT_CREDIT_LIMIT_CENTS,
  WELCOME_BONUS_CENTS,
  coverDebit,
  generateLast4,
  isValidAmount,
  isValidHandle,
  normalizeHandle,
  splitEvenly,
  sharesSumTo,
  transferFee,
  type TransferSpeed,
} from './ledger';

type FinanceContext = Context<WorkerContext>;

const AVATAR_COLORS = [
  '#9969FA',
  '#FB5E1B',
  '#42E69F',
  '#4BB4FF',
  '#E074FF',
  '#FCBA1E',
  '#3F34EE',
  '#D52B9C',
];

const PRIVACY = new Set(['public', 'friends', 'private']);

function fail(
  context: FinanceContext,
  status: ContentfulStatusCode,
  code: string,
  message: string,
) {
  return context.json({ error: { code, message } }, status);
}

function userId(context: FinanceContext) {
  const session = context.get('session');

  if (!session) {
    throw new Error('Session missing after auth middleware');
  }

  return session.user.id;
}

async function readBody(context: FinanceContext) {
  try {
    return (await context.req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function privacyOf(value: unknown) {
  return typeof value === 'string' && PRIVACY.has(value)
    ? (value as 'public' | 'friends' | 'private')
    : 'friends';
}

async function loadProfile(db: Database, id: string) {
  return db
    .prepare(`SELECT * FROM finance_profile WHERE user_id = ?`)
    .bind(id)
    .first<ProfileRow>();
}

async function loadFundingSource(db: Database, id: string, owner: string) {
  return db
    .prepare(
      `SELECT * FROM finance_funding_source WHERE id = ? AND user_id = ?`,
    )
    .bind(id, owner)
    .first<FundingSourceRow>();
}

async function loadTransaction(db: Database, id: string) {
  const row = await db
    .prepare(`${TRANSACTION_SELECT} WHERE t.id = ?`)
    .bind(id)
    .first<TransactionRow>();

  return row ? toTransaction(row) : null;
}

async function friendIds(db: Database, me: string) {
  const rows = await db
    .prepare(`SELECT friend_user_id FROM finance_friendship WHERE user_id = ?`)
    .bind(me)
    .all<{ friend_user_id: string }>();

  return new Set(rows.results.map((row) => row.friend_user_id));
}

function newId() {
  return crypto.randomUUID();
}

export const financeRoutes = new Hono<WorkerContext>();

financeRoutes.get('/', (context) =>
  context.json({ app: 'finance', authPath: '/v1/auth', status: 'ok' }),
);

// ---------------------------------------------------------------------------
// Profile & onboarding
// ---------------------------------------------------------------------------

financeRoutes.get('/me', requireAccount, async (context) => {
  const session = context.get('session');
  const me = userId(context);
  const row = await loadProfile(context.env.DB, me);

  return context.json({
    user: session?.user,
    profile: row ? toProfile(row) : null,
  });
});

financeRoutes.get(
  '/handles/:handle/available',
  requireAccount,
  async (context) => {
    const handle = normalizeHandle(context.req.param('handle'));
    if (!isValidHandle(handle)) {
      return context.json({ handle, available: false, reason: 'invalid' });
    }

    const existing = await context.env.DB.prepare(
      `SELECT user_id FROM finance_profile WHERE handle = ?`,
    )
      .bind(handle)
      .first();

    return context.json({
      handle,
      available: !existing,
      reason: existing ? 'taken' : null,
    });
  },
);

financeRoutes.post('/profile', requireAccount, async (context) => {
  const me = userId(context);
  const db = context.env.DB;
  const body = await readBody(context);
  const handle = normalizeHandle(str(body.handle));
  const displayName =
    str(body.displayName) || context.get('session')?.user.name;

  if (!isValidHandle(handle)) {
    return fail(
      context,
      400,
      'INVALID_HANDLE',
      'Handles are 3-30 characters: lowercase letters, numbers, and dashes.',
    );
  }

  if (!displayName) {
    return fail(context, 400, 'INVALID_NAME', 'Add a display name.');
  }

  const existing = await loadProfile(db, me);
  if (existing) {
    return context.json({ profile: toProfile(existing) });
  }

  const taken = await db
    .prepare(`SELECT user_id FROM finance_profile WHERE handle = ?`)
    .bind(handle)
    .first();
  if (taken) {
    return fail(context, 409, 'HANDLE_TAKEN', 'That handle is already taken.');
  }

  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const bonusId = newId();
  const requestOne = newId();
  const requestTwo = newId();

  await db.batch([
    db
      .prepare(
        `INSERT INTO app_membership (app_id, user_id, role)
         VALUES ('finance', ?, 'member')
         ON CONFLICT (app_id, user_id) DO NOTHING`,
      )
      .bind(me),
    db
      .prepare(
        `INSERT INTO finance_profile
           (user_id, handle, display_name, avatar_color, balance_cents)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(me, handle, displayName, color, WELCOME_BONUS_CENTS),
    db
      .prepare(
        `INSERT INTO finance_transaction
           (id, kind, to_user_id, amount_cents, note, emoji, privacy, funding_label)
         VALUES (?, 'add_money', ?, ?, 'Welcome bonus', '🎉', 'private', 'TesterPay')`,
      )
      .bind(bonusId, me, WELCOME_BONUS_CENTS),
    // A couple of starter requests so the inbox has something to act on.
    db
      .prepare(
        `INSERT INTO finance_request
           (id, requester_id, payer_id, amount_cents, note, emoji, privacy)
         VALUES (?, 'demo_ava', ?, 1250, 'Dinner last week', '🍝', 'friends')`,
      )
      .bind(requestOne, me),
    db
      .prepare(
        `INSERT INTO finance_request
           (id, requester_id, payer_id, amount_cents, note, emoji, privacy)
         VALUES (?, 'demo_marcus', ?, 600, 'Movie snacks', '🍿', 'friends')`,
      )
      .bind(requestTwo, me),
  ]);

  const created = await loadProfile(db, me);
  if (!created) {
    throw new Error('Profile missing after creation');
  }

  return context.json({ profile: toProfile(created) }, 201);
});

const member = requireMembership('finance');

financeRoutes.patch('/profile', member, async (context) => {
  const me = userId(context);
  const body = await readBody(context);
  const current = await loadProfile(context.env.DB, me);
  if (!current) {
    return fail(context, 404, 'PROFILE_MISSING', 'Finish onboarding first.');
  }

  const displayName = str(body.displayName) || current.display_name;
  const bio = typeof body.bio === 'string' ? body.bio.trim() : current.bio;
  const avatarColor = str(body.avatarColor) || current.avatar_color;

  await context.env.DB.prepare(
    `UPDATE finance_profile
     SET display_name = ?, bio = ?, avatar_color = ?
     WHERE user_id = ?`,
  )
    .bind(displayName, bio, avatarColor, me)
    .run();

  const updated = await loadProfile(context.env.DB, me);
  return context.json({ profile: updated ? toProfile(updated) : null });
});

financeRoutes.post('/identity/verify', member, async (context) => {
  const me = userId(context);
  const body = await readBody(context);
  const legalName = str(body.legalName);
  const dateOfBirth = str(body.dateOfBirth);
  const ssnLast4 = str(body.ssnLast4);
  const address = str(body.address);

  if (legalName.length < 2) {
    return fail(context, 400, 'INVALID_NAME', 'Enter your full legal name.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return fail(context, 400, 'INVALID_DOB', 'Use the format YYYY-MM-DD.');
  }
  if (!/^\d{4}$/.test(ssnLast4)) {
    return fail(context, 400, 'INVALID_SSN', 'Enter the last 4 digits.');
  }
  if (address.length < 5) {
    return fail(context, 400, 'INVALID_ADDRESS', 'Enter your street address.');
  }

  await context.env.DB.prepare(
    `UPDATE finance_profile
     SET verification_status = 'verified', legal_name = ?, date_of_birth = ?,
         ssn_last4 = ?, address = ?
     WHERE user_id = ?`,
  )
    .bind(legalName, dateOfBirth, ssnLast4, address, me)
    .run();

  const updated = await loadProfile(context.env.DB, me);
  return context.json({ profile: updated ? toProfile(updated) : null });
});

// ---------------------------------------------------------------------------
// People & friends
// ---------------------------------------------------------------------------

financeRoutes.get('/people', member, async (context) => {
  const me = userId(context);
  const query = normalizeHandle(context.req.query('q') ?? '');
  const friends = await friendIds(context.env.DB, me);
  const like = `%${query}%`;

  const rows = await context.env.DB.prepare(
    `SELECT * FROM finance_profile
     WHERE user_id != ?
       AND (? = '' OR handle LIKE ? OR lower(display_name) LIKE ?)
     ORDER BY is_demo DESC, display_name ASC
     LIMIT 40`,
  )
    .bind(me, query, like, like)
    .all<ProfileRow>();

  return context.json({
    people: rows.results.map((row) => ({
      ...toPerson(row),
      isFriend: friends.has(row.user_id),
    })),
  });
});

financeRoutes.get('/people/:handle', member, async (context) => {
  const me = userId(context);
  const handle = normalizeHandle(context.req.param('handle'));
  const row = await context.env.DB.prepare(
    `SELECT * FROM finance_profile WHERE handle = ?`,
  )
    .bind(handle)
    .first<ProfileRow>();

  if (!row) {
    return fail(context, 404, 'PERSON_NOT_FOUND', 'No one has that handle.');
  }

  const friends = await friendIds(context.env.DB, me);
  const shared = await context.env.DB.prepare(
    `${TRANSACTION_SELECT}
     WHERE t.kind = 'payment'
       AND ((t.from_user_id = ? AND t.to_user_id = ?)
         OR (t.from_user_id = ? AND t.to_user_id = ?))
     ORDER BY t.created_at DESC LIMIT 20`,
  )
    .bind(me, row.user_id, row.user_id, me)
    .all<TransactionRow>();

  return context.json({
    person: { ...toPerson(row), isFriend: friends.has(row.user_id) },
    transactions: shared.results.map(toTransaction),
  });
});

financeRoutes.get('/friends', member, async (context) => {
  const me = userId(context);
  const rows = await context.env.DB.prepare(
    `SELECT p.* FROM finance_friendship f
     JOIN finance_profile p ON p.user_id = f.friend_user_id
     WHERE f.user_id = ?
     ORDER BY p.display_name ASC`,
  )
    .bind(me)
    .all<ProfileRow>();

  const suggestions = await context.env.DB.prepare(
    `SELECT * FROM finance_profile
     WHERE user_id != ?
       AND user_id NOT IN (
         SELECT friend_user_id FROM finance_friendship WHERE user_id = ?
       )
     ORDER BY is_demo DESC, display_name ASC LIMIT 6`,
  )
    .bind(me, me)
    .all<ProfileRow>();

  return context.json({
    friends: rows.results.map((row) => ({ ...toPerson(row), isFriend: true })),
    suggestions: suggestions.results.map((row) => ({
      ...toPerson(row),
      isFriend: false,
    })),
  });
});

financeRoutes.post('/friends/:userId', member, async (context) => {
  const me = userId(context);
  const other = context.req.param('userId');

  if (other === me) {
    return fail(context, 400, 'SELF_FRIEND', "You can't add yourself.");
  }

  const exists = await loadProfile(context.env.DB, other);
  if (!exists) {
    return fail(
      context,
      404,
      'PERSON_NOT_FOUND',
      'That person does not exist.',
    );
  }

  await context.env.DB.batch([
    context.env.DB.prepare(
      `INSERT INTO finance_friendship (user_id, friend_user_id) VALUES (?, ?)
       ON CONFLICT DO NOTHING`,
    ).bind(me, other),
    context.env.DB.prepare(
      `INSERT INTO finance_friendship (user_id, friend_user_id) VALUES (?, ?)
       ON CONFLICT DO NOTHING`,
    ).bind(other, me),
  ]);

  return context.json({ person: { ...toPerson(exists), isFriend: true } }, 201);
});

financeRoutes.delete('/friends/:userId', member, async (context) => {
  const me = userId(context);
  const other = context.req.param('userId');

  await context.env.DB.batch([
    context.env.DB.prepare(
      `DELETE FROM finance_friendship WHERE user_id = ? AND friend_user_id = ?`,
    ).bind(me, other),
    context.env.DB.prepare(
      `DELETE FROM finance_friendship WHERE user_id = ? AND friend_user_id = ?`,
    ).bind(other, me),
  ]);

  return context.json({ removed: true });
});

// ---------------------------------------------------------------------------
// Feed & transactions
// ---------------------------------------------------------------------------

financeRoutes.get('/feed', member, async (context) => {
  const me = userId(context);
  const scope = context.req.query('scope') ?? 'friends';
  const db = context.env.DB;
  let rows: { results: TransactionRow[] };

  if (scope === 'mine') {
    rows = await db
      .prepare(
        `${TRANSACTION_SELECT}
         WHERE t.from_user_id = ? OR t.to_user_id = ?
         ORDER BY t.created_at DESC LIMIT 100`,
      )
      .bind(me, me)
      .all<TransactionRow>();
  } else if (scope === 'public') {
    rows = await db
      .prepare(
        `${TRANSACTION_SELECT}
         WHERE t.kind = 'payment' AND t.privacy = 'public'
         ORDER BY t.created_at DESC LIMIT 100`,
      )
      .all<TransactionRow>();
  } else {
    rows = await db
      .prepare(
        `${TRANSACTION_SELECT}
         WHERE t.kind = 'payment'
           AND t.privacy != 'private'
           AND (
             t.from_user_id = ? OR t.to_user_id = ?
             OR t.from_user_id IN (
               SELECT friend_user_id FROM finance_friendship WHERE user_id = ?
             )
             OR t.to_user_id IN (
               SELECT friend_user_id FROM finance_friendship WHERE user_id = ?
             )
           )
         ORDER BY t.created_at DESC LIMIT 100`,
      )
      .bind(me, me, me, me)
      .all<TransactionRow>();
  }

  return context.json({ transactions: rows.results.map(toTransaction) });
});

financeRoutes.get('/transactions/:id', member, async (context) => {
  const transaction = await loadTransaction(
    context.env.DB,
    context.req.param('id'),
  );

  if (!transaction) {
    return fail(
      context,
      404,
      'TRANSACTION_NOT_FOUND',
      'Transaction not found.',
    );
  }

  return context.json({ transaction });
});

// ---------------------------------------------------------------------------
// Payments & requests
// ---------------------------------------------------------------------------

interface PaymentInput {
  from: string;
  to: string;
  amountCents: number;
  note: string;
  emoji: string | null;
  privacy: 'public' | 'friends' | 'private';
  fundingSourceId: string | null;
  splitId?: string | null;
  requestId?: string | null;
}

async function executePayment(
  context: FinanceContext,
  input: PaymentInput,
): Promise<
  | { ok: true; transactionId: string }
  | { ok: false; status: ContentfulStatusCode; code: string; message: string }
> {
  const db = context.env.DB;
  const payer = await loadProfile(db, input.from);
  const payee = await loadProfile(db, input.to);

  if (!payer) {
    return {
      ok: false,
      status: 404,
      code: 'PROFILE_MISSING',
      message: 'Finish onboarding first.',
    };
  }
  if (!payee) {
    return {
      ok: false,
      status: 404,
      code: 'PERSON_NOT_FOUND',
      message: 'That person does not exist.',
    };
  }

  const source = input.fundingSourceId
    ? await loadFundingSource(db, input.fundingSourceId, input.from)
    : null;
  const cover = coverDebit(payer.balance_cents, input.amountCents, !!source);

  if (!cover.ok) {
    return {
      ok: false,
      status: 402,
      code: 'INSUFFICIENT_FUNDS',
      message: 'Add money or pick a bank or card to cover the rest.',
    };
  }

  const transactionId = newId();
  const fundingLabel = source
    ? cover.fromBalance > 0
      ? `Balance + ${source.label}`
      : source.label
    : 'TesterPay balance';

  await db.batch([
    db
      .prepare(
        `UPDATE finance_profile SET balance_cents = balance_cents - ?
         WHERE user_id = ?`,
      )
      .bind(cover.fromBalance, input.from),
    db
      .prepare(
        `UPDATE finance_profile SET balance_cents = balance_cents + ?
         WHERE user_id = ?`,
      )
      .bind(input.amountCents, input.to),
    db
      .prepare(
        `INSERT INTO finance_transaction
           (id, kind, from_user_id, to_user_id, amount_cents, note, emoji, privacy,
            funding_source_id, funding_label, split_id, request_id)
         VALUES (?, 'payment', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        transactionId,
        input.from,
        input.to,
        input.amountCents,
        input.note,
        input.emoji,
        input.privacy,
        source?.id ?? null,
        fundingLabel,
        input.splitId ?? null,
        input.requestId ?? null,
      ),
  ]);

  return { ok: true, transactionId };
}

financeRoutes.post('/payments', member, async (context) => {
  const me = userId(context);
  const body = await readBody(context);
  const to = str(body.toUserId);
  const amountCents = body.amountCents;

  if (!to || to === me) {
    return fail(context, 400, 'INVALID_RECIPIENT', 'Pick someone to pay.');
  }
  if (!isValidAmount(amountCents)) {
    return fail(
      context,
      400,
      'INVALID_AMOUNT',
      'Enter an amount up to $5,000.',
    );
  }

  const result = await executePayment(context, {
    from: me,
    to,
    amountCents,
    note: str(body.note),
    emoji: str(body.emoji) || null,
    privacy: privacyOf(body.privacy),
    fundingSourceId: str(body.fundingSourceId) || null,
  });

  if (!result.ok) {
    return fail(context, result.status, result.code, result.message);
  }

  const transaction = await loadTransaction(
    context.env.DB,
    result.transactionId,
  );
  const profile = await loadProfile(context.env.DB, me);

  return context.json(
    { transaction, profile: profile ? toProfile(profile) : null },
    201,
  );
});

financeRoutes.post('/requests', member, async (context) => {
  const me = userId(context);
  const body = await readBody(context);
  const payer = str(body.fromUserId);
  const amountCents = body.amountCents;

  if (!payer || payer === me) {
    return fail(context, 400, 'INVALID_PAYER', 'Pick someone to request from.');
  }
  if (!isValidAmount(amountCents)) {
    return fail(
      context,
      400,
      'INVALID_AMOUNT',
      'Enter an amount up to $5,000.',
    );
  }
  if (!(await loadProfile(context.env.DB, payer))) {
    return fail(
      context,
      404,
      'PERSON_NOT_FOUND',
      'That person does not exist.',
    );
  }

  const id = newId();
  await context.env.DB.prepare(
    `INSERT INTO finance_request
       (id, requester_id, payer_id, amount_cents, note, emoji, privacy)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      me,
      payer,
      amountCents,
      str(body.note),
      str(body.emoji) || null,
      privacyOf(body.privacy),
    )
    .run();

  const row = await context.env.DB.prepare(`${REQUEST_SELECT} WHERE r.id = ?`)
    .bind(id)
    .first<RequestRow>();

  return context.json({ request: row ? toRequest(row) : null }, 201);
});

financeRoutes.get('/requests', member, async (context) => {
  const me = userId(context);
  const rows = await context.env.DB.prepare(
    `${REQUEST_SELECT}
     WHERE r.requester_id = ? OR r.payer_id = ?
     ORDER BY r.created_at DESC LIMIT 100`,
  )
    .bind(me, me)
    .all<RequestRow>();

  const requests = rows.results.map(toRequest);

  return context.json({
    incoming: requests.filter((request) => request.payer.userId === me),
    outgoing: requests.filter((request) => request.requester.userId === me),
  });
});

async function loadRequest(db: Database, id: string) {
  return db
    .prepare(`${REQUEST_SELECT} WHERE r.id = ?`)
    .bind(id)
    .first<RequestRow>();
}

financeRoutes.post('/requests/:id/pay', member, async (context) => {
  const me = userId(context);
  const body = await readBody(context);
  const row = await loadRequest(context.env.DB, context.req.param('id'));

  if (!row || row.payer_id !== me) {
    return fail(context, 404, 'REQUEST_NOT_FOUND', 'Request not found.');
  }
  if (row.status !== 'pending') {
    return fail(context, 409, 'REQUEST_RESOLVED', 'This request is settled.');
  }

  const result = await executePayment(context, {
    from: me,
    to: row.requester_id,
    amountCents: row.amount_cents,
    note: row.note,
    emoji: row.emoji,
    privacy: row.privacy,
    fundingSourceId: str(body.fundingSourceId) || null,
    splitId: row.split_id,
    requestId: row.id,
  });

  if (!result.ok) {
    return fail(context, result.status, result.code, result.message);
  }

  await context.env.DB.prepare(
    `UPDATE finance_request
     SET status = 'paid', transaction_id = ?, resolved_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  )
    .bind(result.transactionId, row.id)
    .run();

  const updated = await loadRequest(context.env.DB, row.id);
  const transaction = await loadTransaction(
    context.env.DB,
    result.transactionId,
  );

  return context.json({
    request: updated ? toRequest(updated) : null,
    transaction,
  });
});

for (const action of ['decline', 'cancel'] as const) {
  financeRoutes.post(`/requests/:id/${action}`, member, async (context) => {
    const me = userId(context);
    const row = await loadRequest(context.env.DB, context.req.param('id'));
    const allowed =
      row &&
      (action === 'decline' ? row.payer_id === me : row.requester_id === me);

    if (!row || !allowed) {
      return fail(context, 404, 'REQUEST_NOT_FOUND', 'Request not found.');
    }
    if (row.status !== 'pending') {
      return fail(context, 409, 'REQUEST_RESOLVED', 'This request is settled.');
    }

    await context.env.DB.prepare(
      `UPDATE finance_request
       SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?`,
    )
      .bind(action === 'decline' ? 'declined' : 'cancelled', row.id)
      .run();

    const updated = await loadRequest(context.env.DB, row.id);
    return context.json({ request: updated ? toRequest(updated) : null });
  });
}

// ---------------------------------------------------------------------------
// Splits
// ---------------------------------------------------------------------------

financeRoutes.post('/splits', member, async (context) => {
  const me = userId(context);
  const body = await readBody(context);
  const totalCents = body.totalCents;
  const participants = Array.isArray(body.participantUserIds)
    ? body.participantUserIds.filter(
        (id): id is string => typeof id === 'string' && id !== me,
      )
    : [];
  const includeSelf = body.includeSelf !== false;

  if (!isValidAmount(totalCents)) {
    return fail(context, 400, 'INVALID_AMOUNT', 'Enter a total up to $5,000.');
  }
  if (participants.length === 0) {
    return fail(context, 400, 'NO_PARTICIPANTS', 'Add at least one person.');
  }

  const count = participants.length + (includeSelf ? 1 : 0);
  let shares: number[];

  if (Array.isArray(body.shares)) {
    const custom = body.shares as { userId?: unknown; amountCents?: unknown }[];
    shares = participants.map((id) => {
      const share = custom.find((entry) => entry.userId === id);
      return typeof share?.amountCents === 'number' ? share.amountCents : 0;
    });
    const mine = includeSelf
      ? totalCents - shares.reduce((a, b) => a + b, 0)
      : 0;

    if (mine < 0 || (!includeSelf && !sharesSumTo(shares, totalCents))) {
      return fail(
        context,
        400,
        'SHARES_MISMATCH',
        'Shares must add up to the total.',
      );
    }
    if (shares.some((share) => !Number.isInteger(share) || share <= 0)) {
      return fail(
        context,
        400,
        'INVALID_SHARE',
        'Every share must be over $0.',
      );
    }
  } else {
    const even = splitEvenly(totalCents, count);
    shares = includeSelf ? even.slice(1) : even;
  }

  const splitId = newId();
  const note = str(body.note) || 'Split';
  const emoji = str(body.emoji) || null;
  const privacy = privacyOf(body.privacy);
  const db = context.env.DB;

  await db.batch([
    db
      .prepare(
        `INSERT INTO finance_split
           (id, creator_id, total_cents, note, emoji, participant_count)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(splitId, me, totalCents, note, emoji, count),
    ...participants.map((id, index) =>
      db
        .prepare(
          `INSERT INTO finance_request
             (id, requester_id, payer_id, amount_cents, note, emoji, privacy, split_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(newId(), me, id, shares[index], note, emoji, privacy, splitId),
    ),
  ]);

  return context.json(await loadSplit(db, splitId), 201);
});

async function loadSplit(db: Database, id: string) {
  const split = await db
    .prepare(`SELECT * FROM finance_split WHERE id = ?`)
    .bind(id)
    .first<SplitRow>();
  const requests = await db
    .prepare(`${REQUEST_SELECT} WHERE r.split_id = ? ORDER BY r.created_at ASC`)
    .bind(id)
    .all<RequestRow>();

  return {
    split: split ? toSplit(split) : null,
    requests: requests.results.map(toRequest),
  };
}

financeRoutes.get('/splits/:id', member, async (context) => {
  const me = userId(context);
  const data = await loadSplit(context.env.DB, context.req.param('id'));
  const visible =
    data.split &&
    (data.split.creatorId === me ||
      data.requests.some((request) => request.payer.userId === me));

  if (!visible) {
    return fail(context, 404, 'SPLIT_NOT_FOUND', 'Split not found.');
  }

  return context.json(data);
});

// ---------------------------------------------------------------------------
// QR codes
// ---------------------------------------------------------------------------

financeRoutes.get('/qr/mine', member, async (context) => {
  const me = userId(context);
  const profile = await loadProfile(context.env.DB, me);
  if (!profile) {
    return fail(context, 404, 'PROFILE_MISSING', 'Finish onboarding first.');
  }

  return context.json({
    code: `testerpay://u/${profile.handle}`,
    handle: profile.handle,
  });
});

financeRoutes.post('/qr/tokens', member, async (context) => {
  const me = userId(context);
  const body = await readBody(context);
  const mode = body.mode === 'pay' ? 'pay' : 'request';
  const amountCents = isValidAmount(body.amountCents) ? body.amountCents : null;
  const token = newId().replace(/-/g, '').slice(0, 12);

  await context.env.DB.prepare(
    `INSERT INTO finance_qr_token (token, user_id, mode, amount_cents, note, expires_at)
     VALUES (?, ?, ?, ?, ?, datetime('now', '+1 day'))`,
  )
    .bind(token, me, mode, amountCents, str(body.note) || null)
    .run();

  return context.json({ code: `testerpay://qr/${token}`, token }, 201);
});

financeRoutes.get('/qr/resolve', member, async (context) => {
  const me = userId(context);
  const code = (context.req.query('code') ?? '').trim();
  const db = context.env.DB;

  const merchant = await db
    .prepare(`SELECT * FROM finance_merchant WHERE qr_code = ?`)
    .bind(code.toUpperCase())
    .first<MerchantRow>();
  if (merchant) {
    return context.json({ type: 'merchant', merchant: toMerchant(merchant) });
  }

  const tokenMatch = code.match(/^testerpay:\/\/qr\/([a-z0-9]+)$/i);
  if (tokenMatch) {
    const token = await db
      .prepare(
        `SELECT q.*, p.* FROM finance_qr_token q
         JOIN finance_profile p ON p.user_id = q.user_id
         WHERE q.token = ? AND q.expires_at > datetime('now')`,
      )
      .bind(tokenMatch[1])
      .first<
        ProfileRow & {
          mode: 'pay' | 'request';
          amount_cents: number | null;
          note: string | null;
        }
      >();

    if (!token) {
      return fail(context, 404, 'QR_EXPIRED', 'That code has expired.');
    }
    if (token.user_id === me) {
      return fail(context, 400, 'QR_SELF', "That's your own code.");
    }

    return context.json({
      type: 'person',
      person: toPerson(token),
      mode: token.mode,
      amountCents: token.amount_cents,
      note: token.note,
    });
  }

  const handleMatch = code.match(/^(?:testerpay:\/\/u\/|@)?([a-z0-9-]+)$/i);
  if (handleMatch) {
    const person = await db
      .prepare(`SELECT * FROM finance_profile WHERE handle = ?`)
      .bind(normalizeHandle(handleMatch[1]))
      .first<ProfileRow>();

    if (person && person.user_id !== me) {
      return context.json({
        type: 'person',
        person: toPerson(person),
        mode: 'pay',
        amountCents: null,
        note: null,
      });
    }
  }

  return fail(context, 404, 'QR_UNKNOWN', "We don't recognize that code.");
});

// ---------------------------------------------------------------------------
// Funding sources & balance
// ---------------------------------------------------------------------------

financeRoutes.get('/funding-sources', member, async (context) => {
  const me = userId(context);
  const rows = await context.env.DB.prepare(
    `SELECT * FROM finance_funding_source WHERE user_id = ?
     ORDER BY is_default DESC, created_at ASC`,
  )
    .bind(me)
    .all<FundingSourceRow>();

  return context.json({ fundingSources: rows.results.map(toFundingSource) });
});

financeRoutes.post('/funding-sources', member, async (context) => {
  const me = userId(context);
  const body = await readBody(context);
  const type = body.type === 'debit_card' ? 'debit_card' : 'bank';
  const institution = str(body.institution);
  const last4 = str(body.last4) || generateLast4();

  if (institution.length < 2) {
    return fail(
      context,
      400,
      'INVALID_INSTITUTION',
      'Pick a bank or card issuer.',
    );
  }
  if (!/^\d{4}$/.test(last4)) {
    return fail(context, 400, 'INVALID_LAST4', 'Enter the last 4 digits.');
  }

  const existing = await context.env.DB.prepare(
    `SELECT COUNT(*) AS count FROM finance_funding_source WHERE user_id = ?`,
  )
    .bind(me)
    .first<{ count: number }>();
  const id = newId();
  const label =
    str(body.label) ||
    `${institution} ${type === 'bank' ? 'Checking' : 'Debit'} ••${last4}`;

  await context.env.DB.prepare(
    `INSERT INTO finance_funding_source
       (id, user_id, type, label, institution, last4, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, me, type, label, institution, last4, existing?.count ? 0 : 1)
    .run();

  const row = await loadFundingSource(context.env.DB, id, me);
  return context.json(
    { fundingSource: row ? toFundingSource(row) : null },
    201,
  );
});

financeRoutes.post('/funding-sources/:id/default', member, async (context) => {
  const me = userId(context);
  const id = context.req.param('id');
  const row = await loadFundingSource(context.env.DB, id, me);
  if (!row) {
    return fail(context, 404, 'SOURCE_NOT_FOUND', 'Funding source not found.');
  }

  await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE finance_funding_source SET is_default = 0 WHERE user_id = ?`,
    ).bind(me),
    context.env.DB.prepare(
      `UPDATE finance_funding_source SET is_default = 1 WHERE id = ?`,
    ).bind(id),
  ]);

  return context.json({ updated: true });
});

financeRoutes.delete('/funding-sources/:id', member, async (context) => {
  const me = userId(context);
  await context.env.DB.prepare(
    `DELETE FROM finance_funding_source WHERE id = ? AND user_id = ?`,
  )
    .bind(context.req.param('id'), me)
    .run();

  return context.json({ removed: true });
});

financeRoutes.post('/balance/add', member, async (context) => {
  const me = userId(context);
  const body = await readBody(context);
  const amountCents = body.amountCents;
  const source = str(body.fundingSourceId)
    ? await loadFundingSource(context.env.DB, str(body.fundingSourceId), me)
    : null;

  if (!isValidAmount(amountCents)) {
    return fail(
      context,
      400,
      'INVALID_AMOUNT',
      'Enter an amount up to $5,000.',
    );
  }
  if (!source) {
    return fail(
      context,
      400,
      'SOURCE_REQUIRED',
      'Pick a bank or card to add from.',
    );
  }

  const id = newId();
  await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE finance_profile SET balance_cents = balance_cents + ? WHERE user_id = ?`,
    ).bind(amountCents, me),
    context.env.DB.prepare(
      `INSERT INTO finance_transaction
         (id, kind, to_user_id, amount_cents, note, privacy, funding_source_id, funding_label)
       VALUES (?, 'add_money', ?, ?, 'Added money', 'private', ?, ?)`,
    ).bind(id, me, amountCents, source.id, source.label),
  ]);

  const profile = await loadProfile(context.env.DB, me);
  return context.json(
    {
      transaction: await loadTransaction(context.env.DB, id),
      profile: profile ? toProfile(profile) : null,
    },
    201,
  );
});

financeRoutes.post('/balance/transfer', member, async (context) => {
  const me = userId(context);
  const body = await readBody(context);
  const amountCents = body.amountCents;
  const speed: TransferSpeed =
    body.speed === 'instant' ? 'instant' : 'standard';
  const source = str(body.fundingSourceId)
    ? await loadFundingSource(context.env.DB, str(body.fundingSourceId), me)
    : null;
  const profile = await loadProfile(context.env.DB, me);

  if (!isValidAmount(amountCents)) {
    return fail(
      context,
      400,
      'INVALID_AMOUNT',
      'Enter an amount up to $5,000.',
    );
  }
  if (!source) {
    return fail(
      context,
      400,
      'SOURCE_REQUIRED',
      'Pick where to send the money.',
    );
  }
  if (speed === 'instant' && source.type !== 'debit_card') {
    return fail(
      context,
      400,
      'INSTANT_NEEDS_CARD',
      'Instant transfers need a debit card.',
    );
  }

  const feeCents = transferFee(amountCents, speed);
  const total = amountCents + feeCents;
  if (!profile || profile.balance_cents < total) {
    return fail(context, 402, 'INSUFFICIENT_FUNDS', 'Not enough balance.');
  }

  const id = newId();
  await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE finance_profile SET balance_cents = balance_cents - ? WHERE user_id = ?`,
    ).bind(total, me),
    context.env.DB.prepare(
      `INSERT INTO finance_transaction
         (id, kind, from_user_id, amount_cents, fee_cents, note, privacy,
          funding_source_id, funding_label, speed, status)
       VALUES (?, 'transfer_out', ?, ?, ?, ?, 'private', ?, ?, ?, ?)`,
    ).bind(
      id,
      me,
      amountCents,
      feeCents,
      speed === 'instant' ? 'Instant transfer' : 'Standard transfer (1-3 days)',
      source.id,
      source.label,
      speed,
      speed === 'instant' ? 'completed' : 'pending',
    ),
  ]);

  const updated = await loadProfile(context.env.DB, me);
  return context.json(
    {
      transaction: await loadTransaction(context.env.DB, id),
      profile: updated ? toProfile(updated) : null,
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// Merchants
// ---------------------------------------------------------------------------

financeRoutes.get('/merchants', member, async (context) => {
  const rows = await context.env.DB.prepare(
    `SELECT * FROM finance_merchant ORDER BY name ASC`,
  ).all<MerchantRow>();

  return context.json({ merchants: rows.results.map(toMerchant) });
});

financeRoutes.get('/merchants/:id', member, async (context) => {
  const row = await context.env.DB.prepare(
    `SELECT * FROM finance_merchant WHERE id = ?`,
  )
    .bind(context.req.param('id'))
    .first<MerchantRow>();

  if (!row) {
    return fail(context, 404, 'MERCHANT_NOT_FOUND', 'Merchant not found.');
  }

  return context.json({ merchant: toMerchant(row) });
});

financeRoutes.post('/merchants/:id/pay', member, async (context) => {
  const me = userId(context);
  const body = await readBody(context);
  const amountCents = body.amountCents;
  const channel = body.channel === 'online' ? 'online' : 'in_store';
  const merchant = await context.env.DB.prepare(
    `SELECT * FROM finance_merchant WHERE id = ?`,
  )
    .bind(context.req.param('id'))
    .first<MerchantRow>();
  const profile = await loadProfile(context.env.DB, me);

  if (!merchant) {
    return fail(context, 404, 'MERCHANT_NOT_FOUND', 'Merchant not found.');
  }
  if (!isValidAmount(amountCents)) {
    return fail(
      context,
      400,
      'INVALID_AMOUNT',
      'Enter an amount up to $5,000.',
    );
  }
  if (!profile) {
    return fail(context, 404, 'PROFILE_MISSING', 'Finish onboarding first.');
  }

  const source = str(body.fundingSourceId)
    ? await loadFundingSource(context.env.DB, str(body.fundingSourceId), me)
    : null;
  const cover = coverDebit(profile.balance_cents, amountCents, !!source);
  if (!cover.ok) {
    return fail(
      context,
      402,
      'INSUFFICIENT_FUNDS',
      'Add money or pick a bank or card to cover the rest.',
    );
  }

  const id = newId();
  const fundingLabel = source
    ? cover.fromBalance > 0
      ? `Balance + ${source.label}`
      : source.label
    : 'TesterPay balance';

  await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE finance_profile SET balance_cents = balance_cents - ? WHERE user_id = ?`,
    ).bind(cover.fromBalance, me),
    context.env.DB.prepare(
      `INSERT INTO finance_transaction
         (id, kind, from_user_id, merchant_id, amount_cents, note, emoji, privacy,
          funding_source_id, funding_label, channel)
       VALUES (?, 'merchant', ?, ?, ?, ?, ?, 'private', ?, ?, ?)`,
    ).bind(
      id,
      me,
      merchant.id,
      amountCents,
      str(body.note) || merchant.name,
      merchant.emoji,
      source?.id ?? null,
      fundingLabel,
      channel,
    ),
  ]);

  const updated = await loadProfile(context.env.DB, me);
  return context.json(
    {
      transaction: await loadTransaction(context.env.DB, id),
      profile: updated ? toProfile(updated) : null,
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

financeRoutes.get('/cards', member, async (context) => {
  const me = userId(context);
  const rows = await context.env.DB.prepare(
    `SELECT * FROM finance_card WHERE user_id = ? ORDER BY created_at ASC`,
  )
    .bind(me)
    .all<CardRow>();

  return context.json({ cards: rows.results.map(toCard) });
});

financeRoutes.post('/cards', member, async (context) => {
  const me = userId(context);
  const body = await readBody(context);
  const type = body.type === 'credit' ? 'credit' : 'debit';
  const profile = await loadProfile(context.env.DB, me);

  if (!profile) {
    return fail(context, 404, 'PROFILE_MISSING', 'Finish onboarding first.');
  }
  if (profile.verification_status !== 'verified') {
    return fail(
      context,
      403,
      'VERIFICATION_REQUIRED',
      'Verify your identity before getting a card.',
    );
  }

  const existing = await context.env.DB.prepare(
    `SELECT * FROM finance_card WHERE user_id = ? AND type = ?`,
  )
    .bind(me, type)
    .first<CardRow>();
  if (existing) {
    return fail(
      context,
      409,
      'CARD_EXISTS',
      `You already have a ${type} card.`,
    );
  }

  const id = newId();
  const now = new Date();
  const design = str(body.design) || (type === 'credit' ? 'midnight' : 'sky');

  await context.env.DB.prepare(
    `INSERT INTO finance_card
       (id, user_id, type, last4, exp_month, exp_year, design, spend_limit_cents,
        credit_limit_cents)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      me,
      type,
      generateLast4(),
      now.getMonth() + 1,
      now.getFullYear() + 4,
      design,
      type === 'debit' ? 300_000 : null,
      type === 'credit' ? DEFAULT_CREDIT_LIMIT_CENTS : null,
    )
    .run();

  const row = await context.env.DB.prepare(
    `SELECT * FROM finance_card WHERE id = ?`,
  )
    .bind(id)
    .first<CardRow>();

  return context.json({ card: row ? toCard(row) : null }, 201);
});

async function loadCard(db: Database, id: string, owner: string) {
  return db
    .prepare(`SELECT * FROM finance_card WHERE id = ? AND user_id = ?`)
    .bind(id, owner)
    .first<CardRow>();
}

financeRoutes.patch('/cards/:id', member, async (context) => {
  const me = userId(context);
  const body = await readBody(context);
  const card = await loadCard(context.env.DB, context.req.param('id'), me);
  if (!card) {
    return fail(context, 404, 'CARD_NOT_FOUND', 'Card not found.');
  }

  const status =
    body.status === 'locked' || body.status === 'active'
      ? body.status
      : card.status;
  const spendLimit =
    typeof body.spendLimitCents === 'number' && body.spendLimitCents >= 0
      ? Math.round(body.spendLimitCents)
      : card.spend_limit_cents;
  const design = str(body.design) || card.design;
  const physical =
    body.physicalStatus === 'ordered' || body.physicalStatus === 'activated'
      ? body.physicalStatus
      : card.physical_status;

  await context.env.DB.prepare(
    `UPDATE finance_card
     SET status = ?, spend_limit_cents = ?, design = ?, physical_status = ?
     WHERE id = ?`,
  )
    .bind(status, spendLimit, design, physical, card.id)
    .run();

  const updated = await loadCard(context.env.DB, card.id, me);
  return context.json({ card: updated ? toCard(updated) : null });
});

financeRoutes.get('/cards/:id/transactions', member, async (context) => {
  const me = userId(context);
  const card = await loadCard(context.env.DB, context.req.param('id'), me);
  if (!card) {
    return fail(context, 404, 'CARD_NOT_FOUND', 'Card not found.');
  }

  const rows = await context.env.DB.prepare(
    `${TRANSACTION_SELECT}
     WHERE t.from_user_id = ? AND t.kind IN ('merchant', 'card_purchase')
     ORDER BY t.created_at DESC LIMIT 50`,
  )
    .bind(me)
    .all<TransactionRow>();

  return context.json({ transactions: rows.results.map(toTransaction) });
});
