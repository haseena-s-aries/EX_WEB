/* eslint-env node, browser */
/* Extended browser-fieldwork acceptance: download completeness, unsaved-form recovery, inspection/defect conflicts
 * across devices (with photo replacement), checkpoint-wording conflicts, set-aside/restore and storage-full handling.
 * Runs after the main scenarios (it expects their synchronized inspection, defect and changed password). */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {api, login, png, step, assert, WEB} = require('./lib');
const {helpers: h} = require('./browser-fieldwork');
const {T} = h;

module.exports = async function extendedScenarios(browser, fx) {
  const projectName = fx.project.projectName.toUpperCase(); const areaId = fx.area.id;
  const [eqMotor, eqBox] = fx.equipment;
  let token;
  const sApi = async () => token || (token = await login(fx.surveyor.email, fx.surveyor.password));
  const creds = () => ({email: fx.surveyor.email, password: fx.surveyor.password});
  const C = await h.device(browser); const D = await h.device(browser);
  const panel = (page, heading) => page.locator('section.fw-panel, form.fw-panel', {has: page.locator('h2', {hasText: heading})});
  const syncAll = async page => { await h.tab(page, 'Sync Center'); await h.syncNowInPanel(page); await h.waitMessage(page, /All Changes Synced|All queued changes synced/); };
  const offlineReloadAndUnlock = async page => {
    await page.context().setOffline(true); await page.reload();
    await page.getByRole('button', {name: 'Sign in to offline fieldwork'}).click({timeout: 60000});
    await h.signIn(page, creds()); await h.openFieldwork(page);
  };

  try {
    await step('Download completeness: plans, layouts, area images, reference documents, inspection history photos and checklist applicability', async () => {
      await h.signIn(C.page, creds()); await h.shellInstalled(C.page); await h.openFieldwork(C.page); await h.download(C.page, projectName);
      await h.openProject(C.page, projectName, areaId);
      const gallery = panel(C.page, 'Layouts and supporting files');
      for (const name of ['Hazardous area plan', 'ga-common-layout.png', 'pump-deck-layout.png'])
        await gallery.getByText(`View ${name}`).waitFor(T);
      assert.ok(await gallery.locator('img').count() >= 3, 'layout images decrypted from the device copy');
      await h.equipmentCard(C.page, eqMotor.tagNumber).getByRole('button', {name: 'View / Edit Equipment'}).click();
      const refs = C.page.locator('section[aria-label="Reference documents"]');
      await refs.getByText(`Ex certificate ${fx.run}`).waitFor(T);
      assert.ok((await refs.innerText()).includes('IECEx TST 26.0001') && (await refs.innerText()).includes('Rev B'));
      await refs.getByText('View ex-certificate.png').waitFor(T);
      await C.page.getByRole('button', {name: 'Cancel'}).click();
      const card = h.equipmentCard(C.page, eqMotor.tagNumber);
      await card.locator('summary', {hasText: 'Inspection history (1)'}).click();
      await card.locator('details button').first().click();
      await panel(C.page, 'Saved inspection').getByText('View checkpoint.png').waitFor(T);
      await panel(C.page, 'Saved inspection').getByRole('button', {name: 'Back'}).click();
      const server = (await api('GET', `/fieldwork/projects/${fx.project.id}/records/checklist/${eqBox.id}`, {token: await sApi(), expect: 200})).body;
      await h.equipmentCard(C.page, eqBox.tagNumber).getByRole('button', {name: 'Inspection Checklist'}).click();
      await C.page.locator('article.fw-checkpoint').first().waitFor(T);
      assert.strictEqual(await C.page.locator('article.fw-checkpoint').count(), server.server.points.length, 'device checklist matches the server applicability selection');
      assert.strictEqual(await C.page.locator('article.fw-checkpoint').first().getByLabel('Items to Be Checked').inputValue(), server.server.points[0].text);
      await C.page.getByRole('button', {name: 'Back', exact: true}).click();
    });

    await step('Unsaved equipment and defect forms survive a restart before "Save on device"', async () => {
      await C.page.getByRole('button', {name: '+ Add Equipment'}).click();
      const form = panel(C.page, 'Add Equipment');
      await form.getByLabel('Item Tag *').fill(`UNSAVED-${fx.run}`); await form.getByLabel('Description', {exact: true}).fill('Typed but not saved');
      await C.page.locator('.fw-message', {hasText: 'Saved locally'}).waitFor(T);
      await offlineReloadAndUnlock(C.page);
      assert.strictEqual(await panel(C.page, 'Add Equipment').getByLabel('Item Tag *').inputValue(), `UNSAVED-${fx.run}`);
      assert.strictEqual(await panel(C.page, 'Add Equipment').getByLabel('Description', {exact: true}).inputValue(), 'Typed but not saved');
      await panel(C.page, 'Add Equipment').getByRole('button', {name: 'Cancel'}).click();
      await h.equipmentCard(C.page, eqMotor.tagNumber).getByRole('button', {name: '+ Defect Draft'}).click();
      await panel(C.page, 'Defect draft').getByLabel('observation').fill('Defect typed but not saved');
      await C.page.locator('.fw-message', {hasText: 'Saved locally'}).waitFor(T);
      await C.page.reload();
      await C.page.getByRole('button', {name: 'Sign in to offline fieldwork'}).click({timeout: 60000});
      await h.signIn(C.page, creds()); await h.openFieldwork(C.page);
      assert.strictEqual(await panel(C.page, 'Defect draft').getByLabel('observation').inputValue(), 'Defect typed but not saved');
      await panel(C.page, 'Defect draft').getByRole('button', {name: 'Cancel'}).click();
      assert.strictEqual(await h.pendingCount(C.page), 0, 'nothing was queued without "Save on device"');
      await C.context.setOffline(false);
    });

    await step('Two devices: concurrent inspection answers on a new inspection conflict and are resolved per checkpoint', async () => {
      await h.signIn(D.page, creds()); await h.shellInstalled(D.page); await h.openFieldwork(D.page); await h.download(D.page, projectName);
      await h.tab(C.page, 'Downloaded projects'); await h.download(C.page, projectName);
      await C.context.setOffline(true); await D.context.setOffline(true);
      await h.openProject(C.page, projectName, areaId); await h.openProject(D.page, projectName, areaId);
      await h.editChecklist(C.page, eqBox.tagNumber, {pass: true, remarks: 'Answer from device C'});
      await h.editChecklist(D.page, eqBox.tagNumber, {fail: true, remarks: 'Answer from device D'});
      await C.context.setOffline(false); await syncAll(C.page);
      await D.context.setOffline(false); await h.tab(D.page, 'Sync Center'); await h.syncNowInPanel(D.page);
      const conflict = D.page.locator('section.fw-panel', {has: D.page.locator('h3', {hasText: 'inspection · Conflict'})});
      await conflict.waitFor({timeout: 90000});
      assert.ok((await conflict.innerText()).includes('Another device already answered'));
      await conflict.getByRole('button', {name: 'Load current versions to resolve'}).click();
      const field = conflict.locator('fieldset', {has: D.page.locator('legend', {hasText: 'Answer '})});
      await field.waitFor(T);
      assert.ok((await field.innerText()).includes('Answer from device C'), 'the other device’s answer is shown');
      await field.getByText('Keep local').click();
      await conflict.getByRole('button', {name: 'Save resolution for synchronization'}).click();
      await syncAll(D.page);
      const history = (await api('GET', `/v1/inspection-activities/equipment/${eqBox.id}?categoryOnly=true`, {token: await sApi(), expect: 200})).body;
      assert.strictEqual(history.length, 1, 'both devices used the same inspection');
      const activity = (await api('GET', `/v1/inspection-activities/${history[0].id}`, {token: await sApi(), expect: 200})).body;
      const saved = activity.responses.find(r => r.observation === 'Answer from device D');
      assert.ok(saved && /Fail/.test(saved.gradeResultsJson), 'chosen (device D) answer persisted');
    });

    await step('Checkpoint wording changed after an inspection was opened: server wording is accepted, the answer and the checklist change are kept', async () => {
      await h.tab(C.page, 'Downloaded projects'); await h.download(C.page, projectName);
      await h.openProject(C.page, projectName, areaId);
      await h.editChecklist(C.page, eqMotor.tagNumber, {text: `Reworded checkpoint ${fx.run}`, remarks: 'Remark after rewording'});
      await h.tab(C.page, 'Sync Center'); await h.syncNowInPanel(C.page);
      const conflict = C.page.locator('section.fw-panel', {has: C.page.locator('h3', {hasText: 'inspection · Conflict'})});
      await conflict.waitFor({timeout: 90000});
      await conflict.getByRole('button', {name: 'Load current versions to resolve'}).click();
      const wording = conflict.locator('fieldset', {has: C.page.locator('legend', {hasText: 'Checkpoint wording on this inspection'})});
      await wording.waitFor(T);
      assert.strictEqual(await wording.getByText('Keep local').count(), 0, 'local wording cannot be forced onto an opened inspection');
      const all = conflict.getByRole('button', {name: 'Keep all local'});
      if (await all.isVisible()) await all.click(); else await wording.getByText('Accept server').click();
      await conflict.getByRole('button', {name: 'Save resolution for synchronization'}).click();
      await syncAll(C.page);
      const t = await sApi();
      const checklist = (await api('GET', `/fieldwork/projects/${fx.project.id}/records/checklist/${eqMotor.id}`, {token: t, expect: 200})).body;
      assert.ok(checklist.server.points.some(p => p.text === `Reworded checkpoint ${fx.run}`), 'equipment checklist keeps the new wording');
      const history = (await api('GET', `/v1/inspection-activities/equipment/${eqMotor.id}?categoryOnly=true`, {token: t, expect: 200})).body;
      const activity = (await api('GET', `/v1/inspection-activities/${history[0].id}`, {token: t, expect: 200})).body;
      assert.ok(activity.responses.some(r => r.observation === 'Remark after rewording'), 'answer saved against the inspection’s own wording');
    });

    await step('Two devices: defect edit conflict with photo replacement; replaced file removed only after commit', async () => {
      const t = await sApi();
      const defect = (await api('GET', `/defects?projectId=${fx.project.id}`, {token: t, expect: 200})).body.items.find(d => (d.observation || d.description) === `Offline defect ${fx.run}`);
      for (const page of [C.page, D.page]) { await h.tab(page, 'Downloaded projects'); await h.download(page, projectName); await h.openProject(page, projectName, areaId); }
      await C.context.setOffline(true); await D.context.setOffline(true);
      const editDefect = async (page, changes, photo) => {
        const list = panel(page, 'Defects (');
        await list.locator('summary', {hasText: `Offline defect ${fx.run}`}).click();
        await list.getByRole('button', {name: 'Edit defect draft'}).click();
        const form = panel(page, 'Defect draft');
        for (const [label, value] of Object.entries(changes)) await form.getByLabel(label).fill(value);
        if (photo) await form.getByLabel('Evidence (up to two files)').setInputFiles({name: 'defect-replacement.png', mimeType: 'image/png', buffer: photo});
        await form.getByRole('button', {name: 'Save defect on device'}).click();
        await page.locator('.fw-message', {hasText: 'Defect saved on device'}).waitFor(T);
      };
      await editDefect(C.page, {recommendation: 'Recommendation from device C'}, png(77));
      await editDefect(D.page, {recommendation: 'Recommendation from device D'});
      await C.context.setOffline(false); await syncAll(C.page);
      await D.context.setOffline(false); await h.tab(D.page, 'Sync Center'); await h.syncNowInPanel(D.page);
      const conflict = D.page.locator('section.fw-panel', {has: D.page.locator('h3', {hasText: 'defect · Conflict'})});
      await conflict.waitFor({timeout: 90000});
      await conflict.getByRole('button', {name: 'Load current versions to resolve'}).click();
      const field = conflict.locator('fieldset', {has: D.page.locator('legend', {hasText: 'recommendation'})});
      assert.ok((await field.innerText()).includes('Recommendation from device C'));
      const fields = conflict.locator('fieldset');
      for (let i = 0; i < await fields.count(); i++) await fields.nth(i).getByText('Use server').click();
      await conflict.getByRole('button', {name: 'Save resolution for synchronization'}).click();
      await syncAll(D.page);
      const after = (await api('GET', `/defects?projectId=${fx.project.id}`, {token: t, expect: 200})).body.items.find(d => d.id === defect.id);
      assert.strictEqual(after.recommendation, 'Recommendation from device C');
      assert.strictEqual((after.photos || []).length, 1, 'slot 1 replaced, not duplicated');
      assert.ok(JSON.stringify(after.photos).includes('defect-replacement'), 'replacement photo associated');
      const root = process.env.E2E_STORAGE_ROOT;
      if (root) {
        const dir = path.join(root, 'inspections', fx.project.id.replace(/-/g, ''), defect.id.replace(/-/g, ''));
        assert.strictEqual(fs.readdirSync(dir).length, 1, 'replaced defect photo deleted from storage after commit; new one kept');
      }
    });

    await step('Stuck change: a rejected equipment record and its dependent defect are set aside, exported, restored — never lost', async () => {
      await C.context.setOffline(true);
      await h.tab(C.page, 'Fieldwork');
      const longTag = `INVALID-${'X'.repeat(140)}`;
      await C.page.getByRole('button', {name: '+ Add Equipment'}).click();
      const form = panel(C.page, 'Add Equipment');
      await form.getByLabel('Item Tag *').fill(longTag); await form.getByLabel('Equipment Type *').fill('Rejected by server validation');
      await form.getByRole('button', {name: 'Save on device'}).click();
      await C.page.locator('.fw-message', {hasText: 'Saved on Device'}).waitFor(T);
      await h.equipmentCard(C.page, longTag.slice(0, 40)).getByRole('button', {name: '+ Defect Draft'}).click();
      await panel(C.page, 'Defect draft').getByLabel('observation').fill(`Defect on rejected equipment ${fx.run}`);
      await panel(C.page, 'Defect draft').getByRole('button', {name: 'Save defect on device'}).click();
      await C.page.locator('.fw-message', {hasText: 'Defect saved on device'}).waitFor(T);
      await C.context.setOffline(false); await h.tab(C.page, 'Sync Center'); await h.syncNowInPanel(C.page);
      const eqCard = C.page.locator('section.fw-panel', {has: C.page.locator('h3', {hasText: 'equipment · Failed'})});
      await eqCard.waitFor({timeout: 90000});
      const defectCard = C.page.locator('section.fw-panel', {has: C.page.locator('h3', {hasText: 'defect · Pending'})});
      await defectCard.getByText(/Waiting for the equipment .* change \(Failed\)/).waitFor(T);
      await eqCard.getByRole('button', {name: 'Set aside (+1 dependent)'}).click();
      await C.page.locator('.fw-message', {hasText: '2 change(s) set aside'}).waitFor(T);
      assert.strictEqual(await h.pendingCount(C.page), 0);
      await h.syncNowInPanel(C.page);
      await h.waitMessage(C.page, 'set aside on this device (not synchronized)');
      const setAside = C.page.locator('section.fw-set-aside');
      assert.strictEqual(await setAside.locator('article').count(), 2);
      const [download] = await Promise.all([C.page.waitForEvent('download'), setAside.locator('article', {hasText: 'defect'}).getByRole('button', {name: 'Download a copy'}).click()]);
      const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
      assert.strictEqual(exported.payload.observation, `Defect on rejected equipment ${fx.run}`);
      await setAside.locator('article', {hasText: 'defect'}).getByRole('button', {name: 'Restore to queue'}).click();
      await C.page.locator('.fw-message', {hasText: '2 change(s) restored'}).waitFor(T);
      assert.strictEqual(await h.pendingCount(C.page), 2, 'restoring the defect also restores the equipment it needs');
      // Clean up for later steps: set it aside again (still retained on the device).
      await h.syncNowInPanel(C.page);
      await C.page.locator('section.fw-panel', {has: C.page.locator('h3', {hasText: 'equipment · Failed'})}).getByRole('button', {name: /Set aside/}).click();
      await C.page.locator('.fw-message', {hasText: 'set aside'}).waitFor(T);
    });

    await step('Storage full (simulated QuotaExceededError): the save is refused with a clear message, nothing is lost, and it works again once space is free', async () => {
      // Simulated storage-full: Chromium's quota emulation is not reliable for IndexedDB here, so large writes are made
      // to fail the way browsers report quota exhaustion (the transaction aborts asynchronously with QuotaExceededError).
      await C.page.evaluate(() => {
        const put = IDBObjectStore.prototype.put; window.__restorePut = () => { IDBObjectStore.prototype.put = put; };
        IDBObjectStore.prototype.put = function (value, ...rest) {
          const result = put.call(this, value, ...rest);
          if ((value?.data?.byteLength || 0) > 1024 * 1024) { const tx = this.transaction;
            setTimeout(() => { Object.defineProperty(tx, 'error', {configurable: true, get: () => new DOMException('Quota exceeded', 'QuotaExceededError')}); try { tx.abort(); } catch { /* done */ } }, 0); }
          return result;
        };
      });
      try {
        await h.tab(C.page, 'Fieldwork');
        await h.equipmentCard(C.page, eqMotor.tagNumber).getByRole('button', {name: 'Inspection Checklist'}).click();
        const panelEl = panel(C.page, 'Inspection Checklist');
        const before = await panelEl.locator('.fw-gallery .fw-photo').count();
        const pendingBefore = await h.pendingCount(C.page);
        await panelEl.locator('label', {hasText: 'Photographs / evidence'}).locator('input[type=file]')
          .setInputFiles({name: 'too-large.png', mimeType: 'image/png', buffer: crypto.randomBytes(4 * 1024 * 1024)});
        await C.page.locator('.fw-error', {hasText: 'Device storage is full. This change was NOT saved.'}).waitFor(T);
        assert.strictEqual(await panelEl.locator('.fw-gallery .fw-photo').count(), before, 'refused photo is not shown as saved');
        assert.strictEqual(await h.pendingCount(C.page), pendingBefore, 'queue unchanged');
        await panelEl.getByRole('button', {name: 'Back', exact: true}).click();
      } finally { await C.page.evaluate(() => window.__restorePut?.()); }
      // After space is available again the same photo saves normally.
      await h.equipmentCard(C.page, eqMotor.tagNumber).getByRole('button', {name: 'Inspection Checklist'}).click();
      await panel(C.page, 'Inspection Checklist').locator('label', {hasText: 'Photographs / evidence'}).locator('input[type=file]')
        .setInputFiles({name: 'fits-now.png', mimeType: 'image/png', buffer: png(91)});
      await C.page.getByText('View fits-now.png').waitFor(T);
      await panel(C.page, 'Inspection Checklist').getByRole('button', {name: 'Back', exact: true}).click();
      await h.tab(C.page, 'Sync Center');
      assert.strictEqual(await C.page.locator('section.fw-set-aside article').count(), 2, 'set-aside work retained');
      await h.tab(C.page, 'Downloaded projects');
      await C.page.locator('.fw-panel', {has: C.page.locator('h2', {hasText: projectName})}).getByText('Available Offline').waitFor(T);
    });
  } finally { await C.context.close(); await D.context.close(); }
};
