const fs = require('fs');
const path = require('path');

class AssessmentsService {
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

  getAssessment(buildingId) {
    const reports = this._loadReports();
    const report = this._findReport(reports, buildingId);
    if (!report) return null;
    return report.appraisal || null;
  }

  saveAssessment(buildingId, assessmentData) {
    const reports = this._loadReports();
    const report = this._findReport(reports, buildingId);
    if (!report) return null;

    const { damageLevel, appraiserComments, inspectionDate, reinspectionRequired } = assessmentData;

    if (!damageLevel || !inspectionDate) {
      return { error: 'Damage level and inspection date are required' };
    }

    report.appraisal = {
      damageLevel,
      appraiserComments: appraiserComments || '',
      inspectionDate,
      reinspectionRequired: Boolean(reinspectionRequired),
    };

    this._saveReports(reports);
    return { appraisal: report.appraisal, report };
  }
}

module.exports = { AssessmentsService };
