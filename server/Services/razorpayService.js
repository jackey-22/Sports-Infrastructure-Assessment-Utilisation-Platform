const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function csvCredentials(filePath) {
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  const [headerLine, valueLine] = text.split(/\r?\n/);
  const headers = String(headerLine || "").split(",").map((item) => item.trim());
  const values = String(valueLine || "").split(",").map((item) => item.trim());
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  return { keyId: row.key_id, keySecret: row.key_secret };
}

function credentials() {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return {
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET,
    };
  }

  const localConfigPath = path.resolve(__dirname, "../razorpay.local.json");
  if (fs.existsSync(localConfigPath)) {
    const localConfig = JSON.parse(fs.readFileSync(localConfigPath, "utf8"));
    if (localConfig.credentialsFile) return csvCredentials(localConfig.credentialsFile);
  }

  throw new Error("Razorpay credentials are not configured");
}

async function razorpayRequest(method, endpoint, body) {
  const { keyId, keySecret } = credentials();
  const response = await fetch(`https://api.razorpay.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.description || "Razorpay request failed");
    error.status = response.status;
    throw error;
  }
  return data;
}

async function createOrder({ amount, receipt, notes }) {
  return razorpayRequest("POST", "/orders", {
    amount: Math.round(Number(amount) * 100),
    currency: "INR",
    receipt: String(receipt).slice(0, 40),
    notes,
  });
}

async function fetchPayment(paymentId) {
  return razorpayRequest("GET", `/payments/${encodeURIComponent(paymentId)}`);
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const { keySecret } = credentials();
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const actualBuffer = Buffer.from(String(signature || ""), "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function checkoutKeyId() {
  return credentials().keyId;
}

module.exports = { createOrder, fetchPayment, verifyPaymentSignature, checkoutKeyId };
