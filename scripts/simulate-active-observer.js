import { getDatabase } from '../packages/db/src/database.js';

const db = getDatabase();
const id = 'dev-simulated-device-01';
const merchantId = '00000000-0000-0000-0000-000000000001';

function beat() {
  try {
    const now = new Date().toISOString();
    db.execute(`
      INSERT OR REPLACE INTO android_devices (
        id, merchant_id, device_name, device_model, signing_key_hash, is_active, last_heartbeat_at, created_at
      ) VALUES (?, ?, ?, ?, ?, 1, datetime('now'), ?)
    `, [id, merchantId, 'Simulated Observer Phone', 'Android 14', 'simulated_hash', now]);
    console.log(`[${new Date().toLocaleTimeString()}] ✅ Observer heartbeat updated.`);
  } catch (err) {
    console.error('Heartbeat error:', err.message);
  }
}

beat();
setInterval(beat, 60000); // Pulse every 60 seconds
