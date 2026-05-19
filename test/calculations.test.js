const test = require('node:test');
const assert = require('node:assert/strict');
const { computeQuoteTotals } = require('../src/services/calculations');

test('computeQuoteTotals supports multi-VAT with discount and deposit', () => {
  const totals = computeQuoteTotals(
    [
      { description: 'Design', quantity: 2, unit_price: 100, vat_rate: 20 },
      { description: 'Dev', quantity: 1, unit_price: 200, vat_rate: 10 }
    ],
    10,
    30
  );

  assert.equal(totals.totalHt, 360);
  assert.equal(totals.totalVat, 54);
  assert.equal(totals.totalTtc, 414);
  assert.equal(totals.depositAmount, 124.2);
  assert.equal(totals.remainingAmount, 289.8);
});

test('computeQuoteTotals clamps invalid rates', () => {
  const totals = computeQuoteTotals([{ description: 'X', quantity: 1, unit_price: 100, vat_rate: 20 }], 130, -10);
  assert.equal(totals.discountRate, 100);
  assert.equal(totals.depositRate, 0);
  assert.equal(totals.totalTtc, 0);
});
