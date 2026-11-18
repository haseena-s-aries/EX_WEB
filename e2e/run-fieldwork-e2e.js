/* eslint-env node, browser */
/* Local browser-fieldwork acceptance suite.
 * Requires a DISPOSABLE local stack (see docs/browser-fieldwork-local-testing.md):
 *   backend  E2E_API (default http://localhost:5235/api) on a throwaway SQL Server database
 *   web      E2E_WEB (default http://localhost:3000/) serving `npm run build` output via `npm run serve:offline-local`
 * Loopback targets only; never point this at a shared or live environment. */
const {results} = require('./lib');
const {seed, apiChecks} = require('./seed-and-api');
const browserScenarios = require('./browser-fieldwork');
const extendedScenarios = require('./browser-fieldwork-extended');
const layoutChecks = require('./mobile-layout');
let chromium;
try { ({chromium} = require('playwright')); } catch { console.error('Playwright is required (require("playwright")).'); process.exit(2); }

(async () => {
  const only = process.argv.slice(2);
  const fx = await seed();
  console.log(`Seeded synthetic fixture ${fx.run} (project ${fx.project.id})`);
  const browser = await chromium.launch();
  try {
    if (!only.length || only.includes('api')) await apiChecks(fx);
    if (!only.length || only.includes('browser')) await browserScenarios(browser, fx);
    if (!only.length || only.includes('browser')) await extendedScenarios(browser, fx);
    if (!only.length || only.includes('layout')) await layoutChecks(browser, fx);
  } catch { /* failure already reported */ }
  finally { await browser.close(); }
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} steps passed`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
