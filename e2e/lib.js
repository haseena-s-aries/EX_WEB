/* eslint-env node, browser */
/* Shared helpers for the local browser-fieldwork E2E suite. Loopback targets only. */
const assert = require('assert');

// Node-side calls use 127.0.0.1 while the browser uses localhost, so the server's per-address sign-in
// rate limit (20 per 5 minutes) is not shared between the harness and the browser under test.
const API = process.env.E2E_API || 'http://127.0.0.1:5235/api';
const WEB = process.env.E2E_WEB || 'http://localhost:3000/';
for (const url of [API, WEB]) {
  const host = new URL(url).hostname;
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host))
    throw new Error(`Refusing to run against ${url}: the fieldwork E2E suite only targets a disposable local stack.`);
}

const results = [];
/** Pages whose state is printed when a step fails. */
const debugPages = [];
async function step(name, fn) {
  const started = Date.now();
  try { await fn(); results.push({name, ok: true, ms: Date.now() - started}); console.log(`PASS ${name} (${Date.now() - started} ms)`); }
  catch (error) {
    results.push({name, ok: false, error: error.stack || String(error)}); console.log(`FAIL ${name}\n${error.stack || error}`);
    for (const [i, page] of debugPages.entries()) {
      try {
        const text = await page.locator('.fw-root').isVisible() ? await page.locator('.fw-root').innerText() : await page.locator('body').innerText();
        console.log(`--- page ${i} text ---\n${text.slice(0, 3000)}`);
        if (process.env.E2E_ARTIFACTS) await page.screenshot({path: `${process.env.E2E_ARTIFACTS}/failure-${results.length}-${i}.png`, fullPage: false});
      } catch { /* page may be closed */ }
    }
    throw error;
  }
}

async function api(method, path, {token, json, form, headers = {}, expect} = {}) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(API + path, {method, headers: {...(token ? {Authorization: `Bearer ${token}`} : {}),
      ...(json !== undefined ? {'Content-Type': 'application/json'} : {}), ...headers}, body: json !== undefined ? JSON.stringify(json) : form});
    if (response.status === 429 && attempt < 1) { console.log('  rate limited; waiting 305 s'); await new Promise(r => setTimeout(r, 305000)); continue; }
    const text = await response.text();
    let body; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (expect !== undefined && response.status !== expect)
      throw new Error(`${method} ${path}: expected ${expect}, got ${response.status} ${text.slice(0, 400)}`);
    return {status: response.status, body, text};
  }
}
async function login(email, password) {
  const r = await api('POST', '/auth/login', {json: {email, password}, expect: 200});
  return r.body.accessToken;
}
/** 64x48 solid PNG, distinct per seed, so uploads have real, hashable bytes. */
function png(seed = 1) {
  const zlib = require('zlib');
  const w = 64, h = 48, raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = (seed * 53 + x * 3) & 255; raw[o + 1] = (seed * 97 + y * 5) & 255; raw[o + 2] = (seed * 31) & 255;
  }
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function crc32(buf) { let c, crc = 0xffffffff; for (const b of buf) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return crc ^ 0xffffffff; }

module.exports = {API, WEB, api, login, png, step, results, assert, debugPages};
