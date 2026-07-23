const { requireRole, requireSettlementAccess } = require('../roles/rolesHelper');

function createBuildingsRoutes(express, buildingsService, habitationFileService, notificationService, actionsService, settlementProcessesService, processLogger) {
  const router = express.Router();

  router.get('/reports', (req, res) => {
    const role = req.headers['x-user-role'];
    const userSettlement = req.headers['x-user-settlement'];
    if (role === 'MUNICIPALITY' && userSettlement) {
      return res.json(buildingsService.getAllForSettlement(userSettlement));
    }
    res.json(buildingsService.getAll());
  });

  router.post('/reports', (req, res) => {
    const result = buildingsService.create(req.body);
    if (result.error === 'All fields are required') {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json(result.report);
  });

  router.get('/reports/:id', requireSettlementAccess(buildingsService), (req, res) => {
    const report = buildingsService.getById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  });

  router.patch('/reports/:id/status', requireSettlementAccess(buildingsService), (req, res) => {
    const result = buildingsService.updateStatus(req.params.id, req.body.status);
    if (result.error === 'not_found') return res.status(404).json({ error: 'Report not found' });
    if (result.error) return res.status(400).json({ error: result.error });
    const userId = req.headers['x-user-id'];
    const userName = req.headers['x-user-name'];
    if (userId && userName) {
      actionsService.log(userId, userName, `Status updated to: ${req.body.status}`, 'building', req.params.id);
    }
    res.json(result.report);
  });

  router.patch('/reports/:id/budget-request', requireRole('MINISTRY'), (req, res) => {
    const result = buildingsService.openBudgetRequest(req.params.id);
    if (result.error === 'not_found') return res.status(404).json({ error: 'Report not found' });
    const userId = req.headers['x-user-id'];
    const userName = req.headers['x-user-name'];
    if (userId && userName) {
      actionsService.log(userId, userName, 'Open Budget Request', 'building', req.params.id);
    }
    res.json(result.report);
  });

  router.post('/buildings/:id/return-home-package', requireSettlementAccess(buildingsService), async (req, res) => {
    const context = buildingsService.generateReturnHomePackage(req.params.id, habitationFileService, notificationService);
    if (context.error === 'not_found') return res.status(404).json({ error: 'Report not found' });
    const report = context.report;
    const buildingSettlement = report.settlementId || '';

    const canGenerate = Boolean(
      report.damagePhotosExist &&
      report.engineerReportExists &&
      report.eligibilityCheckPerformed &&
      report.budgetRequestOpened &&
      ['Building in the process of restoration', 'Restoration process completed'].includes(report.status)
    );

    if (!canGenerate) {
      return res.status(400).json({ error: 'Report is not eligible for a re-occupation file' });
    }

    processLogger.info('BUILDING_PDF_START', { settlement: buildingSettlement, buildingId: report.id });

    const result = await habitationFileService.generateReturnHomePackage(report);
    buildingsService.markReturnHomeFileGenerated(report.id);

    processLogger.info('BUILDING_PDF_END', { settlement: buildingSettlement, buildingId: report.id });

    if (report.familyEmail) {
      const subject = `Return to Home Approval ${report.address}`;
      const body = `Hello,\n\nWe are pleased to inform you that your building has been approved for return to home.\nThe occupancy file has been prepared successfully.\n\nBest regards,\nMinistry of Construction and Housing`;
      processLogger.info('BUILDING_NOTIFICATION_START', { settlement: buildingSettlement, buildingId: report.id });
      try {
        await notificationService.sendWithRetry(report.id, report.familyEmail, subject, body, report.address, String(report.id));
        processLogger.info('BUILDING_NOTIFICATION_SUCCESS', { settlement: buildingSettlement, buildingId: report.id });
      } catch (error) {
        processLogger.error('BUILDING_NOTIFICATION_FAILED', { settlement: buildingSettlement, buildingId: report.id, error: error.message });
      }
    }

    processLogger.info('BUILDING_PROCESSING_COMPLETE', { settlement: buildingSettlement, buildingId: report.id });

    res.json(result);
  });

  router.post('/buildings/batch-return-home-packages', async (req, res) => {
    const { settlement } = req.body;
    const role = req.headers['x-user-role'];
    const userSettlement = req.headers['x-user-settlement'];
    const userName = req.headers['x-user-name'] || 'System';
    const effectiveSettlement = (role === 'MUNICIPALITY' && userSettlement) ? userSettlement : settlement;

    const process = settlementProcessesService.create(effectiveSettlement, userName);

    processLogger.info('SETTLEMENT_PROCESS_START', { settlement: effectiveSettlement });

    const filteredReports = buildingsService.getSettlementReports(effectiveSettlement);
    const generatedFiles = [];

    processLogger.info('SETTLEMENT_ELIGIBLE_BUILDINGS_FOUND', { settlement: effectiveSettlement, buildingId: filteredReports.length });

    let processFailed = false;

    for (const report of filteredReports) {
      const canGenerate = Boolean(
        report.damagePhotosExist &&
        report.engineerReportExists &&
        report.eligibilityCheckPerformed &&
        report.budgetRequestOpened &&
        ['Building in the process of restoration', 'Restoration process completed'].includes(report.status)
      );

      if (canGenerate) {
        processLogger.info('BUILDING_PROCESSING_START', { settlement: effectiveSettlement, buildingId: report.id });

        try {
          processLogger.info('BUILDING_PDF_START', { settlement: effectiveSettlement, buildingId: report.id });
          const result = await habitationFileService.generateReturnHomePackage(report);
          processLogger.info('BUILDING_PDF_END', { settlement: effectiveSettlement, buildingId: report.id });

          buildingsService.markReturnHomeFileGenerated(report.id);
          generatedFiles.push({ buildingId: report.id, url: result.url, fileName: result.fileName });

          if (report.familyEmail) {
            const subject = `Return to Home Approval ${report.address}`;
            const body = `Hello,\n\nWe are pleased to inform you that your building has been approved for return to home.\nThe occupancy file has been prepared successfully.\n\nBest regards,\nMinistry of Construction and Housing`;
            processLogger.info('BUILDING_NOTIFICATION_START', { settlement: effectiveSettlement, buildingId: report.id });
            try {
              await notificationService.sendWithRetry(report.id, report.familyEmail, subject, body, report.address, String(report.id));
              processLogger.info('BUILDING_NOTIFICATION_SUCCESS', { settlement: effectiveSettlement, buildingId: report.id });
            } catch (error) {
              processLogger.error('BUILDING_NOTIFICATION_FAILED', { settlement: effectiveSettlement, buildingId: report.id, error: error.message });
            }
          }
        } catch (error) {
          processFailed = true;
          processLogger.error('BUILDING_PROCESSING_FAILED', { settlement: effectiveSettlement, buildingId: report.id, error: error.message });
        }

        processLogger.info('BUILDING_PROCESSING_COMPLETE', { settlement: effectiveSettlement, buildingId: report.id });
      }
    }

    if (processFailed) {
      processLogger.error('SETTLEMENT_PROCESS_FAILED', { settlement: effectiveSettlement });
    } else {
      processLogger.info('SETTLEMENT_PROCESS_COMPLETE', { settlement: effectiveSettlement });
    }

    settlementProcessesService.complete(process.id);

    res.json({ count: generatedFiles.length, files: generatedFiles });
  });

  router.get('/buildings/settlement-summary/:settlement', (req, res) => {
    const role = req.headers['x-user-role'];
    const userSettlement = req.headers['x-user-settlement'];
    const requestedSettlement = req.params.settlement;

    if (role === 'MUNICIPALITY' && userSettlement && requestedSettlement !== userSettlement) {
      return res.status(403).json({ error: 'Access denied: cannot view summary for another settlement' });
    }

    const summary = buildingsService.getSettlementSummary(requestedSettlement);
    res.json(summary);
  });

  router.get('/buildings/eligibility/:id', requireSettlementAccess(buildingsService), (req, res) => {
    const eligible = buildingsService.isEligibleForOpening(req.params.id);
    res.json({ eligible });
  });

  return router;
}

module.exports = { createBuildingsRoutes };
