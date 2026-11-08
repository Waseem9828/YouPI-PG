import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { encryptAtRest } from '../packages/common/src/index.js';
import { hashApiKey } from '../packages/db/src/index.js';

export function seedSadafMerchant(dbInstance) {
  const db = dbInstance.db || dbInstance;
  const sadafMerchantId = '33333333-3333-3333-3333-333333333333';
  const webhookSecret = 'sadaf_webhook_secret_9828786246';
  const apiKey = 'yp_live_sadaf_9828786246';
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT id FROM merchants WHERE id = ? OR slug = ?').get(sadafMerchantId, 'sadaf-computer-centre');

  if (!existing) {
    const insertStmt = db.prepare(`
      INSERT INTO merchants (id, business_name, slug, contact_email, contact_phone, webhook_url, webhook_secret, api_key_hash, branding, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(
      sadafMerchantId,
      'SADAF computer centre',
      'sadaf-computer-centre',
      'Sadafcomputercenter@gamail.cim',
      '09828786246',
      'https://acme.com/api/webhook',
      encryptAtRest(webhookSecret),
      hashApiKey(apiKey),
      JSON.stringify({ primaryColor: '#2563eb', appName: 'SADAF computer centre', logoUrl: null }),
      now,
      now
    );
    console.log('✅ SADAF computer centre Merchant created successfully');
  } else {
    const updateStmt = db.prepare(`
      UPDATE merchants 
      SET business_name = ?, slug = ?, contact_email = ?, contact_phone = ?, webhook_url = ?, webhook_secret = ?, api_key_hash = ?, branding = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(
      'SADAF computer centre',
      'sadaf-computer-centre',
      'Sadafcomputercenter@gamail.cim',
      '09828786246',
      'https://acme.com/api/webhook',
      encryptAtRest(webhookSecret),
      hashApiKey(apiKey),
      JSON.stringify({ primaryColor: '#2563eb', appName: 'SADAF computer centre', logoUrl: null }),
      now,
      existing.id
    );
    console.log('✅ SADAF computer centre Merchant updated successfully');
  }

  const targetMerchantId = existing ? existing.id : sadafMerchantId;

  // Ensure active receiving account for this merchant
  const accId = '33333333-3333-3333-3333-000000000003';
  const existingAcc = db.prepare('SELECT id FROM payment_receiving_accounts WHERE id = ? OR (merchant_id = ? AND upi_id = ?)').get(accId, targetMerchantId, '9828786246@upi');

  if (!existingAcc) {
    db.prepare(`
      INSERT INTO payment_receiving_accounts (id, merchant_id, upi_id, payee_name, is_merchant_enabled, is_active, is_slot_busy, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, 1, 0, ?, ?)
    `).run(accId, targetMerchantId, '9828786246@upi', 'SADAF computer centre', now, now);
    console.log('✅ SADAF computer centre Receiving Account (9828786246@upi) created successfully');
  } else {
    db.prepare(`
      UPDATE payment_receiving_accounts 
      SET upi_id = ?, payee_name = ?, is_merchant_enabled = 1, is_active = 1, updated_at = ?
      WHERE id = ?
    `).run('9828786246@upi', 'SADAF computer centre', now, existingAcc.id);
    console.log('✅ SADAF computer centre Receiving Account (9828786246@upi) updated successfully');
  }

  return {
    merchantId: targetMerchantId,
    apiKey,
    webhookSecret
  };
}

// Standalone execution
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const db = new DatabaseSync('./data/youpi_pg.sqlite');
  seedSadafMerchant(db);
}
