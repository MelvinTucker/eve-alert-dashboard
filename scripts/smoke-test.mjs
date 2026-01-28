#!/usr/bin/env node
/**
 * Smoke test for deployed dashboard.
 * Exits non-zero if any endpoint fails.
 */

const BASE = process.env.DASHBOARD_URL || 'https://eve-alert-dashboard.vercel.app';
const paths = [
  '/api/health',
  '/',
  '/accounts',
  '/accounts/MelTuc',
  '/characters/MelTuc',
];

async function main() {
  for (const p of paths) {
    const url = `${BASE}${p}`;
    const resp = await fetch(url, { redirect: 'follow' });
    if (!resp.ok) {
      const text = await resp.text();
      console.error(`FAIL ${url} -> ${resp.status}`);
      console.error(text.slice(0, 400));
      process.exit(1);
    }
    console.log(`OK ${url} -> ${resp.status}`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
