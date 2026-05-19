/**
 * SP-D Account self-test: register → profile → address CRUD → sign out
 * Run: node e2e-account.js
 * Requires server running on http://localhost:19009
 * Requires Medusa backend on http://localhost:9000
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:19009';
const API_BASE = 'http://localhost:9000';
const EMAIL = `test+${Date.now()}@hanoot.test`;
const PASSWORD = 'TestPass123!';

const results = [];

function pass(label) { results.push({ label, status: 'PASS' }); console.log(`  ✓ ${label}`); }
function fail(label, err) { results.push({ label, status: 'FAIL', err: String(err) }); console.log(`  ✗ ${label}:`, err); }

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // ───────────────────────────────────────────────
  // STEP 1: Navigate to /auth/register and fill form
  // ───────────────────────────────────────────────
  console.log('\n[1] Register screen');
  try {
    await page.goto(`${BASE}/auth/register`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const title = await page.title();
    pass('1a - register page loads');
  } catch (e) { fail('1a - register page loads', e); }

  try {
    // Check form inputs exist (Expo web renders TextInput as <input>)
    const inputs = await page.locator('input').count();
    if (inputs >= 4) {
      pass('1b - form has >=4 inputs (first, last, email, phone, password)');
    } else {
      fail('1b - form inputs count', `got ${inputs}`);
    }
  } catch (e) { fail('1b - form inputs count', e); }

  // ───────────────────────────────────────────────
  // STEP 2: Backend register (direct API check)
  // ───────────────────────────────────────────────
  console.log('\n[2] Backend register (direct API)');
  let backendAvailable = false;
  try {
    const resp = await page.request.post(`${API_BASE}/auth/customer/emailpass/register`, {
      data: { email: EMAIL, password: PASSWORD },
      timeout: 8000,
    });
    if (resp.ok()) {
      backendAvailable = true;
      pass('2a - POST /auth/customer/emailpass/register -> 200');
      const body = await resp.json();
      if (body.token) {
        pass('2b - registration token returned');
      } else {
        fail('2b - registration token returned', 'no token in response: ' + JSON.stringify(body));
      }
    } else {
      const txt = await resp.text();
      fail('2a - POST /auth/customer/emailpass/register', `status ${resp.status()}: ${txt.slice(0, 200)}`);
    }
  } catch (e) { fail('2a - POST /auth/customer/emailpass/register (backend reachable?)', e); }

  // ───────────────────────────────────────────────
  // STEP 3: Login + /store/customers/me
  // ───────────────────────────────────────────────
  console.log('\n[3] Backend login + fetch me');
  let authToken = null;
  if (backendAvailable) {
    try {
      // Create customer record (need registration token first)
      const regResp = await page.request.post(`${API_BASE}/auth/customer/emailpass/register`, {
        data: { email: `token-test-${Date.now()}@hanoot.test`, password: PASSWORD },
      });
      const regBody = await regResp.json();
      const regToken = regBody?.token;

      const loginResp = await page.request.post(`${API_BASE}/auth/customer/emailpass`, {
        data: { email: EMAIL, password: PASSWORD },
        timeout: 8000,
      });
      if (loginResp.ok()) {
        const loginBody = await loginResp.json();
        authToken = loginBody?.token;
        if (authToken) {
          pass('3a - login returns JWT');
        } else {
          fail('3a - login returns JWT', 'no token: ' + JSON.stringify(loginBody));
        }
      } else {
        fail('3a - login', `status ${loginResp.status()}`);
      }
    } catch (e) { fail('3a - login', e); }

    if (authToken) {
      try {
        const meResp = await page.request.get(`${API_BASE}/store/customers/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (meResp.ok()) {
          const meBody = await meResp.json();
          pass(`3b - GET /store/customers/me -> customer id=${meBody?.customer?.id}`);
        } else {
          fail('3b - GET /store/customers/me', `status ${meResp.status()}`);
        }
      } catch (e) { fail('3b - GET /store/customers/me', e); }
    }
  } else {
    results.push({ label: '3a - login (skipped - backend not reachable)', status: 'SKIP' });
    console.log('  - 3a,3b skipped (backend not reachable)');
  }

  // ───────────────────────────────────────────────
  // STEP 4: Addresses API
  // ───────────────────────────────────────────────
  console.log('\n[4] Addresses API');
  let createdAddressId = null;
  if (authToken) {
    try {
      const createResp = await page.request.post(`${API_BASE}/store/addresses`, {
        data: {
          label: 'Home',
          recipient_name: 'Test User',
          phone: '+9647001234567',
          street: 'Al-Mansour St',
          building: '12',
          apartment: '3A',
          city: 'Baghdad',
          country_code: 'IQ',
          delivery_instructions: 'Ring twice',
          is_default: true,
        },
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (createResp.ok()) {
        const body = await createResp.json();
        createdAddressId = body?.address?.id;
        pass(`4a - POST /store/addresses -> id=${createdAddressId}`);
      } else {
        const txt = await createResp.text();
        fail('4a - POST /store/addresses', `status ${createResp.status()}: ${txt.slice(0,200)}`);
      }
    } catch (e) { fail('4a - POST /store/addresses', e); }

    try {
      const listResp = await page.request.get(`${API_BASE}/store/addresses`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (listResp.ok()) {
        const body = await listResp.json();
        const count = body?.addresses?.length ?? 0;
        if (count > 0) {
          pass(`4b - GET /store/addresses -> ${count} address(es)`);
        } else {
          fail('4b - GET /store/addresses', 'empty list');
        }
      } else {
        fail('4b - GET /store/addresses', `status ${listResp.status()}`);
      }
    } catch (e) { fail('4b - GET /store/addresses', e); }

    if (createdAddressId) {
      try {
        const updateResp = await page.request.post(`${API_BASE}/store/addresses/${createdAddressId}`, {
          data: { label: 'Office' },
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (updateResp.ok()) {
          pass(`4c - POST /store/addresses/${createdAddressId} (update)`);
        } else {
          fail('4c - update address', `status ${updateResp.status()}`);
        }
      } catch (e) { fail('4c - update address', e); }

      try {
        const deleteResp = await page.request.delete(`${API_BASE}/store/addresses/${createdAddressId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (deleteResp.ok()) {
          pass(`4d - DELETE /store/addresses/${createdAddressId}`);
        } else {
          fail('4d - delete address', `status ${deleteResp.status()}`);
        }
      } catch (e) { fail('4d - delete address', e); }
    }
  } else {
    ['4a','4b','4c','4d'].forEach(s => {
      results.push({ label: `${s} - addresses (skipped)`, status: 'SKIP' });
      console.log(`  - ${s} skipped`);
    });
  }

  // ───────────────────────────────────────────────
  // STEP 5: Web UI smoke tests
  // ───────────────────────────────────────────────
  console.log('\n[5] Web UI smoke tests');
  const pages = [
    ['5a', `${BASE}/auth/login`, 'login page'],
    ['5b', `${BASE}/auth/register`, 'register page'],
    ['5c', `${BASE}/(tabs)/profile`, 'profile page'],
    ['5d', `${BASE}/addresses`, 'addresses list page'],
    ['5e', `${BASE}/addresses/new`, 'new address form'],
    ['5f', `${BASE}/profile/edit`, 'edit profile page'],
  ];
  for (const [step, url, label] of pages) {
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const status = resp?.status();
      if (status && status < 400) {
        pass(`${step} - ${label} (HTTP ${status})`);
      } else {
        fail(`${step} - ${label}`, `HTTP ${status}`);
      }
    } catch (e) { fail(`${step} - ${label}`, e); }
  }

  // ───────────────────────────────────────────────
  // STEP 6: Profile page shows Sign in CTA when not authenticated
  // ───────────────────────────────────────────────
  console.log('\n[6] Profile - unauthenticated state');
  try {
    await page.goto(`${BASE}/(tabs)/profile`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const html = await page.content();
    if (html.includes('Sign in to Hanoot') || html.includes('Log in') || html.includes('Create account')) {
      pass('6a - profile shows sign-in CTA when unauthenticated');
    } else {
      fail('6a - profile shows sign-in CTA', 'could not find expected text in page');
    }
  } catch (e) { fail('6a - profile shows sign-in CTA', e); }

  // ───────────────────────────────────────────────
  // SUMMARY
  // ───────────────────────────────────────────────
  await browser.close();

  console.log('\n══════════════════════════════════════════');
  console.log('  PLAYWRIGHT SELF-TEST SUMMARY');
  console.log('══════════════════════════════════════════');
  const passes = results.filter(r => r.status === 'PASS').length;
  const fails = results.filter(r => r.status === 'FAIL').length;
  const skips = results.filter(r => r.status === 'SKIP').length;
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'SKIP' ? '○' : '✗';
    console.log(`  ${icon} [${r.status}] ${r.label}${r.err ? '\n      ERROR: ' + r.err : ''}`);
  });
  console.log(`\n  Results: ${passes} PASS, ${fails} FAIL, ${skips} SKIP`);
  console.log('══════════════════════════════════════════\n');
  process.exit(fails > 0 ? 1 : 0);
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
