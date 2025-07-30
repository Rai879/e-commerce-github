const mysql = require('mysql2');

// Untuk kode lama (pakai callback / .query)
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ecommerce_db',
});

// Untuk kode baru (pakai async/await dan .execute)
const promisePool = pool.promise();

module.exports = {
  // Untuk kode lama
  query: (...args) => pool.query(...args),

  // Untuk kode baru
  execute: (...args) => promisePool.execute(...args),

  pool,         // jika ada yang pakai pool langsung
  promisePool,  // untuk eksplisit pakai promise pool (opsional)
};
