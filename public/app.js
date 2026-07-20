const listScreen = document.getElementById('listScreen');
const createScreen = document.getElementById('createScreen');
const detailsScreen = document.getElementById('detailsScreen');
const reportList = document.getElementById('reportList');
const detailsContent = document.getElementById('detailsContent');
const createForm = document.getElementById('createForm');
const statusSelect = document.getElementById('statusSelect');
const waitingFilter = document.getElementById('waitingFilter');
const budgetReadyFilter = document.getElementById('budgetReadyFilter');

let reports = [];
let selectedReportId = null;

function showScreen(screen) {
  [listScreen, createScreen, detailsScreen].forEach((element) => element.classList.add('hidden'));
  screen.classList.remove('hidden');
}

async function loadReports() {
  const response = await fetch('/reports');
  reports = await response.json();
  renderReports();
}

function isWaitingInLine(report) {
  return Boolean(report.engineerReportExists && report.eligibilityCheckPerformed);
}

function isReadyForBudgetRelease(report) {
  return Boolean(report.damagePhotosExist && report.engineerReportExists && report.eligibilityCheckPerformed);
}

function getVisibleReports() {
  let filteredReports = reports;

  if (waitingFilter.checked) {
    filteredReports = filteredReports.filter((report) => isWaitingInLine(report));
  }

  if (budgetReadyFilter.checked) {
    filteredReports = filteredReports.filter((report) => isReadyForBudgetRelease(report));
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
        <th>Action</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  visibleReports.forEach((report) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>#${report.id}</td>
      <td>${report.reporterName}</td>
      <td><span class="status ${report.status}">${report.status}</span></td>
      <td>${isWaitingInLine(report) ? 'Yes' : 'No'}</td>
      <td>${isReadyForBudgetRelease(report) ? 'Yes' : 'No'}</td>
      <td><a href="#" data-id="${report.id}">View</a></td>
    `;
    tbody.appendChild(row);
  });

  reportList.appendChild(table);
}

function getAvailableStatuses(currentStatus) {
  const transitions = {
    WAITING_FOR_VALIDATION: ['WAITING_FOR_VALIDATION', 'NEW'],
    NEW: ['NEW', 'IN_REVIEW'],
    IN_REVIEW: ['IN_REVIEW'],
  };
  return transitions[currentStatus] || [];
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

function renderDetails(report) {
  selectedReportId = report.id;
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
      ${canOpenBudgetRequest(report) ? '' : '<p style="color:#8a4b00; margin-top:0.35rem;">Budget request is blocked until all required information is present and social approval is provided when required.</p>'}
    </div>
  `;

  const budgetButton = document.getElementById('budgetRequestButton');
  if (budgetButton) {
    budgetButton.addEventListener('click', () => {
      if (!canOpenBudgetRequest(report)) {
        return;
      }
      alert('Budget request opened for this report.');
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
createForm.addEventListener('submit', createReport);
reportList.addEventListener('click', async (event) => {
  const link = event.target.closest('a[data-id]');
  if (!link) return;
  event.preventDefault();
  await openDetails(Number(link.dataset.id));
});

loadReports();
