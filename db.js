// db.js
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'dileep_18',
  database: 'gram_panchayat',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Optional: Test connection and log result
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.stack);
  } else {
    console.log('✅ Connected to MySQL');
    connection.release();
  }
});

module.exports = pool;
