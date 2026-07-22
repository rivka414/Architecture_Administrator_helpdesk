const express = require('express');
const fs = require('fs');
const path = require('path');
const { InhabitationFileService } = require('./inhabitationFileService');
const { NotificationService } = require('./notificationService');

function createInitialReports() {
  return [
    {
      id: 1,
      reporterName: 'John Doe',
      address: 'Tel Aviv, Rothschild 1',
      damageType: 'Water',
      description: 'Leak under the sink',
      status: 'Restoration process completed',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      socialApproval: false,
      apartmentsInBuilding: 12,
      budgetRequestOpened: true,
      familyEmail: 'john.doe@example.com',
    },
    {
      id: 2,
      reporterName: 'Jane Smith',
      address: 'Tel Aviv, Allenby 22',
      damageType: 'Electrical',
      description: 'Broken outlet',
      status: 'Restoration process completed',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      socialApproval: false,
      apartmentsInBuilding: 8,
      budgetRequestOpened: true,
      familyEmail: 'jane.smith@example.com',
    },
    {
      id: 3,
      reporterName: 'David Cohen',
      address: 'Jerusalem, Jaffa 10',
      damageType: 'Structural',
      description: 'Crack in the wall',
      status: 'Restoration process completed',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      socialApproval: true,
      apartmentsInBuilding: 30,
      budgetRequestOpened: true,
      familyEmail: 'david.cohen@example.com',
    },
    {
      id: 4,
      reporterName: 'Sarah Levy',
      address: 'Jerusalem, King George 5',
      damageType: 'Water',
      description: 'Flooding in basement',
      status: 'Building in the process of restoration',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      socialApproval: true,
      apartmentsInBuilding: 36,
      budgetRequestOpened: true,
      familyEmail: 'sarah.levy@example.com',
    },
    {
      id: 5,
      reporterName: 'Moshe Ben',
      address: 'Haifa, Herzl 15',
      damageType: 'Fire',
      description: 'Kitchen fire damage',
      status: 'Restoration process completed',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      socialApproval: false,
      apartmentsInBuilding: 20,
      budgetRequestOpened: true,
      familyEmail: 'moshe.ben@example.com',
    },
    {
      id: 6,
      reporterName: 'Rivka Mizrachi',
      address: 'Haifa, Nordau 8',
      damageType: 'Water',
      description: 'Burst pipe on third floor',
      status: 'Restoration process completed',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      socialApproval: false,
      apartmentsInBuilding: 16,
      budgetRequestOpened: true,
      familyEmail: 'rivka.m@example.com',
    },
    {
      id: 7,
      reporterName: 'Avi Shalom',
      address: 'Beer Sheva, Ben Yehuda 3',
      damageType: 'Structural',
      description: 'Foundation settlement',
      status: 'Restoration process completed',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      socialApproval: false,
      apartmentsInBuilding: 10,
      budgetRequestOpened: true,
      familyEmail: 'avi.shalom@example.com',
    },
    {
      id: 8,
      reporterName: 'Hanna Gold',
      address: 'Netanya, Rothschild 42',
      damageType: 'Electrical',
      description: 'Wiring damage in common area',
      status: 'Building in the process of restoration',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      socialApproval: true,
      apartmentsInBuilding: 28,
      budgetRequestOpened: true,
      familyEmail: 'hanna.gold@example.com',
    },
    {
      id: 9,
      reporterName: 'Yosef Avital',
      address: 'Petah Tikva, Hovevei Zion 7',
      damageType: 'Water',
      description: 'Roof leak affecting multiple apartments',
      status: 'Restoration process completed',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      socialApproval: false,
      apartmentsInBuilding: 14,
      budgetRequestOpened: true,
      familyEmail: 'yosef.a@example.com',
    },
    {
      id: 10,
      reporterName: 'Michal Bar',
      address: 'Ramat Gan, Bialik 12',
      damageType: 'Fire',
      description: 'Electrical fire in stairwell',
      status: 'IN_REVIEW',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      socialApproval: false,
      apartmentsInBuilding: 18,
      budgetRequestOpened: false,
      familyEmail: 'michal.bar@example.com',
    },
    {
      id: 11,
      reporterName: 'Eitan Peretz',
      address: 'Ashdod, Sderot 20',
      damageType: 'Structural',
      description: 'Earthquake damage to facade',
      status: 'NEW',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: false,
      socialApproval: false,
      apartmentsInBuilding: 22,
      budgetRequestOpened: false,
      familyEmail: 'eitan.p@example.com',
    },
    {
      id: 12,
      reporterName: 'Tamar Raz',
      address: 'Holon, Weizmann 6',
      damageType: 'Water',
      description: 'Sewage backup in ground floor',
      status: 'WAITING_FOR_VALIDATION',
      damagePhotosExist: true,
      engineerReportExists: false,
      eligibilityCheckPerformed: false,
      socialApproval: false,
      apartmentsInBuilding: 9,
      budgetRequestOpened: false,
      familyEmail: 'tamar.raz@example.com',
    },
    {
      id: 13,
      reporterName: 'Shlomo Dagan',
      address: 'Rishon LeZion, Jabotinsky 33',
      damageType: 'Water',
      description: 'Pipe burst in laundry room',
      status: 'WAITING_FOR_VALIDATION',
      damagePhotosExist: false,
      engineerReportExists: false,
      eligibilityCheckPerformed: false,
      socialApproval: false,
      apartmentsInBuilding: 6,
      budgetRequestOpened: false,
      familyEmail: 'shlomo.d@example.com',
    },
    {
      id: 14,
      reporterName: 'Nurit Fisher',
      address: 'Ashkelon, Ben Gurion 11',
      damageType: 'Electrical',
      description: 'Power outage in common areas',
      status: 'NEW',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      socialApproval: false,
      apartmentsInBuilding: 15,
      budgetRequestOpened: false,
      familyEmail: 'nurit.f@example.com',
    },
    {
      id: 15,
      reporterName: 'Amos Keinan',
      address: 'Kfar Saba, Sokolov 4',
      damageType: 'Fire',
      description: 'Balcony fire spread to wall',
      status: 'IN_REVIEW',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      socialApproval: false,
      apartmentsInBuilding: 11,
      budgetRequestOpened: false,
      familyEmail: 'amos.k@example.com',
    },
    {
      id: 16,
      reporterName: 'Dina Alon',
      address: 'Herzliya, Ahad Haam 19',
      damageType: 'Structural',
      description: 'Cracks in load-bearing wall',
      status: 'WAITING_FOR_VALIDATION',
      damagePhotosExist: false,
      engineerReportExists: false,
      eligibilityCheckPerformed: false,
      socialApproval: false,
      apartmentsInBuilding: 24,
      budgetRequestOpened: false,
      familyEmail: 'dina.alon@example.com',
    },
    {
      id: 17,
      reporterName: 'Gideon Tal',
      address: 'Nahariya, Gaaton 2',
      damageType: 'Water',
      description: 'Storm water damage to lobby',
      status: 'NEW',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: false,
      socialApproval: false,
      apartmentsInBuilding: 7,
      budgetRequestOpened: false,
      familyEmail: 'gideon.t@example.com',
    },
    {
      id: 18,
      reporterName: 'Orly Ben-David',
      address: 'Nazareth, Paulus VI 14',
      damageType: 'Water',
      description: 'Seepage through ceiling',
      status: 'WAITING_FOR_VALIDATION',
      damagePhotosExist: false,
      engineerReportExists: false,
      eligibilityCheckPerformed: false,
      socialApproval: false,
      apartmentsInBuilding: 5,
      budgetRequestOpened: false,
      familyEmail: 'orly.bd@example.com',
    },
    {
      id: 19,
      reporterName: 'Menachem Lev',
      address: 'Eilat, Hatmarim 25',
      damageType: 'Structural',
      description: 'Corrosion damage from salt air',
      status: 'WAITING_FOR_VALIDATION',
      damagePhotosExist: true,
      engineerReportExists: false,
      eligibilityCheckPerformed: false,
      socialApproval: false,
      apartmentsInBuilding: 20,
      budgetRequestOpened: false,
      familyEmail: 'menachem.l@example.com',
    },
    {
      id: 20,
      reporterName: 'Batya Segal',
      address: 'Tiberias, HaGalil 9',
      damageType: 'Electrical',
      description: 'Short circuit in elevator shaft',
      status: 'NEW',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      socialApproval: false,
      apartmentsInBuilding: 13,
      budgetRequestOpened: false,
      familyEmail: 'batya.s@example.com',
    },
    {
      id: 21,
      reporterName: 'Raphael Oz',
      address: 'Zichron Yaakov, Hanadiv 1',
      damageType: 'Fire',
      description: 'Garage fire damage',
      status: 'Restoration process completed',
      damagePhotosExist: true,
      engineerReportExists: true,
      eligibilityCheckPerformed: true,
      socialApproval: false,
      apartmentsInBuilding: 32,
      budgetRequestOpened: true,
      familyEmail: 'raphael.oz@example.com',
    },
    {
      id: 22,
      reporterName: 'Varda Shushan',
      address: 'Mitzpe Ramon, HaMakhtesh 3',
      damageType: 'Water',
      description: 'Water heater explosion',
      status: 'WAITING_FOR_VALIDATION',
      damagePhotosExist: false,
      engineerReportExists: false,
      eligibilityCheckPerformed: false,
      socialApproval: false,
      apartmentsInBuilding: 4,
      budgetRequestOpened: false,
      familyEmail: 'varda.s@example.com',
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
  const notificationService = new NotificationService(path.join(__dirname, 'data', 'notifications.csv'));
  const reportsFilePath = path.join(__dirname, 'data', 'reports.json');
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/files', express.static(path.join(__dirname, 'files')));

  let reports = loadReports(reportsFilePath);
  reports.forEach((report) => {
    if (report.familyEmail === undefined || report.familyEmail === null) {
      report.familyEmail = '';
    }
    if (report.socialApproval === undefined) {
      report.socialApproval = false;
    }
    if (report.budgetRequestOpened === undefined) {
      report.budgetRequestOpened = false;
    }
  });
  let nextId = reports.length ? Math.max(...reports.map((report) => Number(report.id))) + 1 : 3;

  app.get('/reports', (req, res) => {
    res.json(reports);
  });

  app.post('/reports', (req, res) => {
    const { reporterName, address, damageType, description, damagePhotosExist, engineerReportExists, eligibilityCheckPerformed, socialApproval, apartmentsInBuilding, budgetRequestOpened, status, familyEmail } = req.body;

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
      familyEmail: familyEmail || '',
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
    
    // Send email notification if family email exists
    if (report.familyEmail) {
      const subject = `Return to Home Approval ${report.address}`;
      const body = `Hello,\n\nWe are pleased to inform you that your building has been approved for return to home.\nThe occupancy file has been prepared successfully.\n\nBest regards,\nMinistry of Construction and Housing`;
      
      try {
        await notificationService.sendWithRetry(
          report.id,
          report.familyEmail,
          subject,
          body,
          report.address
        );
      } catch (error) {
        console.error(`Failed to send notification for building ${report.id}:`, error);
      }
    }
    
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

          if (report.familyEmail) {
            const subject = `Return to Home Approval ${report.address}`;
            const body = `Hello,\n\nWe are pleased to inform you that your building has been approved for return to home.\nThe occupancy file has been prepared successfully.\n\nBest regards,\nMinistry of Construction and Housing`;
            try {
              await notificationService.sendWithRetry(report.id, report.familyEmail, subject, body, report.address);
            } catch (error) {
              console.error(`Failed to send notification for building ${report.id}:`, error);
            }
          }
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

  app.post('/notifications/send', (req, res) => {
    const { buildingId, email, subject, body } = req.body;
    
    if (!buildingId || !email || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const report = reports.find((item) => item.id === Number(buildingId));
    if (!report) {
      return res.status(404).json({ error: 'Building not found' });
    }
    
    const result = notificationService.sendNotification(
      buildingId,
      email,
      subject,
      body,
      report.address
    );
    
    res.json(result);
  });

  app.get('/notifications', (req, res) => {
    const notifications = notificationService.getAllNotifications();
    res.json(notifications);
  });

  app.get('/notifications/status', (req, res) => {
    res.json({ mode: notificationService.getStatusMode() });
  });

  app.post('/notifications/status', (req, res) => {
    const { mode } = req.body;
    if (!mode) {
      return res.status(400).json({ error: 'Missing mode' });
    }
    notificationService.setStatusMode(mode);
    res.json({ mode: notificationService.getStatusMode() });
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
