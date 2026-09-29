import { migrations } from '../migrations';
import type { Database } from './database';

export function migrate(db: Database) {
  const driver = db.driver;
  driver.exec('PRAGMA foreign_keys = ON');
  const version = driver.all<{ user_version: number }>(
    'PRAGMA user_version',
    [],
  )[0].user_version;
  if (version > migrations.length)
    throw new Error(
      'This demo was saved by a newer app version. Please update the app.',
    );
  driver.exec('SAVEPOINT migrations');
  try {
    for (let index = version; index < migrations.length; index++) {
      driver.exec(migrations[index]);
      driver.exec(`PRAGMA user_version = ${index + 1}`);
    }
    driver.exec(
      'CREATE TABLE IF NOT EXISTS local_media (key TEXT PRIMARY KEY, bytes BLOB NOT NULL, mime_type TEXT NOT NULL)',
    );
    driver.exec('RELEASE migrations');
  } catch (error) {
    driver.exec('ROLLBACK TO migrations; RELEASE migrations');
    throw error;
  }
}
