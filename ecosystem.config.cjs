// =============================================================================
// YOUPI PG V2 — PM2 Ecosystem Configuration for 24/7 Cloud Deployment
// 
// Usage on VPS (Ubuntu / Debian / CentOS / macOS):
//   npm install -g pm2
//   pm2 start ecosystem.config.cjs
//   pm2 save
//   pm2 startup
// =============================================================================

module.exports = {
  apps: [
    {
      name: 'youpi-pg-cluster',
      script: './scripts/dev.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        YOUPI_MODE: 'production',
        YOUPI_ALLOW_LOCALHOST_MODE: 'true',
        USE_SQLITE_FALLBACK: 'true',
        PAYMENT_API_PORT: 6100,
        CHECKOUT_PORTAL_PORT: 7000,
        MERCHANT_ADMIN_PORT: 6001,
        SMS_OBSERVER_PORT: 6002,
        GMAIL_OBSERVER_PORT: 6003,
        CONTROL_CENTER_PORT: 8090
      }
    }
  ]
};
