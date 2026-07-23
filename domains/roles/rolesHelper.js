function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.headers['x-user-role'];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Permission denied: insufficient role' });
    }
    next();
  };
}

function requireSettlementAccess(buildingsService) {
  return (req, res, next) => {
    const role = req.headers['x-user-role'];
    if (role !== 'MUNICIPALITY') return next();

    const userSettlement = req.headers['x-user-settlement'];
    if (!userSettlement) {
      return res.status(403).json({ error: 'Settlement information required' });
    }

    const buildingId = req.params.id;
    if (!buildingId) return next();

    if (!buildingsService.belongsToSettlement(buildingId, userSettlement)) {
      return res.status(403).json({ error: 'Access denied: building is outside your settlement' });
    }
    next();
  };
}

module.exports = { requireRole, requireSettlementAccess };
