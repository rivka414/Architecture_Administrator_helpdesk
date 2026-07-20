const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');

let server;
let baseUrl;

test.before(async () => {
  const app = createApp();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

test('GET /reports returns reports', async () => {
  const response = await fetch(`${baseUrl}/reports`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(Array.isArray(body));
  assert.ok(body.length > 0);
});

test('POST /reports creates a report with WAITING_FOR_VALIDATION by default', async () => {
  const response = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Alice',
      address: 'Main Street 10',
      damageType: 'Water',
      description: 'Leak in the kitchen',
    }),
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.status, 'WAITING_FOR_VALIDATION');
  assert.ok(body.id);
});

test('POST /reports stores the new eligibility fields', async () => {
  const response = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Carol',
      address: 'Park Avenue 7',
      damageType: 'Structural',
      description: 'Wall crack in the lobby',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      apartmentsInBuilding: 24,
    }),
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.damagePhotosExist, true);
  assert.equal(body.engineerReportExists, true);
  assert.equal(body.eligibilityCheckPerformed, true);
  assert.equal(body.apartmentsInBuilding, 24);
});

test('POST /reports parses string boolean values correctly', async () => {
  const response = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Dina',
      address: 'Lake Road 5',
      damageType: 'Fire',
      description: 'Smoke damage',
      damagePhotosExist: 'false',
      engineerReportExists: 'true',
      eligibilityCheckPerformed: 'false',
      apartmentsInBuilding: '10',
    }),
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.damagePhotosExist, false);
  assert.equal(body.engineerReportExists, true);
  assert.equal(body.eligibilityCheckPerformed, false);
  assert.equal(body.socialApproval, false);
  assert.equal(body.apartmentsInBuilding, 10);
});

test('PATCH /reports/:id/budget-request marks a budget request as opened', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Mina',
      address: 'Hill 8',
      damageType: 'Water',
      description: 'Roof leak',
    }),
  });
  const created = await createResponse.json();

  const response = await fetch(`${baseUrl}/reports/${created.id}/budget-request`, {
    method: 'PATCH',
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.budgetRequestOpened, true);
});

test('POST /buildings/:id/return-home-package generates a file for eligible reports', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Eli',
      address: 'Garden 33',
      damageType: 'Structural',
      description: 'Foundation issue',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      socialApproval: true,
      apartmentsInBuilding: 30,
      budgetRequestOpened: true,
      status: 'Restoration process completed',
    }),
  });
  const created = await createResponse.json();

  const response = await fetch(`${baseUrl}/buildings/${created.id}/return-home-package`, {
    method: 'POST',
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.url);
  assert.ok(body.fileName);
});

test('POST /buildings/:id/return-home-package allows generation after restoration work begins', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Rina',
      address: 'North 9',
      damageType: 'Water',
      description: 'Basement issue',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      socialApproval: true,
      apartmentsInBuilding: 18,
      budgetRequestOpened: true,
      status: 'Building in the process of restoration',
    }),
  });
  const created = await createResponse.json();

  const response = await fetch(`${baseUrl}/buildings/${created.id}/return-home-package`, {
    method: 'POST',
  });

  assert.equal(response.status, 200);
});

test('PATCH /reports/:id/status supports the new status flow', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Bob',
      address: 'Market 22',
      damageType: 'Electrical',
      description: 'Broken socket',
    }),
  });
  const created = await createResponse.json();

  const firstUpdate = await fetch(`${baseUrl}/reports/${created.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'NEW' }),
  });
  assert.equal(firstUpdate.status, 200);
  const secondUpdate = await fetch(`${baseUrl}/reports/${created.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'IN_REVIEW' }),
  });
  assert.equal(secondUpdate.status, 200);
  const body = await secondUpdate.json();
  assert.equal(body.status, 'IN_REVIEW');
});
