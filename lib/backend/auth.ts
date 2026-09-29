import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { Hono } from 'hono';

import type { LocalUser, WorkerContext } from './env';
import { requireAccount } from './middleware/auth';

export const authRoutes = new Hono<WorkerContext>();

async function passwordHash(password: string, salt = crypto.randomUUID()) {
  const bytes = await pbkdf2Async(sha256, password, salt, {
    c: 100_000,
    dkLen: 32,
  });
  return `${salt}:${bytesToHex(bytes)}`;
}

async function matches(password: string, stored: string | null) {
  return (
    !!stored && (await passwordHash(password, stored.split(':')[0])) === stored
  );
}

function credentials(input: Record<string, unknown>) {
  return {
    email:
      typeof input.email === 'string' ? input.email.trim().toLowerCase() : '',
    password: typeof input.password === 'string' ? input.password : '',
    name: typeof input.name === 'string' ? input.name.trim() : '',
  };
}

function publicUser(user: {
  id: string;
  name: string;
  email: string;
  isAnonymous: number;
}): LocalUser {
  return { ...user, isAnonymous: user.isAnonymous === 1 };
}

for (const mode of [
  'sign-up/email',
  'sign-in/email',
  'sign-in/anonymous',
] as const) {
  authRoutes.post(`/${mode}`, async (context) => {
    const db = context.env.DB;
    const { email, password, name } = credentials(await context.req.json());
    const anonymous = mode === 'sign-in/anonymous';
    const signingUp = mode === 'sign-up/email';
    if (
      !anonymous &&
      (!email.includes('@') ||
        password.length < 8 ||
        (signingUp && name.length < 2))
    ) {
      return context.json(
        {
          error: {
            code: 'INVALID_CREDENTIALS',
            message:
              'Enter a valid email, a password of at least 8 characters, and your name.',
          },
        },
        400,
      );
    }
    let user = await db
      .prepare(
        'SELECT id, name, email, isAnonymous FROM user WHERE lower(email) = ?',
      )
      .bind(email)
      .first<{
        id: string;
        name: string;
        email: string;
        isAnonymous: number;
      }>();
    if (signingUp && user)
      return context.json(
        {
          error: {
            code: 'USER_ALREADY_EXISTS',
            message:
              'An account with this email already exists on this device.',
          },
        },
        409,
      );
    if (!signingUp && !anonymous) {
      const account =
        user &&
        (await db
          .prepare('SELECT password FROM account WHERE userId = ?')
          .bind(user.id)
          .first<{ password: string | null }>());
      if (!user || !account || !(await matches(password, account.password))) {
        return context.json(
          {
            error: {
              code: 'INVALID_CREDENTIALS',
              message:
                'Email or password is incorrect. Accounts are local to this device.',
            },
          },
          401,
        );
      }
    } else {
      const guest = context.get('session')?.user;
      const upgrading = signingUp && guest?.isAnonymous;
      const id = upgrading ? guest.id : crypto.randomUUID();
      const now = Date.now();
      user = {
        id,
        name: anonymous ? 'Guest' : name,
        email: anonymous ? `${id}@guest.demo.invalid` : email,
        isAnonymous: anonymous ? 1 : 0,
      };
      if (upgrading) {
        await db
          .prepare(
            'UPDATE user SET name = ?, email = ?, isAnonymous = 0, updatedAt = ? WHERE id = ?',
          )
          .bind(name, email, now, id)
          .run();
      } else {
        await db
          .prepare(
            'INSERT INTO user (id, name, email, isAnonymous, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
          )
          .bind(id, user.name, user.email, user.isAnonymous, now, now)
          .run();
      }
      if (!anonymous)
        await db
          .prepare(
            'INSERT INTO account (id, userId, issuer, accountId, providerId, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          )
          .bind(
            crypto.randomUUID(),
            id,
            'local',
            email,
            'credential',
            await passwordHash(password),
            now,
            now,
          )
          .run();
    }
    if (!user) throw new Error('Missing local user');
    const token = crypto.randomUUID();
    const now = Date.now();
    await db
      .prepare(
        'INSERT INTO session (id, userId, token, expiresAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .bind(
        crypto.randomUUID(),
        user.id,
        token,
        now + 365 * 24 * 60 * 60 * 1000,
        now,
        now,
      )
      .run();
    context.header('set-auth-token', token);
    return context.json({ token, user: publicUser(user) });
  });
}

authRoutes.post('/sign-out', async (context) => {
  const token = context.get('session')?.token;
  if (token)
    await context.env.DB.prepare('DELETE FROM session WHERE token = ?')
      .bind(token)
      .run();
  return context.json({ success: true });
});

authRoutes.post('/delete-user', requireAccount, async (context) => {
  const user = context.get('session')!.user;
  const input: Record<string, unknown> = await context.req.json();
  if (typeof input.password === 'string') {
    const row = await context.env.DB.prepare(
      'SELECT password FROM account WHERE userId = ?',
    )
      .bind(user.id)
      .first<{ password: string | null }>();
    if (!(await matches(input.password, row?.password ?? null)))
      return context.json(
        { error: { code: 'INVALID_PASSWORD', message: 'Incorrect password.' } },
        400,
      );
  }
  await context.env.DB.prepare('DELETE FROM user WHERE id = ?')
    .bind(user.id)
    .run();
  return context.json({ success: true });
});

for (const route of ['verify-password', 'change-password'] as const) {
  authRoutes.post(`/${route}`, requireAccount, async (context) => {
    const id = context.get('session')!.user.id;
    const input: Record<string, unknown> = await context.req.json();
    const password =
      route === 'verify-password' ? input.password : input.currentPassword;
    const row = await context.env.DB.prepare(
      'SELECT password FROM account WHERE userId = ?',
    )
      .bind(id)
      .first<{ password: string | null }>();
    if (
      typeof password !== 'string' ||
      !(await matches(password, row?.password ?? null))
    )
      return context.json(
        { error: { code: 'INVALID_PASSWORD', message: 'Incorrect password.' } },
        400,
      );
    if (route === 'change-password') {
      if (typeof input.newPassword !== 'string' || input.newPassword.length < 8)
        return context.json(
          {
            error: {
              code: 'INVALID_PASSWORD',
              message: 'Use at least 8 characters.',
            },
          },
          400,
        );
      await context.env.DB.prepare(
        'UPDATE account SET password = ? WHERE userId = ?',
      )
        .bind(await passwordHash(input.newPassword), id)
        .run();
      await context.env.DB.prepare(
        'DELETE FROM session WHERE userId = ? AND token != ?',
      )
        .bind(id, context.get('session')!.token)
        .run();
    }
    return context.json({ status: true });
  });
}

authRoutes.post('/reset-password', async (context) => {
  const input: Record<string, unknown> = await context.req.json();
  if (
    typeof input.token !== 'string' ||
    typeof input.newPassword !== 'string' ||
    input.newPassword.length < 8
  )
    return context.json(
      {
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Use at least 8 characters.',
        },
      },
      400,
    );
  const db = context.env.DB;
  const row = await db
    .prepare(
      'SELECT id, value FROM verification WHERE identifier = ? AND expiresAt > ?',
    )
    .bind(`reset-password:${input.token}`, Date.now())
    .first<{ id: string; value: string }>();
  if (!row)
    return context.json(
      {
        error: {
          code: 'INVALID_TOKEN',
          message: 'The recovery code has expired.',
        },
      },
      400,
    );
  await db.batch([
    db
      .prepare('UPDATE account SET password = ? WHERE userId = ?')
      .bind(await passwordHash(input.newPassword), row.value),
    db.prepare('DELETE FROM verification WHERE id = ?').bind(row.id),
    db.prepare('DELETE FROM session WHERE userId = ?').bind(row.value),
  ]);
  return context.json({ status: true });
});
