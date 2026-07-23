function createActionsRoutes(express, actionsService) {
  const router = express.Router();

  router.get('/actions', (req, res) => {
    res.json(actionsService.getAll());
  });

  router.get('/buildings/:id/actions', (req, res) => {
    const actions = actionsService.getByBuilding(req.params.id);
    res.json(actions);
  });

  return router;
}

module.exports = { createActionsRoutes };
