const fs = require('fs');
const path = require('path');

class ProcessLogger {
  constructor(filePath) {
    this.filePath = filePath;
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, '', 'utf8');
    }
  }

  _write(entry) {
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.filePath, line, 'utf8');
  }

  log(level, event, options = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      settlement: options.settlement || null,
      buildingId: options.buildingId != null ? Number(options.buildingId) : null,
      attempt: options.attempt != null ? Number(options.attempt) : null,
      error: options.error || null,
    };
    this._write(entry);
    return entry;
  }

  info(event, options) {
    return this.log('INFO', event, options);
  }

  warn(event, options) {
    return this.log('WARN', event, options);
  }

  error(event, options) {
    return this.log('ERROR', event, options);
  }

  getAll() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      const lines = data.trim().split('\n').filter(Boolean);
      return lines.map((line) => JSON.parse(line));
    } catch {
      return [];
    }
  }
}

module.exports = { ProcessLogger };
