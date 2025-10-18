const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./db');
app.use('/downloads', express.static(__dirname + '/downloads'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'gram-panchayat-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day in milliseconds
}));

// Serve static files

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
      res.redirect('/dashboard');
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
  if (!req.session || !req.session.adminId) {
    return res.redirect('/admin/login');
  }
  next();
}

// Middleware to protect user routes
function requireLogin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

app.get('/admin/dashboard', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Admin logout error:', err);
    }
    res.redirect('/admin/login');
  });
});

app.get('/admin/users', requireAdmin, (req, res) => {
  db.query('SELECT id, name, email FROM users', (err, results) => {
    if (err) return res.status(500).send('Error loading users');
    res.render('admin-users', { users: results });
  });
});

app.get('/house-tax', requireLogin, (req, res) => {
  res.sendFile(__dirname + '/views/house-tax.html');
});

app.post('/pay-house-tax', requireLogin, (req, res) => {
  const { ownerName, propertyId, address } = req.body;
  const userId = req.session.userId;

  if (!ownerName || !propertyId || !address) {
    return res.status(400).send('Missing required fields');
  }

  // Get admin-set tax amount for this user
  db.query('SELECT amount FROM user_house_tax WHERE user_id = ?', [userId], (err, results) => {
    if (err) {
      console.error('Error fetching tax amount:', err);
      return res.status(500).send('Internal Server Error');
    }

    const taxAmount = results.length > 0 ? parseFloat(results[0].amount) : 0;

    if (taxAmount === 0) {
      return res.status(400).send('No tax amount set by admin. Please contact administrator.');
    }

    const query = `
      INSERT INTO house_tax (owner_name, tax_amount, property_id, address)
      VALUES (?, ?, ?, ?)
    `;

    db.query(query, [ownerName, taxAmount, propertyId, address], (err, result) => {
      if (err) {
        console.error('Error inserting house tax data:', err);
        return res.status(500).send('Internal Server Error');
      }
      res.send('✅ House tax payment submitted successfully!');
    });
  });
});

app.get('/download/:type/:id', requireLogin, async (req, res) => {
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
  } else {
    return res.status(400).send('Invalid type');
  }

  try {
    const [rows] = await db.promise().query(query, [id]);

    if (rows.length === 0) return res.status(404).send('Receipt not found');

    const receipt = rows[0];

    // Generate PDF receipt
    const doc = new PDFDocument({ margin: 50 });
    const filename = `${type.replace(/\s+/g, '_')}_receipt_${receipt.id}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(20).text(`${type.replace('-', ' ').toUpperCase()} RECEIPT`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Receipt ID: ${receipt.id}`);
    doc.text(`Name: ${receipt.name || 'N/A'}`);
    doc.text(`Amount: ₹${receipt.amount}`);
    doc.text(`Date: ${new Date(receipt.date).toLocaleString()}`);

    doc.moveDown();
    doc.fontSize(10).fillColor('#666').text('This is a system-generated receipt and does not require a signature.', { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('Error in receipt download:', err);
    res.status(500).send('Server Error');
  }
});

// API to get all receipts for download-receipts.html
app.get('/api/receipts', requireLogin, (req, res) => {
  const queries = [
    { name: 'House Tax', sql: 'SELECT id, owner_name as name, tax_amount as amount, created_at as date, "house-tax" as type FROM house_tax' },
    { name: 'Water Tax', sql: 'SELECT id, owner_name as name, amount, created_at as date, "water-tax" as type FROM water_tax' },

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

app.get('/water-tax', requireLogin, (req, res) => {
  res.sendFile(__dirname + '/views/water-tax.html');
});

app.post('/pay-water-tax', requireLogin, (req, res) => {
  const { ownerName, houseNumber, mobile, transactionId } = req.body;
  const userId = req.session.userId;

  if (!ownerName || !houseNumber || !mobile || !transactionId) {
    return res.status(400).send('Missing required fields');
  }

  // Get admin-set tax amount for this user
  db.query('SELECT amount FROM user_water_tax WHERE user_id = ?', [userId], (err, results) => {
    if (err) {
      console.error('Error fetching tax amount:', err);
      return res.status(500).send('Internal Server Error');
    }

    const amount = results.length > 0 ? parseFloat(results[0].amount) : 0;

    if (amount === 0) {
      return res.status(400).send('No tax amount set by admin. Please contact administrator.');
    }

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
});


// Removed other taxes routes


app.get('/electricity-bill', requireLogin, (req, res) => {
  res.sendFile(__dirname + '/views/electricity-bill.html');
});

// ...existing code...
app.post('/pay-electricity-bill', requireLogin, async (req, res) => {
  const { consumerName, meterNumber, billingMonth, unitsConsumed, upiId } = req.body;
  const userId = req.session.userId;

  if (!consumerName || !meterNumber || !billingMonth || !unitsConsumed || !upiId) {
    return res.status(400).send('Missing required fields');
  }

  try {
    // Get admin-set tax amount for this user
    const [results] = await db.promise().query('SELECT amount FROM user_electricity_tax WHERE user_id = ?', [userId]);
    const amount = results.length > 0 ? parseFloat(results[0].amount) : 0;

    if (amount === 0) {
      return res.status(400).send('No tax amount set by admin. Please contact administrator.');
    }

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

// API to get user dashboard statistics
app.get('/api/user/stats', requireLogin, (req, res) => {
  const userId = req.session.userId;
  // console.log(userId);

  // Get user's email to match with payment records
  db.query('SELECT email, name FROM users WHERE id = ?', [userId], (err, userResults) => {
    if (err || userResults.length === 0) {
      return res.status(500).json({ error: 'User not found' });
    }

    const userName = userResults[0].name;
    // console.log(userName);
    // Count total transactions for this user (matching by name)
    const queries = [
      `SELECT COUNT(*) as count, COALESCE(SUM(tax_amount), 0) as total FROM house_tax WHERE owner_name = ?`,
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM water_tax WHERE owner_name = ?`,

      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM electricity_bill WHERE consumer_name = ?`
    ];

    let completed = 0;
    let totalTransactions = 0;
    let totalAmount = 0;

    queries.forEach(query => {
      db.query(query, [userName], (err, results) => {
        if (!err && results.length > 0) {
          totalTransactions += parseInt(results[0].count);
          totalAmount += parseFloat(results[0].total);
        }
        completed++;

        if (completed === queries.length) {
          // Get announcement count
          db.query('SELECT COUNT(*) as count FROM announcements WHERE status = "active"', (err, announcementResults) => {
            const newNotices = err ? 0 : announcementResults[0].count;

            res.json({
              pendingPayments: 0, // Can be calculated based on due dates if implemented
              totalTransactions: totalTransactions,
              totalAmount: totalAmount,
              newNotices: newNotices,
              servicesAvailable: 6
            });
          });
        }
      });
    });
  });
});

// API to get user tax amounts set by admin
app.get('/api/user-tax-amounts/:taxType', requireLogin, (req, res) => {
  const userId = req.session.userId;
  const { taxType } = req.params;

  let tableName;
  let query;

  switch (taxType) {
    case 'house':
      tableName = 'user_house_tax';
      query = 'SELECT amount FROM user_house_tax WHERE user_id = ?';
      break;
    case 'water':
      tableName = 'user_water_tax';
      query = 'SELECT amount FROM user_water_tax WHERE user_id = ?';
      break;
    case 'electricity':
      tableName = 'user_electricity_tax';
      query = 'SELECT amount FROM user_electricity_tax WHERE user_id = ?';
      break;
    // Removed other tax case
    default:
      return res.status(400).json({ error: 'Invalid tax type' });
  }

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching tax amount:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const amount = results.length > 0 ? parseFloat(results[0].amount) : 0;
    res.json({ amount });
  });
});

// API to get admin dashboard statistics
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const queries = {
    users: 'SELECT COUNT(*) as count FROM users',
    houseTax: 'SELECT COUNT(*) as count, COALESCE(SUM(tax_amount), 0) as total FROM house_tax',
    waterTax: 'SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM water_tax',

    electricity: 'SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM electricity_bill',
    announcements: 'SELECT COUNT(*) as count FROM announcements WHERE status = "active"'
  };
  
  let stats = {
    totalUsers: 0,
    totalRevenue: 0,
    completedPayments: 0,
    activeAnnouncements: 0
  };
  
  let completed = 0;
  const totalQueries = Object.keys(queries).length;
  
  // Get user count
  db.query(queries.users, (err, results) => {
    if (!err) stats.totalUsers = results[0].count;
    completed++;
    checkComplete();
  });
  
  // Get house tax stats
  db.query(queries.houseTax, (err, results) => {
    if (!err) {
      stats.completedPayments += parseInt(results[0].count);
      stats.totalRevenue += parseFloat(results[0].total);
    }
    completed++;
    checkComplete();
  });
  
  // Get water tax stats
  db.query(queries.waterTax, (err, results) => {
    if (!err) {
      stats.completedPayments += parseInt(results[0].count);
      stats.totalRevenue += parseFloat(results[0].total);
    }
    completed++;
    checkComplete();
  });
  

  
  // Get electricity stats
  db.query(queries.electricity, (err, results) => {
    if (!err) {
      stats.completedPayments += parseInt(results[0].count);
      stats.totalRevenue += parseFloat(results[0].total);
    }
    completed++;
    checkComplete();
  });
  
  // Get announcements count
  db.query(queries.announcements, (err, results) => {
    if (!err) stats.activeAnnouncements = results[0].count;
    completed++;
    checkComplete();
  });
  
  function checkComplete() {
    if (completed === totalQueries) {
      res.json(stats);
    }
  }
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

app.get('/admin-user-taxes', requireAdmin, (req, res) => {
  res.sendFile(__dirname + '/views/admin-user-taxes.html');
});

app.get('/admin-user-tax-status', requireAdmin, (req, res) => {
  res.sendFile(__dirname + '/views/admin-user-tax-status.html');
});

// API to get user tax status (amounts and payment status)
app.get('/admin/user-tax-status', requireAdmin, (req, res) => {
  // Get all users
  db.query('SELECT id, name, email FROM users', (err, users) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (users.length === 0) {
      return res.json([]);
    }

    let processedUsers = 0;
    const result = [];

    users.forEach(user => {
      // Get admin-set tax amounts for this user
      const taxQueries = [
        { type: 'House Tax', table: 'user_house_tax', paymentTable: 'house_tax', nameField: 'owner_name' },
        { type: 'Water Tax', table: 'user_water_tax', paymentTable: 'water_tax', nameField: 'owner_name' },
        { type: 'Electricity Bill', table: 'user_electricity_tax', paymentTable: 'electricity_bill', nameField: 'consumer_name' }
      ];

      let userTaxes = [];
      let completedQueries = 0;

      taxQueries.forEach(taxQuery => {
        // Get admin-set amount
        db.query(`SELECT amount FROM ${taxQuery.table} WHERE user_id = ?`, [user.id], (err, amountResults) => {
          const adminAmount = amountResults.length > 0 ? parseFloat(amountResults[0].amount) : 0;

          // Get payment status (check if user has paid)
          db.query(`SELECT COUNT(*) as count FROM ${taxQuery.paymentTable} WHERE ${taxQuery.nameField} = ?`, [user.name], (err, paymentResults) => {
            const hasPaid = paymentResults[0].count > 0;

            let status = 'no-amount';
            let statusText = 'No Amount Set';

            if (adminAmount > 0) {
              status = hasPaid ? 'paid' : 'unpaid';
              statusText = hasPaid ? 'Paid' : 'Unpaid';
            }

            userTaxes.push({
              type: taxQuery.type,
              amount: adminAmount,
              status: status,
              statusText: statusText,
              tableName: taxQuery.table
            });

            completedQueries++;

            if (completedQueries === taxQueries.length) {
              // Add user to result (removed other taxes handling)
              result.push({
                id: user.id,
                name: user.name,
                email: user.email,
                taxes: userTaxes
              });

              processedUsers++;
              if (processedUsers === users.length) {
                res.json(result);
              }
            }
          });
        });
      });
    });
  });
});

// API to get users list for admin tax management
app.get('/admin/users-list', requireAdmin, (req, res) => {
  const query = 'SELECT id, name, email FROM users';
  db.query(query, (err, users) => {
    if (err) return res.status(500).json({ error: 'Error fetching users' });
    res.json(users);
  });
});

// API to get user tax amounts set by admin
app.get('/admin/user-taxes/:userId', requireAdmin, (req, res) => {
  const userId = req.params.userId;

  const queries = [
    { type: 'house', sql: 'SELECT amount FROM user_house_tax WHERE user_id = ?' },
    { type: 'water', sql: 'SELECT amount FROM user_water_tax WHERE user_id = ?' },
    { type: 'electricity', sql: 'SELECT amount FROM user_electricity_tax WHERE user_id = ?' },
    // Removed other tax query
  ];

  let taxAmounts = {
    house: 0,
    water: 0,
    electricity: 0
  };

  let completed = 0;

  queries.forEach(q => {
    db.query(q.sql, [userId], (err, results) => {
      if (!err) {
        taxAmounts[q.type] = results.length > 0 ? parseFloat(results[0].amount) : 0;
      }
      completed++;
      if (completed === queries.length) {
        res.json(taxAmounts);
      }
    });
  });
});

// API to update user tax amounts
app.post('/admin/user-taxes/:userId', requireAdmin, (req, res) => {
  const userId = req.params.userId;
  const { taxType, tableName, amount } = req.body;

  // Handle single tax update from the tax status page
  if (taxType && tableName && amount !== undefined) {
    let sql;
    let params;

    // Removed other tax handling
    sql = `INSERT INTO ${tableName} (user_id, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount = ?`;
    params = [userId, amount, amount];

    db.query(sql, params, (err) => {
      if (err) {
        console.error('Error updating tax amount:', err);
        return res.status(500).json({ error: 'Failed to update tax amount' });
      }
      res.json({ success: true, message: 'Tax amount updated successfully' });
    });
    return;
  }

  // Handle bulk update from the user taxes page (legacy support)
  const { house, water, electricity } = req.body;

  const updates = [];

  // Update house tax
  if (house !== undefined) {
    updates.push({
      sql: 'INSERT INTO user_house_tax (user_id, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount = ?',
      params: [userId, house, house]
    });
  }

  // Update water tax
  if (water !== undefined) {
    updates.push({
      sql: 'INSERT INTO user_water_tax (user_id, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount = ?',
      params: [userId, water, water]
    });
  }

  // Update electricity tax
  if (electricity !== undefined) {
    updates.push({
      sql: 'INSERT INTO user_electricity_tax (user_id, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount = ?',
      params: [userId, electricity, electricity]
    });
  }

  // Removed other taxes update

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No tax amounts provided' });
  }

  let completed = 0;
  let errors = [];

  updates.forEach(update => {
    db.query(update.sql, update.params, (err) => {
      if (err) {
        console.error('Error updating tax amount:', err);
        errors.push(err.message);
      }
      completed++;
      if (completed === updates.length) {
        if (errors.length > 0) {
          res.status(500).json({ error: 'Some updates failed', details: errors });
        } else {
          res.json({ success: true, message: 'Tax amounts updated successfully' });
        }
      }
    });
  });
});

 app.get('/dashboard', requireLogin, (req,res)=>{
res.sendFile(__dirname+'/views/dashboard.html');
 });
 app.get('/dashboard.html', (req,res)=>{ res.redirect('/dashboard'); });

 app.get('/download-receipts', requireLogin, (req, res) => {
  res.sendFile(__dirname + '/views/download-reciepts.html');
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

// API to get user tax amounts
app.get('/api/user-tax-amounts/:userId/:taxType', requireLogin, (req, res) => {
  const { userId, taxType } = req.params;

  // Ensure user can only access their own tax amounts
  if (req.session.userId != userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  let tableName;
  let query;

  switch (taxType) {
    case 'house':
      tableName = 'user_house_tax';
      query = 'SELECT amount FROM user_house_tax WHERE user_id = ?';
      break;
    case 'water':
      tableName = 'user_water_tax';
      query = 'SELECT amount FROM user_water_tax WHERE user_id = ?';
      break;
    case 'electricity':
      tableName = 'user_electricity_tax';
      query = 'SELECT amount FROM user_electricity_tax WHERE user_id = ?';
      break;
    // Removed other tax case
    default:
      return res.status(400).json({ error: 'Invalid tax type' });
  }

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const amount = results.length > 0 ? parseFloat(results[0].amount) : 0;
    res.json({ amount });
  });
});

// Removed other tax API endpoint

// Admin routes are handled within this file; legacy admin router removed.

// Server
app.listen(3000, () => {
  console.log('✅ Server running on http://localhost:3000');
});


