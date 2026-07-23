const express = require('express');
const path = require('path');
const { InhabitationFileService } = require('./inhabitationFileService');
const { NotificationService } = require('./notificationService');
const { AssessmentsService } = require('./domains/assessments/assessmentsService');
const { ApprovalsService } = require('./domains/approvals/approvalsService');
const { BuildingsService } = require('./domains/buildings/buildingsService');
const { UsersService } = require('./domains/users/usersService');
const { ActionsService } = require('./domains/actions/actionsService');
const { createAssessmentsRoutes } = require('./domains/assessments/assessmentsRoutes');
const { createApprovalsRoutes } = require('./domains/approvals/approvalsRoutes');
const { createBuildingsRoutes } = require('./domains/buildings/buildingsRoutes');
const { createUsersRoutes } = require('./domains/users/usersRoutes');
const { createActionsRoutes } = require('./domains/actions/actionsRoutes');

function createApp() {
  const app = express();
  const reportsFilePath = path.join(__dirname, 'data', 'reports.json');

  const habitationFileService = new InhabitationFileService(path.join(__dirname, 'files'));
  const notificationService = new NotificationService(path.join(__dirname, 'data', 'notifications.csv'));
  const assessmentsService = new AssessmentsService(reportsFilePath);
  const approvalsService = new ApprovalsService(reportsFilePath);
  const buildingsService = new BuildingsService(reportsFilePath, assessmentsService, approvalsService);
  const usersService = new UsersService(path.join(__dirname, 'data', 'users.json'));
  const actionsService = new ActionsService(path.join(__dirname, 'data', 'actions.json'));

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/files', express.static(path.join(__dirname, 'files')));

  app.use(createUsersRoutes(express, usersService));
  app.use(createActionsRoutes(express, actionsService));
  app.use(createAssessmentsRoutes(express, assessmentsService, actionsService, buildingsService));
  app.use(createApprovalsRoutes(express, approvalsService, actionsService, buildingsService));
  app.use(createBuildingsRoutes(express, buildingsService, habitationFileService, notificationService, actionsService));

  app.post('/notifications/send', (req, res) => {
    const { buildingId, email, subject, body, idempotencyKey } = req.body;

    if (!buildingId || !email || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const report = buildingsService.getById(buildingId);
    if (!report) {
      return res.status(404).json({ error: 'Building not found' });
    }

    const result = notificationService.sendNotification(
      buildingId, email, subject, body, report.address,
      idempotencyKey || String(buildingId)
    );

    res.json(result);
  });

  app.get('/notifications', (req, res) => {
    res.json(notificationService.getAllNotifications());
  });

  app.get('/notifications/status', (req, res) => {
    res.json({ mode: notificationService.getStatusMode() });
  });

  app.post('/notifications/status', (req, res) => {
    const { mode } = req.body;
    if (!mode) return res.status(400).json({ error: 'Missing mode' });
    notificationService.setStatusMode(mode);
    res.json({ mode: notificationService.getStatusMode() });
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
