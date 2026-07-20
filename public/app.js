const listScreen = document.getElementById('listScreen');
const createScreen = document.getElementById('createScreen');
const detailsScreen = document.getElementById('detailsScreen');
const reportList = document.getElementById('reportList');
const detailsContent = document.getElementById('detailsContent');
const createForm = document.getElementById('createForm');
const statusSelect = document.getElementById('statusSelect');

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

function renderReports() {
  reportList.innerHTML = '';
  reports.forEach((report) => {
    const item = document.createElement('li');
    item.innerHTML = `<strong>#${report.id}</strong> ${report.reporterName} - <span class="status ${report.status}">${report.status}</span> <a href="#" data-id="${report.id}">View</a>`;
    reportList.appendChild(item);
  });
}

function getAvailableStatuses(currentStatus) {
  const transitions = {
    WAITING_FOR_VALIDATION: ['WAITING_FOR_VALIDATION', 'NEW'],
    NEW: ['NEW', 'IN_REVIEW'],
    IN_REVIEW: ['IN_REVIEW'],
  };
  return transitions[currentStatus] || [];
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
  `;
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
createForm.addEventListener('submit', createReport);
reportList.addEventListener('click', async (event) => {
  const link = event.target.closest('a[data-id]');
  if (!link) return;
  event.preventDefault();
  await openDetails(Number(link.dataset.id));
});

loadReports();
