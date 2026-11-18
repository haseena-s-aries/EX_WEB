/* eslint-env node, browser */
/* Responsive layout checks for the Surveyor experience and the fieldwork / Sync Center UI.
 * For every width: no page-level horizontal scroll, no visible element clipped past the viewport edge
 * (unless it sits inside its own horizontal scroller), and fieldwork controls keep 44 px touch targets. */
const fs = require('fs');
const {api, login, step, assert, debugPages, WEB} = require('./lib');

const WIDTHS = [320, 360, 375, 390, 414, 430, 768, 1024];
const T = {timeout: 60000};

/** Runs in the page: returns layout problems in the current view. */
function audit(scope) {
  const vw = document.documentElement.clientWidth; const problems = [];
  const scroller = el => { for (let p = el.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p);
    if (/(auto|scroll|hidden|clip)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
  const describe = el => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}` +
    `[${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40)}]`;
  if (document.scrollingElement.scrollWidth > vw + 1) problems.push(`page scrolls horizontally (${document.scrollingElement.scrollWidth} > ${vw})`);
  const root = scope ? document.querySelector(scope) : document.body;
  if (scope && root && root.scrollWidth > root.clientWidth + 1) problems.push(`${scope} scrolls horizontally (${root.scrollWidth} > ${root.clientWidth})`);
  for (const el of (root || document.body).querySelectorAll('*')) {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    if (!r.width || !r.height || s.visibility === 'hidden' || s.display === 'contents') continue;
    if ((r.right > vw + 1 || r.left < -1) && !scroller(el) && s.position !== 'fixed') problems.push(`clipped: ${describe(el)} (${Math.round(r.left)}–${Math.round(r.right)} of ${vw})`);
    if (scope && el.matches('button, select, input:not([type=radio]):not([type=checkbox]):not([type=file]), summary') && r.height < 43.5)
      problems.push(`small touch target: ${describe(el)} (${Math.round(r.height)} px)`);
  }
  const dock = document.querySelector('.fw-dock');
  if (dock) { const d = dock.getBoundingClientRect(); if (d.right > vw + 1 || d.left < -1) problems.push('sync dock clipped'); }
  return [...new Set(problems)].slice(0, 25);
}

module.exports = async function layoutChecks(browser, fx) {
  const out = process.env.E2E_ARTIFACTS;
  const context = await browser.newContext({viewport: {width: 1280, height: 900}, serviceWorkers: 'allow'});
  const page = await context.newPage(); debugPages.push(page);
  page.on('dialog', d => d.accept().catch(() => {}));
  const findings = {};
  const record = async (width, view, scope) => {
    const problems = await page.evaluate(audit, scope);
    if (problems.length) (findings[`${width}px ${view}`] = problems);
    if (out) await page.screenshot({path: `${out}/layout-${width}-${view.replace(/\W+/g, '-')}.png`, fullPage: false});
  };
  await step('Layout: sign in once for the responsive audit', async () => {
    await page.goto(WEB); await page.click('.ex-landing-login');
    await page.getByPlaceholder('Email').fill(fx.surveyor.email); await page.getByPlaceholder('Password').fill(fx.surveyor.password);
    await page.getByLabel('Sign in').first().click(); await page.waitForSelector('.fw-dock', T);
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.locator('.fw-status', {hasText: /synced|Pending|Offline/}).waitFor(T);
    // Create one conflict so the conflict comparison is audited too.
    await page.click('.fw-launch'); await page.waitForSelector('.fw-root', T);
    const card = page.locator('.fw-panel', {has: page.locator('h2', {hasText: fx.project.projectName.toUpperCase()})});
    await card.getByRole('button', {name: /Download for Offline Use|Update offline copy/}).click();
    await card.getByRole('button', {name: 'Update offline copy'}).waitFor({timeout: 120000});
    await card.getByText('Available Offline').waitFor({timeout: 120000});
    await context.setOffline(true);
    await card.getByRole('button', {name: 'Open offline fieldwork'}).click();
    await page.locator('.fw-root label', {hasText: /^Area/}).locator('select').selectOption(fx.area.id);
    const tag = fx.equipment[1].tagNumber;
    await page.locator('section.fw-panel', {has: page.locator('h3', {hasText: tag})}).getByRole('button', {name: 'View / Edit Equipment'}).click();
    await page.getByLabel('Location / Area', {exact: true}).fill('Layout audit – local value with a deliberately long location description to test wrapping');
    await page.getByRole('button', {name: 'Save on device'}).click();
    await page.locator('.fw-message', {hasText: 'Saved on Device'}).waitFor(T);
    const token = fx.layoutToken || await login(fx.surveyor.email, fx.surveyor.password);
    const rows = (await api('GET', `/surveyor/projects/${fx.project.id}/areas/${fx.area.id}/equipment`, {token, expect: 200})).body;
    const row = rows.find(e => e.id === fx.equipment[1].id);
    await api('PUT', `/surveyor/projects/${fx.project.id}/areas/${fx.area.id}/equipment/${row.id}`, {token, expect: 200,
      json: {...row, xPercent: row.xPercent ?? 0, yPercent: row.yPercent ?? 0, location: 'Layout audit – server value'}});
    await context.setOffline(false);
    await page.locator('.fw-tabs button', {hasText: 'Sync Center'}).click();
    await page.locator('.fw-tabs button', {hasText: 'Sync Now'}).click();
    const conflict = page.locator('section.fw-panel', {has: page.locator('h3', {hasText: 'equipment · Conflict'})});
    await conflict.waitFor({timeout: 90000});
    await conflict.getByRole('button', {name: 'Load current versions to resolve'}).click();
    await conflict.locator('fieldset').first().waitFor(T);
  });

  await step(`Layout: ${WIDTHS.join(', ')} px — fieldwork, forms, checklist, Sync Center, conflicts and Surveyor screens`, async () => {
    for (const width of WIDTHS) {
      await page.setViewportSize({width, height: width >= 768 ? 1024 : 800});
      await page.waitForTimeout(150);
      await record(width, 'sync-center-conflict', '.fw-root');
      await page.locator('.fw-tabs button', {hasText: 'Fieldwork'}).first().click();
      await record(width, 'fieldwork-equipment-list', '.fw-root');
      const card = page.locator('section.fw-panel', {has: page.locator('h3', {hasText: fx.equipment[0].tagNumber})});
      await card.getByRole('button', {name: 'View / Edit Equipment'}).click();
      await record(width, 'equipment-form', '.fw-root');
      await page.getByRole('button', {name: 'Cancel'}).click();
      await card.getByRole('button', {name: 'Inspection Checklist'}).click();
      await page.locator('article.fw-checkpoint').first().waitFor(T);
      await record(width, 'inspection-checklist', '.fw-root');
      await page.getByRole('button', {name: 'Back', exact: true}).click();
      await card.getByRole('button', {name: '+ Defect Draft'}).click();
      await record(width, 'defect-form', '.fw-root');
      await page.getByRole('button', {name: 'Cancel'}).click();
      await page.locator('.fw-tabs button', {hasText: 'Downloaded projects'}).click();
      await record(width, 'downloaded-projects', '.fw-root');
      await page.locator('.fw-tabs button', {hasText: 'Sync Center'}).click();
      // Regular Surveyor workspace behind the fieldwork overlay, with the sync dock.
      await page.getByRole('button', {name: 'Back to workspace'}).click();
      await page.waitForTimeout(300);
      await record(width, 'surveyor-dashboard', null);
      const open = page.getByLabel(`Open ${fx.project.projectName}`).first();
      if (await open.isVisible().catch(() => false)) {
        await open.click(); await page.waitForTimeout(800);
        await record(width, 'surveyor-project-details', null);
        const back = page.getByText('< Back to projects').first();
        if (await back.isVisible().catch(() => false)) await back.click();
      }
      await page.click('.fw-launch'); await page.waitForSelector('.fw-root', T);
      await page.locator('.fw-tabs button', {hasText: 'Sync Center'}).click();
      const conflict = page.locator('section.fw-panel', {has: page.locator('h3', {hasText: 'equipment · Conflict'})});
      if (!await conflict.locator('fieldset').first().isVisible().catch(() => false))
        await conflict.getByRole('button', {name: /Load current versions|Reload current server version/}).click();
    }
    if (out) fs.writeFileSync(`${out}/layout-findings.json`, JSON.stringify(findings, null, 2));
    const summary = Object.entries(findings).map(([k, v]) => `${k}:\n  ${v.join('\n  ')}`).join('\n');
    assert.strictEqual(Object.keys(findings).length, 0, `Layout problems found:\n${summary}`);
  });
  await context.close();
};
