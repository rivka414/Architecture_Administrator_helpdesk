const { requireRole } = require('../roles/rolesHelper');

function createApprovalsRoutes(express, approvalsService, actionsService) {
  const router = express.Router();

  router.get('/reports/:id/permit-approval', (req, res) => {
    const approval = approvalsService.getApproval(req.params.id);
    if (approval === null) {
      return res.status(404).json({ error: 'Building not found' });
    }
    res.json({ permitApproval: approval });
  });

  router.patch('/reports/:id/permit-approval', requireRole('MINISTRY', 'MUNICIPALITY'), (req, res) => {
    const result = approvalsService.saveApproval(req.params.id, req.body);
    if (result === null) {
      return res.status(404).json({ error: 'Building not found' });
    }
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    const userId = req.headers['x-user-id'];
    const userName = req.headers['x-user-name'];
    if (userId && userName) {
      actionsService.log(userId, userName, 'Update Permit Approval', 'building', req.params.id);
    }
    res.json(result.report);
  });

  return router;
}

module.exports = { createApprovalsRoutes };
