function createUsersRoutes(express, usersService) {
  const router = express.Router();

  router.get('/users', (req, res) => {
    res.json(usersService.getAllSafe());
  });

  router.get('/users/:id', (req, res) => {
    const user = usersService.getById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...safe } = user;
    res.json(safe);
  });

  router.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Missing username or password' });
    }
    const user = usersService.findByCredentials(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  });

  return router;
}

module.exports = { createUsersRoutes };
