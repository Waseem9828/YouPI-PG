import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPaymentApp } from '../apps/payment-api/src/index.js';
import { CheckoutServer } from '../apps/checkout-portal/src/server.js';
import { AdminServer } from '../apps/merchant-admin/src/server.js';
import { CoinWalletStoreServer } from '../apps/coin-wallet-store/src/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PORT = Number(process.env.PORT || 10000);
const BIND_HOST = '0.0.0.0';

console.log('====================================================');
console.log('🚀 Starting YOUPI PG Cloud Unified Host for Render/Cloud');
console.log('====================================================');

// 1. Initialize core services in-memory
const paymentApp = createPaymentApp();
const coreServer = paymentApp.rawServer;

const checkoutService = new CheckoutServer({
  apiBaseUrl: `http://127.0.0.1:${PORT}`
});
const checkoutServer = checkoutService.createServer();

const adminService = new AdminServer({
  db: paymentApp.context.db,
  apiBaseUrl: `http://127.0.0.1:${PORT}`
});
const adminServer = adminService.createServer();

const storeService = new CoinWalletStoreServer({
  gatewayApiUrl: `http://127.0.0.1:${PORT}`,
  merchantId: '00000000-0000-0000-0000-000000000001'
});
const storeServer = storeService.createServer();

// 2. Gateway router dispatching to the appropriate sub-service based on path
const unifiedServer = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Global Health endpoint
  if (pathname === '/health' || pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'UP',
      service: 'youpi-pg-unified',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Root URL: Redirect to demo store
  if (pathname === '/' || pathname === '') {
    res.writeHead(302, { Location: '/store' });
    res.end();
    return;
  }

  // Core Payment API: /api/*
  if (pathname.startsWith('/api/')) {
    coreServer.emit('request', req, res);
    return;
  }

  // Merchant Admin: /admin or /admin/*
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    adminServer.emit('request', req, res);
    return;
  }

  // Demo Showcase Store: /store, /wallet, /order-*
  if (pathname === '/store' || pathname.startsWith('/store/') || pathname === '/wallet' || pathname.startsWith('/order-')) {
    storeServer.emit('request', req, res);
    return;
  }

  // Default: Checkout portal & universal integration SDK
  // /youpi.js, /checkout/*, /icons/*, /css/*, /js/*, /
  checkoutServer.emit('request', req, res);
});

unifiedServer.listen(PORT, BIND_HOST, () => {
  console.log(`[✓] YOUPI PG Unified Cloud Gateway listening on ${BIND_HOST}:${PORT}`);
  console.log(`[✓] Core REST API:       http://${BIND_HOST}:${PORT}/api/v1/*`);
  console.log(`[✓] Checkout Portal:     http://${BIND_HOST}:${PORT}/checkout/:id`);
  console.log(`[✓] Universal SDK:       http://${BIND_HOST}:${PORT}/youpi.js`);
  console.log(`[✓] Merchant Admin:      http://${BIND_HOST}:${PORT}/admin`);
  console.log(`[✓] Showcase Store:      http://${BIND_HOST}:${PORT}/store`);
  console.log('====================================================\n');
});

// Graceful shutdown
const shutdown = () => {
  console.log('\nShutting down cloud gateway cleanly...');
  paymentApp.destroy();
  unifiedServer.close(() => {
    console.log('Gateway closed.');
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);