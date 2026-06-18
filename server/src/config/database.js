import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'estimate_invoice_db',
  waitForConnections: true,
  connectionLimit: 10,
});

// mysql2/promiseのプールラッパーは内部の生プールが発火する 'error'
// イベント（アイドル接続の切断など）を転送しない。リスナーが無いまま
// 'error' が発火するとプロセスがクラッシュするため、ここで捕捉する。
pool.pool.on('error', (err) => {
  console.error('MySQLプールエラー:', err);
});

export async function testConnection() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT DATABASE() AS db_name');
    return {
      connected: true,
      dbName: rows[0].db_name,
    };
  } finally {
    connection.release();
  }
}

export default pool;
