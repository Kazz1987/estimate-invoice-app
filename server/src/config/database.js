import { Pool, types } from 'pg';

// BIGINT(OID 20)はpgのデフォルトでは文字列で返るため、IDが数値として扱われていた
// mysql2時代の挙動に合わせてJS numberにパースする。
// NUMERIC(OID 1700)は元々mysql2でも文字列返却だったため、ここでは変更しない
// （フロントエンドは既にNumber()で都度キャストする前提で書かれている）。
types.setTypeParser(20, (val) => parseInt(val, 10));

// Neon（サーバーレスPostgres）はSSL接続必須。
// 自己署名証明書エラーを避けるため rejectUnauthorized: false を指定する。
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// アイドル接続の切断などでプールが発火する 'error' イベントの
// リスナーが無いとプロセスがクラッシュするため、ここで捕捉する。
pool.on('error', (err) => {
  console.error('PostgreSQLプールエラー:', err);
});

// AggregateError（Node18+のDNS解決失敗時など）はmessageが空文字になり、
// 実際のエラーは.errorsに入っているため、ここで読み取り可能な形に整形する。
export function describeDbError(error) {
  if (error && Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors.map((e) => e.message || String(e)).join('; ');
  }
  return error?.message || error?.code || String(error);
}

export async function testConnection() {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT current_database() AS db_name');
      return {
        connected: true,
        dbName: result.rows[0].db_name,
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('PostgreSQL接続失敗:', error);
    console.error('PostgreSQL接続失敗 詳細:', describeDbError(error));
    throw error;
  }
}

export default pool;
