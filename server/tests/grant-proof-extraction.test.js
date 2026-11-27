const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeExtraction } = require("../Services/grantProofExtraction");

test("grant proof extraction normalizes OCR financial fields", () => {
  const result = normalizeExtraction({
    documentType: "Invoice",
    vendorName: "Shree Sports Supplies",
    invoiceNumber: "INV-104",
    documentDate: "2026-11-20",
    currency: "inr",
    subtotal: "₹ 42,000.00",
    taxAmount: "7,560",
    totalAmount: "49,560.00",
    confidence: 1.4,
    warnings: ["Stamp is partly unclear"],
  }, { provider: "gemini", model: "test-model", scannedAt: new Date("2026-11-27") });

  assert.equal(result.status, "Completed");
  assert.equal(result.totalAmount, 49560);
  assert.equal(result.subtotal, 42000);
  assert.equal(result.taxAmount, 7560);
  assert.equal(result.currency, "INR");
  assert.equal(result.confidence, 1);
  assert.deepEqual(result.warnings, ["Stamp is partly unclear"]);
});

test("grant proof extraction keeps unknown amounts null", () => {
  const result = normalizeExtraction({
    documentType: "Payment proof",
    totalAmount: "not visible",
    subtotal: "",
    confidence: "not-known",
  });

  assert.equal(result.totalAmount, null);
  assert.equal(result.subtotal, null);
  assert.equal(result.confidence, 0);
});
