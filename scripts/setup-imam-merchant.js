import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { encryptAtRest } from '../packages/common/src/index.js';
import { hashApiKey } from '../packages/db/src/index.js';

export function seedImamMerchant(dbInstance) {
  const db = dbInstance.db || dbInstance;
  const imamMerchantId = '22222222-2222-2222-2222-222222222222';
  const webhookSecret = 'imam_tankhwah_webhook_secret_waseem_9828';
  const apiKey = 'mk_live_imam_tankhwah_waseem_9828';

  const existing = db.prepare('SELECT id FROM merchants WHERE id = ?').get(imamMerchantId);
  const now = new Date().toISOString();

  if (!existing) {
    const insertStmt = db.prepare(`
      INSERT INTO merchants (id, business_name, slug, contact_email, contact_phone, webhook_url, webhook_secret, api_key_hash, branding, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(
      imamMerchantId,
      'इमाम तनख्वाह प्रबंधन (मस्जिद कमेटी)',
      'imam-tankhwah',
      'waseem@example.com',
      '9828786246',
      'http://127.0.0.1:3001/api/webhook/youpi',
      encryptAtRest(webhookSecret),
      hashApiKey(apiKey),
      JSON.stringify({ primaryColor: '#176b50', appName: 'इमाम तनख्वाह प्रबंधन', logoUrl: null }),
      now,
      now
    );
    console.log('✅ Imam Tankhwah Merchant created successfully');
  } else {
    const updateStmt = db.prepare(`
      UPDATE merchants 
      SET business_name = ?, webhook_url = ?, webhook_secret = ?, api_key_hash = ?, branding = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(
      'इमाम तनख्वाह प्रबंधन (मस्जिद कमेटी)',
      'http://127.0.0.1:3001/api/webhook/youpi',
      encryptAtRest(webhookSecret),
      hashApiKey(apiKey),
      JSON.stringify({ primaryColor: '#176b50', appName: 'इमाम तनख्वाह प्रबंधन', logoUrl: null }),
      now,
      imamMerchantId
    );
    console.log('✅ Imam Tankhwah Merchant updated successfully');
  }

  // Ensure active receiving account for this merchant
  const accId = '22222222-2222-2222-2222-000000000002';
  const existingAcc = db.prepare('SELECT id FROM payment_receiving_accounts WHERE id = ?').get(accId);

  if (!existingAcc) {
    db.prepare(`
      INSERT INTO payment_receiving_accounts (id, merchant_id, upi_id, payee_name, is_merchant_enabled, is_active, is_slot_busy, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, 1, 0, ?, ?)
    `).run(accId, imamMerchantId, 'prabhulal-8@bpunity', 'Prabhulal', now, now);
    console.log('✅ Imam Tankhwah Receiving Account (prabhulal-8@bpunity) created successfully');
  } else {
    db.prepare(`
      UPDATE payment_receiving_accounts 
      SET upi_id = ?, payee_name = ?, is_merchant_enabled = 1, is_active = 1, updated_at = ?
      WHERE id = ?
    `).run('prabhulal-8@bpunity', 'Prabhulal', now, accId);
    console.log('✅ Imam Tankhwah Receiving Account (prabhulal-8@bpunity) updated successfully');
  }
}

// Standalone execution
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const db = new DatabaseSync('./data/youpi_pg.sqlite');
  seedImamMerchant(db);
}
