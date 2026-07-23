const { requireRole, requireSettlementAccess } = require('../roles/rolesHelper');

function createAssessmentsRoutes(express, assessmentsService, actionsService, buildingsService) {
  const router = express.Router();

  router.get('/reports/:id/appraisal', requireSettlementAccess(buildingsService), (req, res) => {
    const assessment = assessmentsService.getAssessment(req.params.id);
    if (assessment === null) {
      return res.status(404).json({ error: 'Building not found' });
    }
    res.json({ appraisal: assessment });
  });

  router.patch('/reports/:id/appraisal', requireRole('APPRAISER', 'MINISTRY'), (req, res) => {
    const result = assessmentsService.saveAssessment(req.params.id, req.body);
    if (result === null) {
      return res.status(404).json({ error: 'Building not found' });
    }
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    const userId = req.headers['x-user-id'];
    const userName = req.headers['x-user-name'];
    if (userId && userName) {
      actionsService.log(userId, userName, 'Update Appraisal', 'building', req.params.id);
    }
    res.json(result.report);
  });

  return router;
}

module.exports = { createAssessmentsRoutes };
