import initSqlJs from 'sql.js';
import { Database, type SqlDriver } from '../../lib/backend/local/database';
import { migrate } from '../../lib/backend/local/migrate';

export const VISUAL_NOW = Date.UTC(2026, 9, 8, 12);
export const VISUAL_TOKEN = 'visual-demo-session';

// A test-only account with no password. The browser uses the real local backend.
export async function memberDatabase(): Promise<number[]> {
  const SQL = await initSqlJs();
  const sqlite = new SQL.Database();
  try {
    const driver: SqlDriver = {
      exec: (sql) => { sqlite.exec(sql); },
      all: <T>(sql: string, values: Parameters<SqlDriver['run']>[1]) => {
        const statement = sqlite.prepare(sql);
        try {
          statement.bind(values);
          const rows: T[] = [];
          while (statement.step()) rows.push(statement.getAsObject() as T);
          return rows;
        } finally { statement.free(); }
      },
      run: (sql, values) => {
        sqlite.run(sql, values);
        return { changes: sqlite.getRowsModified(), last_row_id: 0 };
      },
    };
    migrate(new Database(driver));
    sqlite.run(`
      INSERT INTO user (id, name, email, createdAt, updatedAt)
        VALUES ('visual_member', 'Jordan Lee', 'visual@example.test', ?, ?);
      `, [VISUAL_NOW, VISUAL_NOW]);
    sqlite.run(`
      INSERT INTO session (id, userId, token, expiresAt, createdAt, updatedAt)
        VALUES ('visual_session', 'visual_member', ?, ?, ?, ?);
      `, [VISUAL_TOKEN, VISUAL_NOW + 86_400_000, VISUAL_NOW, VISUAL_NOW]);
    sqlite.run(`
      INSERT INTO app_membership (app_id, user_id) VALUES ('finance', 'visual_member');
      INSERT INTO finance_profile
        (user_id, handle, display_name, avatar_color, balance_cents)
        VALUES ('visual_member', 'jordan-lee', 'Jordan Lee', '#9969FA', 1000);
      INSERT INTO finance_friendship (user_id, friend_user_id)
        VALUES ('visual_member', 'demo_ava');
      UPDATE finance_transaction SET created_at = '2026-10-08 10:00:00';
      UPDATE finance_profile SET created_at = '2026-10-08 10:00:00';
    `);
    return Array.from(sqlite.export());
  } finally { sqlite.close(); }
}
