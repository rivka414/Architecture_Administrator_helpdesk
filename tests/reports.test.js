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
