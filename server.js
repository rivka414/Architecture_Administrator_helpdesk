const express = require('express');
const path = require('path');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  const reports = [
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

  let nextId = 3;

  app.get('/reports', (req, res) => {
    res.json(reports);
  });

  app.post('/reports', (req, res) => {
    const { reporterName, address, damageType, description, damagePhotosExist, engineerReportExists, eligibilityCheckPerformed, apartmentsInBuilding } = req.body;

    if (!reporterName || !address || !damageType || !description) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const report = {
      id: nextId++,
      reporterName,
      address,
      damageType,
      description,
      status: 'WAITING_FOR_VALIDATION',
      damagePhotosExist: Boolean(damagePhotosExist),
      engineerReportExists: Boolean(engineerReportExists),
      eligibilityCheckPerformed: Boolean(eligibilityCheckPerformed),
      apartmentsInBuilding: Number(apartmentsInBuilding) || 0,
    };

    reports.push(report);
    res.status(201).json(report);
  });

  app.get('/reports/:id', (req, res) => {
    const report = reports.find((item) => item.id === Number(req.params.id));
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  });

  app.patch('/reports/:id/status', (req, res) => {
    const report = reports.find((item) => item.id === Number(req.params.id));
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const { status } = req.body;
    const allowedStatuses = ['WAITING_FOR_VALIDATION', 'NEW', 'IN_REVIEW'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const currentStatus = report.status;
    const validTransitions = {
      WAITING_FOR_VALIDATION: ['NEW'],
      NEW: ['IN_REVIEW'],
      IN_REVIEW: [],
    };

    if (!validTransitions[currentStatus].includes(status) && currentStatus !== status) {
      return res.status(400).json({ error: 'Invalid status transition' });
    }

    report.status = status;
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
