/* eslint-env node, browser */
/* Browser fieldwork end-to-end scenarios (real backend, real service worker, real IndexedDB vault). */
const {API, WEB, api, login, png, step, assert, debugPages} = require('./lib');

/** Matches browser calls to the API whatever loopback name the page uses (localhost vs 127.0.0.1). */
const API_PORT = new URL(API).port;
const isApiCall = url => { const u = new URL(url); return u.port === API_PORT && u.pathname.startsWith('/api/'); };
const T = {timeout: 60000};

async function device(browser, viewport = {width: 1280, height: 900}) {
  const context = await browser.newContext({viewport, serviceWorkers: 'allow'});
  const page = await context.newPage();
  page.on('dialog', d => d.accept().catch(() => {}));
  page.on('pageerror', e => console.log('  [pageerror]', e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('  [console]', m.text().slice(0, 300)); });
  debugPages.push(page);
  return {context, page};
}
async function signIn(page, {email, password}) {
  if (!page.url().startsWith(WEB)) await page.goto(WEB);
  const landing = page.locator('.ex-landing-login');
  if (await landing.isVisible().catch(() => false)) await landing.click();
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  let rejected = false; const onDialog = d => { if (/Login failed|Too many/i.test(d.message())) rejected = true; };
  page.on('dialog', onDialog);
  await page.getByLabel('Sign in').first().click();
  try {
    await page.waitForFunction(() => !!document.querySelector('.fw-dock') && !document.querySelector('[placeholder=Password]'), null, {timeout: 20000});
  } catch (error) {
    if (!rejected) throw error;
    console.log('  sign-in rate limited by the server; waiting 305 s'); await page.waitForTimeout(305000);
    await page.getByLabel('Sign in').first().click();
    await page.waitForSelector('.fw-dock', T);
  } finally { page.off('dialog', onDialog); }
}
async function shellInstalled(page) {
  await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; if (!r.active) throw new Error('no active worker'); });
}
const status = page => page.locator('.fw-status').innerText();
async function openFieldwork(page) {
  if (!await page.locator('.fw-root').isVisible().catch(() => false)) await page.click('.fw-launch');
  await page.waitForSelector('.fw-root', T);
}
async function tab(page, name) { await page.locator('.fw-tabs button', {hasText: name}).first().click(); }
async function syncNowInPanel(page) { await page.locator('.fw-tabs button', {hasText: 'Sync Now'}).click(); }
async function waitMessage(page, text, timeout = 90000) {
  await page.locator('.fw-message', {hasText: text}).waitFor({timeout});
  // A success message must coincide with an empty queue.
  if (/Synced|synced/.test(String(text))) await page.locator('.fw-tabs button', {hasText: 'Sync Center (0)'}).waitFor({timeout});
}
async function pendingCount(page) {
  const label = await page.locator('.fw-tabs button', {hasText: 'Sync Center'}).innerText();
  return Number(/\((\d+)\)/.exec(label)[1]);
}
async function download(page, projectName) {
  const card = page.locator('.fw-panel', {has: page.locator('h2', {hasText: projectName})});
  await card.getByRole('button', {name: /Download for Offline Use|Update offline copy/}).click();
  // Wait for this download to finish (the card may already say "Available Offline" from an earlier copy).
  await card.getByRole('button', {name: 'Downloading…'}).waitFor({timeout: 5000}).catch(() => {});
  await card.getByRole('button', {name: 'Downloading…'}).waitFor({state: 'detached', timeout: 120000});
  await card.getByText('Available Offline', {exact: false}).waitFor({timeout: 120000});
  await card.getByRole('button', {name: 'Update offline copy'}).waitFor({timeout: 120000});
  return card;
}
async function openProject(page, projectName, areaName) {
  await tab(page, 'Downloaded projects');
  const card = page.locator('.fw-panel', {has: page.locator('h2', {hasText: projectName})});
  await card.getByRole('button', {name: 'Open offline fieldwork'}).click();
  // Area names are displayed upper-case; select the area by its id.
  if (areaName) await page.locator('.fw-root label', {hasText: /^Area/}).locator('select').selectOption(areaName);
}
async function equipmentRow(fx, token, id) {
  const list = (await api('GET', `/surveyor/projects/${fx.project.id}/areas/${fx.area.id}/equipment`, {token, expect: 200})).body;
  return list.find(e => e.id === id);
}
/** Submit an in-panel sign-in form; waits out the server's sign-in rate limit once if it is hit. */
async function submitSignIn(page, scope, password, button) {
  await scope.getByLabel('Password', {exact: true}).fill(password);
  await scope.getByRole('button', {name: button}).click();
  const limited = scope.getByText('Too many sign-in attempts');
  if (await limited.waitFor({timeout: 5000}).then(() => true, () => false)) {
    console.log('  sign-in rate limited by the server; waiting 305 s'); await page.waitForTimeout(305000);
    await scope.getByLabel('Password', {exact: true}).fill(password);
    await scope.getByRole('button', {name: button}).click();
  }
}
const equipmentCard = (page, tag) => page.locator('section.fw-panel', {has: page.locator('h3', {hasText: tag})});
async function editEquipment(page, tag, changes) {
  await equipmentCard(page, tag).getByRole('button', {name: 'View / Edit Equipment'}).click();
  const form = page.locator('form.fw-panel', {has: page.locator('h2', {hasText: 'Edit Equipment'})});
  for (const [label, value] of Object.entries(changes)) await form.getByLabel(label, {exact: true}).fill(value);
  await form.getByRole('button', {name: 'Save on device'}).click();
  await page.locator('.fw-message', {hasText: 'Saved on Device'}).waitFor(T);
}
async function editChecklist(page, tag, {text, pass, fail, remarks, photo, save = 'Save Draft'}) {
  await equipmentCard(page, tag).getByRole('button', {name: 'Inspection Checklist'}).click();
  const panel = page.locator('section.fw-panel', {has: page.locator('h2', {hasText: 'Inspection Checklist'})});
  const first = panel.locator('article.fw-checkpoint').first();
  if (text !== undefined) await first.getByLabel('Items to Be Checked').fill(text);
  if (pass) await first.getByRole('button', {name: 'P — Pass'}).click();
  if (fail) await first.getByRole('button', {name: 'F — Fail'}).click();
  if (remarks) await first.getByLabel('Remarks').fill(remarks);
  if (photo) {
    await panel.locator('label', {hasText: 'Photographs / evidence'}).locator('input[type=file]').setInputFiles({name: 'checkpoint.png', mimeType: 'image/png', buffer: photo});
    await panel.getByText('View checkpoint.png').waitFor(T);
  }
  await panel.getByRole('button', {name: save, exact: true}).click();
  await page.locator('.fw-message', {hasText: /Pending Sync|No checklist changes/}).waitFor(T);
  await panel.getByRole('button', {name: 'Back', exact: true}).click();
}

module.exports = async function browserScenarios(browser, fx) {
  const P = fx.project; const projectName = P.projectName.toUpperCase(); const areaName = fx.area.id;
  const [eqMotor, eqBox] = fx.equipment;
  const A = await device(browser);
  // Cache the API token: the server rate-limits sign-ins (20 per 5 minutes per address).
  let apiToken = fx.sToken;
  const sApi = async () => apiToken || (apiToken = await login(fx.surveyor.email, fx.surveyor.password));
  let password = fx.surveyor.password;

  await step('Browser: sign in, install offline shell, show local Sync Now and status', async () => {
    await signIn(A.page, fx.surveyor);
    await shellInstalled(A.page);
    await A.page.locator('.fw-status', {hasText: /synced|Pending|Offline/}).waitFor(T);
    assert.ok(await A.page.getByRole('button', {name: 'Sync Now'}).isVisible());
  });

  await step('Browser: download an assigned project', async () => {
    await openFieldwork(A.page);
    await download(A.page, projectName);
    // The unassigned project must not be offered.
    assert.strictEqual(await A.page.locator('h2', {hasText: fx.unassigned.projectName.toUpperCase()}).count(), 0);
  });

  let newTag = `E2E-NEW-${fx.run}`;
  await step('Browser offline: save equipment (new + edit), checklist edit, inspection, remarks, defect and photos', async () => {
    await A.context.setOffline(true);
    await A.page.locator('.fw-status', {hasText: 'Offline'}).waitFor(T);
    await openProject(A.page, projectName, areaName);
    await A.page.getByRole('button', {name: '+ Add Equipment'}).click();
    const form = A.page.locator('form.fw-panel', {has: A.page.locator('h2', {hasText: 'Add Equipment'})});
    await form.getByLabel('Item Tag *').fill(newTag);
    await form.getByLabel('Equipment Type *').fill('Luminaire');
    await form.getByLabel('Equipment evidence').setInputFiles({name: 'new-equipment.png', mimeType: 'image/png', buffer: png(21)});
    await form.getByRole('button', {name: 'Save on device'}).click();
    await A.page.locator('.fw-message', {hasText: 'Saved on Device'}).waitFor(T);
    await editEquipment(A.page, eqMotor.tagNumber, {Description: 'Motor – edited offline'});
    await editChecklist(A.page, eqMotor.tagNumber, {text: `Offline checkpoint text ${fx.run}`, pass: true, remarks: 'Gland tight; offline remark', photo: png(31)});
    await equipmentCard(A.page, eqMotor.tagNumber).getByRole('button', {name: '+ Defect Draft'}).click();
    const defect = A.page.locator('form.fw-panel', {has: A.page.locator('h2', {hasText: 'Defect draft'})});
    await defect.getByLabel('observation').fill(`Offline defect ${fx.run}`);
    await defect.getByLabel('recommendation').fill('Replace gland');
    await defect.getByLabel('Evidence (up to two files)').setInputFiles({name: 'defect.png', mimeType: 'image/png', buffer: png(41)});
    await defect.getByRole('button', {name: 'Save defect on device'}).click();
    await A.page.locator('.fw-message', {hasText: 'Defect saved on device'}).waitFor(T);
    const pending = await pendingCount(A.page);
    assert.ok(pending >= 5, `expected >=5 queued operations, got ${pending}`);
  });

  await step('Browser offline: reload recovers the same project, queue and drafts', async () => {
    const before = await pendingCount(A.page);
    await A.page.reload();
    await A.page.getByRole('button', {name: 'Sign in to offline fieldwork'}).click({timeout: 60000});
    await signIn(A.page, {email: fx.surveyor.email, password});
    await openFieldwork(A.page);
    await A.page.locator('.fw-tabs button', {hasText: `Sync Center (${before})`}).waitFor(T);
    await tab(A.page, 'Downloaded projects');
    await A.page.locator('.fw-panel', {has: A.page.locator('h2', {hasText: projectName})}).getByText('Available Offline').waitFor(T);
    await openProject(A.page, projectName, areaName);
    await equipmentCard(A.page, newTag).getByText('Saved on Device – Pending Sync').waitFor(T);
    // The inspection draft (answers, remarks, photo) is restored from the encrypted device copy.
    await equipmentCard(A.page, eqMotor.tagNumber).getByRole('button', {name: 'Inspection Checklist'}).click();
    const first = A.page.locator('article.fw-checkpoint').first();
    assert.strictEqual(await first.getByLabel('Remarks').inputValue(), 'Gland tight; offline remark');
    await A.page.getByText('View checkpoint.png').waitFor(T);
    await A.page.getByRole('button', {name: 'Back', exact: true}).click();
  });

  await step('Reconnect: automatic sync with a lost checklist response and an interrupted photo upload, then manual retry without duplicates', async () => {
    let lostChecklist = false, lostPhoto = false;
    await A.page.route(/\/selection\?equipmentId=/, async route => {
      if (route.request().method() === 'PUT' && !lostChecklist) { lostChecklist = true; await route.fetch(); return route.abort('connectionreset'); }
      return route.continue();
    });
    await A.page.route(/\/inspection-activities\/[0-9a-f-]+\/photos$/, async route => {
      if (route.request().method() === 'POST' && !lostPhoto) { lostPhoto = true; await route.fetch(); return route.abort('connectionreset'); }
      return route.continue();
    });
    await A.context.setOffline(false); // 'online' event starts automatic sync
    await tab(A.page, 'Sync Center');
    await A.page.locator('.fw-panel h3', {hasText: /· Failed/}).first().waitFor({timeout: 90000});
    assert.ok(lostChecklist, 'checklist response was not interrupted');
    for (let i = 0; i < 6 && !await A.page.locator('.fw-message', {hasText: 'All Changes Synced'}).isVisible(); i++) {
      await A.page.waitForFunction(() => !document.querySelector('.fw-tabs button.primary')?.disabled, null, T);
      await syncNowInPanel(A.page);
      await A.page.waitForTimeout(1500);
    }
    await waitMessage(A.page, 'All Changes Synced');
    assert.ok(lostPhoto, 'photo response was not interrupted');
    await A.page.unrouteAll({behavior: 'ignoreErrors'});
  });

  await step('Server persistence: equipment, checklist (single version), inspection, remarks, defect and photo associations', async () => {
    const t = await sApi();
    const list = (await api('GET', `/surveyor/projects/${P.id}/areas/${fx.area.id}/equipment`, {token: t, expect: 200})).body;
    const created = list.filter(e => e.tagNumber === newTag);
    assert.strictEqual(created.length, 1, 'new equipment must exist exactly once');
    assert.ok(created[0].sequenceNo > 0, 'server allocates the register number');
    const motor = list.find(e => e.id === eqMotor.id);
    assert.strictEqual(motor.description, 'Motor – edited offline');
    const newPhotos = (await api('GET', `/surveyor/projects/${P.id}/areas/${fx.area.id}/equipment/${created[0].id}/photos`, {token: t, expect: 200})).body;
    assert.strictEqual(newPhotos.length, 1, 'equipment photo stored once');
    const checklist = (await api('GET', `/fieldwork/projects/${P.id}/records/checklist/${eqMotor.id}`, {token: t, expect: 200})).body;
    assert.strictEqual(checklist.version, '1', 'lost-response retry must not create a second checklist version');
    assert.ok(checklist.server.points.some(p => p.text === `Offline checkpoint text ${fx.run}`));
    const history = (await api('GET', `/v1/inspection-activities/equipment/${eqMotor.id}?categoryOnly=true`, {token: t, expect: 200})).body;
    assert.strictEqual(history.length, 1, 'exactly one inspection activity');
    const activity = (await api('GET', `/v1/inspection-activities/${history[0].id}`, {token: t, expect: 200})).body;
    const response = activity.responses.find(r => r.observation === 'Gland tight; offline remark');
    assert.ok(response, 'checkpoint remark persisted'); assert.ok(/Pass/.test(response.gradeResultsJson || ''), 'grade persisted');
    assert.strictEqual((activity.evidence || []).length, 1, 'inspection photo stored exactly once despite interrupted upload');
    const defects = (await api('GET', `/defects?projectId=${P.id}`, {token: t, expect: 200})).body.items.filter(d => (d.observation || d.description) === `Offline defect ${fx.run}`);
    assert.strictEqual(defects.length, 1, 'defect stored once');
    assert.ok((defects[0].photos || []).length >= 1, 'defect photo associated');
  });

  await step('Token expiry: sync pauses, work is retained, in-place sign-in resumes sync', async () => {
    await A.page.route(isApiCall, route => route.fulfill({status: 401, contentType: 'application/json', body: '{"error":"expired"}'}));
    await tab(A.page, 'Fieldwork');
    await editEquipment(A.page, eqBox.tagNumber, {Manufacturer: 'Token-expiry Mfr'});
    await syncNowInPanel(A.page);
    await A.page.locator('.fw-reauth').waitFor(T);
    await A.page.locator('.fw-status', {hasText: 'Sign in to resume sync'}).waitFor(T);
    assert.strictEqual(await pendingCount(A.page), 1, 'pending change retained while paused');
    await A.page.unrouteAll({behavior: 'ignoreErrors'});
    await submitSignIn(A.page, A.page.locator('.fw-reauth'), password, 'Sign in and resume sync');
    await waitMessage(A.page, 'All Changes Synced');
    const t = await sApi();
    assert.strictEqual((await equipmentRow(fx, t, eqBox.id)).manufacturer, 'Token-expiry Mfr');
  });

  await step('Password change: old vault is re-keyed with the previous password; pending work and photos survive', async () => {
    await A.context.setOffline(true);
    await tab(A.page, 'Fieldwork');
    await editEquipment(A.page, eqMotor.tagNumber, {Model: 'MODEL-REKEY'});
    const old = password; const next = `${old}-Changed2`;
    const t = await sApi();
    await api('POST', '/account/change-password', {token: t, json: {currentPassword: old, newPassword: next, confirmPassword: next}, expect: 200});
    password = next; fx.surveyor.password = next; apiToken = undefined; // old token is revoked by the password change
    await A.context.setOffline(false);
    await tab(A.page, 'Sync Center');
    await syncNowInPanel(A.page);
    await A.page.locator('.fw-reauth').waitFor(T);
    await submitSignIn(A.page, A.page.locator('.fw-reauth'), next, 'Sign in and resume sync');
    await A.page.getByRole('heading', {name: 'Unlock device work saved under your previous password'}).waitFor(T);
    await A.page.getByLabel('Previous password', {exact: true}).fill('definitely-wrong');
    await A.page.getByRole('button', {name: 'Unlock and re-key to my new password'}).click();
    await A.page.getByText('does not open this device workspace. Nothing was changed').waitFor(T);
    await A.page.getByLabel('Previous password', {exact: true}).fill(old);
    await A.page.getByRole('button', {name: 'Unlock and re-key to my new password'}).click();
    await A.page.locator('.fw-tabs button', {hasText: 'Sync Center (1)'}).waitFor(T);
    await syncNowInPanel(A.page);
    await waitMessage(A.page, 'All Changes Synced');
    assert.strictEqual((await equipmentRow(fx, await sApi(), eqMotor.id)).model, 'MODEL-REKEY');
    // After a restart the NEW password opens the vault directly, with the downloaded project and photos intact.
    await A.page.reload();
    await A.page.waitForSelector('.fw-dock', T);
    await openFieldwork(A.page);
    await A.page.getByRole('heading', {name: 'Unlock device workspace'}).waitFor(T);
    await submitSignIn(A.page, A.page.locator('section[aria-labelledby="fw-unlock"]'), next, 'Unlock');
    // The unlocked workspace restores the last saved draft view; the downloaded copy is still listed.
    await equipmentCard(A.page, eqMotor.tagNumber).waitFor(T); // restored work view (status text is transient)
    await tab(A.page, 'Downloaded projects');
    await A.page.locator('.fw-panel', {has: A.page.locator('h2', {hasText: projectName})}).getByText('Available Offline').waitFor(T);
    await openProject(A.page, projectName, areaName);
    await A.page.locator('.fw-gallery img').first().waitFor(T); // decrypted downloaded layout image
  });

  await step('Two devices: concurrent equipment and checklist edits conflict and are resolved without losing either version', async () => {
    const B = await device(browser);
    try {
      await signIn(B.page, {email: fx.surveyor.email, password});
      await shellInstalled(B.page);
      await openFieldwork(B.page); await download(B.page, projectName);
      await tab(A.page, 'Downloaded projects'); await download(A.page, projectName);
      await A.context.setOffline(true); await B.context.setOffline(true);
      await openProject(A.page, projectName, areaName); await openProject(B.page, projectName, areaName);
      await editEquipment(A.page, eqMotor.tagNumber, {Description: 'Description from device A'});
      await editEquipment(B.page, eqMotor.tagNumber, {Description: 'Description from device B'});
      await editChecklist(A.page, eqBox.tagNumber, {text: 'Checkpoint wording from device A', save: 'Save Checklist Changes'});
      await editChecklist(B.page, eqBox.tagNumber, {text: 'Checkpoint wording from device B', save: 'Save Checklist Changes'});
      await A.context.setOffline(false); await tab(A.page, 'Sync Center'); await syncNowInPanel(A.page); await waitMessage(A.page, 'All Changes Synced');
      await B.context.setOffline(false); await tab(B.page, 'Sync Center'); await syncNowInPanel(B.page);
      await B.page.locator('.fw-panel h3', {hasText: 'equipment · Conflict'}).waitFor({timeout: 90000});
      await B.page.locator('.fw-panel h3', {hasText: 'checklist · Conflict'}).waitFor({timeout: 90000});
      // Equipment: keep B's description. Checklist: take A's (server) checkpoint wording.
      const eq = B.page.locator('section.fw-panel', {has: B.page.locator('h3', {hasText: 'equipment · Conflict'})});
      await eq.getByRole('button', {name: 'Load current versions to resolve'}).click();
      const descField = eq.locator('fieldset', {has: B.page.locator('legend', {hasText: 'description'})});
      assert.ok((await descField.innerText()).includes('Description from device A'), 'server value shown');
      await eq.getByRole('button', {name: 'Save resolution for synchronization'}).click();
      await eq.getByText(/Choose local or server values/).waitFor(T); // refuses to guess
      await descField.getByText('Keep local').click();
      await eq.getByRole('button', {name: 'Save resolution for synchronization'}).click();
      const ck = B.page.locator('section.fw-panel', {has: B.page.locator('h3', {hasText: 'checklist · Conflict'})});
      await ck.getByRole('button', {name: 'Load current versions to resolve'}).click();
      await ck.locator('fieldset legend', {hasText: 'Checkpoint'}).first().waitFor(T);
      assert.ok((await ck.innerText()).includes('Checkpoint wording from device A'));
      const fields = ck.locator('fieldset');
      for (let i = 0; i < await fields.count(); i++) await fields.nth(i).getByText('Use server').click();
      await ck.getByRole('button', {name: 'Save resolution for synchronization'}).click();
      await B.page.locator('.fw-panel h3', {hasText: '· Conflict'}).first().waitFor({state: 'detached', timeout: 30000});
      await syncNowInPanel(B.page); await waitMessage(B.page, 'All Changes Synced');
      const t = await sApi();
      assert.strictEqual((await equipmentRow(fx, t, eqMotor.id)).description, 'Description from device B');
      const checklist = (await api('GET', `/fieldwork/projects/${P.id}/records/checklist/${eqBox.id}`, {token: t, expect: 200})).body;
      assert.ok(checklist.server.points.some(p => p.text === 'Checkpoint wording from device A'));
      assert.ok(!checklist.server.points.some(p => p.text === 'Checkpoint wording from device B'));
      assert.strictEqual(checklist.version, '3', 'API check v1, device A v2, resolved device B v3 (history retained)');
    } finally { await B.context.close(); }
  });

  await step('Account isolation: another surveyor on the same browser cannot see or unlock the first account’s device data', async () => {
    await A.page.getByRole('button', {name: 'Back to workspace'}).click();
    const before = await A.page.evaluate(id => new Promise(resolve => { const r = indexedDB.open('ex-survey-fieldwork-v1');
      r.onsuccess = () => { const q = r.result.transaction('vault').objectStore('vault').index('account').count(id); q.onsuccess = () => resolve(q.result); }; }), fx.surveyor.id);
    await A.page.context().clearCookies();
    await A.page.evaluate(() => sessionStorage.clear());
    await A.page.goto(WEB);
    await signIn(A.page, fx.other);
    await openFieldwork(A.page);
    await A.page.locator('h2', {hasText: fx.unassigned.projectName.toUpperCase()}).waitFor(T);
    assert.strictEqual(await A.page.locator('h2', {hasText: projectName}).count(), 0, 'first account project not visible');
    const after = await A.page.evaluate(id => new Promise(resolve => { const r = indexedDB.open('ex-survey-fieldwork-v1');
      r.onsuccess = () => { const q = r.result.transaction('vault').objectStore('vault').index('account').count(id); q.onsuccess = () => resolve(q.result); }; }), fx.surveyor.id);
    assert.ok(before > 0 && after === before, 'first account rows untouched');
  });

  await A.context.close();
};

module.exports.helpers = {device, signIn, submitSignIn, shellInstalled, openFieldwork, tab, syncNowInPanel, waitMessage, pendingCount, download, openProject,
  equipmentCard, editEquipment, editChecklist, equipmentRow, isApiCall, T};
