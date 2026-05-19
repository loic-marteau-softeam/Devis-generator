function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function sanitizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function computeQuoteTotals(lines, discountRate = 0, depositRate = 0) {
  const discount = Math.max(0, Math.min(100, sanitizeNumber(discountRate)));
  const deposit = Math.max(0, Math.min(100, sanitizeNumber(depositRate)));

  const normalizedLines = lines
    .map((line, index) => ({
      index,
      description: line.description || `Ligne ${index + 1}`,
      quantity: Math.max(0, sanitizeNumber(line.quantity)),
      unitPrice: Math.max(0, sanitizeNumber(line.unit_price ?? line.unitPrice)),
      vatRate: Math.max(0, sanitizeNumber(line.vat_rate ?? line.vatRate))
    }))
    .filter((line) => line.quantity > 0 && line.unitPrice >= 0);

  const factor = 1 - discount / 100;
  const lineTotals = normalizedLines.map((line) => {
    const baseHt = line.quantity * line.unitPrice;
    const discountedHt = baseHt * factor;
    const vatAmount = discountedHt * (line.vatRate / 100);
    const totalTtc = discountedHt + vatAmount;

    return {
      ...line,
      baseHt: round2(baseHt),
      discountedHt: round2(discountedHt),
      vatAmount: round2(vatAmount),
      totalTtc: round2(totalTtc)
    };
  });

  const totalHt = round2(lineTotals.reduce((sum, l) => sum + l.discountedHt, 0));
  const totalVat = round2(lineTotals.reduce((sum, l) => sum + l.vatAmount, 0));
  const totalTtc = round2(totalHt + totalVat);
  const depositAmount = round2(totalTtc * (deposit / 100));
  const remainingAmount = round2(totalTtc - depositAmount);

  return {
    lines: lineTotals,
    discountRate: discount,
    depositRate: deposit,
    totalHt,
    totalVat,
    totalTtc,
    depositAmount,
    remainingAmount
  };
}

module.exports = {
  computeQuoteTotals,
  round2
};
