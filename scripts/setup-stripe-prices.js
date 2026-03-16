#!/usr/bin/env node

/**
 * Creates Stripe products and prices for WinBix AI SaaS,
 * then updates .env.local with the resulting Price IDs.
 *
 * Usage: node scripts/setup-stripe-prices.js
 * Requires: STRIPE_SECRET_KEY in .env.local
 */

const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
};

const STRIPE_SECRET_KEY = getEnv('STRIPE_SECRET_KEY');
if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === 'sk_placeholder') {
  console.error('Error: STRIPE_SECRET_KEY not set in .env.local');
  process.exit(1);
}

// Using native https to avoid needing stripe npm package installed
const https = require('https');

function stripeRequest(method, endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = data
      ? Object.entries(data)
          .flatMap(([k, v]) => {
            if (typeof v === 'object' && v !== null) {
              return Object.entries(v).map(
                ([sk, sv]) => `${encodeURIComponent(`${k}[${sk}`)}]=${encodeURIComponent(sv)}`
              );
            }
            return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
          })
          .join('&')
      : '';

    const options = {
      hostname: 'api.stripe.com',
      path: `/v1/${endpoint}`,
      method,
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    if (method === 'POST') {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.error) reject(new Error(`Stripe: ${json.error.message}`));
          else resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    if (method === 'POST') req.write(postData);
    req.end();
  });
}

const PLANS = [
  { name: 'WinBix AI — Basic (Monthly)', envKey: 'STRIPE_PRICE_BASIC_MONTHLY', amount: 2900, interval: 'month' },
  { name: 'WinBix AI — Basic (Annual)', envKey: 'STRIPE_PRICE_BASIC_ANNUAL', amount: 29000, interval: 'year' },
  { name: 'WinBix AI — Pro (Monthly)', envKey: 'STRIPE_PRICE_PRO_MONTHLY', amount: 7900, interval: 'month' },
  { name: 'WinBix AI — Pro (Annual)', envKey: 'STRIPE_PRICE_PRO_ANNUAL', amount: 79000, interval: 'year' },
];

async function main() {
  console.log('Creating Stripe products and prices...\n');

  const results = {};

  for (const plan of PLANS) {
    // Create product
    const product = await stripeRequest('POST', 'products', {
      name: plan.name,
    });
    console.log(`  Product: ${product.name} (${product.id})`);

    // Create price
    const price = await stripeRequest('POST', 'prices', {
      product: product.id,
      unit_amount: String(plan.amount),
      currency: 'usd',
      recurring: { interval: plan.interval },
    });
    console.log(`  Price:   ${price.id} — $${plan.amount / 100}/${plan.interval}\n`);

    results[plan.envKey] = price.id;
  }

  // Update .env.local
  let updated = envContent;
  for (const [key, value] of Object.entries(results)) {
    updated = updated.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${value}`);
  }

  fs.writeFileSync(envPath, updated, 'utf-8');
  console.log('Updated .env.local with Price IDs:\n');
  for (const [key, value] of Object.entries(results)) {
    console.log(`  ${key}=${value}`);
  }
  console.log('\nDone! Stripe is fully configured for testing.');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
