const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
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
    headers: { 'X-User-Role': 'MINISTRY' },
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

test('PATCH /reports/:id/appraisal saves a damage assessment', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Tom',
      address: 'Valley 44',
      damageType: 'Structural',
      description: 'Cracked walls',
    }),
  });
  const created = await createResponse.json();

  const response = await fetch(`${baseUrl}/reports/${created.id}/appraisal`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-User-Role': 'APPRAISER' },
    body: JSON.stringify({
      damageLevel: 'severe',
      appraiserComments: 'Major structural damage to load-bearing walls',
      inspectionDate: '2026-07-20',
      reinspectionRequired: true,
    }),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.appraisal);
  assert.equal(body.appraisal.damageLevel, 'severe');
  assert.equal(body.appraisal.appraiserComments, 'Major structural damage to load-bearing walls');
  assert.equal(body.appraisal.inspectionDate, '2026-07-20');
  assert.equal(body.appraisal.reinspectionRequired, true);
});

test('PATCH /reports/:id/appraisal returns 400 when required fields are missing', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Sara',
      address: 'Hilltop 9',
      damageType: 'Water',
      description: 'Flooding',
    }),
  });
  const created = await createResponse.json();

  const response = await fetch(`${baseUrl}/reports/${created.id}/appraisal`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-User-Role': 'APPRAISER' },
    body: JSON.stringify({ damageLevel: 'medium' }),
  });

  assert.equal(response.status, 400);
});

test('PATCH /reports/:id/permit-approval saves local authority approval data', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Dan',
      address: 'Station 11',
      damageType: 'Structural',
      description: 'Roof damage',
    }),
  });
  const created = await createResponse.json();

  const response = await fetch(`${baseUrl}/reports/${created.id}/permit-approval`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-User-Role': 'MINISTRY' },
    body: JSON.stringify({
      waterSupply: true,
      electricitySupply: true,
      accessRoads: true,
      environmentalCleared: false,
      localAuthorityComments: 'Road repair pending',
      approved: false,
    }),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.permitApproval);
  assert.equal(body.permitApproval.waterSupply, true);
  assert.equal(body.permitApproval.electricitySupply, true);
  assert.equal(body.permitApproval.accessRoads, true);
  assert.equal(body.permitApproval.environmentalCleared, false);
  assert.equal(body.permitApproval.localAuthorityComments, 'Road repair pending');
  assert.equal(body.permitApproval.approved, false);
});

test('GET /users returns seeded users with passwords for reference', async () => {
  const response = await fetch(`${baseUrl}/users`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(Array.isArray(body));
  assert.ok(body.length > 0);
  assert.ok(body[0].fullName);
  assert.ok(body[0].username);
  assert.ok(body[0].password);
});

test('POST /auth/login with valid credentials returns user with role', async () => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'david.cohen', password: 'david123' }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user.id, 1);
  assert.equal(body.user.fullName, 'David Cohen');
  assert.equal(body.user.role, 'MINISTRY');
  assert.equal(body.user.password, undefined);
});

test('POST /auth/login with wrong password returns 401', async () => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'david.cohen', password: 'wrong' }),
  });
  assert.equal(response.status, 401);
});

test('POST /auth/login with missing fields returns 400', async () => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'david.cohen' }),
  });
  assert.equal(response.status, 400);
});

test('PATCH /reports/:id/status logs action when user headers are provided', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Status User',
      address: 'Change Rd 1',
      damageType: 'Water',
      description: 'Leak',
    }),
  });
  const created = await createResponse.json();

  await fetch(`${baseUrl}/reports/${created.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': '4', 'X-User-Name': 'Hanna Gold' },
    body: JSON.stringify({ status: 'NEW' }),
  });

  const actionsResponse = await fetch(`${baseUrl}/buildings/${created.id}/actions`);
  const actions = await actionsResponse.json();
  assert.ok(actions.length > 0);
  assert.equal(actions[0].userName, 'Hanna Gold');
  assert.equal(actions[0].action, 'Status updated to: NEW');
});

test('PATCH /reports/:id/budget-request logs action when user headers are provided', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Action User',
      address: 'Test Ave 1',
      damageType: 'Water',
      description: 'Test',
    }),
  });
  const created = await createResponse.json();

  await fetch(`${baseUrl}/reports/${created.id}/budget-request`, {
    method: 'PATCH',
    headers: {
      'X-User-Id': '1',
      'X-User-Name': 'David Cohen',
      'X-User-Role': 'MINISTRY',
    },
  });

  const actionsResponse = await fetch(`${baseUrl}/buildings/${created.id}/actions`);
  const actions = await actionsResponse.json();
  assert.ok(actions.length > 0);
  assert.equal(actions[0].userName, 'David Cohen');
  assert.equal(actions[0].action, 'Open Budget Request');
});

test('PATCH /reports/:id/appraisal logs action when user headers are provided', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Appraiser User',
      address: 'Eval Blvd 5',
      damageType: 'Structural',
      description: 'Cracks',
    }),
  });
  const created = await createResponse.json();

  await fetch(`${baseUrl}/reports/${created.id}/appraisal`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': '2', 'X-User-Name': 'Sarah Levy', 'X-User-Role': 'APPRAISER' },
    body: JSON.stringify({
      damageLevel: 'light',
      appraiserComments: 'Minor damage',
      inspectionDate: '2026-07-23',
      reinspectionRequired: false,
    }),
  });

  const actionsResponse = await fetch(`${baseUrl}/buildings/${created.id}/actions`);
  const actions = await actionsResponse.json();
  assert.ok(actions.length > 0);
  assert.equal(actions[0].userName, 'Sarah Levy');
  assert.equal(actions[0].action, 'Update Appraisal');
});

test('PATCH /reports/:id/permit-approval logs action when user headers are provided', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Permit User',
      address: 'Authority Rd 9',
      damageType: 'Fire',
      description: 'Smoke',
    }),
  });
  const created = await createResponse.json();

  await fetch(`${baseUrl}/reports/${created.id}/permit-approval`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': '1', 'X-User-Name': 'David Cohen', 'X-User-Role': 'MINISTRY' },
    body: JSON.stringify({
      waterSupply: true,
      electricitySupply: true,
      accessRoads: false,
      environmentalCleared: true,
      localAuthorityComments: 'All good',
      approved: true,
    }),
  });

  const actionsResponse = await fetch(`${baseUrl}/buildings/${created.id}/actions`);
  const actions = await actionsResponse.json();
  assert.ok(actions.length > 0);
  assert.equal(actions[0].userName, 'David Cohen');
  assert.equal(actions[0].action, 'Update Permit Approval');
});

test('MUNICIPALITY user is denied updating appraisal (returns 403)', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Perm Test',
      address: 'Deny Rd 1',
      damageType: 'Water',
      description: 'Test',
    }),
  });
  const created = await createResponse.json();

  const response = await fetch(`${baseUrl}/reports/${created.id}/appraisal`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-User-Role': 'MUNICIPALITY' },
    body: JSON.stringify({
      damageLevel: 'light',
      appraiserComments: 'Should be denied',
      inspectionDate: '2026-07-23',
      reinspectionRequired: false,
    }),
  });

  assert.equal(response.status, 403);
  const body = await response.json();
  assert.ok(body.error.includes('Permission denied'));

  const getResponse = await fetch(`${baseUrl}/reports/${created.id}/appraisal`);
  assert.equal(getResponse.status, 404);
});

test('APPRAISER user is denied updating permit-approval (returns 403)', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Perm Test 2',
      address: 'Deny Rd 2',
      damageType: 'Fire',
      description: 'Test',
    }),
  });
  const created = await createResponse.json();

  const response = await fetch(`${baseUrl}/reports/${created.id}/permit-approval`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-User-Role': 'APPRAISER' },
    body: JSON.stringify({
      waterSupply: true,
      electricitySupply: true,
      accessRoads: true,
      environmentalCleared: true,
      localAuthorityComments: 'Should be denied',
      approved: true,
    }),
  });

  assert.equal(response.status, 403);
  const body = await response.json();
  assert.ok(body.error.includes('Permission denied'));

  const getResponse = await fetch(`${baseUrl}/reports/${created.id}/permit-approval`);
  assert.equal(getResponse.status, 404);
});

test('APPRAISER user is denied opening budget request (returns 403)', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Perm Test 3',
      address: 'Deny Rd 3',
      damageType: 'Structural',
      description: 'Test',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
    }),
  });
  const created = await createResponse.json();

  const response = await fetch(`${baseUrl}/reports/${created.id}/budget-request`, {
    method: 'PATCH',
    headers: { 'X-User-Role': 'APPRAISER' },
  });

  assert.equal(response.status, 403);
  const body = await response.json();
  assert.ok(body.error.includes('Permission denied'));

  const getResponse = await fetch(`${baseUrl}/reports/${created.id}`);
  const getData = await getResponse.json();
  assert.equal(getData.budgetRequestOpened, false);
});

test('MUNICIPALITY user is denied opening budget request (returns 403)', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Perm Test 4',
      address: 'Deny Rd 4',
      damageType: 'Water',
      description: 'Test',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
    }),
  });
  const created = await createResponse.json();

  const response = await fetch(`${baseUrl}/reports/${created.id}/budget-request`, {
    method: 'PATCH',
    headers: { 'X-User-Role': 'MUNICIPALITY' },
  });

  assert.equal(response.status, 403);
});

test('User with no role header is denied role-protected operations (returns 403)', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'No Role',
      address: 'Deny Rd 5',
      damageType: 'Water',
      description: 'Test',
    }),
  });
  const created = await createResponse.json();

  const appraisalResponse = await fetch(`${baseUrl}/reports/${created.id}/appraisal`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      damageLevel: 'light',
      appraiserComments: 'Should fail',
      inspectionDate: '2026-07-23',
      reinspectionRequired: false,
    }),
  });
  assert.equal(appraisalResponse.status, 403);

  const budgetResponse = await fetch(`${baseUrl}/reports/${created.id}/budget-request`, {
    method: 'PATCH',
  });
  assert.equal(budgetResponse.status, 403);

  const permitResponse = await fetch(`${baseUrl}/reports/${created.id}/permit-approval`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ waterSupply: true, electricitySupply: true, accessRoads: true, environmentalCleared: true, approved: true }),
  });
  assert.equal(permitResponse.status, 403);
});

test('No action record is created when operation is blocked by role', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'No Action',
      address: 'Deny Rd 6',
      damageType: 'Fire',
      description: 'Test',
    }),
  });
  const created = await createResponse.json();

  await fetch(`${baseUrl}/reports/${created.id}/appraisal`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-User-Role': 'MUNICIPALITY' },
    body: JSON.stringify({
      damageLevel: 'light',
      appraiserComments: 'Denied',
      inspectionDate: '2026-07-23',
      reinspectionRequired: false,
    }),
  });

  const actionsResponse = await fetch(`${baseUrl}/buildings/${created.id}/actions`);
  const actions = await actionsResponse.json();
  assert.equal(actions.length, 0);
});

test('MINISTRY user can update appraisal', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Ministry Test',
      address: 'Allow Rd 1',
      damageType: 'Water',
      description: 'Test',
    }),
  });
  const created = await createResponse.json();

  const response = await fetch(`${baseUrl}/reports/${created.id}/appraisal`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-User-Role': 'MINISTRY' },
    body: JSON.stringify({
      damageLevel: 'medium',
      appraiserComments: 'Allowed',
      inspectionDate: '2026-07-23',
      reinspectionRequired: false,
    }),
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.appraisal);
});

test('MINISTRY user can update permit-approval', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Ministry Test 2',
      address: 'Allow Rd 2',
      damageType: 'Structural',
      description: 'Test',
    }),
  });
  const created = await createResponse.json();

  const response = await fetch(`${baseUrl}/reports/${created.id}/permit-approval`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-User-Role': 'MINISTRY' },
    body: JSON.stringify({
      waterSupply: true,
      electricitySupply: true,
      accessRoads: true,
      environmentalCleared: true,
      approved: true,
    }),
  });

  assert.equal(response.status, 200);
});

test('MUNICIPALITY user only sees buildings in their settlement', async () => {
  const response = await fetch(`${baseUrl}/reports`, {
    headers: { 'X-User-Role': 'MUNICIPALITY', 'X-User-Settlement': 'Jerusalem' },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(Array.isArray(body));
  body.forEach((report) => {
    assert.equal(report.settlementId, 'Jerusalem');
  });
});

test('MUNICIPALITY user is denied viewing building outside their settlement (returns 403)', async () => {
  const response = await fetch(`${baseUrl}/reports/1`, {
    headers: { 'X-User-Role': 'MUNICIPALITY', 'X-User-Settlement': 'Jerusalem' },
  });
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.ok(body.error.includes('Access denied'));
});

test('MUNICIPALITY user can view building in their settlement', async () => {
  const response = await fetch(`${baseUrl}/reports/3`, {
    headers: { 'X-User-Role': 'MUNICIPALITY', 'X-User-Settlement': 'Jerusalem' },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.id, 3);
  assert.equal(body.settlementId, 'Jerusalem');
});

test('MUNICIPALITY user is denied updating status of building outside their settlement', async () => {
  const response = await fetch(`${baseUrl}/reports/1/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-User-Role': 'MUNICIPALITY', 'X-User-Settlement': 'Jerusalem' },
    body: JSON.stringify({ status: 'NEW' }),
  });
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.ok(body.error.includes('Access denied'));
});

test('MUNICIPALITY user is denied updating permit-approval for building outside their settlement', async () => {
  const response = await fetch(`${baseUrl}/reports/1/permit-approval`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-User-Role': 'MUNICIPALITY', 'X-User-Settlement': 'Jerusalem' },
    body: JSON.stringify({ waterSupply: true, electricitySupply: true, accessRoads: true, environmentalCleared: true, approved: true }),
  });
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.ok(body.error.includes('Access denied'));
});

test('MUNICIPALITY user without settlement header is denied building access', async () => {
  const response = await fetch(`${baseUrl}/reports/3`, {
    headers: { 'X-User-Role': 'MUNICIPALITY' },
  });
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.ok(body.error.includes('Settlement information required'));
});

test('MINISTRY user can access any building regardless of settlement', async () => {
  const response = await fetch(`${baseUrl}/reports/1`, {
    headers: { 'X-User-Role': 'MINISTRY' },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.id, 1);
});

test('APPRAISER user can access any building regardless of settlement', async () => {
  const response = await fetch(`${baseUrl}/reports/1`, {
    headers: { 'X-User-Role': 'APPRAISER' },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.id, 1);
});

test('No action record is created when operation is blocked by settlement', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Settlement Block',
      address: 'Jerusalem, Test St 1',
      damageType: 'Water',
      description: 'Test',
    }),
  });
  const created = await createResponse.json();

  await fetch(`${baseUrl}/reports/${created.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-User-Role': 'MUNICIPALITY', 'X-User-Settlement': 'Tel Aviv' },
    body: JSON.stringify({ status: 'NEW' }),
  });

  const actionsResponse = await fetch(`${baseUrl}/buildings/${created.id}/actions`);
  const actions = await actionsResponse.json();
  assert.equal(actions.length, 0);
});

test('GET /settlement-processes returns empty array initially', async () => {
  const response = await fetch(`${baseUrl}/settlement-processes`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(Array.isArray(body));
});

test('Batch return-home-packages creates a SettlementProcess record', async () => {
  const response = await fetch(`${baseUrl}/buildings/batch-return-home-packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Name': 'David Cohen' },
    body: JSON.stringify({ settlement: 'Jerusalem' }),
  });
  assert.equal(response.status, 200);

  const processesResponse = await fetch(`${baseUrl}/settlement-processes`);
  const processes = await processesResponse.json();
  assert.ok(processes.length > 0);

  const latest = processes[0];
  assert.equal(latest.settlementName, 'Jerusalem');
  assert.equal(latest.startedBy, 'David Cohen');
  assert.equal(latest.status, 'COMPLETED');
  assert.ok(latest.startedAt);
  assert.ok(latest.completedAt);
});

test('SettlementProcess has correct fields', async () => {
  await fetch(`${baseUrl}/buildings/batch-return-home-packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Name': 'Test User' },
    body: JSON.stringify({ settlement: 'Haifa' }),
  });

  const processesResponse = await fetch(`${baseUrl}/settlement-processes`);
  const processes = await processesResponse.json();
  const haifaProcess = processes.find((p) => p.settlementName === 'Haifa');
  assert.ok(haifaProcess);
  assert.equal(haifaProcess.startedBy, 'Test User');
  assert.equal(haifaProcess.status, 'COMPLETED');
  assert.ok(typeof haifaProcess.id === 'number');
  assert.ok(typeof haifaProcess.startedAt === 'string');
  assert.ok(typeof haifaProcess.completedAt === 'string');
});

test('GET /settlement-processes/:id returns a specific process', async () => {
  await fetch(`${baseUrl}/buildings/batch-return-home-packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Name': 'Detail Test' },
    body: JSON.stringify({ settlement: 'Tel Aviv' }),
  });

  const processesResponse = await fetch(`${baseUrl}/settlement-processes`);
  const processes = await processesResponse.json();
  const telAvivProcess = processes.find((p) => p.settlementName === 'Tel Aviv');
  assert.ok(telAvivProcess);

  const detailResponse = await fetch(`${baseUrl}/settlement-processes/${telAvivProcess.id}`);
  assert.equal(detailResponse.status, 200);
  const detail = await detailResponse.json();
  assert.equal(detail.settlementName, 'Tel Aviv');
  assert.equal(detail.status, 'COMPLETED');
});

test('GET /settlement-processes/:id returns 404 for nonexistent process', async () => {
  const response = await fetch(`${baseUrl}/settlement-processes/99999`);
  assert.equal(response.status, 404);
});

test('Settlement processes are sorted newest first', async () => {
  await fetch(`${baseUrl}/buildings/batch-return-home-packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Name': 'First' },
    body: JSON.stringify({ settlement: 'Beer Sheva' }),
  });
  await fetch(`${baseUrl}/buildings/batch-return-home-packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Name': 'Second' },
    body: JSON.stringify({ settlement: 'Netanya' }),
  });

  const response = await fetch(`${baseUrl}/settlement-processes`);
  const processes = await response.json();
  assert.ok(processes.length >= 2);
  const firstDate = new Date(processes[0].startedAt);
  const secondDate = new Date(processes[1].startedAt);
  assert.ok(firstDate >= secondDate);
});

test('Batch process logs settlement-level events to file', async () => {
  const logPath = path.join(__dirname, '..', 'data', 'processLogs.json');
  const beforeLogs = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';

  await fetch(`${baseUrl}/buildings/batch-return-home-packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Name': 'Log Test User' },
    body: JSON.stringify({ settlement: 'Jerusalem' }),
  });

  const afterLogs = fs.readFileSync(logPath, 'utf8');
  const newLines = afterLogs.slice(beforeLogs.length).trim().split('\n').filter(Boolean);
  const newEntries = newLines.map((line) => JSON.parse(line));

  const startEvent = newEntries.find((e) => e.event === 'SETTLEMENT_PROCESS_START');
  assert.ok(startEvent, 'SETTLEMENT_PROCESS_START event should exist');
  assert.equal(startEvent.level, 'INFO');
  assert.equal(startEvent.settlement, 'Jerusalem');

  const foundEvent = newEntries.find((e) => e.event === 'SETTLEMENT_ELIGIBLE_BUILDINGS_FOUND');
  assert.ok(foundEvent, 'SETTLEMENT_ELIGIBLE_BUILDINGS_FOUND event should exist');
  assert.equal(foundEvent.level, 'INFO');
  assert.equal(typeof foundEvent.buildingId, 'number');

  const completeEvent = newEntries.find((e) => e.event === 'SETTLEMENT_PROCESS_COMPLETE');
  assert.ok(completeEvent, 'SETTLEMENT_PROCESS_COMPLETE event should exist');
  assert.equal(completeEvent.level, 'INFO');
  assert.equal(completeEvent.settlement, 'Jerusalem');
});

test('Batch process logs building-level events to file', async () => {
  const logPath = path.join(__dirname, '..', 'data', 'processLogs.json');
  const beforeLogs = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';

  await fetch(`${baseUrl}/buildings/batch-return-home-packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Name': 'Building Log User' },
    body: JSON.stringify({ settlement: 'Haifa' }),
  });

  const afterLogs = fs.readFileSync(logPath, 'utf8');
  const newLines = afterLogs.slice(beforeLogs.length).trim().split('\n').filter(Boolean);
  const newEntries = newLines.map((line) => JSON.parse(line));

  const startEvents = newEntries.filter((e) => e.event === 'BUILDING_PROCESSING_START');
  assert.ok(startEvents.length > 0, 'BUILDING_PROCESSING_START events should exist');
  startEvents.forEach((e) => {
    assert.equal(e.level, 'INFO');
    assert.equal(e.settlement, 'Haifa');
    assert.equal(typeof e.buildingId, 'number');
  });

  const pdfStartEvents = newEntries.filter((e) => e.event === 'BUILDING_PDF_START');
  assert.ok(pdfStartEvents.length > 0, 'BUILDING_PDF_START events should exist');

  const pdfEndEvents = newEntries.filter((e) => e.event === 'BUILDING_PDF_END');
  assert.ok(pdfEndEvents.length > 0, 'BUILDING_PDF_END events should exist');

  const completeEvents = newEntries.filter((e) => e.event === 'BUILDING_PROCESSING_COMPLETE');
  assert.ok(completeEvents.length > 0, 'BUILDING_PROCESSING_COMPLETE events should exist');
});

test('Log entries have correct structure with timestamp and level', async () => {
  const logPath = path.join(__dirname, '..', 'data', 'processLogs.json');
  const beforeLogs = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';

  await fetch(`${baseUrl}/buildings/batch-return-home-packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Name': 'Structure Test' },
    body: JSON.stringify({ settlement: 'Beer Sheva' }),
  });

  const afterLogs = fs.readFileSync(logPath, 'utf8');
  const newLines = afterLogs.slice(beforeLogs.length).trim().split('\n').filter(Boolean);
  const newEntries = newLines.map((line) => JSON.parse(line));

  assert.ok(newEntries.length > 0);
  newEntries.forEach((entry) => {
    assert.ok(entry.timestamp, 'entry must have timestamp');
    assert.ok(new Date(entry.timestamp).toISOString() === entry.timestamp, 'timestamp must be ISO format');
    assert.ok(['INFO', 'WARN', 'ERROR'].includes(entry.level), 'level must be INFO, WARN, or ERROR');
    assert.ok(entry.event, 'entry must have event');
    assert.ok('settlement' in entry, 'entry must have settlement field');
    assert.ok('buildingId' in entry, 'entry must have buildingId field');
    assert.ok('attempt' in entry, 'entry must have attempt field');
    assert.ok('error' in entry, 'entry must have error field');
  });
});

test('Single building return-home-package logs events to file', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'Log Single',
      address: 'Jerusalem, Log St 1',
      damageType: 'Water',
      description: 'Test logging',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      budgetRequestOpened: true,
      status: 'Restoration process completed',
    }),
  });
  const created = await createResponse.json();

  const logPath = path.join(__dirname, '..', 'data', 'processLogs.json');
  const beforeLogs = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';

  await fetch(`${baseUrl}/buildings/${created.id}/return-home-package`, {
    method: 'POST',
  });

  const afterLogs = fs.readFileSync(logPath, 'utf8');
  const newLines = afterLogs.slice(beforeLogs.length).trim().split('\n').filter(Boolean);
  const newEntries = newLines.map((line) => JSON.parse(line));

  const pdfEvents = newEntries.filter((e) => e.event === 'BUILDING_PDF_START' || e.event === 'BUILDING_PDF_END');
  assert.ok(pdfEvents.length >= 2, 'PDF start and end events should be logged');

  const completeEvent = newEntries.find((e) => e.event === 'BUILDING_PROCESSING_COMPLETE');
  assert.ok(completeEvent, 'BUILDING_PROCESSING_COMPLETE should be logged');
  assert.equal(completeEvent.buildingId, created.id);
});

test('SettlementProcess record includes a processId (UUID)', async () => {
  const response = await fetch(`${baseUrl}/buildings/batch-return-home-packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Name': 'UUID Test' },
    body: JSON.stringify({ settlement: 'Beer Sheva' }),
  });
  assert.equal(response.status, 200);

  const processesResponse = await fetch(`${baseUrl}/settlement-processes`);
  const processes = await processesResponse.json();
  const latest = processes[0];
  assert.ok(latest.processId, 'process must have processId');
  assert.ok(typeof latest.processId === 'string', 'processId must be a string');
  assert.ok(latest.processId.length > 0, 'processId must not be empty');
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  assert.ok(uuidRegex.test(latest.processId), 'processId must be a valid UUID');
});

test('All batch log entries share the same processId', async () => {
  const logPath = path.join(__dirname, '..', 'data', 'processLogs.json');
  const beforeLogs = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';

  await fetch(`${baseUrl}/buildings/batch-return-home-packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Name': 'Batch PID' },
    body: JSON.stringify({ settlement: 'Beer Sheva' }),
  });

  const afterLogs = fs.readFileSync(logPath, 'utf8');
  const newLines = afterLogs.slice(beforeLogs.length).trim().split('\n').filter(Boolean);
  const newEntries = newLines.map((line) => JSON.parse(line));

  assert.ok(newEntries.length > 0, 'must have new log entries');
  const processIds = newEntries.map((e) => e.processId);
  const uniquePids = [...new Set(processIds)];
  assert.equal(uniquePids.length, 1, 'all log entries in a batch must share the same processId');
  assert.ok(uniquePids[0], 'processId must not be null');
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  assert.ok(uuidRegex.test(uniquePids[0]), 'processId must be a valid UUID');
});

test('Single building return-home-package logs include processId', async () => {
  const createResponse = await fetch(`${baseUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reporterName: 'PID Single',
      address: 'Jerusalem, PID St 1',
      damageType: 'Water',
      description: 'Test processId',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      budgetRequestOpened: true,
      status: 'Restoration process completed',
    }),
  });
  const created = await createResponse.json();

  const logPath = path.join(__dirname, '..', 'data', 'processLogs.json');
  const beforeLogs = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';

  await fetch(`${baseUrl}/buildings/${created.id}/return-home-package`, {
    method: 'POST',
  });

  const afterLogs = fs.readFileSync(logPath, 'utf8');
  const newLines = afterLogs.slice(beforeLogs.length).trim().split('\n').filter(Boolean);
  const newEntries = newLines.map((line) => JSON.parse(line));

  assert.ok(newEntries.length > 0, 'must have new log entries');
  const processIds = newEntries.map((e) => e.processId);
  const uniquePids = [...new Set(processIds)];
  assert.equal(uniquePids.length, 1, 'all single-building logs must share the same processId');
  assert.ok(uniquePids[0], 'processId must not be null');
});

test('Different batch processes have different processIds', async () => {
  const logPath = path.join(__dirname, '..', 'data', 'processLogs.json');
  const beforeLogs = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';

  await fetch(`${baseUrl}/buildings/batch-return-home-packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Name': 'PID Batch 1' },
    body: JSON.stringify({ settlement: 'Beer Sheva' }),
  });

  const midLogs = fs.readFileSync(logPath, 'utf8');

  await fetch(`${baseUrl}/buildings/batch-return-home-packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Name': 'PID Batch 2' },
    body: JSON.stringify({ settlement: 'Beer Sheva' }),
  });

  const afterLogs = fs.readFileSync(logPath, 'utf8');

  const firstBatch = midLogs.slice(beforeLogs.length).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const secondBatch = afterLogs.slice(midLogs.length).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

  const pid1 = firstBatch[0].processId;
  const pid2 = secondBatch[0].processId;
  assert.ok(pid1 && pid2, 'both batches must have processIds');
  assert.notEqual(pid1, pid2, 'different batches must have different processIds');
});

test('GET /system-health returns correct structure', async () => {
  const response = await fetch(`${baseUrl}/system-health`);
  assert.equal(response.status, 200);
  const metrics = await response.json();
  assert.ok(metrics.settlementProcesses, 'must have settlementProcesses');
  assert.ok(metrics.notifications, 'must have notifications');
  assert.ok(metrics.performance, 'must have performance');
  assert.equal(typeof metrics.settlementProcesses.completed, 'number');
  assert.equal(typeof metrics.settlementProcesses.processing, 'number');
  assert.equal(typeof metrics.notifications.successful, 'number');
  assert.equal(typeof metrics.notifications.failed, 'number');
  assert.equal(typeof metrics.notifications.retryCount, 'number');
});

test('System health metrics reflect batch process data', async () => {
  const before = await (await fetch(`${baseUrl}/system-health`)).json();

  await fetch(`${baseUrl}/buildings/batch-return-home-packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Name': 'Health Test' },
    body: JSON.stringify({ settlement: 'Beer Sheva' }),
  });

  const after = await (await fetch(`${baseUrl}/system-health`)).json();
  assert.equal(after.settlementProcesses.completed, before.settlementProcesses.completed + 1);
});

test('System health retry count equals failed notification count', async () => {
  const metrics = await (await fetch(`${baseUrl}/system-health`)).json();
  assert.equal(metrics.notifications.retryCount, metrics.notifications.failed);
});

test('System health average duration is null when no completed processes', async () => {
  const metrics = await (await fetch(`${baseUrl}/system-health`)).json();
  assert.ok(
    typeof metrics.performance.averageSettlementDuration === 'number' || metrics.performance.averageSettlementDuration === null,
    'average duration must be a number or null'
  );
});
