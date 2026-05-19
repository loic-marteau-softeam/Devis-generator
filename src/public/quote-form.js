function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function updatePreview() {
  const lineRows = Array.from(document.querySelectorAll('.line-row'));
  const discountRate = Math.max(0, Math.min(100, parseNumber(document.getElementById('discount_rate').value)));
  const depositRate = Math.max(0, Math.min(100, parseNumber(document.getElementById('deposit_rate').value)));

  const factor = 1 - discountRate / 100;

  let totalHt = 0;
  let totalVat = 0;

  lineRows.forEach((row) => {
    const quantity = Math.max(0, parseNumber(row.querySelector('[name="quantity"]').value));
    const unitPrice = Math.max(0, parseNumber(row.querySelector('[name="unit_price"]').value));
    const vatRate = Math.max(0, parseNumber(row.querySelector('[name="vat_rate"]').value));

    const discountedHt = quantity * unitPrice * factor;
    const vat = discountedHt * (vatRate / 100);

    totalHt += discountedHt;
    totalVat += vat;
  });

  totalHt = round2(totalHt);
  totalVat = round2(totalVat);
  const totalTtc = round2(totalHt + totalVat);
  const depositAmount = round2(totalTtc * (depositRate / 100));
  const remaining = round2(totalTtc - depositAmount);

  document.getElementById('preview-ht').textContent = totalHt.toFixed(2);
  document.getElementById('preview-vat').textContent = totalVat.toFixed(2);
  document.getElementById('preview-ttc').textContent = totalTtc.toFixed(2);
  document.getElementById('preview-deposit').textContent = depositAmount.toFixed(2);
  document.getElementById('preview-remaining').textContent = remaining.toFixed(2);
}

function addLine() {
  const line = document.createElement('div');
  line.className = 'line-row';
  line.innerHTML = `
    <input name="description" placeholder="Description" required />
    <input name="quantity" type="number" step="0.01" min="0" value="1" required />
    <input name="unit_price" type="number" step="0.01" min="0" value="100" required />
    <input name="vat_rate" type="number" step="0.01" min="0" value="20" required />
  `;

  document.getElementById('lines').appendChild(line);
  line.querySelectorAll('input').forEach((input) => input.addEventListener('input', updatePreview));
  updatePreview();
}

document.getElementById('add-line').addEventListener('click', addLine);
document.querySelectorAll('#quote-form input').forEach((input) => input.addEventListener('input', updatePreview));
updatePreview();
