import { Hono } from 'hono';

import { authRoutes } from './auth';
import type { AppId, Bindings, WorkerContext } from './env';
import { MediaStorage, type LocalStorage } from './local/database';
import { createStorage } from './local/storage';
import { loadSession } from './middleware/auth';

export const LOCAL_URL = 'https://demo.local';

/** Dispatch requests in-process. No request to this URL ever leaves the app. */
export function createLocalBackend(
  appId: AppId,
  routes: Hono<WorkerContext>,
  storage: LocalStorage = createStorage(`demo-${appId}`),
) {
  const app = new Hono<WorkerContext>();
  app.use('*', loadSession);
  app.route('/v1/auth', authRoutes);
  app.route(`/v1/apps/${appId}`, routes);
  app.onError((error, context) => {
    console.error(error);
    return context.json(
      {
        error: {
          code: 'LOCAL_DATA_ERROR',
          message: 'Could not update local demo data.',
        },
      },
      500,
    );
  });

  return {
    reset: () => storage.reset(),
    async fetch(url: string, init: RequestInit = {}) {
      if (new URL(url).origin !== LOCAL_URL)
        throw new Error('Only local demo requests are supported.');
      if (init.signal?.aborted) throw new Error('The operation was aborted.');
      return storage.access(async (db, persist) => {
        db.driver.exec('SAVEPOINT request');
        try {
          const bindings: Bindings = {
            DB: db,
            MEDIA: new MediaStorage(db),
            checkpoint: async () => {
              db.driver.exec('RELEASE request');
              try {
                await persist();
              } finally {
                db.driver.exec('PRAGMA foreign_keys = ON; SAVEPOINT request');
              }
            },
            signal: init.signal ?? undefined,
          };
          const response = await app.request(url, init, bindings);
          if (response.status >= 500) {
            db.driver.exec('ROLLBACK TO request; RELEASE request');
            return response;
          }
          db.driver.exec('RELEASE request');
          return response;
        } catch (error) {
          db.driver.exec('ROLLBACK TO request; RELEASE request');
          throw error;
        }
      });
    },
  };
}
