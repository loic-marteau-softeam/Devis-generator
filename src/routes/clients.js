const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/clients', requireAuth, (req, res) => {
  const clients = db.prepare('SELECT * FROM clients ORDER BY created_at DESC').all();
  return res.render('clients/index', {
    title: 'Clients',
    clients,
    user: req.session.user
  });
});

router.post('/clients', requireRole('admin', 'commercial'), (req, res) => {
  const { company_name, contact_name, email, phone, address } = req.body;

  if (!company_name || !company_name.trim()) {
    return res.status(400).render('error', {
      title: 'Erreur client',
      message: 'Le nom de société est requis.',
      user: req.session.user
    });
  }

  db.prepare(
    `INSERT INTO clients (company_name, contact_name, email, phone, address)
     VALUES (?, ?, ?, ?, ?)`
  ).run(company_name.trim(), contact_name?.trim() || null, email?.trim() || null, phone?.trim() || null, address?.trim() || null);

  return res.redirect('/clients');
});

module.exports = router;
