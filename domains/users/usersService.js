const fs = require('fs');
const path = require('path');

class UsersService {
  constructor(filePath) {
    this.filePath = filePath;
    this.users = this._load();
  }

  _load() {
    if (!fs.existsSync(this.filePath)) {
      const initial = [];
      this._saveTo(initial);
      return initial;
    }
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      console.warn('Could not read users file.');
    }
    return [];
  }

  _saveTo(users) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(users, null, 2));
  }

  getAll() {
    return this._load();
  }

  getAllSafe() {
    return this._load();
  }

  getById(userId) {
    return this._load().find((u) => u.id === Number(userId)) || null;
  }

  findByCredentials(username, password) {
    return this._load().find((u) => u.username === username && u.password === password) || null;
  }
}

module.exports = { UsersService };
