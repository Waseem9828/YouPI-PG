# YOUPI PG V2 — 24/7 Cloud Deployment & Multi-App Integration Guide
## संपूर्ण क्लाउड डिप्लॉयमेंट एवं मल्टी-वेबसाइट इंटीग्रेशन गाइड

यह गाइड आपको सिखाती है कि कैसे **YOUPI PG V2** को अपने कंप्यूटर पर निर्भर रखे बिना, क्लाउड सर्वर (VPS या Render/Railway) पर **24/7 ऑनलाइन (Live)** चलाया जाए, ताकि आपका कंप्यूटर बंद (Off) होने के बाद भी पेमेंट गेटवे हमेशा चालू रहे, और आप इसे अपनी **मल्टीपल वेबसाइट्स व ऐप्स** में कैसे इस्तेमाल कर सकते हैं।

---

## 📑 विषय-सूची (Table of Contents)
1. [आर्किटेक्चर: कंप्यूटर बंद करने के बाद कैसे काम करेगा?](#1-आर्किटेक्चर-कंप्यूटर-बंद-करने-के-बाद-कैसे-काम-करेगा)
2. [विधि 1: किसी भी VPS (Ubuntu / Linux) पर 24/7 लाइव करना (Recommended)](#2-विधि-1-किसी-भी-vps-ubuntu--linux-पर-247-लाइव-करना-recommended)
3. [विधि 2: Docker Compose द्वारा 1-क्लिक डिप्लॉयमेंट](#3-विधि-2-docker-compose-द्वारा-1-क्लिक-डिप्लॉयमेंट)
4. [विधि 3: फ्री / लो-कॉस्ट PaaS (Render / Railway) पर डिप्लॉयमेंट](#4-विधि-3-फ्री--लो-कॉस्ट-paas-render--railway-पर-डिप्लॉयमेंट)
5. [एंड्रॉइड ऑब्ज़र्वर फोन सेटअप (24/7 ऑटोमैटिक बैंक SMS डिटेक्शन)](#5-एंड्रॉइड-ऑब्ज़र्वर-फोन-सेटअप-247-ऑटोमैटिक-बैंक-sms-डिटेक्शन)
6. [एक ही गेटवे को मल्टीपल ऐप्स और वेबसाइट्स में कैसे इस्तेमाल करें?](#6-एक-ही-गेटवे-को-मल्टीपल-ऐप्स-और-वेबसाइट्स-में-कैसे-इस्तेमाल-करें)
7. [समस्या निवारण एवं सुरक्षा चेकलिस्ट](#7-समस्या-निवारण-एवं-सुरक्षा-चेकलिस्ट)

---

## 1. आर्किटेक्चर: कंप्यूटर बंद करने के बाद कैसे काम करेगा?

```
[ कस्टमर का मोबाइल / लैपटॉप ]
             │
             ▼
[ Cloud VPS / Server (24/7 Live) ]  <── (PC बंद होने पर भी यह क्लाउड पर चलता रहेगा)
  • Nginx Reverse Proxy + SSL
  • Port 6100 (Payment REST API)
  • Port 7000 (Checkout Portal & youpi.js)
  • Port 6002 (Bank SMS Observer Ingester)
             │
             ▲
             │ (Bank SMS Webhook)
[ 24/7 Android Observer Phone (WiFi + Charger पर) ]
  • बैंक से जुड़े फोन में YOUPI Observer APK इंस्टॉल रहेगा।
  • जैसे ही बैंक का SMS आएगा, फोन तुरंत क्लाउड सर्वर पर सिग्नल भेजेगा।
             │
             ▼
[ आपकी मर्चेंट वेबसाइट्स (App 1, App 2, App 3...) ]
  • Signed HMAC Webhook द्वारा इंस्टेंट पेमेंट कन्फर्म और रिकॉर्ड अपडेट!
```

---

## 2. विधि 1: किसी भी VPS (Ubuntu / Linux) पर 24/7 लाइव करना (Recommended)

आप **Hostinger, DigitalOcean, Hetzner, AWS, Linode या Linode** का कोई भी सस्ता VPS (₹300 - ₹500/महीना) ले सकते हैं।

### चरण 1: सर्वर में लॉगिन करें और आवश्यक टूल्स इंस्टॉल करें
```bash
# सर्वर अपडेट करें
sudo apt update && sudo apt upgrade -y

# Node.js 24+ (LTS) और Git इंस्टॉल करें
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# Node.js वर्जन जांचें
node -v  # v24.x होना चाहिए

# PM2 प्रोसेस मैनेजर इंस्टॉल करें
sudo npm install -g pm2
```

### चरण 2: GitHub से कोड क्लोन करें
```bash
cd /var/www
git clone https://github.com/Waseem9828/YouPI-PG.git youpi-pg
cd youpi-pg

# डिपेंडेंसी इंस्टॉल करें
npm install
```

### चरण 3: एनवायरनमेंट वेरिएबल्स (.env) कॉन्फ़िगर करें
```bash
cp .env.example .env
nano .env
```
अपने डोमेन और सीक्रेट्स भरें (उदाहरण):
```env
NODE_ENV=production
YOUPI_MODE=production
YOUPI_ALLOW_LOCALHOST_MODE=true

BASE_PAYMENT_API_URL=https://pay.yourdomain.com
BASE_CHECKOUT_URL=https://pay.yourdomain.com
BASE_ADMIN_URL=https://admin.yourdomain.com

PAYMENT_API_PORT=6100
CHECKOUT_PORTAL_PORT=7000
MERCHANT_ADMIN_PORT=6001
SMS_OBSERVER_PORT=6002
GMAIL_OBSERVER_PORT=6003
CONTROL_CENTER_PORT=8090
```

### चरण 4: PM2 से 24/7 बैकग्राउंड में चलाएं
```bash
# गेटवे शुरू करें
pm2 start ecosystem.config.cjs

# सर्वर रीबूट होने पर भी ऑटोमैटिक स्टार्ट होने के लिए:
pm2 save
pm2 startup
```
अब अगर आप अपना कंप्यूटर बंद भी कर देंगे, तो सर्वर पर गेटवे 24 घंटे लगातार चलता रहेगा।

### चरण 5: Nginx रिवर्स प्रॉक्सी और फ्री SSL (Certbot)
`/etc/nginx/sites-available/youpi` फ़ाइल बनाएं:
```bash
sudo nano /etc/nginx/sites-available/youpi
```
कॉन्फ़िगरेशन डालें:
```nginx
server {
    server_name pay.yourdomain.com;

    # Checkout Portal & Frontend SDK (Port 7000)
    location / {
        proxy_pass http://127.0.0.1:7000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Core Payment REST API (Port 6100)
    location /api/ {
        proxy_pass http://127.0.0.1:6100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SMS Observer Ingester (Port 6002)
    location /sms-observer/ {
        rewrite ^/sms-observer/(.*) /$1 break;
        proxy_pass http://127.0.0.1:6002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Nginx सक्षम करें और फ्री SSL लगाएं:
```bash
sudo ln -s /etc/nginx/sites-available/youpi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Let's Encrypt से फ़्री SSL लगाएं
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d pay.yourdomain.com
```

---

## 3. विधि 2: Docker Compose द्वारा 1-क्लिक डिप्लॉयमेंट

यदि आप Docker का उपयोग करते हैं:
```bash
# रिपोजिटरी में जाएं
cd youpi-pg

# बैकग्राउंड में 24/7 कंटेनर शुरू करें
docker compose up -d

# लॉग्स देखें
docker compose logs -f
```

---

## 4. विधि 3: फ्री / लो-कॉस्ट PaaS (Render / Railway) पर डिप्लॉयमेंट

अगर आप VPS और Linux टर्मिनल नहीं संभालना चाहते, तो **Railway.app** या **Render.com** सबसे आसान है:

1. **GitHub Repository कनेक्ट करें**:
   - Render या Railway पर लॉगिन करें।
   - **New Web Service** चुनें और अपनी `YouPI-PG` GitHub रिपोजिटरी चुनें।
2. **Build & Start Commands सेट करें**:
   - **Build Command**: `npm install`
   - **Start Command**: `node scripts/dev.js`
3. **Environment Variables जोड़ें**:
   - `NODE_ENV=production`
   - `YOUPI_MODE=production`
   - `YOUPI_ALLOW_LOCALHOST_MODE=true`
   - `BASE_PAYMENT_API_URL=https://your-service.onrender.com`
   - `BASE_CHECKOUT_URL=https://your-service.onrender.com`
4. **Deploy**: डिप्लॉय होते ही आपको 24/7 लाइव HTTPS लिंक मिल जाएगा।

---

## 5. एंड्रॉइड ऑब्ज़र्वर फोन सेटअप (24/7 ऑटोमैटिक बैंक SMS डिटेक्शन)

बैंक SMS को डिटेक्ट करने के लिए किसी एक सस्ते एंड्रॉइड फोन में यह ऐप चालू रखें:

1. **APK इंस्टॉल करें**:
   - `apps/android-observer-app/build/outputs/apk/release/app-release.apk` को फोन में इंस्टॉल करें।
2. **Server URL डालें**:
   - ऐप खोलें और सर्वर यूआरएल में डालें: `https://pay.yourdomain.com` (या `http://<vps-ip>:6002`)
   - अपना Observer API Token दर्ज करें।
3. **आवश्यक अनुमतियां दें**:
   - **Notification Listener Access** (ताकि बैंक SMS का नोटिफिकेशन तुरंत पढ़े)।
   - **SMS Read Permission**।
   - **Battery Optimization Bypass**: फोन सेटिंग्स में जाकर ऐप की बैटरी ऑप्टिमाइजेशन को `Don't optimize` / `Unrestricted` पर सेट करें ताकि स्क्रीन लॉक होने पर भी ऐप बंद न हो।
4. फोन को चार्जर और WiFi से जोड़कर रख दें। अब चाहे आप दुनिया में कहीं भी रहें, पेमेंट 24/7 ऑटोमैटिक वेरीफाई होता रहेगा।

---

## 6. एक ही गेटवे को मल्टीपल ऐप्स और वेबसाइट्स में कैसे इस्तेमाल करें?

YOUPI PG पूरी तरह **Multi-Tenant (मल्टीपल मर्चेंट्स)** सपोर्ट करता है। आप एक ही सर्वर से 10, 50 या 100 अलग-अलग वेबसाइट्स व ऐप्स जोड़ सकते हैं।

### उदाहरण सेटअप:
* **Gateway सर्वर**: `https://pay.yourdomain.com`
* **App 1 (इमाम तनख्वाह ऐप)**: `https://imam.yourdomain.com`
* **App 2 (ई-कॉमर्स स्टोर)**: `https://shop.yourdomain.com`
* **App 3 (डोनेशन पोर्टल)**: `https://donate.yourdomain.com`

---

### चरण 1: हर ऐप के लिए अलग Merchant Key व ID बनाएं
आप Merchant Admin डैशबोर्ड (`http://<vps-ip>:6001`) में जाकर या API द्वारा नया मर्चेंट बना सकते हैं:

```bash
# App 2 (दुकान/शॉप) के लिए नया मर्चेंट बनाएं:
curl -X POST https://pay.yourdomain.com/api/v1/merchants \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your_admin_token" \
  -d '{
    "businessName": "My Online Store",
    "webhookUrl": "https://shop.yourdomain.com/api/webhook/youpi",
    "contactEmail": "store@yourdomain.com"
  }'
```
आपको मिलेगा:
* `merchantId`: `33333333-3333-3333-3333-333333333333`
* `apiKey`: `mk_live_shop_store_xyz123`
* `webhookSecret`: `whsec_shop_secret_abc456`

---

### चरण 2: वेबसाइट में पेमेंट बटन जोड़ें (Universal One-Script)

अपनी वेबसाइट के HTML पेज में केवल यह एक स्क्रिप्ट और बटन जोड़ें:

```html
<!-- 1. Universal Gateway Script (लाइव गेटवे सर्वर से) -->
<script
  src="https://pay.yourdomain.com/youpi.js"
  data-youpi-key="mk_live_shop_store_xyz123"
></script>

<!-- 2. किसी भी बटन पर data-youpi-pay टैग लगाएं -->
<button
  data-youpi-pay
  data-order-id="ORDER-9801"
  data-amount="299"
  data-currency="INR"
  data-customer-name="Rahul Sharma"
  data-customer-phone="9876543210"
  data-metadata='{"item": "T-Shirt", "size": "L"}'
>
  Pay ₹299 via UPI
</button>
```

---

### चरण 3: बैकएंड वेबहुक हैंडलर (Authoritative Payment Confirmation)

जब कस्टमर पेमेंट पूरा करेगा, तो गेटवे आपकी वेबसाइट के सर्वर पर सुरक्षित **HMAC-SHA256** साइन किया हुआ वेबहुक भेजेगा:

#### Node.js / Express Example:
```javascript
import crypto from 'node:crypto';
import express from 'express';

const app = express();

app.post('/api/webhook/youpi', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-gateway-signature'] || '';
  const secret = process.env.YOUPI_WEBHOOK_SECRET; // whsec_shop_secret_abc456

  // 1. HMAC Signature की पुष्टि करें
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  if (signature !== expected) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 2. पेमेंट स्टेटस और विवरण निकालें
  const payload = JSON.parse(req.body.toString('utf8'));
  if (payload.event === 'SUCCESS') {
    const { orderId, amount, utr, metadata } = payload;
    console.log(`[PAID] Order ${orderId} received ₹${amount} with Bank UTR: ${utr}`);

    // अपनी डेटाबेस में ऑर्डर को PAID मार्क करें
    // await db.orders.markAsPaid(orderId, { utr });
  }

  res.status(200).json({ received: true });
});
```

---

## 7. समस्या निवारण एवं सुरक्षा चेकलिस्ट

| जांच का विषय | समाधान |
| :--- | :--- |
| **क्या कंप्यूटर बंद होने पर गेटवे बंद हो जाएगा?** | नहीं, यदि आपने इसे VPS या Render पर चलाया है तो यह क्लाउड पर 24/7 चलता रहेगा। |
| **ऑब्ज़र्वर फोन स्लीप/किल हो गया?** | फोन की बैटरी सेटिंग्स में जाएं और ऐप को `Unrestricted Battery Usage` दें। |
| **मल्टीपल वेबसाइट्स का डेटा मिक्स होगा?** | नहीं, हर ऐप का अलग `merchantId`, `merchantKey` और `webhookSecret` होता है। |
| **डेटाबेस बैकअप कैसे लें?** | `data/youpi_pg.sqlite` फ़ाइल की नियमित बैकअप कॉपी लें (`cp data/youpi_pg.sqlite data/backup.sqlite`). |
