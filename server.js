const express = require('express');
const fs = require('fs');
const path = require('path');
const { InhabitationFileService } = require('./inhabitationFileService');

function createInitialReports() {
  return [
    {
      id: 1,
      reporterName: 'John Doe',
      address: '1 Main Street',
      damageType: 'Water',
      description: 'Leak under the sink',
      status: 'WAITING_FOR_VALIDATION',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      apartmentsInBuilding: 12,
    },
    {
      id: 2,
      reporterName: 'Jane Smith',
      address: '22 River Road',
      damageType: 'Electrical',
      description: 'Broken outlet',
      status: 'IN_REVIEW',
      damagePhotosExist: false,
      engineerReportExists: true,
      eligibilityCheckPerformed: false,
      apartmentsInBuilding: 8,
    },
  ];
}

function loadReports(reportsFilePath) {
  if (!fs.existsSync(reportsFilePath)) {
    return createInitialReports();
  }

  try {
    const data = fs.readFileSync(reportsFilePath, 'utf8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed;
    }
  } catch (error) {
    console.warn('Could not read reports file, using defaults.', error.message);
  }

  return createInitialReports();
}

function saveReports(reportsFilePath, reports) {
  fs.mkdirSync(path.dirname(reportsFilePath), { recursive: true });
  fs.writeFileSync(reportsFilePath, JSON.stringify(reports, null, 2));
}

function createApp() {
  const app = express();
  const habitationFileService = new InhabitationFileService(path.join(__dirname, 'files'));
  const reportsFilePath = path.join(__dirname, 'data', 'reports.json');
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/files', express.static(path.join(__dirname, 'files')));

  let reports = loadReports(reportsFilePath);
  let nextId = reports.length ? Math.max(...reports.map((report) => Number(report.id))) + 1 : 3;

  app.get('/reports', (req, res) => {
    res.json(reports);
  });

  app.post('/reports', (req, res) => {
    const { reporterName, address, damageType, description, damagePhotosExist, engineerReportExists, eligibilityCheckPerformed, socialApproval, apartmentsInBuilding, budgetRequestOpened, status } = req.body;

    if (!reporterName || !address || !damageType || !description) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const parseBoolean = (value) => value === true || value === 'true' || value === '1';

    const report = {
      id: nextId++,
      reporterName,
      address,
      damageType,
      description,
      status: 'WAITING_FOR_VALIDATION',
      damagePhotosExist: parseBoolean(damagePhotosExist),
      engineerReportExists: parseBoolean(engineerReportExists),
      eligibilityCheckPerformed: parseBoolean(eligibilityCheckPerformed),
      socialApproval: parseBoolean(socialApproval),
      apartmentsInBuilding: Number(apartmentsInBuilding) || 0,
      budgetRequestOpened: parseBoolean(budgetRequestOpened),
      status: status || 'WAITING_FOR_VALIDATION',
    };

    reports.push(report);
    saveReports(reportsFilePath, reports);
    res.status(201).json(report);
  });

  app.get('/reports/:id', (req, res) => {
    const report = reports.find((item) => item.id === Number(req.params.id));
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  });

  app.patch('/reports/:id/budget-request', (req, res) => {
    const report = reports.find((item) => item.id === Number(req.params.id));
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.budgetRequestOpened = true;
    saveReports(reportsFilePath, reports);
    res.json(report);
  });

  app.post('/buildings/:id/return-home-package', async (req, res) => {
    const report = reports.find((item) => item.id === Number(req.params.id));
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

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
    res.json(result);
  });

  app.post('/buildings/batch-return-home-packages', async (req, res) => {
    const { settlement } = req.body;
    
    let filteredReports = reports;
    
    if (settlement) {
      filteredReports = reports.filter((report) => {
        const address = report.address || '';
        const reportSettlement = address.split(',')[0].trim();
        return reportSettlement === settlement;
      });
    }

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
          generatedFiles.push({
            buildingId: report.id,
            url: result.url,
            fileName: result.fileName
          });
        } catch (error) {
          console.error(`Failed to generate file for building ${report.id}:`, error);
        }
      }
    }

    res.json({
      count: generatedFiles.length,
      files: generatedFiles
    });
  });

  app.patch('/reports/:id/status', (req, res) => {
    const report = reports.find((item) => item.id === Number(req.params.id));
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const { status } = req.body;
    const allowedStatuses = ['WAITING_FOR_VALIDATION', 'NEW', 'IN_REVIEW', 'Building in the process of restoration', 'Restoration process completed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const currentStatus = report.status;
    const validTransitions = {
      WAITING_FOR_VALIDATION: ['NEW'],
      NEW: ['IN_REVIEW'],
      IN_REVIEW: ['Building in the process of restoration'],
      'Building in the process of restoration': ['Restoration process completed'],
      'Restoration process completed': [],
    };

    if (!validTransitions[currentStatus].includes(status) && currentStatus !== status) {
      return res.status(400).json({ error: 'Invalid status transition' });
    }

    report.status = status;
    saveReports(reportsFilePath, reports);
    res.json(report);
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

module.exports = { createApp };
