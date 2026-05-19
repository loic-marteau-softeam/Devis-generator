const PDFDocument = require('pdfkit');
const { computeQuoteTotals } = require('./calculations');

function createQuotePdf(quote, client, lines) {
  const totals = computeQuoteTotals(lines, quote.discount_rate, quote.deposit_rate);
  const doc = new PDFDocument({ margin: 50 });

  doc.fontSize(20).text('Devis', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Numéro: ${quote.quote_number}`);
  doc.text(`Statut: ${quote.status}`);
  doc.text(`Date: ${quote.issue_date}`);
  doc.text(`Valable jusqu'au: ${quote.valid_until}`);
  doc.moveDown();

  doc.fontSize(13).text('Client', { underline: true });
  doc.fontSize(11).text(client.company_name);
  if (client.contact_name) doc.text(`Contact: ${client.contact_name}`);
  if (client.email) doc.text(`Email: ${client.email}`);
  if (client.phone) doc.text(`Téléphone: ${client.phone}`);
  if (client.address) doc.text(client.address);
  doc.moveDown();

  doc.fontSize(13).text('Prestations', { underline: true });
  doc.moveDown(0.5);

  totals.lines.forEach((line) => {
    doc
      .fontSize(10)
      .text(
        `${line.description} | Qté: ${line.quantity} | PU HT: ${line.unitPrice.toFixed(2)}€ | TVA: ${line.vatRate}% | Total TTC: ${line.totalTtc.toFixed(2)}€`
      );
  });

  doc.moveDown();
  doc.fontSize(12).text(`Remise: ${totals.discountRate}%`);
  doc.text(`Acompte: ${totals.depositRate}%`);
  doc.text(`Total HT: ${totals.totalHt.toFixed(2)} €`);
  doc.text(`Total TVA: ${totals.totalVat.toFixed(2)} €`);
  doc.text(`Total TTC: ${totals.totalTtc.toFixed(2)} €`);
  doc.text(`Acompte à verser: ${totals.depositAmount.toFixed(2)} €`);
  doc.text(`Reste à payer: ${totals.remainingAmount.toFixed(2)} €`);

  if (quote.notes) {
    doc.moveDown();
    doc.fontSize(12).text('Notes');
    doc.fontSize(10).text(quote.notes);
  }

  if (quote.payment_schedule) {
    doc.moveDown();
    doc.fontSize(12).text('Échéancier de paiement');
    doc.fontSize(10).text(quote.payment_schedule);
  }

  doc.moveDown();
  doc.fontSize(12).text('Mentions légales');
  doc.fontSize(9).text(quote.legal_mentions || 'Ce devis est valable pour la période indiquée ci-dessus.', {
    align: 'left'
  });

  doc.end();
  return doc;
}

module.exports = {
  createQuotePdf
};
