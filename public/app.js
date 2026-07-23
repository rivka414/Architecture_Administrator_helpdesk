const loginScreen = document.getElementById('loginScreen');
const listScreen = document.getElementById('listScreen');
const createScreen = document.getElementById('createScreen');
const detailsScreen = document.getElementById('detailsScreen');
const messageCenterScreen = document.getElementById('messageCenterScreen');
const appraisersPortalScreen = document.getElementById('appraisersPortalScreen');
const reportList = document.getElementById('reportList');
const detailsContent = document.getElementById('detailsContent');
const notificationsList = document.getElementById('notificationsList');
const appraisersPortalList = document.getElementById('appraisersPortalList');
const appraisalForm = document.getElementById('appraisalForm');
const createForm = document.getElementById('createForm');
const statusSelect = document.getElementById('statusSelect');
const waitingFilter = document.getElementById('waitingFilter');
const budgetReadyFilter = document.getElementById('budgetReadyFilter');
const settlementFilter = document.getElementById('settlementFilter');
const settlementSummary = document.getElementById('settlementSummary');
const batchGenerateButton = document.getElementById('batchGenerateButton');
const messageCenterButton = document.getElementById('messageCenterButton');
const appraisersPortalButton = document.getElementById('appraisersPortalButton');
const backFromMessageCenter = document.getElementById('backFromMessageCenter');
const backFromAppraisersPortal = document.getElementById('backFromAppraisersPortal');
const localAuthorityPortalScreen = document.getElementById('localAuthorityPortalScreen');
const localAuthorityPortalButton = document.getElementById('localAuthorityPortalButton');
const localAuthorityPortalList = document.getElementById('localAuthorityPortalList');
const permitApprovalForm = document.getElementById('permitApprovalForm');
const permitBuildingInfo = document.getElementById('permitBuildingInfo');
const permitWaterSupply = document.getElementById('permitWaterSupply');
const permitElectricitySupply = document.getElementById('permitElectricitySupply');
const permitAccessRoads = document.getElementById('permitAccessRoads');
const permitEnvironmentalCleared = document.getElementById('permitEnvironmentalCleared');
const permitComments = document.getElementById('permitComments');
const permitApproved = document.getElementById('permitApproved');
const savePermitApprovalButton = document.getElementById('savePermitApprovalButton');
const cancelPermitApprovalButton = document.getElementById('cancelPermitApprovalButton');
const backFromLocalAuthorityPortal = document.getElementById('backFromLocalAuthorityPortal');
const modalOverlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');
const notificationModeSelect = document.getElementById('notificationModeSelect');
const notificationModeIndicator = document.getElementById('notificationModeIndicator');
const appraisalDamageLevel = document.getElementById('appraisalDamageLevel');
const appraisalComments = document.getElementById('appraisalComments');
const appraisalDate = document.getElementById('appraisalDate');
const appraisalReinspection = document.getElementById('appraisalReinspection');
const appraisalBuildingInfo = document.getElementById('appraisalBuildingInfo');
const saveAppraisalButton = document.getElementById('saveAppraisalButton');
const cancelAppraisalButton = document.getElementById('cancelAppraisalButton');
const navUserSection = document.getElementById('navUserSection');
const navUserName = document.getElementById('navUserName');
const logoutButton = document.getElementById('logoutButton');
const actionHistorySection = document.getElementById('actionHistorySection');
const actionHistoryList = document.getElementById('actionHistoryList');
const loginForm = document.getElementById('loginForm');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const userRefTableBody = document.getElementById('userRefTableBody');

let reports = [];
let selectedReportId = null;
let pendingSuccessMessage = '';
let generatedFiles = {};
let selectedAppraisalReportId = null;
let currentUser = null;

function showScreen(screen) {
  [loginScreen, listScreen, createScreen, detailsScreen, messageCenterScreen, appraisersPortalScreen, localAuthorityPortalScreen].forEach((element) => element.classList.add('hidden'));
  screen.classList.remove('hidden');
}

function isLoggedIn() {
  return currentUser !== null;
}

function saveSession(user) {
  localStorage.setItem('currentUser', JSON.stringify(user));
}

function loadSession() {
  try {
    const stored = localStorage.getItem('currentUser');
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function clearSession() {
  localStorage.removeItem('currentUser');
}

async function loadUserRefTable() {
  const response = await fetch('/users');
  const users = await response.json();
  renderUserRefTable(users);
}

function renderUserRefTable(users) {
  userRefTableBody.innerHTML = '';
  users.forEach((user) => {
    const row = document.createElement('tr');
    const settlement = user.settlementId || '—';
    row.innerHTML = `<td>${user.fullName}</td><td>${user.username}</td><td>${user.password}</td><td>${user.role}</td><td>${settlement}</td>`;
    userRefTableBody.appendChild(row);
  });
}

async function handleLogin(event) {
  event.preventDefault();
  loginError.style.display = 'none';
  const username = loginUsername.value.trim();
  const password = loginPassword.value;

  if (!username || !password) {
    loginError.textContent = 'Please enter username and password.';
    loginError.style.display = 'block';
    return;
  }

  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    loginError.textContent = result.error || 'Invalid username or password.';
    loginError.style.display = 'block';
    return;
  }

  const { user } = await response.json();
  login(user);
}

function login(user) {
  currentUser = user;
  saveSession(user);
  const roleDisplay = user.settlementId ? `${user.role} - ${user.settlementId}` : user.role;
  navUserName.textContent = `${user.fullName} (${roleDisplay})`;
  navUserSection.classList.remove('hidden');
  loginForm.reset();
  loginError.style.display = 'none';
  updatePortalButtons();
  showScreen(listScreen);
  loadReports();
}

function logout() {
  currentUser = null;
  clearSession();
  navUserSection.classList.add('hidden');
  navUserName.textContent = '';
  showScreen(loginScreen);
}

function updatePortalButtons() {
  if (!currentUser) return;
  const role = currentUser.role;
  appraisersPortalButton.style.display = (role === 'APPRAISER' || role === 'MINISTRY') ? '' : 'none';
  localAuthorityPortalButton.style.display = (role === 'MINISTRY' || role === 'MUNICIPALITY') ? '' : 'none';
}

function authHeaders() {
  if (!currentUser) return {};
  const headers = {
    'X-User-Id': String(currentUser.id),
    'X-User-Name': currentUser.fullName,
    'X-User-Role': currentUser.role,
  };
  if (currentUser.settlementId) {
    headers['X-User-Settlement'] = currentUser.settlementId;
  }
  return headers;
}

function hasRole(role) {
  return currentUser && currentUser.role === role;
}

function canDoAction(...roles) {
  return currentUser && roles.includes(currentUser.role);
}

async function loadNotifications() {
  const response = await fetch('/notifications');
  const notifications = await response.json();
  renderNotifications(notifications);
}

async function loadNotificationMode() {
  const response = await fetch('/notifications/status');
  const data = await response.json();
  notificationModeSelect.value = data.mode;
  updateModeIndicator(data.mode);
}

async function setNotificationMode(mode) {
  await fetch('/notifications/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode })
  });
  updateModeIndicator(mode);
}

function updateModeIndicator(mode) {
  const labels = {
    success: 'Server: Success',
    always_fail: 'Server: Always Fail',
    fail_first: 'Server: Fail First Attempt',
    random: 'Server: Random Failure',
    timeout: 'Server: Response Lost (Timeout)'
  };
  const colors = {
    success: '#0b6b2f',
    always_fail: '#c62828',
    fail_first: '#e65100',
    random: '#6a1b9a',
    timeout: '#bf360c'
  };
  notificationModeIndicator.textContent = labels[mode] || mode;
  notificationModeIndicator.style.color = colors[mode] || '#222';
}

function renderNotifications(notifications) {
  if (!notifications.length) {
    notificationsList.innerHTML = '<p>No messages sent yet.</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Message ID</th>
        <th>Building ID</th>
        <th>Building Address</th>
        <th>Email</th>
        <th>Subject</th>
        <th>Date & Time</th>
        <th>Status</th>
        <th>Idempotency Key</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  notifications.forEach((msg) => {
    const row = document.createElement('tr');
    const dt = msg.dateTime ? new Date(msg.dateTime).toLocaleString() : '';
    row.innerHTML = `
      <td>${msg.messageId}</td>
      <td>#${msg.buildingId}</td>
      <td>${msg.buildingAddress}</td>
      <td>${msg.email}</td>
      <td>${msg.subject}</td>
      <td>${dt}</td>
      <td><span class="status">${msg.status}</span></td>
      <td>${msg.idempotencyKey || ''}</td>
    `;
    tbody.appendChild(row);
  });

  notificationsList.innerHTML = '';
  notificationsList.appendChild(table);
}

function renderAppraisersPortal() {
  if (!reports.length) {
    appraisersPortalList.innerHTML = '<p>No buildings found.</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Building ID</th>
        <th>Address</th>
        <th>Locality</th>
        <th>Status</th>
        <th>Appraisal</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  reports.forEach((report) => {
    const row = document.createElement('tr');
    const locality = report.address ? report.address.split(',')[0].trim() : '';
    const hasAppraisal = report.appraisal ? 'Yes' : 'No';
    row.innerHTML = `
      <td>#${report.id}</td>
      <td>${report.address}</td>
      <td>${locality}</td>
      <td><span class="status ${report.status}">${report.status}</span></td>
      <td>${hasAppraisal}</td>
      <td><a href="#" class="appraisal-link" data-id="${report.id}">Enter Assessment</a></td>
    `;
    tbody.appendChild(row);
  });

  appraisersPortalList.innerHTML = '';
  appraisersPortalList.appendChild(table);
}

function openAppraisalForm(reportId) {
  const report = reports.find((item) => item.id === reportId);
  if (!report) return;

  selectedAppraisalReportId = reportId;
  appraisalBuildingInfo.textContent = `Building #${report.id} - ${report.address}`;
  appraisalForm.classList.remove('hidden');
  appraisersPortalList.classList.add('hidden');

  if (report.appraisal) {
    appraisalDamageLevel.value = report.appraisal.damageLevel;
    appraisalComments.value = report.appraisal.appraiserComments || '';
    appraisalDate.value = report.appraisal.inspectionDate || '';
    appraisalReinspection.checked = report.appraisal.reinspectionRequired || false;
  } else {
    appraisalDamageLevel.value = 'light';
    appraisalComments.value = '';
    appraisalDate.value = '';
    appraisalReinspection.checked = false;
  }
}

async function saveAppraisal() {
  const response = await fetch(`/reports/${selectedAppraisalReportId}/appraisal`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      damageLevel: appraisalDamageLevel.value,
      appraiserComments: appraisalComments.value,
      inspectionDate: appraisalDate.value,
      reinspectionRequired: appraisalReinspection.checked,
    }),
  });

  if (response.ok) {
    const updated = await response.json();
    const report = reports.find((item) => item.id === updated.id);
    if (report) {
      report.appraisal = updated.appraisal;
    }
    appraisalForm.classList.add('hidden');
    appraisersPortalList.classList.remove('hidden');
    renderAppraisersPortal();
    renderReports();
  }
}

let selectedPermitReportId = null;

function renderLocalAuthorityPortal() {
  if (!reports.length) {
    localAuthorityPortalList.innerHTML = '<p>No buildings found.</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Building ID</th>
        <th>Address</th>
        <th>Locality</th>
        <th>Status</th>
        <th>Permit Approval</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  reports.forEach((report) => {
    const row = document.createElement('tr');
    const locality = report.address ? report.address.split(',')[0].trim() : '';
    const hasApproval = report.permitApproval ? 'Yes' : 'No';
    row.innerHTML = `
      <td>#${report.id}</td>
      <td>${report.address}</td>
      <td>${locality}</td>
      <td><span class="status ${report.status}">${report.status}</span></td>
      <td>${hasApproval}</td>
      <td><a href="#" class="permit-link" data-id="${report.id}">Update Infrastructure</a></td>
    `;
    tbody.appendChild(row);
  });

  localAuthorityPortalList.innerHTML = '';
  localAuthorityPortalList.appendChild(table);
}

function openPermitApprovalForm(reportId) {
  const report = reports.find((item) => item.id === reportId);
  if (!report) return;

  selectedPermitReportId = reportId;
  permitBuildingInfo.textContent = `Building #${report.id} - ${report.address}`;
  permitApprovalForm.classList.remove('hidden');
  localAuthorityPortalList.classList.add('hidden');

  if (report.permitApproval) {
    permitWaterSupply.checked = report.permitApproval.waterSupply || false;
    permitElectricitySupply.checked = report.permitApproval.electricitySupply || false;
    permitAccessRoads.checked = report.permitApproval.accessRoads || false;
    permitEnvironmentalCleared.checked = report.permitApproval.environmentalCleared || false;
    permitComments.value = report.permitApproval.localAuthorityComments || '';
    permitApproved.checked = report.permitApproval.approved || false;
  } else {
    permitWaterSupply.checked = false;
    permitElectricitySupply.checked = false;
    permitAccessRoads.checked = false;
    permitEnvironmentalCleared.checked = false;
    permitComments.value = '';
    permitApproved.checked = false;
  }
}

async function savePermitApproval() {
  const response = await fetch(`/reports/${selectedPermitReportId}/permit-approval`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      waterSupply: permitWaterSupply.checked,
      electricitySupply: permitElectricitySupply.checked,
      accessRoads: permitAccessRoads.checked,
      environmentalCleared: permitEnvironmentalCleared.checked,
      localAuthorityComments: permitComments.value,
      approved: permitApproved.checked,
    }),
  });

  if (response.ok) {
    const updated = await response.json();
    const report = reports.find((item) => item.id === updated.id);
    if (report) {
      report.permitApproval = updated.permitApproval;
    }
    permitApprovalForm.classList.add('hidden');
    localAuthorityPortalList.classList.remove('hidden');
    renderLocalAuthorityPortal();
    renderReports();
  }
}

async function loadReports() {
  const response = await fetch('/reports', { headers: authHeaders() });
  reports = await response.json();
  populateSettlementFilter();
  renderReports();
}

function populateSettlementFilter() {
  const settlements = new Set();
  reports.forEach(report => {
    const settlement = report.settlementId || extractSettlement(report.address);
    if (settlement) {
      settlements.add(settlement);
    }
  });
  
  const currentValue = settlementFilter.value;
  settlementFilter.innerHTML = '<option value="">All Settlements</option>';
  settlements.forEach(settlement => {
    const option = document.createElement('option');
    option.value = settlement;
    option.textContent = settlement;
    settlementFilter.appendChild(option);
  });

  if (currentUser && currentUser.role === 'MUNICIPALITY' && currentUser.settlementId) {
    settlementFilter.value = currentUser.settlementId;
    settlementFilter.disabled = true;
  } else {
    settlementFilter.value = currentValue;
    settlementFilter.disabled = false;
  }
}

function extractSettlement(address) {
  if (!address) return '';
  return address.split(',')[0].trim();
}

function isWaitingInLine(report) {
  return Boolean(report.engineerReportExists && report.eligibilityCheckPerformed);
}

function isReadyForBudgetRelease(report) {
  return Boolean(report.damagePhotosExist && report.engineerReportExists && report.eligibilityCheckPerformed);
}

function canGenerateReoccupationFile(report) {
  return Boolean(
    report.damagePhotosExist &&
    report.engineerReportExists &&
    report.eligibilityCheckPerformed &&
    report.budgetRequestOpened &&
    ['Building in the process of restoration', 'Restoration process completed'].includes(report.status)
  );
}

function isEligibleForOpening(report) {
  if (!report.damagePhotosExist) return false;
  if (!report.engineerReportExists) return false;
  if (!report.eligibilityCheckPerformed) return false;
  const needsSocialApproval = Number(report.apartmentsInBuilding) > 24;
  if (needsSocialApproval && !report.socialApproval) return false;
  if (!report.budgetRequestOpened) return false;
  if (!report.returnHomeFileGenerated) return false;
  if (!report.appraisal) return false;
  if (report.appraisal.damageLevel === 'severe') return false;
  if (!report.permitApproval || !report.permitApproval.approved) return false;
  return true;
}

function getSettlementSummary(filteredReports) {
  const total = filteredReports.length;
  let eligible = 0;
  let notEligible = 0;
  let awaitingAppraisal = 0;
  let awaitingPermit = 0;
  let notEligibleOther = 0;

  filteredReports.forEach((report) => {
    if (isEligibleForOpening(report)) {
      eligible++;
    } else {
      notEligible++;
      if (!report.appraisal) {
        awaitingAppraisal++;
      } else if (!report.permitApproval || !report.permitApproval.approved) {
        awaitingPermit++;
      } else {
        notEligibleOther++;
      }
    }
  });

  return { total, eligible, notEligible, awaitingAppraisal, awaitingPermit, notEligibleOther };
}

function getVisibleReports() {
  let filteredReports = reports;

  if (waitingFilter.checked) {
    filteredReports = filteredReports.filter((report) => isWaitingInLine(report));
  }

  if (budgetReadyFilter.checked) {
    filteredReports = filteredReports.filter((report) => isReadyForBudgetRelease(report));
  }

  if (settlementFilter.value) {
    filteredReports = filteredReports.filter((report) => {
      const settlement = extractSettlement(report.address);
      return settlement === settlementFilter.value;
    });
  }

  return filteredReports;
}

function renderReports() {
  const visibleReports = getVisibleReports();
  reportList.innerHTML = '';

  if (settlementFilter.value) {
    const summary = getSettlementSummary(visibleReports);
    settlementSummary.classList.remove('hidden');
    settlementSummary.innerHTML = `
      <strong>Settlement Summary: ${settlementFilter.value}</strong>
      <div style="margin-top:0.5rem; display:flex; gap:1.5rem; flex-wrap:wrap;">
        <span>Total buildings: <strong>${summary.total}</strong></span>
        <span>Eligible for opening: <strong style="color:#0b6b2f;">${summary.eligible}</strong></span>
        <span>Not eligible: <strong style="color:#c62828;">${summary.notEligible}</strong></span>
        <span>Awaiting appraisal: <strong style="color:#e65100;">${summary.awaitingAppraisal}</strong></span>
        <span>Awaiting local authority approval: <strong style="color:#bf360c;">${summary.awaitingPermit}</strong></span>
        <span>Not eligible (other): <strong style="color:#6a1b9a;">${summary.notEligibleOther}</strong></span>
      </div>
    `;
  } else {
    settlementSummary.classList.add('hidden');
    settlementSummary.innerHTML = '';
  }

  if (!visibleReports.length) {
    reportList.innerHTML = '<p>No reports match the current filter.</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>ID</th>
        <th>Reporter</th>
        <th>Status</th>
        <th>Waiting in line for work</th>
        <th>Ready for budget release</th>
        <th>Re-occupation file</th>
        <th>Document</th>
        <th>Eligible for opening</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  visibleReports.forEach((report) => {
    const row = document.createElement('tr');
    const fileUrl = generatedFiles[report.id];
    const eligible = isEligibleForOpening(report);
    row.innerHTML = `
      <td>#${report.id}</td>
      <td>${report.reporterName}</td>
      <td><span class="status ${report.status}">${report.status}</span></td>
      <td>${isWaitingInLine(report) ? 'Yes' : 'No'}</td>
      <td>${isReadyForBudgetRelease(report) ? 'Yes' : 'No'}</td>
      <td>${report.returnHomeFileGenerated ? 'Yes' : (canGenerateReoccupationFile(report) ? `<a href="#" class="generate-file-link" data-id="${report.id}">Generate a re-occupation file</a>` : '—')}</td>
      <td>${fileUrl ? `<a href="${fileUrl}" target="_blank" class="document-icon">📄</a>` : '—'}</td>
      <td>${eligible ? 'Yes' : 'No'}</td>
      <td><a href="#" data-id="${report.id}">View</a></td>
    `;
    tbody.appendChild(row);
  });

  reportList.appendChild(table);

  updateBatchGenerateButton();
}

function updateBatchGenerateButton() {
  const selectedSettlement = settlementFilter.value;
  if (selectedSettlement) {
    batchGenerateButton.textContent = 'Generate occupancy files for the entire settlement';
  } else {
    batchGenerateButton.textContent = 'Generate occupancy files for all eligible buildings';
  }
}

function showModal(content) {
  modalContent.innerHTML = content;
  modalOverlay.classList.remove('hidden');
  modalOverlay.style.display = 'flex';
}

function hideModal() {
  modalOverlay.classList.add('hidden');
  modalOverlay.style.display = 'none';
}

async function batchGenerateFiles() {
  const selectedSettlement = settlementFilter.value;
  const payload = selectedSettlement ? { settlement: selectedSettlement } : {};
  
  showModal('<div class="spinner"></div><p>Producing files...</p>');
  
  try {
    const response = await fetch('/buildings/batch-return-home-packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      result.files.forEach(file => {
        generatedFiles[file.buildingId] = file.url;
      });
      
      showModal(`<p>${result.count} return-to-home files have been produced</p><button onclick="hideModal()">Close</button>`);
      renderReports();
    } else {
      showModal(`<p>Error: ${result.error || 'Unable to generate files'}</p><button onclick="hideModal()">Close</button>`);
    }
  } catch (error) {
    showModal(`<p>Error: ${error.message}</p><button onclick="hideModal()">Close</button>`);
  }
}

function getAvailableStatuses(currentStatus) {
  const transitions = {
    WAITING_FOR_VALIDATION: ['NEW'],
    NEW: ['IN_REVIEW'],
    IN_REVIEW: ['Building in the process of restoration'],
    'Building in the process of restoration': ['Restoration process completed'],
    'Restoration process completed': [],
  };

  const options = [currentStatus, ...(transitions[currentStatus] || [])];
  return options.filter((status, index) => options.indexOf(status) === index);
}

function getReadinessMessage(report) {
  const canStart = Boolean(report.damagePhotosExist && report.engineerReportExists && report.eligibilityCheckPerformed);
  return canStart ? 'Rehabilitation can be started' : 'Information to start rehabilitation missing';
}

function canOpenBudgetRequest(report) {
  const hasRequiredInfo = Boolean(report.damagePhotosExist && report.engineerReportExists && report.eligibilityCheckPerformed);
  const needsSocialApproval = Number(report.apartmentsInBuilding) > 24;
  const hasSocialApproval = Boolean(report.socialApproval);

  return hasRequiredInfo && (!needsSocialApproval || hasSocialApproval);
}

async function openBudgetRequest(report) {
  const response = await fetch(`/reports/${report.id}/budget-request`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    alert(result.error || 'Unable to open budget request.');
    return;
  }

  const updated = await response.json();
  const existingReport = reports.find((item) => item.id === updated.id);
  if (existingReport) {
    Object.assign(existingReport, updated);
  } else {
    reports.push(updated);
  }

  pendingSuccessMessage = 'Budget request opened successfully.';
  renderDetails(updated);
  renderReports();
}

async function loadActionHistory(buildingId) {
  const response = await fetch(`/buildings/${buildingId}/actions`, { headers: authHeaders() });
  const actions = await response.json();
  renderActionHistory(actions);
}

function renderActionHistory(actions) {
  if (!actions.length) {
    actionHistoryList.innerHTML = '<p>No actions recorded yet.</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Date & Time</th>
        <th>User</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  actions.forEach((action) => {
    const row = document.createElement('tr');
    const dt = action.timestamp ? new Date(action.timestamp).toLocaleString() : '';
    row.innerHTML = `
      <td>${dt}</td>
      <td>${action.userName}</td>
      <td>${action.action}</td>
    `;
    tbody.appendChild(row);
  });

  actionHistoryList.innerHTML = '';
  actionHistoryList.appendChild(table);
}

function renderDetails(report) {
  selectedReportId = report.id;
  const successMessage = pendingSuccessMessage;
  pendingSuccessMessage = '';
  const availableStatuses = getAvailableStatuses(report.status);
  statusSelect.innerHTML = '';
  availableStatuses.forEach((status) => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    statusSelect.appendChild(option);
  });
  statusSelect.value = report.status;
  detailsContent.innerHTML = `
    ${successMessage ? `<div class="success-message">${successMessage}</div>` : ''}
    <p><strong>ID:</strong> ${report.id}</p>
    <p><strong>Reporter:</strong> ${report.reporterName}</p>
    <p><strong>Address:</strong> ${report.address}</p>
    <p><strong>Damage Type:</strong> ${report.damageType}</p>
    <p><strong>Description:</strong> ${report.description}</p>
    <p><strong>Status:</strong> <span class="status ${report.status}">${report.status}</span></p>
    <p><strong>Damage photos exist:</strong> ${report.damagePhotosExist ? 'Yes' : 'No'}</p>
    <p><strong>Engineer report exists:</strong> ${report.engineerReportExists ? 'Yes' : 'No'}</p>
    <p><strong>Eligibility check performed:</strong> ${report.eligibilityCheckPerformed ? 'Yes' : 'No'}</p>
    <p><strong>Apartments in building:</strong> ${report.apartmentsInBuilding}</p>
    <p><strong>Social approval:</strong> ${report.socialApproval ? 'Yes' : 'No'}</p>
    <p><strong>Family Email:</strong> ${report.familyEmail || '—'}</p>
    <p><strong>Readiness:</strong> ${getReadinessMessage(report)}</p>
    ${report.appraisal ? `
      <div style="margin-top:1rem; padding:0.75rem; background:#f0f4f8; border-radius:6px;">
        <h3 style="margin-top:0;">Appraiser Assessment</h3>
        <p><strong>Damage Level:</strong> ${report.appraisal.damageLevel}</p>
        <p><strong>Comments:</strong> ${report.appraisal.appraiserComments || '—'}</p>
        <p><strong>Inspection Date:</strong> ${report.appraisal.inspectionDate}</p>
        <p><strong>Re-inspection Required:</strong> ${report.appraisal.reinspectionRequired ? 'Yes' : 'No'}</p>
      </div>
    ` : ''}
    ${report.permitApproval ? `
      <div style="margin-top:1rem; padding:0.75rem; background:#f0f4f8; border-radius:6px;">
        <h3 style="margin-top:0;">Local Authority Approval</h3>
        <p><strong>Water Supply:</strong> ${report.permitApproval.waterSupply ? 'Yes' : 'No'}</p>
        <p><strong>Electricity Supply:</strong> ${report.permitApproval.electricitySupply ? 'Yes' : 'No'}</p>
        <p><strong>Access Roads:</strong> ${report.permitApproval.accessRoads ? 'Yes' : 'No'}</p>
        <p><strong>Environmental Hazards Cleared:</strong> ${report.permitApproval.environmentalCleared ? 'Yes' : 'No'}</p>
        <p><strong>Comments:</strong> ${report.permitApproval.localAuthorityComments || '—'}</p>
        <p><strong>Approved:</strong> ${report.permitApproval.approved ? 'Yes' : 'No'}</p>
      </div>
    ` : ''}
    <div style="margin-top:0.75rem;">
      <button id="budgetRequestButton" ${(canOpenBudgetRequest(report) && canDoAction('MINISTRY')) ? '' : 'disabled'}>Open Budget Request</button>
      ${canGenerateReoccupationFile(report) ? '<button id="exportButton" style="margin-left:0.5rem;">Generate a re-occupation file</button>' : ''}
      ${!canDoAction('MINISTRY') ? '<p style="color:#c62828; margin-top:0.35rem;">Only MINISTRY users can open budget requests.</p>' : (canOpenBudgetRequest(report) ? '' : '<p style="color:#8a4b00; margin-top:0.35rem;">Budget request is blocked until all required information is present and social approval is provided when required.</p>')}
    </div>
  `;

  const budgetButton = document.getElementById('budgetRequestButton');
  if (budgetButton) {
    budgetButton.addEventListener('click', () => {
      if (!canOpenBudgetRequest(report)) {
        return;
      }
      openBudgetRequest(report);
    });
  }

  const exportButton = document.getElementById('exportButton');
  if (exportButton) {
    exportButton.addEventListener('click', async () => {
      const response = await fetch(`/buildings/${report.id}/return-home-package`, { method: 'POST', headers: authHeaders() });
      const result = await response.json();
      if (response.ok) {
        pendingSuccessMessage = 'Re-occupation file generated successfully.';
        renderDetails(report);
        window.open(result.url, '_blank');
      } else {
        alert(result.error || 'Unable to generate the re-occupation file.');
      }
    });
  }

  actionHistorySection.classList.remove('hidden');
  loadActionHistory(report.id);
}

async function openDetails(id) {
  const response = await fetch(`/reports/${id}`, { headers: authHeaders() });
  const report = await response.json();
  renderDetails(report);
  showScreen(detailsScreen);
}

async function createReport(event) {
  event.preventDefault();
  const formData = new FormData(createForm);
  const payload = Object.fromEntries(formData.entries());

  payload.damagePhotosExist = payload.damagePhotosExist === 'true';
  payload.engineerReportExists = payload.engineerReportExists === 'true';
  payload.eligibilityCheckPerformed = payload.eligibilityCheckPerformed === 'true';
  payload.socialApproval = payload.socialApproval === 'true';
  payload.apartmentsInBuilding = Number(payload.apartmentsInBuilding) || 0;

  const response = await fetch('/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    createForm.reset();
    showScreen(listScreen);
    await loadReports();
  }
}

async function updateStatus() {
  const response = await fetch(`/reports/${selectedReportId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status: statusSelect.value }),
  });
  if (response.ok) {
    const updated = await response.json();
    const report = reports.find((item) => item.id === updated.id);
    if (report) {
      report.status = updated.status;
      renderDetails(updated);
      renderReports();
    }
  }
}

document.getElementById('createButton').addEventListener('click', () => showScreen(createScreen));
document.getElementById('cancelCreate').addEventListener('click', () => showScreen(listScreen));
document.getElementById('backButton').addEventListener('click', () => showScreen(listScreen));
document.getElementById('saveStatusButton').addEventListener('click', updateStatus);
waitingFilter.addEventListener('change', renderReports);
budgetReadyFilter.addEventListener('change', renderReports);
settlementFilter.addEventListener('change', renderReports);
batchGenerateButton.addEventListener('click', batchGenerateFiles);
createForm.addEventListener('submit', createReport);
messageCenterButton.addEventListener('click', async () => {
  await Promise.all([loadNotifications(), loadNotificationMode()]);
  showScreen(messageCenterScreen);
});
backFromMessageCenter.addEventListener('click', () => showScreen(listScreen));
appraisersPortalButton.addEventListener('click', async () => {
  await loadReports();
  renderAppraisersPortal();
  showScreen(appraisersPortalScreen);
});
backFromAppraisersPortal.addEventListener('click', () => {
  appraisalForm.classList.add('hidden');
  appraisersPortalList.classList.remove('hidden');
  showScreen(listScreen);
});
appraisersPortalList.addEventListener('click', (event) => {
  const link = event.target.closest('a.appraisal-link');
  if (link) {
    event.preventDefault();
    openAppraisalForm(Number(link.dataset.id));
  }
});
saveAppraisalButton.addEventListener('click', saveAppraisal);
cancelAppraisalButton.addEventListener('click', () => {
  appraisalForm.classList.add('hidden');
  appraisersPortalList.classList.remove('hidden');
});
localAuthorityPortalButton.addEventListener('click', async () => {
  await loadReports();
  renderLocalAuthorityPortal();
  showScreen(localAuthorityPortalScreen);
});
backFromLocalAuthorityPortal.addEventListener('click', () => {
  permitApprovalForm.classList.add('hidden');
  localAuthorityPortalList.classList.remove('hidden');
  showScreen(listScreen);
});
localAuthorityPortalList.addEventListener('click', (event) => {
  const link = event.target.closest('a.permit-link');
  if (link) {
    event.preventDefault();
    openPermitApprovalForm(Number(link.dataset.id));
  }
});
savePermitApprovalButton.addEventListener('click', savePermitApproval);
cancelPermitApprovalButton.addEventListener('click', () => {
  permitApprovalForm.classList.add('hidden');
  localAuthorityPortalList.classList.remove('hidden');
});
notificationModeSelect.addEventListener('change', () => setNotificationMode(notificationModeSelect.value));
reportList.addEventListener('click', async (event) => {
  const fileLink = event.target.closest('a.generate-file-link');
  if (fileLink) {
    event.preventDefault();
    const response = await fetch(`/buildings/${fileLink.dataset.id}/return-home-package`, { method: 'POST', headers: authHeaders() });
    const result = await response.json();
    if (response.ok) {
      window.open(result.url, '_blank');
      const reportId = Number(fileLink.dataset.id);
      generatedFiles[reportId] = result.url;
      const report = reports.find((item) => item.id === reportId);
      if (report) {
        report.returnHomeFileGenerated = true;
      }
      renderReports();
    }
    return;
  }

  const link = event.target.closest('a[data-id]');
  if (!link) return;
  event.preventDefault();
  await openDetails(Number(link.dataset.id));
});

logoutButton.addEventListener('click', logout);
loginForm.addEventListener('submit', handleLogin);

const savedUser = loadSession();
if (savedUser) {
  currentUser = savedUser;
  const roleDisplay = savedUser.settlementId ? `${savedUser.role} - ${savedUser.settlementId}` : savedUser.role;
  navUserName.textContent = `${savedUser.fullName} (${roleDisplay})`;
  navUserSection.classList.remove('hidden');
  updatePortalButtons();
  showScreen(listScreen);
  loadReports();
} else {
  showScreen(loginScreen);
}
loadUserRefTable();
hideModal();
