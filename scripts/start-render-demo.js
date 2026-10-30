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

// Default to allowing checkout creation even before an Android observer phone is paired
process.env.YOUPI_ENFORCE_OBSERVER_HEALTH = process.env.YOUPI_ENFORCE_OBSERVER_HEALTH || 'false';

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

// Static asset directories across workspaces
const staticRoots = [
  path.resolve(rootDir, 'apps/coin-wallet-store/public'),
  path.resolve(rootDir, 'apps/checkout-portal/public'),
  path.resolve(rootDir, 'apps/merchant-admin/public')
];

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.apk': 'application/vnd.android.package-archive',
  '.yaml': 'text/yaml; charset=utf-8',
  '.ico': 'image/x-icon'
};

function tryServeStatic(pathname, res) {
  const cleanPath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
  for (const root of staticRoots) {
    const filePath = path.join(root, cleanPath);
    const rel = path.relative(root, filePath);
    if (!rel.startsWith('..') && !path.isAbsolute(rel) && fs.existsSync(filePath)) {
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': stat.size,
            'Cache-Control': ext === '.css' || ext === '.js' ? 'no-cache' : 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*'
          });
          fs.createReadStream(filePath).pipe(res);
          return true;
        }
      } catch {}
    }
  }
  return false;
}

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

  // Universal integration SDK script
  if (pathname === '/youpi.js' || pathname === '/sdk/youpi.js' || pathname === '/sdk/youpi-checkout.js') {
    const sdkPath = path.resolve(rootDir, 'apps/checkout-portal/src/sdk/youpi.js');
    if (fs.existsSync(sdkPath)) {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(fs.readFileSync(sdkPath, 'utf8'));
      return;
    }
  }

  // OpenAPI Specification
  if (pathname === '/openapi.yaml') {
    const openApiPath = path.resolve(rootDir, 'openapi.yaml');
    if (fs.existsSync(openApiPath)) {
      res.writeHead(200, {
        'Content-Type': 'text/yaml; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(fs.readFileSync(openApiPath, 'utf8'));
      return;
    }
  }

  // Android Companion APK download
  if (pathname === '/youpi-sms-gateway.apk' || pathname === '/api/v1/admin/sms-gateway/download-apk') {
    adminServer.emit('request', req, res);
    return;
  }

  // Check static file caches first (/css/*, /js/*, /assets/*, /icons/*, /fonts/*)
  if (tryServeStatic(pathname, res)) {
    return;
  }

  // Merchant Admin and Admin API endpoints
  if (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/api/admin/') ||
    pathname.startsWith('/api/services') ||
    pathname === '/api/logs/stream'
  ) {
    adminServer.emit('request', req, res);
    return;
  }

  // Demo Showcase Store pages & store APIs:
  // /store, /wallet, /order-*, /success, /failed, /suspicious, /expired, /cancelled, /api/checkout, /api/wallet-balance, /api/verify-payment, /api/webhook
  if (
    pathname === '/store' ||
    pathname.startsWith('/store/') ||
    pathname === '/wallet' ||
    pathname.startsWith('/order-') ||
    pathname === '/success' ||
    pathname === '/failed' ||
    pathname === '/suspicious' ||
    pathname === '/expired' ||
    pathname === '/cancelled' ||
    pathname === '/api/checkout' ||
    pathname === '/api/wallet-balance' ||
    pathname === '/api/verify-payment' ||
    pathname === '/api/webhook'
  ) {
    storeServer.emit('request', req, res);
    return;
  }

  // Core Payment API: /api/v1/*
  if (pathname.startsWith('/api/')) {
    coreServer.emit('request', req, res);
    return;
  }

  // Checkout Portal customer pages & iframe: /checkout/*
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