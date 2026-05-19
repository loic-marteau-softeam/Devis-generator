const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { db } = require('../db');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const stats = {
    clients: db.prepare('SELECT COUNT(*) AS count FROM clients').get().count,
    quotes: db.prepare('SELECT COUNT(*) AS count FROM quotes').get().count,
    drafts: db.prepare("SELECT COUNT(*) AS count FROM quotes WHERE status = 'draft'").get().count,
    sent: db.prepare("SELECT COUNT(*) AS count FROM quotes WHERE status = 'sent'").get().count
  };

  const latestQuotes = db
    .prepare(
      `SELECT q.id, q.quote_number, q.status, q.created_at, c.company_name
       FROM quotes q
       JOIN clients c ON c.id = q.client_id
       ORDER BY q.created_at DESC
       LIMIT 5`
    )
    .all();

  return res.render('dashboard', {
    title: 'Tableau de bord',
    stats,
    latestQuotes,
    user: req.session.user
  });
});

module.exports = router;
