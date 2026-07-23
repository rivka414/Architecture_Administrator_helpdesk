const fs = require('fs');

class SystemHealthService {
  constructor(settlementProcessesService, notificationService) {
    this.settlementProcessesService = settlementProcessesService;
    this.notificationService = notificationService;
  }

  getMetrics() {
    return {
      settlementProcesses: this._getSettlementProcessMetrics(),
      notifications: this._getNotificationMetrics(),
      performance: this._getPerformanceMetrics(),
    };
  }

  _getSettlementProcessMetrics() {
    const processes = this.settlementProcessesService.getAll();
    let completed = 0;
    let processing = 0;

    for (const p of processes) {
      if (p.status === 'COMPLETED') completed++;
      else if (p.status === 'PROCESSING') processing++;
    }

    return { completed, processing };
  }

  _getNotificationMetrics() {
    const notifications = this.notificationService.getAllNotifications();
    let successful = 0;
    let failed = 0;

    for (const n of notifications) {
      if (n.status === 'SENT') successful++;
      else if (n.status === 'FAILED') failed++;
    }

    return {
      successful,
      failed,
      retryCount: failed,
    };
  }

  _getPerformanceMetrics() {
    const processes = this.settlementProcessesService.getAll();
    const completed = processes.filter(
      (p) => p.status === 'COMPLETED' && p.startedAt && p.completedAt
    );

    if (completed.length === 0) {
      return { averageSettlementDuration: null };
    }

    let totalMs = 0;
    for (const p of completed) {
      totalMs += new Date(p.completedAt) - new Date(p.startedAt);
    }

    const averageMs = totalMs / completed.length;
    const averageSeconds = Math.round(averageMs / 1000);

    return { averageSettlementDuration: averageSeconds };
  }
}

module.exports = { SystemHealthService };
