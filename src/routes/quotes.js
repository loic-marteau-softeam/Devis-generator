const express = require('express');
const { db, getNextQuoteNumber } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { computeQuoteTotals } = require('../services/calculations');
const { createQuotePdf } = require('../services/pdf');

const router = express.Router();

function normalizeLines(body) {
  const descriptions = Array.isArray(body.description) ? body.description : [body.description];
  const quantities = Array.isArray(body.quantity) ? body.quantity : [body.quantity];
  const unitPrices = Array.isArray(body.unit_price) ? body.unit_price : [body.unit_price];
  const vatRates = Array.isArray(body.vat_rate) ? body.vat_rate : [body.vat_rate];

  return descriptions
    .map((description, index) => ({
      description: (description || '').trim(),
      quantity: Number(quantities[index]),
      unit_price: Number(unitPrices[index]),
      vat_rate: Number(vatRates[index])
    }))
    .filter((line) => line.description && Number.isFinite(line.quantity) && Number.isFinite(line.unit_price) && Number.isFinite(line.vat_rate));
}

router.get('/quotes', requireAuth, (req, res) => {
  const quotes = db
    .prepare(
      `SELECT q.*, c.company_name, u.username AS created_by_name
       FROM quotes q
       JOIN clients c ON c.id = q.client_id
       JOIN users u ON u.id = q.created_by
       ORDER BY q.created_at DESC`
    )
    .all();

  return res.render('quotes/index', {
    title: 'Devis',
    quotes,
    user: req.session.user
  });
});

router.get('/quotes/new', requireRole('admin', 'commercial'), (req, res) => {
  const clients = db.prepare('SELECT * FROM clients ORDER BY company_name ASC').all();
  return res.render('quotes/new', {
    title: 'Nouveau devis',
    clients,
    quoteNumber: getNextQuoteNumber(),
    user: req.session.user
  });
});

router.post('/quotes', requireRole('admin', 'commercial'), (req, res) => {
  const { client_id, issue_date, valid_until, discount_rate, deposit_rate, notes } = req.body;
  const lines = normalizeLines(req.body);

  if (!client_id || lines.length === 0) {
    return res.status(400).render('error', {
      title: 'Erreur devis',
      message: 'Le client et au moins une ligne sont requis.',
      user: req.session.user
    });
  }

  const totals = computeQuoteTotals(lines, discount_rate, deposit_rate);
  if (totals.lines.length === 0) {
    return res.status(400).render('error', {
      title: 'Erreur devis',
      message: 'Les lignes de devis sont invalides.',
      user: req.session.user
    });
  }

  const createQuote = db.transaction(() => {
    const quoteNumber = getNextQuoteNumber();
    const quoteResult = db
      .prepare(
        `INSERT INTO quotes
         (quote_number, client_id, status, issue_date, valid_until, discount_rate, deposit_rate, notes, created_by)
         VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?)`
      )
      .run(
        quoteNumber,
        Number(client_id),
        issue_date || new Date().toISOString().slice(0, 10),
        valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        totals.discountRate,
        totals.depositRate,
        notes || null,
        req.session.user.id
      );

    const quoteId = quoteResult.lastInsertRowid;

    const insertLine = db.prepare(
      `INSERT INTO quote_lines (quote_id, position, description, quantity, unit_price, vat_rate)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    totals.lines.forEach((line, index) => {
      insertLine.run(quoteId, index + 1, line.description, line.quantity, line.unitPrice, line.vatRate);
    });

    db.prepare('INSERT INTO quote_history (quote_id, action, performed_by) VALUES (?, ?, ?)').run(
      quoteId,
      'Création du devis',
      req.session.user.id
    );

    return quoteId;
  });

  const quoteId = createQuote();
  return res.redirect(`/quotes/${quoteId}`);
});

router.get('/quotes/:id', requireAuth, (req, res) => {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(Number(req.params.id));

  if (!quote) {
    return res.status(404).render('error', {
      title: 'Devis introuvable',
      message: 'Aucun devis correspondant.',
      user: req.session.user
    });
  }

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(quote.client_id);
  const lines = db.prepare('SELECT * FROM quote_lines WHERE quote_id = ? ORDER BY position ASC').all(quote.id);
  const history = db
    .prepare(
      `SELECT h.*, u.username
       FROM quote_history h
       LEFT JOIN users u ON u.id = h.performed_by
       WHERE h.quote_id = ?
       ORDER BY h.created_at DESC`
    )
    .all(quote.id);

  const totals = computeQuoteTotals(lines, quote.discount_rate, quote.deposit_rate);

  return res.render('quotes/show', {
    title: `Devis ${quote.quote_number}`,
    quote,
    client,
    lines: totals.lines,
    totals,
    history,
    user: req.session.user
  });
});

router.post('/quotes/:id/status', requireRole('admin', 'commercial'), (req, res) => {
  const quoteId = Number(req.params.id);
  const { status } = req.body;

  if (!['draft', 'validated', 'sent'].includes(status)) {
    return res.status(400).render('error', {
      title: 'Statut invalide',
      message: 'Le statut demandé est invalide.',
      user: req.session.user
    });
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE quotes
     SET status = ?,
         validated_at = CASE WHEN ? = 'validated' THEN ? ELSE validated_at END,
         sent_at = CASE WHEN ? = 'sent' THEN ? ELSE sent_at END
     WHERE id = ?`
  ).run(status, status, now, status, now, quoteId);

  db.prepare('INSERT INTO quote_history (quote_id, action, performed_by) VALUES (?, ?, ?)').run(
    quoteId,
    `Changement de statut: ${status}`,
    req.session.user.id
  );

  return res.redirect(`/quotes/${quoteId}`);
});

router.post('/quotes/:id/share', requireRole('admin', 'commercial'), (req, res) => {
  const quoteId = Number(req.params.id);
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(quoteId);

  if (!quote) {
    return res.status(404).render('error', {
      title: 'Devis introuvable',
      message: 'Impossible de partager ce devis.',
      user: req.session.user
    });
  }

  db.prepare('UPDATE quotes SET status = ?, sent_at = ? WHERE id = ?').run('sent', new Date().toISOString(), quoteId);
  db.prepare('INSERT INTO quote_history (quote_id, action, performed_by) VALUES (?, ?, ?)').run(
    quoteId,
    'Partage du devis (simulation email)',
    req.session.user.id
  );

  return res.redirect(`/quotes/${quoteId}`);
});

router.get('/quotes/:id/pdf', requireAuth, (req, res) => {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(Number(req.params.id));

  if (!quote) {
    return res.status(404).render('error', {
      title: 'Devis introuvable',
      message: 'Impossible de générer le PDF.',
      user: req.session.user
    });
  }

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(quote.client_id);
  const lines = db.prepare('SELECT * FROM quote_lines WHERE quote_id = ? ORDER BY position ASC').all(quote.id);

  const pdf = createQuotePdf(quote, client, lines);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${quote.quote_number}.pdf"`);

  return pdf.pipe(res);
});

module.exports = router;
