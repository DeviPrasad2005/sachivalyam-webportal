const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./db');
const adminRoutes = require('./admin'); // admin.js routes
app.use('/downloads', express.static(__dirname + '/downloads'));
app.set('view engine', 'ejs');

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
  const { fullname, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
  db.query(sql, [fullname, email, hashedPassword], (err) => {
    if (err) {
      console.log(err)
      return res.send('Signup failed');
    }
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

// ...existing code...

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  db.query('SELECT * FROM admins WHERE username = ?', [username], async (err, results) => {
    if (err || results.length === 0) {
      return res.send('Invalid admin credentials');
    }
    const admin = results[0];
    const match = await bcrypt.compare(password, admin.password);
    if (match) {
      req.session.adminId = admin.id;
      res.redirect('/admin/dashboard');
    } else {
      res.send('Invalid admin credentials');
    }
  });
});

app.post('/admin/users/delete/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  db.query('DELETE FROM users WHERE id = ?', [userId], (err) => {
    if (err) return res.status(500).send('Error deleting user');
    res.redirect('/admin/users');
  });
});
// ...existing code...

const PDFDocument = require('pdfkit');
const fs = require('fs');

app.get('/admin/payments', requireAdmin, (req, res) => {
  // Example: combine house_tax, water_tax, other_tax, electricity_bill
  const queries = [
    { name: 'House Tax', sql: 'SELECT id, owner_name, tax_amount, created_at FROM house_tax' },
    { name: 'Water Tax', sql: 'SELECT id, owner_name, house_number, mobile, amount, transaction_id, created_at FROM water_tax' },
    { name: 'Other Tax', sql: 'SELECT id, taxpayer_name, tax_type, mobile, amount, transaction_id, created_at FROM other_tax' },
    { name: 'Electricity Bill', sql: 'SELECT id, consumer_name, meter_number, billing_month, units_consumed, amount, upi_id, created_at FROM electricity_bill' }
  ];

  let payments = [];
  let completed = 0;

  queries.forEach((q, idx) => {
    db.query(q.sql, (err, results) => {
      if (!err) payments.push({ type: q.name, data: results });
      completed++;
      if (completed === queries.length) {
        res.render('admin-payments', { payments });
      }
    });
  });
});

// New route to generate PDF report of users who paid taxes
app.get('/admin/reports', requireAdmin, (req, res) => {
  const queries = [
    { name: 'House Tax', sql: 'SELECT owner_name AS name, tax_amount AS amount, created_at FROM house_tax' },
    { name: 'Water Tax', sql: 'SELECT owner_name AS name, amount, created_at FROM water_tax' },
    { name: 'Other Tax', sql: 'SELECT taxpayer_name AS name, amount, created_at FROM other_tax' },
    { name: 'Electricity Bill', sql: 'SELECT consumer_name AS name, amount, created_at FROM electricity_bill' }
  ];

  let allPayments = [];
  let completed = 0;

  queries.forEach((q) => {
    db.query(q.sql, (err, results) => {
      if (!err) allPayments = allPayments.concat(results);
      completed++;
      if (completed === queries.length) {
        // Generate PDF
        const doc = new PDFDocument();
        let filename = 'tax_payments_report.pdf';
        // Setting response to download
        res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        doc.fontSize(18).text('Tax Payments Report', { align: 'center' });
        doc.moveDown();

        allPayments.forEach(payment => {
          doc.fontSize(12).text(`Name: ${payment.name}`);
          doc.text(`Amount: ₹${payment.amount}`);
          doc.text(`Date: ${new Date(payment.created_at).toLocaleDateString()}`);
          doc.moveDown();
        });

        doc.end();
      }
    });
  });
});

// View all announcements
app.get('/admin/announcements', requireAdmin, (req, res) => {
  db.query('SELECT * FROM announcements ORDER BY created_at DESC', (err, results) => {
    if (err) return res.status(500).send('Error loading announcements');
    res.render('admin-announcements', { announcements: results });
  });
});

// Show form to add announcement
app.get('/admin/announcements/new', requireAdmin, (req, res) => {
  res.render('admin-announcement-new');
});

// Handle new announcement submission
app.post('/admin/announcements/new', requireAdmin, (req, res) => {
  const { title, message } = req.body;
  db.query('INSERT INTO announcements (title, message) VALUES (?, ?)', [title, message], (err) => {
    if (err) return res.status(500).send('Error posting announcement');
    res.redirect('/admin/announcements');
  });
});

app.post('/admin/announcements/delete/:id', requireAdmin, (req, res) => {
  const announcementId = req.params.id;
  db.query('DELETE FROM announcements WHERE id = ?', [announcementId], (err) => {
    if (err) return res.status(500).send('Error deleting announcement');
    res.redirect('/admin/announcements');
  });
});

// Show edit form
app.get('/admin/announcements/edit/:id', requireAdmin, (req, res) => {
  const announcementId = req.params.id;
  db.query('SELECT * FROM announcements WHERE id = ?', [announcementId], (err, results) => {
    if (err || results.length === 0) return res.status(404).send('Announcement not found');
    res.render('admin-announcement-edit', { announcement: results[0] });
  });
});

// Handle edit submission
app.post('/admin/announcements/edit/:id', requireAdmin, (req, res) => {
  const announcementId = req.params.id;
  const { title, message } = req.body;
  db.query('UPDATE announcements SET title = ?, message = ? WHERE id = ?', [title, message, announcementId], (err) => {
    if (err) return res.status(500).send('Error updating announcement');
    res.redirect('/admin/announcements');
  });
});
// Middleware to protect admin routes
function requireAdmin(req, res, next) {
  // if (!req.session.adminId) {
  //   return res.redirect('/admin/login');
  // }
  next();
}

app.get('/admin/dashboard', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

app.post('/admin/logout', (req, res) => {
  req.session.adminId = null;
  res.redirect('/admin/login');
});

app.get('/admin/users', requireAdmin, (req, res) => {
  db.query('SELECT id, name, email FROM users', (err, results) => {
    if (err) return res.status(500).send('Error loading users');
    res.render('admin-users', { users: results });
  });
});

app.get('/house-tax', (req, res) => {
  res.sendFile(__dirname + '/views/house-tax.html');
});

app.post('/pay-house-tax', (req, res) => {
  const { ownerName, houseNumber, mobile, taxAmount, transactionId } = req.body;

  const query = `
    INSERT INTO house_tax (owner_name, tax_amount)
    VALUES (?, ?)
  `;

  db.query(query, [ownerName, taxAmount], (err, result) => {
    if (err) {
      console.error('Error inserting house tax data:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.send("✅ House tax payment submitted successfully!");
  });
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
    query = `SELECT id, consumer_name AS name, amount, created_at AS date FROM ${tableName} WHERE id = ?`;
  } else if (type === 'other-tax') {
    tableName = 'other_tax';
    query = `SELECT id, taxpayer_name AS name, amount, created_at AS date FROM ${tableName} WHERE id = ?`;
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

// API to get all receipts for download-receipts.html
app.get('/api/receipts', (req, res) => {
  const queries = [
    { name: 'House Tax', sql: 'SELECT id, owner_name as name, tax_amount as amount, created_at as date, "house-tax" as type FROM house_tax' },
    { name: 'Water Tax', sql: 'SELECT id, owner_name as name, amount, created_at as date, "water-tax" as type FROM water_tax' },
    { name: 'Other Tax', sql: 'SELECT id, taxpayer_name as name, amount, created_at as date, "other-tax" as type FROM other_tax' },
    { name: 'Electricity', sql: 'SELECT id, consumer_name as name, amount, created_at as date, "electricity" as type FROM electricity_bill' }
  ];

  let allReceipts = [];
  let completed = 0;

  queries.forEach(q => {
    db.query(q.sql, (err, results) => {
      if (!err) allReceipts = allReceipts.concat(results);
      completed++;
      if (completed === queries.length) {
        res.json(allReceipts);
      }
    });
  });
});

app.get('/water-tax', (req, res) => {
  res.sendFile(__dirname + '/views/water-tax.html');
});

app.post('/pay-water-tax', (req, res) => {
  const { ownerName, houseNumber, mobile, amount, transactionId } = req.body;

  const query = `
    INSERT INTO water_tax (owner_name, house_number, mobile, amount, transaction_id)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(query, [ownerName, houseNumber, mobile, amount, transactionId], (err, result) => {
    if (err) {
      console.error('Error inserting water tax data:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.send("✅ Water tax payment submitted successfully!");
  });
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
  res.sendFile(__dirname + '/views/electricity-bill.html');
});

// ...existing code...
app.post('/electricity-bill', async (req, res) => {
  const { consumerName, meterNumber, billingMonth, unitsConsumed, amount, upiId } = req.body;
  const userId = req.session.userId;

  if (!consumerName || !meterNumber || !billingMonth || !unitsConsumed || !amount || !upiId) {
    return res.status(400).send('Missing required fields');
  }

  try {
    const sql = `INSERT INTO electricity_bill (consumer_name, meter_number, billing_month, units_consumed, amount, upi_id)
                 VALUES (?, ?, ?, ?, ?, ?)`;
    await db.promise().execute(sql, [consumerName, meterNumber, billingMonth, unitsConsumed, amount, upiId]);
    res.send('✅ Electricity bill payment successful!');
  } catch (err) {
    console.error('Electricity bill error:', err);
    res.status(500).send('Internal Server Error');
  }
});
// ...existing code...

app.get('/announcements', (req, res) => {
  res.sendFile(__dirname + '/views/announcements.html');
});

// API to get announcements
app.get('/api/announcements', (req, res) => {
  db.query('SELECT * FROM announcements ORDER BY created_at DESC', (err, results) => {
    if (err) return res.status(500).send('Error loading announcements');
    res.json(results);
  });
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


