const fs = require('fs');
const path = require('path');

const VALID_TRANSITIONS = {
  WAITING_FOR_VALIDATION: ['NEW'],
  NEW: ['IN_REVIEW'],
  IN_REVIEW: ['Building in the process of restoration'],
  'Building in the process of restoration': ['Restoration process completed'],
  'Restoration process completed': [],
};

const ALLOWED_STATUSES = [
  'WAITING_FOR_VALIDATION', 'NEW', 'IN_REVIEW',
  'Building in the process of restoration', 'Restoration process completed',
];

class BuildingsService {
  constructor(reportsFilePath, assessmentsService, approvalsService) {
    this.reportsFilePath = reportsFilePath;
    this.assessmentsService = assessmentsService;
    this.approvalsService = approvalsService;
    this.reports = this._loadReports();
    this._migrateReports();
  }

  _extractSettlement(address) {
    if (!address) return '';
    return address.split(',')[0].trim();
  }

  _createInitialReports() {
    return [
      { id: 1, reporterName: 'John Doe', address: 'Tel Aviv, Rothschild 1', damageType: 'Water', description: 'Leak under the sink', status: 'Restoration process completed', damagePhotosExist: true, engineerReportExists: true, eligibilityCheckPerformed: true, socialApproval: false, apartmentsInBuilding: 12, budgetRequestOpened: true, familyEmail: 'john.doe@example.com', settlementId: 'Tel Aviv' },
      { id: 2, reporterName: 'Jane Smith', address: 'Tel Aviv, Allenby 22', damageType: 'Electrical', description: 'Broken outlet', status: 'Restoration process completed', damagePhotosExist: true, engineerReportExists: true, eligibilityCheckPerformed: true, socialApproval: false, apartmentsInBuilding: 8, budgetRequestOpened: true, familyEmail: 'jane.smith@example.com', settlementId: 'Tel Aviv' },
      { id: 3, reporterName: 'David Cohen', address: 'Jerusalem, Jaffa 10', damageType: 'Structural', description: 'Crack in the wall', status: 'Restoration process completed', damagePhotosExist: true, engineerReportExists: true, eligibilityCheckPerformed: true, socialApproval: true, apartmentsInBuilding: 30, budgetRequestOpened: true, familyEmail: 'david.cohen@example.com', settlementId: 'Jerusalem' },
      { id: 4, reporterName: 'Sarah Levy', address: 'Jerusalem, King George 5', damageType: 'Water', description: 'Flooding in basement', status: 'Building in the process of restoration', damagePhotosExist: true, engineerReportExists: true, eligibilityCheckPerformed: true, socialApproval: true, apartmentsInBuilding: 36, budgetRequestOpened: true, familyEmail: 'sarah.levy@example.com', settlementId: 'Jerusalem' },
      { id: 5, reporterName: 'Moshe Ben', address: 'Haifa, Herzl 15', damageType: 'Fire', description: 'Kitchen fire damage', status: 'Restoration process completed', damagePhotosExist: true, engineerReportExists: true, eligibilityCheckPerformed: true, socialApproval: false, apartmentsInBuilding: 20, budgetRequestOpened: true, familyEmail: 'moshe.ben@example.com', settlementId: 'Haifa' },
      { id: 6, reporterName: 'Rivka Mizrachi', address: 'Haifa, Nordau 8', damageType: 'Water', description: 'Burst pipe on third floor', status: 'Restoration process completed', damagePhotosExist: true, engineerReportExists: true, eligibilityCheckPerformed: true, socialApproval: false, apartmentsInBuilding: 16, budgetRequestOpened: true, familyEmail: 'rivka.m@example.com', settlementId: 'Haifa' },
      { id: 7, reporterName: 'Avi Shalom', address: 'Beer Sheva, Ben Yehuda 3', damageType: 'Structural', description: 'Foundation settlement', status: 'Restoration process completed', damagePhotosExist: true, engineerReportExists: true, eligibilityCheckPerformed: true, socialApproval: false, apartmentsInBuilding: 10, budgetRequestOpened: true, familyEmail: 'avi.shalom@example.com', settlementId: 'Beer Sheva' },
      { id: 8, reporterName: 'Hanna Gold', address: 'Netanya, Rothschild 42', damageType: 'Electrical', description: 'Wiring damage in common area', status: 'Building in the process of restoration', damagePhotosExist: true, engineerReportExists: true, eligibilityCheckPerformed: true, socialApproval: true, apartmentsInBuilding: 28, budgetRequestOpened: true, familyEmail: 'hanna.gold@example.com', settlementId: 'Netanya' },
      { id: 9, reporterName: 'Yosef Avital', address: 'Petah Tikva, Hovevei Zion 7', damageType: 'Water', description: 'Roof leak affecting multiple apartments', status: 'Restoration process completed', damagePhotosExist: true, engineerReportExists: true, eligibilityCheckPerformed: true, socialApproval: false, apartmentsInBuilding: 14, budgetRequestOpened: true, familyEmail: 'yosef.a@example.com', settlementId: 'Petah Tikva' },
      { id: 10, reporterName: 'Michal Bar', address: 'Ramat Gan, Bialik 12', damageType: 'Fire', description: 'Electrical fire in stairwell', status: 'IN_REVIEW', damagePhotosExist: true, engineerReportExists: true, eligibilityCheckPerformed: true, socialApproval: false, apartmentsInBuilding: 18, budgetRequestOpened: false, familyEmail: 'michal.bar@example.com', settlementId: 'Ramat Gan' },
      { id: 11, reporterName: 'Eitan Peretz', address: 'Ashdod, Sderot 20', damageType: 'Structural', description: 'Earthquake damage to facade', status: 'NEW', damagePhotosExist: true, engineerReportExists: true, eligibilityCheckPerformed: false, socialApproval: false, apartmentsInBuilding: 22, budgetRequestOpened: false, familyEmail: 'eitan.p@example.com', settlementId: 'Ashdod' },
      { id: 12, reporterName: 'Tamar Raz', address: 'Holon, Weizmann 6', damageType: 'Water', description: 'Sewage backup in ground floor', status: 'WAITING_FOR_VALIDATION', damagePhotosExist: true, engineerReportExists: false, eligibilityCheckPerformed: false, socialApproval: false, apartmentsInBuilding: 9, budgetRequestOpened: false, familyEmail: 'tamar.raz@example.com', settlementId: 'Holon' },
      { id: 13, reporterName: 'Shlomo Dagan', address: 'Rishon LeZion, Jabotinsky 33', damageType: 'Water', description: 'Pipe burst in laundry room', status: 'WAITING_FOR_VALIDATION', damagePhotosExist: false, engineerReportExists: false, eligibilityCheckPerformed: false, socialApproval: false, apartmentsInBuilding: 6, budgetRequestOpened: false, familyEmail: 'shlomo.d@example.com', settlementId: 'Rishon LeZion' },
      { id: 14, reporterName: 'Nurit Fisher', address: 'Ashkelon, Ben Gurion 11', damageType: 'Electrical', description: 'Power outage in common areas', status: 'NEW', damagePhotosExist: true, engineerReportExists: true, eligibilityCheckPerformed: true, socialApproval: false, apartmentsInBuilding: 15, budgetRequestOpened: false, familyEmail: 'nurit.f@example.com', settlementId: 'Ashkelon' },
      { id: 15, reporterName: 'Amos Keinan', address: 'Kfar Saba, Sokolov 4', damageType: 'Fire', description: 'Balcony fire spread to wall', status: 'IN_REVIEW', damagePhotosExist: true, engineerReportExists: true, eligibilityCheckPerformed: true, socialApproval: false, apartmentsInBuilding: 11, budgetRequestOpened: false, familyEmail: 'amos.k@example.com', settlementId: 'Kfar Saba' },
      { id: 16, reporterName: 'Dina Alon', address: 'Herzliya, Ahad Haam 19', damageType: 'Structural', description: 'Cracks in load-bearing wall', status: 'WAITING_FOR_VALIDATION', damagePhotosExist: false, engineerReportExists: false, eligibilityCheckPerformed: false, socialApproval: false, apartmentsInBuilding: 24, budgetRequestOpened: false, familyEmail: 'dina.alon@example.com', settlementId: 'Herzliya' },
      { id: 17, reporterName: 'Gideon Tal', address: 'Nahariya, Gaaton 2', damageType: 'Water', description: 'Storm water damage to lobby', status: 'NEW', damagePhotosExist: true, engineerReportExists: true, eligibilityCheckPerformed: false, socialApproval: false, apartmentsInBuilding: 7, budgetRequestOpened: false, familyEmail: 'gideon.t@example.com', settlementId: 'Nahariya' },
      { id: 18, reporterName: 'Orly Ben-David', address: 'Nazareth, Paulus VI 14', damageType: 'Water', description: 'Seepage through ceiling', status: 'WAITING_FOR_VALIDATION', damagePhotosExist: false, engineerReportExists: false, eligibilityCheckPerformed: false, socialApproval: false, apartmentsInBuilding: 5, budgetRequestOpened: false, familyEmail: 'orly.bd@example.com', settlementId: 'Nazareth' },
      { id: 19, reporterName: 'Menachem Lev', address: 'Eilat, Hatmarim 25', damageType: 'Structural', description: 'Corrosion damage from salt air', status: 'WAITING_FOR_VALIDATION', damagePhotosExist: true, engineerReportExists: false, eligibilityCheckPerformed: false, socialApproval: false, apartmentsInBuilding: 20, budgetRequestOpened: false, familyEmail: 'menachem.l@example.com', settlementId: 'Eilat' },
      { id: 20, reporterName: 'Batya Segal', address: 'Tiberias, HaGalil 9', damageType: 'Electrical', description: 'Short circuit in elevator shaft', status: 'NEW', damagePhotosExist: true, engineerReportExists: true, eligibilityCheckPerformed: true, socialApproval: false, apartmentsInBuilding: 13, budgetRequestOpened: false, familyEmail: 'batya.s@example.com', settlementId: 'Tiberias' },
      { id: 21, reporterName: 'Raphael Oz', address: 'Zichron Yaakov, Hanadiv 1', damageType: 'Fire', description: 'Garage fire damage', status: 'Restoration process completed', damagePhotosExist: true, engineerReportExists: true, eligibilityCheckPerformed: true, socialApproval: false, apartmentsInBuilding: 32, budgetRequestOpened: true, familyEmail: 'raphael.oz@example.com', settlementId: 'Zichron Yaakov' },
      { id: 22, reporterName: 'Varda Shushan', address: 'Mitzpe Ramon, HaMakhtesh 3', damageType: 'Water', description: 'Water heater explosion', status: 'WAITING_FOR_VALIDATION', damagePhotosExist: false, engineerReportExists: false, eligibilityCheckPerformed: false, socialApproval: false, apartmentsInBuilding: 4, budgetRequestOpened: false, familyEmail: 'varda.s@example.com', settlementId: 'Mitzpe Ramon' },
    ];
  }

  _loadReports() {
    if (!fs.existsSync(this.reportsFilePath)) {
      const initial = this._createInitialReports();
      this._saveTo(initial);
      return initial;
    }
    try {
      const data = fs.readFileSync(this.reportsFilePath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      console.warn('Could not read reports file, using defaults.');
    }
    return this._createInitialReports();
  }

  _migrateReports() {
    this.reports.forEach((report) => {
      if (report.familyEmail === undefined || report.familyEmail === null) report.familyEmail = '';
      if (report.socialApproval === undefined) report.socialApproval = false;
      if (report.budgetRequestOpened === undefined) report.budgetRequestOpened = false;
      if (!report.appraisal) report.appraisal = null;
      if (!report.permitApproval) report.permitApproval = null;
      if (report.returnHomeFileGenerated === undefined) report.returnHomeFileGenerated = false;
      if (!report.settlementId) report.settlementId = this._extractSettlement(report.address);
    });
  }

  _save() {
    this._saveTo(this.reports);
  }

  _reload() {
    this.reports = this._loadReportsRaw();
    this._migrateReports();
  }

  _loadReportsRaw() {
    try {
      const data = fs.readFileSync(this.reportsFilePath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      console.warn('Could not read reports file, using defaults.');
    }
    return this._createInitialReports();
  }

  _saveTo(reports) {
    fs.mkdirSync(path.dirname(this.reportsFilePath), { recursive: true });
    fs.writeFileSync(this.reportsFilePath, JSON.stringify(reports, null, 2));
  }

  _find(buildingId) {
    return this.reports.find((r) => r.id === Number(buildingId));
  }

  _getReportsData() {
    return this.reports;
  }

  _getNextId() {
    return this.reports.length ? Math.max(...this.reports.map((r) => Number(r.id))) + 1 : 3;
  }

  getAll() {
    this._reload();
    return this.reports;
  }

  getAllForSettlement(settlementId) {
    this._reload();
    return this.reports.filter((r) => r.settlementId === settlementId);
  }

  belongsToSettlement(buildingId, settlementId) {
    const building = this._find(buildingId);
    return building && building.settlementId === settlementId;
  }

  getById(buildingId) {
    this._reload();
    return this._find(buildingId) || null;
  }

  create(data) {
    const { reporterName, address, damageType, description, damagePhotosExist, engineerReportExists, eligibilityCheckPerformed, socialApproval, apartmentsInBuilding, budgetRequestOpened, status, familyEmail } = data;

    if (!reporterName || !address || !damageType || !description) {
      return { error: 'All fields are required' };
    }

    const parseBoolean = (value) => value === true || value === 'true' || value === '1';

    const report = {
      id: this._getNextId(),
      reporterName,
      address,
      damageType,
      description,
      status: status || 'WAITING_FOR_VALIDATION',
      damagePhotosExist: parseBoolean(damagePhotosExist),
      engineerReportExists: parseBoolean(engineerReportExists),
      eligibilityCheckPerformed: parseBoolean(eligibilityCheckPerformed),
      socialApproval: parseBoolean(socialApproval),
      apartmentsInBuilding: Number(apartmentsInBuilding) || 0,
      budgetRequestOpened: parseBoolean(budgetRequestOpened),
      familyEmail: familyEmail || '',
      appraisal: null,
      permitApproval: null,
      returnHomeFileGenerated: false,
      settlementId: this._extractSettlement(address),
    };

    this.reports.push(report);
    this._save();
    return { report };
  }

  updateStatus(buildingId, newStatus) {
    this._reload();
    const report = this._find(buildingId);
    if (!report) return { error: 'not_found' };

    if (!ALLOWED_STATUSES.includes(newStatus)) {
      return { error: 'Invalid status' };
    }

    const currentStatus = report.status;
    if (!VALID_TRANSITIONS[currentStatus].includes(newStatus) && currentStatus !== newStatus) {
      return { error: 'Invalid status transition' };
    }

    report.status = newStatus;
    this._save();
    return { report };
  }

  openBudgetRequest(buildingId) {
    this._reload();
    const report = this._find(buildingId);
    if (!report) return { error: 'not_found' };
    report.budgetRequestOpened = true;
    this._save();
    return { report };
  }

  generateReturnHomePackage(buildingId, habitationFileService, notificationService) {
    this._reload();
    const report = this._find(buildingId);
    if (!report) return { error: 'not_found' };
    return { report };
  }

  markReturnHomeFileGenerated(buildingId) {
    this._reload();
    const report = this._find(buildingId);
    if (!report) return { error: 'not_found' };
    report.returnHomeFileGenerated = true;
    this._save();
    return { report };
  }

  getSettlementReports(settlement) {
    this._reload();
    if (!settlement) return this.reports;
    return this.reports.filter((report) => {
      const address = report.address || '';
      return address.split(',')[0].trim() === settlement;
    });
  }

  isEligibleForOpening(buildingId) {
    this._reload();
    const report = this._find(buildingId);
    if (!report) return false;
    return this._checkEligibility(report);
  }

  _checkEligibility(report) {
    if (!report.damagePhotosExist) return false;
    if (!report.engineerReportExists) return false;
    if (!report.eligibilityCheckPerformed) return false;
    const needsSocialApproval = Number(report.apartmentsInBuilding) > 24;
    if (needsSocialApproval && !report.socialApproval) return false;
    if (!report.budgetRequestOpened) return false;
    if (!report.returnHomeFileGenerated) return false;

    const assessment = this.assessmentsService.getAssessment(report.id);
    if (!assessment) return false;
    if (assessment.damageLevel === 'severe') return false;

    const approval = this.approvalsService.getApproval(report.id);
    if (!approval || !approval.approved) return false;

    return true;
  }

  getSettlementSummary(settlement) {
    const reports = this.getSettlementReports(settlement);
    const total = reports.length;
    let eligible = 0;
    let notEligible = 0;
    let awaitingAppraisal = 0;
    let awaitingPermit = 0;
    let notEligibleOther = 0;

    reports.forEach((report) => {
      if (this._checkEligibility(report)) {
        eligible++;
      } else {
        notEligible++;
        const assessment = this.assessmentsService.getAssessment(report.id);
        const approval = this.approvalsService.getApproval(report.id);
        if (!assessment) {
          awaitingAppraisal++;
        } else if (!approval || !approval.approved) {
          awaitingPermit++;
        } else {
          notEligibleOther++;
        }
      }
    });

    return { total, eligible, notEligible, awaitingAppraisal, awaitingPermit, notEligibleOther };
  }
}

module.exports = { BuildingsService };
