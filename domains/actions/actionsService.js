const fs = require('fs');
const path = require('path');

class ActionsService {
  constructor(filePath) {
    this.filePath = filePath;
    this.actions = this._load();
  }

  _load() {
    if (!fs.existsSync(this.filePath)) {
      this._saveTo([]);
      return [];
    }
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      console.warn('Could not read actions file.');
    }
    return [];
  }

  _saveTo(actions) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(actions, null, 2));
  }

  _save() {
    this._saveTo(this.actions);
  }

  log(userId, userName, action, entityType, entityId) {
    const record = {
      id: this.actions.length ? Math.max(...this.actions.map((a) => a.id)) + 1 : 1,
      userId: Number(userId),
      userName,
      action,
      entityType,
      entityId: Number(entityId),
      timestamp: new Date().toISOString(),
    };
    this.actions.push(record);
    this._save();
    return record;
  }

  getByBuilding(buildingId) {
    this.actions = this._load();
    return this.actions.filter((a) => a.entityType === 'building' && a.entityId === Number(buildingId));
  }

  getAll() {
    return this._load();
  }
}

module.exports = { ActionsService };
