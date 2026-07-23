function createSettlementProcessesRoutes(express, settlementProcessesService, processLogger) {
  const router = express.Router();

  router.get('/settlement-processes', (req, res) => {
    res.json(settlementProcessesService.getAll());
  });

  router.get('/settlement-processes/:id', (req, res) => {
    const record = settlementProcessesService.getById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Settlement process not found' });
    res.json(record);
  });

  router.get('/process-logs', (req, res) => {
    res.json(processLogger.getAll());
  });

  return router;
}

module.exports = { createSettlementProcessesRoutes };
