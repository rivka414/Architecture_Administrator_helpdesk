const fs = require('fs');
const path = require('path');

class SettlementProcessesService {
  constructor(filePath) {
    this.filePath = filePath;
    this._ensureFile();
  }

  _ensureFile() {
    if (!fs.existsSync(this.filePath)) {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, '[]');
    }
  }

  _load() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  _save(processes) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(processes, null, 2));
  }

  create(settlementName, startedBy) {
    const processes = this._load();
    const id = processes.length ? Math.max(...processes.map((p) => p.id)) + 1 : 1;
    const record = {
      id,
      settlementName,
      startedBy,
      startedAt: new Date().toISOString(),
      completedAt: null,
      status: 'PROCESSING',
    };
    processes.push(record);
    this._save(processes);
    return record;
  }

  complete(id) {
    const processes = this._load();
    const record = processes.find((p) => p.id === Number(id));
    if (!record) return null;
    record.completedAt = new Date().toISOString();
    record.status = 'COMPLETED';
    this._save(processes);
    return record;
  }

  getAll() {
    const processes = this._load();
    return processes.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  }

  getById(id) {
    const processes = this._load();
    return processes.find((p) => p.id === Number(id)) || null;
  }
}

module.exports = { SettlementProcessesService };
