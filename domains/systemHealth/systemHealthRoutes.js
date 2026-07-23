function createSystemHealthRoutes(express, systemHealthService) {
  const router = express.Router();

  router.get('/system-health', (req, res) => {
    res.json(systemHealthService.getMetrics());
  });

  return router;
}

module.exports = { createSystemHealthRoutes };
