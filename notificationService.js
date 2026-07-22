const fs = require('fs');
const path = require('path');

const VALID_MODES = ['success', 'always_fail', 'fail_first', 'random'];

class NotificationService {
  constructor(csvFilePath) {
    this.csvFilePath = csvFilePath;
    this.messageIdCounter = 1;
    this.statusMode = 'success';
    this.attemptCount = 0;
    
    // Ensure the directory exists
    const dir = path.dirname(this.csvFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Create CSV file with headers if it doesn't exist
    if (!fs.existsSync(this.csvFilePath)) {
      const headers = 'MessageID,BuildingID,BuildingAddress,Email,Subject,DateTime,Status\n';
      fs.writeFileSync(this.csvFilePath, headers, 'utf8');
    }
    
    // Load the last message ID from the CSV file
    this.loadLastMessageId();
  }

  getStatusMode() {
    return this.statusMode;
  }

  setStatusMode(mode) {
    if (VALID_MODES.includes(mode)) {
      this.statusMode = mode;
      this.attemptCount = 0;
    }
  }

  shouldFail() {
    switch (this.statusMode) {
      case 'always_fail':
        return true;
      case 'fail_first':
        this.attemptCount++;
        return this.attemptCount === 1;
      case 'random':
        return Math.random() < 0.3;
      default:
        return false;
    }
  }
  
  loadLastMessageId() {
    try {
      const data = fs.readFileSync(this.csvFilePath, 'utf8');
      const lines = data.trim().split('\n');
      if (lines.length > 1) {
        const lastLine = lines[lines.length - 1];
        const parts = lastLine.split(',');
        if (parts.length > 0) {
          const lastId = parseInt(parts[0]);
          if (!isNaN(lastId)) {
            this.messageIdCounter = lastId + 1;
          }
        }
      }
    } catch (error) {
      console.warn('Could not load last message ID, starting from 1');
    }
  }
  
  sendNotification(buildingId, email, subject, body, buildingAddress) {
    const messageId = this.messageIdCounter++;
    const now = new Date();
    const dateTime = now.toISOString();
    const status = this.shouldFail() ? 'FAILED' : 'SENT';
    
    // Append to CSV file
    const csvLine = `${messageId},${buildingId},"${buildingAddress}",${email},"${subject}",${dateTime},${status}\n`;
    fs.appendFileSync(this.csvFilePath, csvLine, 'utf8');
    
    return {
      status: status,
      messageId: messageId
    };
  }

  sendWithRetry(buildingId, email, subject, body, buildingAddress) {
    const MAX_ATTEMPTS = 3;
    let lastResult;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      lastResult = this.sendNotification(buildingId, email, subject, body, buildingAddress);
      if (lastResult.status === 'SENT') {
        return lastResult;
      }
    }

    return lastResult;
  }
  
  getAllNotifications() {
    const data = fs.readFileSync(this.csvFilePath, 'utf8');
    const lines = data.trim().split('\n');
    
    if (lines.length <= 1) {
      return [];
    }
    
    const headers = lines[0].split(',');
    const notifications = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = this.parseCSVLine(line);
      
      if (values.length === headers.length) {
        notifications.push({
          messageId: values[0],
          buildingId: values[1],
          buildingAddress: values[2],
          email: values[3],
          subject: values[4],
          dateTime: values[5],
          status: values[6]
        });
      }
    }
    
    return notifications.reverse(); // Show newest first
  }
  
  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }
}

module.exports = { NotificationService };
