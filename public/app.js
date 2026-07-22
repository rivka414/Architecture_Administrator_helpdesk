const listScreen = document.getElementById('listScreen');
const createScreen = document.getElementById('createScreen');
const detailsScreen = document.getElementById('detailsScreen');
const reportList = document.getElementById('reportList');
const detailsContent = document.getElementById('detailsContent');
const createForm = document.getElementById('createForm');
const statusSelect = document.getElementById('statusSelect');
const waitingFilter = document.getElementById('waitingFilter');
const budgetReadyFilter = document.getElementById('budgetReadyFilter');
const settlementFilter = document.getElementById('settlementFilter');
const batchGenerateButton = document.getElementById('batchGenerateButton');
const modalOverlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');

let reports = [];
let selectedReportId = null;
let pendingSuccessMessage = '';
let generatedFiles = {};

function showScreen(screen) {
  [listScreen, createScreen, detailsScreen].forEach((element) => element.classList.add('hidden'));
  screen.classList.remove('hidden');
}

async function loadReports() {
  const response = await fetch('/reports');
  reports = await response.json();
  populateSettlementFilter();
  renderReports();
}

function populateSettlementFilter() {
  const settlements = new Set();
  reports.forEach(report => {
    const address = report.address || '';
    const settlement = address.split(',')[0].trim();
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
  settlementFilter.value = currentValue;
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
        <th>Action</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  visibleReports.forEach((report) => {
    const row = document.createElement('tr');
    const fileUrl = generatedFiles[report.id];
    row.innerHTML = `
      <td>#${report.id}</td>
      <td>${report.reporterName}</td>
      <td><span class="status ${report.status}">${report.status}</span></td>
      <td>${isWaitingInLine(report) ? 'Yes' : 'No'}</td>
      <td>${isReadyForBudgetRelease(report) ? 'Yes' : 'No'}</td>
      <td>${canGenerateReoccupationFile(report) ? `<a href="#" class="generate-file-link" data-id="${report.id}">Generate a re-occupation file</a>` : '—'}</td>
      <td>${fileUrl ? `<a href="${fileUrl}" target="_blank" class="document-icon">📄</a>` : '—'}</td>
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
      headers: { 'Content-Type': 'application/json' },
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
  const response = await fetch(`/reports/${report.id}/budget-request`, { method: 'PATCH' });
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
    <p><strong>Readiness:</strong> ${getReadinessMessage(report)}</p>
    <div style="margin-top:0.75rem;">
      <button id="budgetRequestButton" ${canOpenBudgetRequest(report) ? '' : 'disabled'}>Open Budget Request</button>
      ${canGenerateReoccupationFile(report) ? '<button id="exportButton" style="margin-left:0.5rem;">Generate a re-occupation file</button>' : ''}
      ${canOpenBudgetRequest(report) ? '' : '<p style="color:#8a4b00; margin-top:0.35rem;">Budget request is blocked until all required information is present and social approval is provided when required.</p>'}
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
      const response = await fetch(`/buildings/${report.id}/return-home-package`, { method: 'POST' });
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
}

async function openDetails(id) {
  const response = await fetch(`/reports/${id}`);
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
    headers: { 'Content-Type': 'application/json' },
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
reportList.addEventListener('click', async (event) => {
  const fileLink = event.target.closest('a.generate-file-link');
  if (fileLink) {
    event.preventDefault();
    const response = await fetch(`/buildings/${fileLink.dataset.id}/return-home-package`, { method: 'POST' });
    const result = await response.json();
    if (response.ok) {
      window.open(result.url, '_blank');
    }
    return;
  }

  const link = event.target.closest('a[data-id]');
  if (!link) return;
  event.preventDefault();
  await openDetails(Number(link.dataset.id));
});

loadReports();

// Ensure modal is hidden on page load
hideModal();
