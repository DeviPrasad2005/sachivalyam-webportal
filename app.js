const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./db');
const adminRoutes = require('./admin'); // admin.js routes
app.use('/downloads', express.static(__dirname + '/downloads'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'gram-panchayat-secret',
  resave: false,
  saveUninitialized: true,
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'views')));

// Routes
app.get('/', (req, res) => {
  console.log("✅ Server is working");
  res.sendFile(path.join(__dirname, 'views', 'home.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});

app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
  db.query(sql, [name, email, hashedPassword], (err) => {
    if (err) return res.send('Signup failed');
    res.redirect('/login');
  });
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
    if (err || results.length === 0) return res.send('User not found');
    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      req.session.userId = user.id;
      res.redirect('/dashboard.html');
    } else {
      res.send('Incorrect password');
    }
  });
});

app.get('/house-tax', (req, res) => {
  res.sendFile(__dirname + '/views/house-tax.html');
});


app.get('/download/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  let tableName, query;

  if (type === 'house-tax') {
    tableName = 'house_tax';
    query = `SELECT id, owner_name AS name, tax_amount AS amount, created_at AS date FROM ${tableName} WHERE id = ?`;
  } else if (type === 'water-tax') {
    tableName = 'water_tax';
    query = `SELECT id, owner_name AS name, amount, created_at AS date FROM ${tableName} WHERE id = ?`;
  } else if (type === 'electricity') {
    tableName = 'electricity_bill';
    query = `SELECT id, user_id, amount_due AS amount, billing_month AS date FROM ${tableName} WHERE id = ?`;
  } else {
    return res.status(400).send('Invalid type');
  }

  try {
    const [rows] = await db.promise().query(query, [id]);

    if (rows.length === 0) return res.status(404).send('Receipt not found');

    const receipt = rows[0];

    // Plain HTML fallback receipt
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>${type} Receipt</title></head>
      <body style="font-family: Arial; margin: 40px;">
        <h2>${type.replace('-', ' ').toUpperCase()} Receipt</h2>
        <p><strong>Name:</strong> ${receipt.name || 'N/A'}</p>
        <p><strong>Amount:</strong> ₹${receipt.amount}</p>
        <p><strong>Date:</strong> ${new Date(receipt.date).toLocaleDateString()}</p>
        <p><strong>Receipt ID:</strong> ${receipt.id}</p>
        <br>
        <a href="/dashboard.html" style="display: inline-block; padding: 8px 16px; background: green; color: white; border-radius: 6px; text-decoration: none;">Back to Dashboard</a>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Error in receipt download:', err);
    res.status(500).send('Server Error');
  }
});



app.get('/water-tax', (req, res) => {
  res.sendFile(__dirname + '/views/water-tax.html');
});

app.post('/pay-water-tax', (req, res) => {
  const { ownerName, houseNumber, mobile, amount, transactionId } = req.body;

  console.log("Water Tax Payment Received:", { ownerName, houseNumber, mobile, amount, transactionId });

  res.send("✅ Water tax payment successful. Thank you!");
});


app.get('/other-taxes', (req, res) => {
  res.sendFile(__dirname + '/views/other-taxes.html');
});

app.post('/pay-other-tax', (req, res) => {
  const { taxpayerName, taxType, mobile, amount, transactionId } = req.body;

  const query = `
    INSERT INTO other_tax (taxpayer_name, tax_type, mobile, amount, transaction_id)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(query, [taxpayerName, taxType, mobile, amount, transactionId], (err, result) => {
    if (err) {
      console.error('Error inserting other tax data:', err);
      return res.status(500).send('Internal Server Error');
    }

    res.send("✅ Other tax payment submitted successfully!");
  });
});


app.get('/electricity-bill', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  res.sendFile(__dirname + '/views/electricity-bill.html');
});

app.post('/electricity-bill', async (req, res) => {
  const { consumer_number, billing_month, units_consumed, amount_due } = req.body;
  const userId = req.session.userId;

  try {
    const [result] = await db.promise().execute(
      'INSERT INTO electricity_bill (user_id, consumer_number, billing_month, units_consumed, amount_due) VALUES (?, ?, ?, ?, ?)',
      [userId, consumer_number, billing_month, units_consumed, amount_due]
    );
    res.redirect('/electricity-bill'); // You can show success alert on frontend if needed
  } catch (err) {
    console.error('Electricity bill error:', err);
    res.status(500).send('Server Error');
  }
});

app.get('/announcements', (req, res) => {
  res.sendFile(__dirname + '/views/announcements.html');
});

app.get('/schemes', (req, res) => {
  res.sendFile(__dirname + '/views/schemes.html');
});

app.get('/notices', (req, res) => {
  res.sendFile(__dirname + '/views/notices.html');
});

app.get('/emergency', (req, res) => {
  res.sendFile(__dirname + '/views/emergency.html');
});


 app.get('/dashboard',(req,res)=>{
res.sendFile(__dirname+'/views/dashboard.html');
 });

// Admin routes
app.use(adminRoutes);

// Server
app.listen(3000, () => {
  console.log('✅ Server running on http://localhost:3000');
});


