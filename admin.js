
const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('./db');

function isAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  res.redirect('/login.html'); 
}


router.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'adminlogin.html'));
});

// Admin Login Authentication
router.post('/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    req.session.isAdmin = true;
    res.redirect('/adminpanel.html');
  } else {
    res.send('Invalid admin credentials');
  }
});

// Admin Panel Page
router.get('/adminpanel', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'adminpanel.html'));
});

router.get('/admin/users', isAdmin, (req, res) => {
  const query = 'SELECT id, name, email FROM users';
  db.query(query, (err, users) => {
    if (err) return res.send('Error fetching users');
    res.json(users);
  });
});

// Send all taxes as JSON
router.get('/admin/taxes', isAdmin, (req, res) => {
  const query = 'SELECT * FROM taxes';
  db.query(query, (err, taxes) => {
    if (err) return res.send('Error fetching taxes');
    res.json(taxes);
  });
});

// Get user tax amounts set by admin
router.get('/admin/user-taxes/:userId', isAdmin, (req, res) => {
  const userId = req.params.userId;

  const queries = [
    { type: 'house', sql: 'SELECT amount FROM user_house_tax WHERE user_id = ?' },
    { type: 'water', sql: 'SELECT amount FROM user_water_tax WHERE user_id = ?' },
    { type: 'electricity', sql: 'SELECT amount FROM user_electricity_tax WHERE user_id = ?' },
    { type: 'other', sql: 'SELECT tax_type, amount FROM user_other_tax WHERE user_id = ?' }
  ];

  let taxAmounts = {
    house: 0,
    water: 0,
    electricity: 0,
    other: []
  };

  let completed = 0;

  queries.forEach(q => {
    db.query(q.sql, [userId], (err, results) => {
      if (!err) {
        if (q.type === 'other') {
          taxAmounts.other = results;
        } else {
          taxAmounts[q.type] = results.length > 0 ? parseFloat(results[0].amount) : 0;
        }
      }
      completed++;
      if (completed === queries.length) {
        res.json(taxAmounts);
      }
    });
  });
});

// Update user tax amounts
router.post('/admin/user-taxes/:userId', isAdmin, (req, res) => {
  const userId = req.params.userId;
  const { house, water, electricity, other } = req.body;

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

  // Update other taxes
  if (other && Array.isArray(other)) {
    other.forEach(tax => {
      updates.push({
        sql: 'INSERT INTO user_other_tax (user_id, tax_type, amount) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE amount = ?',
        params: [userId, tax.tax_type, tax.amount, tax.amount]
      });
    });
  }

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

// API to get all users for admin tax management
router.get('/admin/users-list', isAdmin, (req, res) => {
  const query = 'SELECT id, name, email FROM users';
  db.query(query, (err, users) => {
    if (err) return res.status(500).json({ error: 'Error fetching users' });
    res.json(users);
  });
});

// API to get tax amounts for a specific user
router.get('/admin/user-taxes/:userId', isAdmin, (req, res) => {
  const userId = req.params.userId;

  const queries = [
    { type: 'house', sql: 'SELECT amount FROM user_house_tax WHERE user_id = ?' },
    { type: 'water', sql: 'SELECT amount FROM user_water_tax WHERE user_id = ?' },
    { type: 'electricity', sql: 'SELECT amount FROM user_electricity_tax WHERE user_id = ?' },
    { type: 'other', sql: 'SELECT tax_type, amount FROM user_other_tax WHERE user_id = ?' }
  ];

  let taxAmounts = {
    house: 0,
    water: 0,
    electricity: 0,
    other: []
  };

  let completed = 0;

  queries.forEach(query => {
    db.query(query.sql, [userId], (err, results) => {
      if (!err) {
        if (query.type === 'other') {
          taxAmounts.other = results;
        } else {
          taxAmounts[query.type] = results.length > 0 ? parseFloat(results[0].amount) : 0;
        }
      }
      completed++;
      if (completed === queries.length) {
        res.json(taxAmounts);
      }
    });
  });
});

// API to update tax amounts for a user
router.post('/admin/user-taxes/:userId', isAdmin, (req, res) => {
  const userId = req.params.userId;
  const { house, water, electricity, other } = req.body;

  let operations = [];
  let completed = 0;
  let errors = [];

  // Update house tax
  if (house !== undefined) {
    operations.push(() => {
      db.query('INSERT INTO user_house_tax (user_id, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount = ?',
        [userId, house, house], (err) => {
          if (err) errors.push('house: ' + err.message);
          completed++;
          checkComplete();
        });
    });
  }

  // Update water tax
  if (water !== undefined) {
    operations.push(() => {
      db.query('INSERT INTO user_water_tax (user_id, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount = ?',
        [userId, water, water], (err) => {
          if (err) errors.push('water: ' + err.message);
          completed++;
          checkComplete();
        });
    });
  }

  // Update electricity tax
  if (electricity !== undefined) {
    operations.push(() => {
      db.query('INSERT INTO user_electricity_tax (user_id, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount = ?',
        [userId, electricity, electricity], (err) => {
          if (err) errors.push('electricity: ' + err.message);
          completed++;
          checkComplete();
        });
    });
  }

  // Update other taxes
  if (other && Array.isArray(other)) {
    other.forEach(tax => {
      operations.push(() => {
        db.query('INSERT INTO user_other_tax (user_id, tax_type, amount) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE amount = ?',
          [userId, tax.taxType, tax.amount, tax.amount], (err) => {
            if (err) errors.push(`other-${tax.taxType}: ` + err.message);
            completed++;
            checkComplete();
          });
      });
    });
  }

  function checkComplete() {
    if (completed === operations.length) {
      if (errors.length > 0) {
        res.status(500).json({ error: 'Some updates failed', details: errors });
      } else {
        res.json({ success: true, message: 'Tax amounts updated successfully' });
      }
    }
  }

  // Start operations
  operations.forEach(op => op());
});

module.exports = router;
