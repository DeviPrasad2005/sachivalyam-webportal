const bcrypt = require('bcrypt');
const db = require('./db');

async function insertAdmin() {
  const username = 'deviPrasad';
  const password = 'dileep_18'; // Change this to your desired password
  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = 'INSERT INTO admins (username, password) VALUES (?, ?)';
  db.query(sql, [username, hashedPassword], (err, result) => {
    if (err) {
      console.error('Error inserting admin:', err);
      return;
    }
    console.log('Admin user inserted successfully');
    db.end();
  });
}

insertAdmin();
