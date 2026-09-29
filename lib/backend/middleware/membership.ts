import { createMiddleware } from 'hono/factory';

import type { AppId, Membership, WorkerContext } from '../env';

interface MembershipRow {
  app_id: AppId;
  created_at: string;
  role: Membership['role'];
  user_id: string;
}

function toMembership(row: MembershipRow): Membership {
  return {
    appId: row.app_id,
    createdAt: row.created_at,
    role: row.role,
    userId: row.user_id,
  };
}

export function requireMembership(appId: AppId) {
  return createMiddleware<WorkerContext>(async (context, next) => {
    const session = context.get('session');

    if (!session) {
      return context.json(
        {
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Sign in to access this endpoint.',
          },
        },
        401,
      );
    }

    const membership = await context.env.DB.prepare(
      `SELECT app_id, created_at, role, user_id
       FROM app_membership
       WHERE app_id = ? AND user_id = ?`,
    )
      .bind(appId, session.user.id)
      .first<MembershipRow>();

    if (!membership) {
      return context.json(
        {
          error: {
            code: 'APP_ACCESS_REQUIRED',
            message: `Join ${appId} before accessing this endpoint.`,
          },
        },
        403,
      );
    }

    context.set('membership', toMembership(membership));
    await next();
  });
}
