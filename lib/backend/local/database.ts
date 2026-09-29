export type SqlValue = string | number | null | Uint8Array;

export interface SqlDriver {
  exec(sql: string): void;
  all<T>(sql: string, values: SqlValue[]): T[];
  run(
    sql: string,
    values: SqlValue[],
  ): { changes: number; last_row_id: number };
}

export class Statement {
  constructor(
    private readonly driver: SqlDriver,
    private readonly sql: string,
    private readonly values: SqlValue[] = [],
  ) {}

  bind(...values: SqlValue[]) {
    return new Statement(this.driver, this.sql, values);
  }

  async first<T = Record<string, unknown>>() {
    return this.driver.all<T>(this.sql, this.values)[0] ?? null;
  }

  async all<T = Record<string, unknown>>() {
    return { results: this.driver.all<T>(this.sql, this.values) };
  }

  execute() {
    return { meta: this.driver.run(this.sql, this.values) };
  }

  async run() {
    return this.execute();
  }
}

/** The existing app queries run against the same small SQLite interface everywhere. */
export class Database {
  constructor(readonly driver: SqlDriver) {}

  prepare(sql: string) {
    return new Statement(this.driver, sql);
  }

  async batch(statements: Statement[]) {
    this.driver.exec('SAVEPOINT batch');
    try {
      const results = [];
      for (const statement of statements) results.push(statement.execute());
      this.driver.exec('RELEASE batch');
      return results;
    } catch (error) {
      this.driver.exec('ROLLBACK TO batch; RELEASE batch');
      throw error;
    }
  }
}

export interface MediaObject {
  body: ArrayBuffer;
  httpMetadata: { contentType: string };
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** Uploaded media lives in the same local database as the records that reference it. */
export class MediaStorage {
  constructor(private readonly db: Database) {}

  async put(
    key: string,
    bytes: ArrayBuffer,
    options: { httpMetadata: { contentType: string } },
  ) {
    await this.db
      .prepare(
        'INSERT OR REPLACE INTO local_media (key, bytes, mime_type) VALUES (?, ?, ?)',
      )
      .bind(key, new Uint8Array(bytes), options.httpMetadata.contentType)
      .run();
  }

  async get(
    key: string,
    options?: { range: { offset: number; length: number } },
  ): Promise<MediaObject | null> {
    const row = await this.db
      .prepare('SELECT bytes, mime_type FROM local_media WHERE key = ?')
      .bind(key)
      .first<{ bytes: Uint8Array; mime_type: string }>();
    if (!row) return null;
    const range = options?.range;
    const body = Uint8Array.from(
      range
        ? row.bytes.subarray(range.offset, range.offset + range.length)
        : row.bytes,
    ).buffer;
    return {
      body,
      httpMetadata: { contentType: row.mime_type },
      arrayBuffer: async () => body,
    };
  }

  async delete(key: string) {
    await this.db
      .prepare('DELETE FROM local_media WHERE key = ?')
      .bind(key)
      .run();
  }
}

export interface LocalStorage {
  /** Holds a lock until the whole operation, including persistence, finishes. */
  access<T>(
    operation: (db: Database, persist: () => Promise<void>) => Promise<T>,
  ): Promise<T>;
  reset(): Promise<void>;
}
