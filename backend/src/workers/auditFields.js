// Per-model field whitelist for audit logging.
// Keys must match Prisma model names exactly (PascalCase).
//
// RULES (non-negotiable):
//   1. Pseudonymous IDs (id, customerId, merchantId, walletId) — OK
//   2. Business entity names (merchant name, company name) — OK (not individual names)
//   3. Status flags, timestamps, amounts, counts — OK
//   4. Person names, email, phone, address, IC, DOB — NEVER
//   5. Bank/card numbers, biometrics, tokens, passwordHash — NEVER
//   6. Free-text (comments, notes, remarks, feedback) — NEVER (may contain inline PII)
//   7. Model in auditPrisma but NOT in this map → logs only fact-of-change, zero field data (safe default)

export const AUDIT_FIELDS = {
  // ─── Auth / Users ───
  // User:     ['id', 'status', 'role', 'jwtVersion', 'createdAt', 'updatedAt'],
  // Customer: ['id', 'status', 'emailVerified', 'contactVerified', 'jwtVersion', 'createdAt', 'updatedAt'],
  // Merchant: ['id', 'status', 'createdAt', 'updatedAt'],

  // ─── Wallet ───
  // Wallet:        ['id', 'customerId', 'merchantId', 'currency', 'status', 'createdAt', 'updatedAt'],
  // WalletTopup:   ['id', 'walletId', 'amount', 'status', 'source', 'createdAt'],
  // WalletAdjust:  ['id', 'walletId', 'amount', 'type', 'createdAt'],

  // ─── Transactions ───
  // Transaction: ['id', 'walletId', 'merchantId', 'status', 'type', 'amount', 'currency', 'createdAt'],

  // ─── Orders ───
  // Order:     ['id', 'customerId', 'merchantId', 'status', 'paymentStatus', 'amount', 'currency', 'createdAt', 'updatedAt'],
  // OrderItem: ['id', 'orderId', 'quantity', 'amount', 'status', 'createdAt'],

  // ─── Withdrawal ───
  // Withdrawal: ['id', 'customerId', 'walletId', 'merchantId', 'status', 'amount', 'fee', 'netAmount', 'createdAt', 'updatedAt'],
};
