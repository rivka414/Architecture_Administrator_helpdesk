function createBuildingsRoutes(express, buildingsService, habitationFileService, notificationService) {
  const router = express.Router();

  router.get('/reports', (req, res) => {
    res.json(buildingsService.getAll());
  });

  router.post('/reports', (req, res) => {
    const result = buildingsService.create(req.body);
    if (result.error === 'All fields are required') {
      return res.status(400).json({ error: result.error });
    }
    res.status(201).json(result.report);
  });

  router.get('/reports/:id', (req, res) => {
    const report = buildingsService.getById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  });

  router.patch('/reports/:id/status', (req, res) => {
    const result = buildingsService.updateStatus(req.params.id, req.body.status);
    if (result.error === 'not_found') return res.status(404).json({ error: 'Report not found' });
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result.report);
  });

  router.patch('/reports/:id/budget-request', (req, res) => {
    const result = buildingsService.openBudgetRequest(req.params.id);
    if (result.error === 'not_found') return res.status(404).json({ error: 'Report not found' });
    res.json(result.report);
  });

  router.post('/buildings/:id/return-home-package', async (req, res) => {
    const context = buildingsService.generateReturnHomePackage(req.params.id, habitationFileService, notificationService);
    if (context.error === 'not_found') return res.status(404).json({ error: 'Report not found' });
    const report = context.report;

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

    const result = await habitationFileService.generateReturnHomePackage(report);
    buildingsService.markReturnHomeFileGenerated(report.id);

    if (report.familyEmail) {
      const subject = `Return to Home Approval ${report.address}`;
      const body = `Hello,\n\nWe are pleased to inform you that your building has been approved for return to home.\nThe occupancy file has been prepared successfully.\n\nBest regards,\nMinistry of Construction and Housing`;
      try {
        await notificationService.sendWithRetry(report.id, report.familyEmail, subject, body, report.address, String(report.id));
      } catch (error) {
        console.error(`Failed to send notification for building ${report.id}:`, error);
      }
    }

    res.json(result);
  });

  router.post('/buildings/batch-return-home-packages', async (req, res) => {
    const { settlement } = req.body;
    const filteredReports = buildingsService.getSettlementReports(settlement);
    const generatedFiles = [];

    for (const report of filteredReports) {
      const canGenerate = Boolean(
        report.damagePhotosExist &&
        report.engineerReportExists &&
        report.eligibilityCheckPerformed &&
        report.budgetRequestOpened &&
        ['Building in the process of restoration', 'Restoration process completed'].includes(report.status)
      );

      if (canGenerate) {
        try {
          const result = await habitationFileService.generateReturnHomePackage(report);
          buildingsService.markReturnHomeFileGenerated(report.id);
          generatedFiles.push({ buildingId: report.id, url: result.url, fileName: result.fileName });

          if (report.familyEmail) {
            const subject = `Return to Home Approval ${report.address}`;
            const body = `Hello,\n\nWe are pleased to inform you that your building has been approved for return to home.\nThe occupancy file has been prepared successfully.\n\nBest regards,\nMinistry of Construction and Housing`;
            try {
              await notificationService.sendWithRetry(report.id, report.familyEmail, subject, body, report.address, String(report.id));
            } catch (error) {
              console.error(`Failed to send notification for building ${report.id}:`, error);
            }
          }
        } catch (error) {
          console.error(`Failed to generate file for building ${report.id}:`, error);
        }
      }
    }

    res.json({ count: generatedFiles.length, files: generatedFiles });
  });

  router.get('/buildings/settlement-summary/:settlement', (req, res) => {
    const summary = buildingsService.getSettlementSummary(req.params.settlement);
    res.json(summary);
  });

  router.get('/buildings/eligibility/:id', (req, res) => {
    const eligible = buildingsService.isEligibleForOpening(req.params.id);
    res.json({ eligible });
  });

  return router;
}

module.exports = { createBuildingsRoutes };
