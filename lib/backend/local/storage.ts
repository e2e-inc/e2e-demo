import initSqlJs from 'sql.js/dist/sql-asm-memory-growth.js';

import { Database, type LocalStorage, type SqlDriver } from './database';
import { migrate } from './migrate';

let engine: ReturnType<typeof initSqlJs> | undefined;

function openStore(name: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore('database');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function snapshot(store: IDBDatabase): Promise<Uint8Array | undefined> {
  return new Promise((resolve, reject) => {
    const request = store
      .transaction('database')
      .objectStore('database')
      .get('sqlite');
    request.onsuccess = () => resolve(request.result as Uint8Array | undefined);
    request.onerror = () => reject(request.error);
  });
}

function save(store: IDBDatabase, bytes: Uint8Array) {
  return new Promise<void>((resolve, reject) => {
    const transaction = store.transaction('database', 'readwrite');
    transaction.objectStore('database').put(bytes, 'sqlite');
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Could not save demo data.'));
  });
}

/** Reload under a cross-tab lock before each operation so two tabs cannot overwrite one another. */
export function createStorage(name: string): LocalStorage {
  const access = async <T>(
    operation: (db: Database, persist: () => Promise<void>) => Promise<T>,
    reset = false,
  ) => {
    if (!globalThis.navigator?.locks)
      throw new Error(
        'Local demos require HTTPS or localhost to safely save data across tabs.',
      );
    return navigator.locks.request(name, async () => {
      const store = await openStore(name);
      try {
        const SQL = await (engine ??= initSqlJs());
        const sqlite = new SQL.Database(
          reset ? undefined : await snapshot(store),
        );
        const driver: SqlDriver = {
          exec: (sql) => {
            sqlite.exec(sql);
          },
          all: <Row>(sql: string, values: Parameters<SqlDriver['run']>[1]) => {
            const statement = sqlite.prepare(sql);
            try {
              statement.bind(values);
              const rows: Row[] = [];
              while (statement.step())
                rows.push(statement.getAsObject() as Row);
              return rows;
            } finally {
              statement.free();
            }
          },
          run: (sql, values) => {
            sqlite.run(sql, values);
            return {
              changes: sqlite.getRowsModified(),
              last_row_id: Number(
                sqlite.exec('SELECT last_insert_rowid()')[0].values[0][0],
              ),
            };
          },
        };
        const db = new Database(driver);
        try {
          migrate(db);
          const persist = () => save(store, sqlite.export());
          const result = await operation(db, persist);
          await persist();
          return result;
        } finally {
          sqlite.close();
        }
      } finally {
        store.close();
      }
    });
  };
  return { access, reset: () => access(async () => undefined, true) };
}
