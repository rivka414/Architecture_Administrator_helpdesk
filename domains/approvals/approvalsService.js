const fs = require('fs');
const path = require('path');

class ApprovalsService {
  constructor(reportsFilePath) {
    this.reportsFilePath = reportsFilePath;
  }

  _loadReports() {
    try {
      const data = fs.readFileSync(this.reportsFilePath, 'utf8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  _saveReports(reports) {
    fs.mkdirSync(path.dirname(this.reportsFilePath), { recursive: true });
    fs.writeFileSync(this.reportsFilePath, JSON.stringify(reports, null, 2));
  }

  _findReport(reports, buildingId) {
    return reports.find((r) => r.id === Number(buildingId));
  }

  getApproval(buildingId) {
    const reports = this._loadReports();
    const report = this._findReport(reports, buildingId);
    if (!report) return null;
    return report.permitApproval || null;
  }

  saveApproval(buildingId, approvalData) {
    const reports = this._loadReports();
    const report = this._findReport(reports, buildingId);
    if (!report) return null;

    const { waterSupply, electricitySupply, accessRoads, environmentalCleared, localAuthorityComments, approved } = approvalData;

    report.permitApproval = {
      waterSupply: Boolean(waterSupply),
      electricitySupply: Boolean(electricitySupply),
      accessRoads: Boolean(accessRoads),
      environmentalCleared: Boolean(environmentalCleared),
      localAuthorityComments: localAuthorityComments || '',
      approved: Boolean(approved),
    };

    this._saveReports(reports);
    return { permitApproval: report.permitApproval, report };
  }
}

module.exports = { ApprovalsService };
