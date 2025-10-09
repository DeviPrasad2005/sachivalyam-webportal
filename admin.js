
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

module.exports = router;
