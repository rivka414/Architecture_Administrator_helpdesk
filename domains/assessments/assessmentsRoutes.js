function createAssessmentsRoutes(express, assessmentsService) {
  const router = express.Router();

  router.get('/reports/:id/appraisal', (req, res) => {
    const assessment = assessmentsService.getAssessment(req.params.id);
    if (assessment === null) {
      return res.status(404).json({ error: 'Building not found' });
    }
    res.json({ appraisal: assessment });
  });

  router.patch('/reports/:id/appraisal', (req, res) => {
    const result = assessmentsService.saveAssessment(req.params.id, req.body);
    if (result === null) {
      return res.status(404).json({ error: 'Building not found' });
    }
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result.report);
  });

  return router;
}

module.exports = { createAssessmentsRoutes };
