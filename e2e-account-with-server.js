/**
 * SP-D Account self-test: starts the static server then runs Playwright tests.
 * Run: node e2e-account-with-server.js
 */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 19009;
const BASE = `http://localhost:${PORT}`;
const API_BASE = 'http://127.0.0.1:9000';
const EMAIL = `test+${Date.now()}@hanoot.test`;
const PASSWORD = 'TestPass123!';
const PUB_KEY = 'pk_93955e55e64a552747b4e823efaf62b16d9af5016112d81ab42fde45add5862d';

const SERVE_SCRIPT = path.join(__dirname, 'mobile', 'web-build', '_serve.cjs');

const results = [];
function pass(label) { results.push({ label, status: 'PASS' }); console.log(`  ✓ ${label}`); }
function fail(label, err) { results.push({ label, status: 'FAIL', err: String(err).slice(0, 200) }); console.log(`  ✗ ${label}:`, String(err).slice(0, 200)); }
function skip(label) { results.push({ label, status: 'SKIP' }); console.log(`  ○ ${label}`); }

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function checkPortFree(port) {
  return new Promise((resolve) => {
    const http = require('http');
    const req = http.request({ hostname: 'localhost', port, method: 'HEAD', path: '/' }, () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(true));
    req.end();
  });
}

async function startServer() {
  // If port already in use, use existing server
  const free = await checkPortFree(PORT);
  if (!free) {
    console.log('[server] Port already in use — using existing server');
    return null;
  }
  return new Promise((resolve, reject) => {
    const child = spawn('node', [SERVE_SCRIPT], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });
    let started = false;
    child.stdout.on('data', (d) => {
      if (!started && d.toString().includes('[serve]')) {
        started = true;
        setTimeout(() => resolve(child), 800);
      }
    });
    child.stderr.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('EADDRINUSE')) {
        console.log('[server] Port already in use — using existing server');
        if (!started) { started = true; resolve(null); }
      }
    });
    child.on('error', (e) => { if (!started) reject(e); });
    child.on('exit', (code, sig) => {
      if (!started && code !== 0) reject(new Error(`server exit ${code}`));
      else console.log(`[server] child exited: code=${code} sig=${sig}`);
    });
    setTimeout(() => { if (!started) reject(new Error('server start timeout')); }, 10000);
  });
}

async function run() {
  // Start static server
  console.log('[server] Starting static server…');
  let serverProc;
  try {
    serverProc = await startServer();
    console.log(`[server] Running on ${BASE}`);
  } catch (e) {
    console.error('[server] Failed to start:', e.message);
    // try to continue anyway (server might already be running)
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    // ────────────────────────────────────────────────────────
    // STEP 1: Web UI smoke tests
    // ────────────────────────────────────────────────────────
    console.log('\n[1] Web UI smoke tests');
    const uiPages = [
      ['1a', `${BASE}/auth/login`, 'login page'],
      ['1b', `${BASE}/auth/register`, 'register page'],
      ['1c', `${BASE}/profile`, 'profile page'],
      ['1d', `${BASE}/addresses`, 'addresses list page'],
      ['1e', `${BASE}/addresses/new`, 'new address form'],
      ['1f', `${BASE}/profile/edit`, 'edit profile page'],
    ];
    for (const [step, url, label] of uiPages) {
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

    // ────────────────────────────────────────────────────────
    // STEP 2: Register page has phone input
    // ────────────────────────────────────────────────────────
    console.log('\n[2] Register form has phone input');
    try {
      await page.goto(`${BASE}/auth/register`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const inputs = await page.locator('input').count();
      if (inputs >= 5) {
        pass(`2a - register has ${inputs} inputs (first, last, email, phone, password)`);
      } else {
        fail('2a - register inputs', `got ${inputs}, expected >=5`);
      }
    } catch (e) { fail('2a - register inputs', e); }

    // ────────────────────────────────────────────────────────
    // STEP 3: Profile page shows Sign in CTA when unauthenticated
    // ────────────────────────────────────────────────────────
    console.log('\n[3] Profile - unauthenticated state');
    try {
      await page.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const html = await page.content();
      if (html.includes('Sign in to Hanoot') || html.includes('Log in') || html.includes('Create account')) {
        pass('3a - profile shows sign-in CTA when unauthenticated');
      } else {
        fail('3a - profile sign-in CTA', 'expected text not found');
      }
    } catch (e) { fail('3a - profile sign-in CTA', e); }

    // ────────────────────────────────────────────────────────
    // STEP 4: Backend API tests
    // ────────────────────────────────────────────────────────
    console.log('\n[4] Backend API');
    let backendOk = false;
    let authToken = null;

    // 4a: Register
    try {
      const regEmail = `test+${Date.now()}@hanoot.test`;
      const resp = await page.request.post(`${API_BASE}/auth/customer/emailpass/register`, {
        data: { email: regEmail, password: PASSWORD },
        timeout: 8000,
      });
      if (resp.ok()) {
        const body = await resp.json();
        backendOk = !!body.token;
        pass(`4a - POST /auth/customer/emailpass/register (token=${backendOk})`);

        // Create customer
        const custResp = await page.request.post(`${API_BASE}/store/customers`, {
          data: { email: regEmail, first_name: 'Test', last_name: 'User', phone: '+9647001234567' },
          headers: {
            Authorization: `Bearer ${body.token}`,
            'x-publishable-api-key': PUB_KEY,
          },
          timeout: 8000,
        });
        if (custResp.ok()) {
          pass('4b - POST /store/customers creates customer');
        } else {
          const txt = await custResp.text();
          fail('4b - POST /store/customers', `${custResp.status()}: ${txt.slice(0,150)}`);
        }

        // Login
        const loginResp = await page.request.post(`${API_BASE}/auth/customer/emailpass`, {
          data: { email: regEmail, password: PASSWORD },
          timeout: 8000,
        });
        if (loginResp.ok()) {
          const loginBody = await loginResp.json();
          authToken = loginBody?.token;
          pass(`4c - POST /auth/customer/emailpass (token=${!!authToken})`);
        } else {
          fail('4c - login', `status ${loginResp.status()}`);
        }
      } else {
        const txt = await resp.text();
        fail('4a - register', `${resp.status()}: ${txt.slice(0,150)}`);
      }
    } catch (e) { fail('4a - register (backend reachable?)', e); }

    // 4d: GET /store/customers/me
    if (authToken) {
      try {
        const meResp = await page.request.get(`${API_BASE}/store/customers/me`, {
          headers: { Authorization: `Bearer ${authToken}`, 'x-publishable-api-key': PUB_KEY },
        });
        if (meResp.ok()) {
          const meBody = await meResp.json();
          pass(`4d - GET /store/customers/me -> id=${meBody?.customer?.id}`);
        } else {
          fail('4d - GET /store/customers/me', `status ${meResp.status()}`);
        }
      } catch (e) { fail('4d - GET /store/customers/me', e); }
    } else {
      skip('4d - GET /store/customers/me (no token)');
    }

    // ────────────────────────────────────────────────────────
    // STEP 5: Addresses CRUD
    // ────────────────────────────────────────────────────────
    console.log('\n[5] Addresses CRUD');
    let createdId = null;

    if (authToken) {
      // 5a: Create
      try {
        const createResp = await page.request.post(`${API_BASE}/store/addresses`, {
          data: {
            label: 'Home',
            recipient_name: 'Test User',
            phone: '+9647001234567',
            street: 'Al-Mansour St 14',
            building: '12',
            apartment: '3A',
            city: 'Baghdad',
            country_code: 'IQ',
            delivery_instructions: 'Ring twice',
            is_default: true,
          },
          headers: { Authorization: `Bearer ${authToken}`, 'x-publishable-api-key': PUB_KEY },
        });
        if (createResp.ok()) {
          const body = await createResp.json();
          createdId = body?.address?.id;
          pass(`5a - POST /store/addresses -> id=${createdId}`);
        } else {
          const txt = await createResp.text();
          fail('5a - POST /store/addresses', `${createResp.status()}: ${txt.slice(0,150)}`);
        }
      } catch (e) { fail('5a - POST /store/addresses', e); }

      // 5b: List
      try {
        const listResp = await page.request.get(`${API_BASE}/store/addresses`, {
          headers: { Authorization: `Bearer ${authToken}`, 'x-publishable-api-key': PUB_KEY },
        });
        if (listResp.ok()) {
          const body = await listResp.json();
          const count = body?.addresses?.length ?? 0;
          if (count > 0) {
            pass(`5b - GET /store/addresses -> ${count} address(es)`);
          } else {
            fail('5b - GET /store/addresses', 'empty list');
          }
        } else {
          fail('5b - GET /store/addresses', `status ${listResp.status()}`);
        }
      } catch (e) { fail('5b - GET /store/addresses', e); }

      // 5c: Update
      if (createdId) {
        try {
          const updateResp = await page.request.post(`${API_BASE}/store/addresses/${createdId}`, {
            data: { label: 'Office' },
            headers: { Authorization: `Bearer ${authToken}`, 'x-publishable-api-key': PUB_KEY },
          });
          if (updateResp.ok()) {
            pass(`5c - POST /store/addresses/${createdId} (update label)`);
          } else {
            fail('5c - update address', `status ${updateResp.status()}`);
          }
        } catch (e) { fail('5c - update address', e); }

        // 5d: Delete
        try {
          const deleteResp = await page.request.delete(`${API_BASE}/store/addresses/${createdId}`, {
            headers: { Authorization: `Bearer ${authToken}`, 'x-publishable-api-key': PUB_KEY },
          });
          if (deleteResp.ok()) {
            pass(`5d - DELETE /store/addresses/${createdId}`);
          } else {
            fail('5d - delete address', `status ${deleteResp.status()}`);
          }
        } catch (e) { fail('5d - delete address', e); }
      } else {
        skip('5c - update (no address id)');
        skip('5d - delete (no address id)');
      }
    } else {
      skip('5a - create address (no token)');
      skip('5b - list addresses (no token)');
      skip('5c - update address (no token)');
      skip('5d - delete address (no token)');
    }
  } finally {
    await browser.close();
    if (serverProc) { try { serverProc.kill(); } catch (_) {} }
  }

  // ────────────────────────────────────────────────────────
  // SUMMARY
  // ────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  console.log('  SP-D PLAYWRIGHT SELF-TEST RESULTS');
  console.log('══════════════════════════════════════════');
  const passes = results.filter(r => r.status === 'PASS').length;
  const fails = results.filter(r => r.status === 'FAIL').length;
  const skips = results.filter(r => r.status === 'SKIP').length;
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✓' : r.status === 'SKIP' ? '○' : '✗';
    console.log(`  ${icon} [${r.status.padEnd(4)}] ${r.label}${r.err ? '\n         ' + r.err : ''}`);
  });
  console.log(`\n  Results: ${passes} PASS, ${fails} FAIL, ${skips} SKIP`);
  const backendFails = results.filter(r => r.status === 'FAIL' && /4[a-d]|5[a-d]/.test(r.label));
  const uiFails = results.filter(r => r.status === 'FAIL' && /1[a-f]|2[a-f]|3[a-f]/.test(r.label));
  console.log(`  UI: ${uiFails.length} fail  |  Backend API: ${backendFails.length} fail`);
  console.log('══════════════════════════════════════════\n');
  process.exit(fails > 0 ? 1 : 0);
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
