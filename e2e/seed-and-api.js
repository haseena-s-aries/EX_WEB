/* eslint-env node, browser */
/* Seeds a synthetic fixture through the real API and verifies server-side fieldwork idempotency/conflicts. */
const crypto = require('crypto');
const {api, login, png, step, assert} = require('./lib');

const ADMIN = {email: process.env.E2E_ADMIN_EMAIL || 'e2e-admin@example.test', password: process.env.E2E_ADMIN_PASSWORD || 'E2eAdmin!Passw0rd#2026'};
const run = crypto.randomBytes(3).toString('hex');

async function seed() {
  const admin = await login(ADMIN.email, ADMIN.password);
  const mk = async (role, name) => {
    const email = `e2e-${role.toLowerCase()}-${run}-${name}@example.test`; const password = `E2e!${role}${run}Pw#1`;
    const r = await api('POST', '/auth/users', {token: admin, json: {email, displayName: `E2E ${role} ${name} ${run}`, password, role}, expect: 201});
    return {id: r.body.id, email, password};
  };
  const surveyor = await mk('Surveyor', 'a'); const other = await mk('Surveyor', 'b'); const qc = await mk('Qc', 'a');
  const mkProject = async (label, surveyorId) => (await api('POST', '/projects', {token: admin, expect: 201, json: {
    projectName: `E2E Fieldwork ${label} ${run}`, jobNo: `E2E-${label}-${run}`, location: 'Local test bench', vesselOrSiteName: 'Synthetic site',
    assignedSurveyorId: surveyorId, assignedQcId: qc.id, clientName: 'Synthetic Client', targetDate: '2027-01-31', sector: 'Synthetic'}})).body;
  const project = await mkProject('A', surveyor.id);
  const unassigned = await mkProject('B', other.id);
  const area = (await api('POST', `/projects/${project.id}/areas`, {token: admin, json: {areaName: 'Pump deck'}, expect: 201})).body;
  const form = new FormData(); form.append('Files', new Blob([png(7)], {type: 'image/png'}), 'pump-deck-layout.png');
  await api('POST', `/projects/${project.id}/areas/${area.id}/photos`, {token: admin, form, expect: 201}).catch(async () =>
    api('POST', `/projects/${project.id}/areas/${area.id}/photos`, {token: admin, form}));
  const sToken = await login(surveyor.email, surveyor.password);
  const equipment = [];
  for (const [tag, type] of [['P-101-MTR', 'Motor'], ['JB-204', 'Junction box']])
    equipment.push((await api('POST', `/surveyor/projects/${project.id}/areas/${area.id}/equipment`, {token: sToken, expect: 201,
      json: {xPercent: 40, yPercent: 40, tagNumber: tag, type, exProtectionType: 'Ex d', isPlacedOnLayout: false, description: `${type} seeded`}})).body);
  return {admin, surveyor, other, qc, project, unassigned, area, equipment, run, sToken};
}

async function apiChecks(fx) {
  const t = fx.sToken; const p = fx.project.id; const e = fx.equipment[1].id;
  const selectionUrl = `/v1/inspection-activities/category-checklist/projects/${p}/selection?equipmentId=${e}`;
  const selection = (await api('GET', selectionUrl, {token: t, expect: 200})).body;
  const points = selection.points.filter(x => selection.selectedCodes.includes(x.code)).slice(0, 5);
  const usable = points.length ? points : selection.points.slice(0, 5);
  const body = {codes: usable.map(x => x.code), version: 0, categoryChanges: Object.fromEntries(usable.map(x => [x.code, x.protectionApplicability])),
    descriptionChanges: Object.fromEntries(usable.map((x, i) => [x.code, i === 0 ? `${x.text} (API idempotency check)` : x.text]))};
  const op = crypto.randomUUID();
  const headers = {'X-Fieldwork-Operation': op, 'X-Fieldwork-Project': p, 'X-Fieldwork-Version': '0'};

  await step('API: checklist conflict record is retrievable (kind=checklist)', async () => {
    const r = await api('GET', `/fieldwork/projects/${p}/records/checklist/${e}`, {token: t, expect: 200});
    assert.strictEqual(r.body.version, '0'); assert.ok(Array.isArray(r.body.server.points));
  });
  await step('API: checklist save is accepted as an idempotent fieldwork mutation', async () => {
    const first = await api('PUT', selectionUrl, {token: t, json: body, headers, expect: 200});
    assert.strictEqual(first.body.result.version, 1); assert.strictEqual(first.body.version, '1');
    // Lost response: the identical retry must replay the committed receipt, not create version 2.
    const replay = await api('PUT', selectionUrl, {token: t, json: body, headers, expect: 200});
    assert.deepStrictEqual(replay.body, first.body);
    const record = await api('GET', `/fieldwork/projects/${p}/records/checklist/${e}`, {token: t, expect: 200});
    assert.strictEqual(record.body.version, '1', 'retry must not create a duplicate checklist version');
    assert.strictEqual(record.body.server.source, 'equipment');
    assert.ok(record.body.server.points[0].text.endsWith('(API idempotency check)'));
  });
  await step('API: reusing an operation ID with different data is rejected', async () => {
    const r = await api('PUT', selectionUrl, {token: t, json: {...body, codes: body.codes.slice(0, 1)}, headers});
    assert.strictEqual(r.status, 409);
  });
  await step('API: stale checklist version returns 409 with current server values', async () => {
    const r = await api('PUT', selectionUrl, {token: t, json: body, headers: {...headers, 'X-Fieldwork-Operation': crypto.randomUUID()}});
    assert.strictEqual(r.status, 409); assert.strictEqual(r.body.version, '1'); assert.ok(r.body.server.points.length > 0);
  });
  await step('API: checklist requires equipment scope and project assignment', async () => {
    const noEquipment = await api('PUT', `/v1/inspection-activities/category-checklist/projects/${p}/selection`, {token: t, json: body,
      headers: {...headers, 'X-Fieldwork-Operation': crypto.randomUUID()}});
    assert.strictEqual(noEquipment.status, 400);
    const other = await api('PUT', `/v1/inspection-activities/category-checklist/projects/${fx.unassigned.id}/selection?equipmentId=${e}`,
      {token: t, json: body, headers: {...headers, 'X-Fieldwork-Project': fx.unassigned.id, 'X-Fieldwork-Operation': crypto.randomUUID()}});
    assert.strictEqual(other.status, 403);
  });
  await step('API: pre-sync assignment revalidation endpoint', async () => {
    await api('GET', `/fieldwork/projects/${p}/access`, {token: t, expect: 200});
    await api('GET', `/fieldwork/projects/${fx.unassigned.id}/access`, {token: t, expect: 403});
    await api('GET', `/fieldwork/projects/${p}/access`, {expect: 401});
  });
  // Restore a clean checklist baseline for the browser scenarios on equipment 0 (equipment 1 is now at version 1).
}

module.exports = {seed, apiChecks};
