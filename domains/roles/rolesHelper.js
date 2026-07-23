function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.headers['x-user-role'];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Permission denied: insufficient role' });
    }
    next();
  };
}

module.exports = { requireRole };
