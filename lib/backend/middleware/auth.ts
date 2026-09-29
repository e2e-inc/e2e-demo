import { createMiddleware } from 'hono/factory';
import type { WorkerContext } from '../env';

export const loadSession = createMiddleware<WorkerContext>(
  async (context, next) => {
    const token = context.req.header('Authorization')?.replace(/^Bearer /, '');
    const user = token
      ? await context.env.DB.prepare(
          'SELECT u.id, u.name, u.email, u.isAnonymous FROM user u JOIN session s ON s.userId = u.id WHERE s.token = ? AND s.expiresAt > ?',
        )
          .bind(token, Date.now())
          .first<{
            id: string;
            name: string;
            email: string;
            isAnonymous: number;
          }>()
      : null;
    context.set(
      'session',
      user && token
        ? { user: { ...user, isAnonymous: user.isAnonymous === 1 }, token }
        : null,
    );
    await next();
  },
);

export const requireAccount = createMiddleware<WorkerContext>(
  async (context, next) => {
    if (!context.get('session'))
      return context.json(
        {
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Sign in to access this endpoint.',
          },
        },
        401,
      );
    await next();
  },
);
