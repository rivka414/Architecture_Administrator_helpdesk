# Damage Reports Management System

> **Ministry of Construction and Housing** — Resident Return & Settlement Opening Management System

## Overview

The **Damage Reports Management System** is an enterprise platform built for the Israeli Ministry of Construction and Housing to manage the end-to-end lifecycle of building rehabilitation following damage events. The system tracks buildings from initial damage report through appraisal, budget approval, restoration, and final re-occupation, enabling government officials, local authorities, and professional appraisers to collaborate within a unified, role-based interface.

The platform solves the critical business problem of coordinating multi-stakeholder processes across hundreds of buildings in dozens of settlements — ensuring accountability, audit trails, and structured data flow from damage assessment to resident return.

---

## Key Features

### Building Management
- Create and track damage reports with structured eligibility data
- Status flow: `WAITING_FOR_VALIDATION → NEW → IN_REVIEW → Restoration in progress → Restoration completed`
- Eligibility engine evaluating 8+ criteria (damage photos, engineer reports, social approval, budget, appraisal, permit approval)
- Batch generation of re-occupation PDF files for entire settlements

### PDF Generation (Hebrew RTL)
- Automated return-to-home PDF documents using PDFKit
- Full Hebrew RTL (Right-to-Left) support via `bidi-js`
- Professionally formatted with building details and approval status

### Role-Based Permissions
- Three distinct roles: **MINISTRY**, **MUNICIPALITY**, **APPRAISER**
- Server-side middleware (`requireRole`) enforcing access on every protected endpoint
- Frontend permission-aware UI — buttons and portals hidden by role

### Settlement-Based Access Control
- `MUNICIPALITY` users restricted to buildings within their assigned settlement
- Middleware `requireSettlementAccess` on all building-accessing routes
- Settlement filter locked for municipality users

### Notification System
- Mock notification server with 5 configurable modes: `success`, `always_fail`, `fail_first`, `random`, `timeout`
- Automatic retry mechanism (max 3 attempts, stops on first success)
- Idempotency protection — prevents duplicate notifications per building
- Full CSV audit log of all sent/failed notifications

### Settlement Process Tracking
- `SettlementProcess` entity tracking batch operations with unique UUID `processId`
- Status lifecycle: `PROCESSING → COMPLETED`
- Read-only API for process history

### Process Logging (Structured)
- JSON-lines log file (`data/processLogs.json`) capturing every event
- Settlement-level events: `SETTLEMENT_PROCESS_START`, `SETTLEMENT_PROCESS_COMPLETE`, `SETTLEMENT_PROCESS_FAILED`
- Building-level events: `BUILDING_PDF_START`, `BUILDING_PDF_END`, `BUILDING_NOTIFICATION_START/SUCCESS/FAILED`
- Every log entry tagged with `processId` for correlation across concurrent processes

### System Health Dashboard
- Real-time metrics computed from existing data (no external tools)
- Settlement Processes: Completed / Processing counts
- Notifications: Successful / Failed / Retry Count
- Performance: Average Settlement Duration

### Action Audit Trail
- Every status change, budget request, appraisal, and permit approval logged
- Per-building action history with timestamp and user name

---

## Architecture & Project Structure

The system follows a **domain-driven modular architecture**. Each business domain owns its service (business logic), routes (API), and middleware, with clear separation of concerns.

### Ownership Model
- **BuildingsService** — owns building data, eligibility logic, settlement queries
- **AssessmentsService** — owns appraisal data (damage level, comments, inspection date)
- **ApprovalsService** — owns permit approval data (infrastructure checks, authority approval)
- **SettlementProcessesService** — owns batch process tracking records
- **ProcessLogger** — owns structured log file writes and reads
- **NotificationService** — owns notification sending, retry, idempotency, CSV log
- **InhabitationFileService** — owns PDF generation

```
damage-reports-mvp/
├── server.js                          # Express app wiring, notification routes
├── package.json
├── inhabitationFileService.js         # PDF generation (PDFKit + bidi-js)
├── notificationService.js             # Mock notification server + retry + idempotency
├── data/
│   ├── reports.json                   # Building records (22 seeded)
│   ├── users.json                     # User accounts (7 seeded, 3 roles)
│   ├── actions.json                   # Action audit log
│   ├── settlementProcesses.json       # Batch process records
│   ├── processLogs.json               # Structured JSON-lines log
│   └── notifications.csv              # Notification audit CSV
├── domains/
│   ├── actions/
│   │   ├── actionsService.js          # Action logging
│   │   └── actionsRoutes.js           # GET /actions, GET /buildings/:id/actions
│   ├── approvals/
│   │   ├── approvalsService.js        # Permit approval CRUD
│   │   └── approvalsRoutes.js         # PATCH /reports/:id/permit-approval
│   ├── assessments/
│   │   ├── assessmentsService.js      # Appraisal CRUD
│   │   └── assessmentsRoutes.js       # PATCH /reports/:id/appraisal
│   ├── buildings/
│   │   ├── buildingsService.js        # Building CRUD, eligibility, settlement logic
│   │   └── buildingsRoutes.js         # All building + batch endpoints
│   ├── roles/
│   │   └── rolesHelper.js             # requireRole() + requireSettlementAccess()
│   ├── settlementProcesses/
│   │   ├── settlementProcessesService.js  # Process CRUD
│   │   ├── settlementProcessesRoutes.js   # GET /settlement-processes, /process-logs
│   │   └── processLogger.js           # Structured JSON-lines logger
│   ├── systemHealth/
│   │   ├── systemHealthService.js     # Metrics computation
│   │   └── systemHealthRoutes.js      # GET /system-health
│   └── users/
│       ├── usersService.js            # User CRUD + authentication
│       └── usersRoutes.js             # GET /users, POST /auth/login
├── public/
│   ├── index.html                     # Single-page application (all screens)
│   ├── app.js                         # Frontend logic (~1200 lines)
│   └── styles.css                     # Modern enterprise dashboard CSS
├── tests/
│   └── reports.test.js                # 54 integration tests
├── files/                             # Generated PDF files (runtime)
└── fonts/                             # Hebrew font files for PDF
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Server | Express.js |
| Frontend | Vanilla HTML, CSS, JavaScript (no framework) |
| PDF Generation | PDFKit |
| RTL Support | bidi-js |
| Styling | Custom CSS (Rubik font, CSS custom properties) |
| Testing | Node.js built-in test runner (`node --test`) |
| Data Storage | JSON flat files (no database) |

---

## Getting Started

### Prerequisites
- **Node.js** 18+ (recommended: latest LTS)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd damage-reports-mvp

# Install dependencies
npm install
```

### Running the Server

```bash
# Start the server on port 3000
npm start
```

The server starts at `http://localhost:3000`. Open this URL in your browser to access the application.

### Running Tests

```bash
# Run all 54 integration tests
npm test

# Or explicitly:
node --test tests/reports.test.js
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |

---

## Roles & Permissions

The system enforces access control at both **server middleware** and **frontend UI** levels.

| Role | View All Buildings | View Own Settlement | Update Appraisals | Approve/Reject Permit | Open Budget Request | Access Portals |
|------|:--:|:--:|:--:|:--:|:--:|:--:|
| **MINISTRY** | Yes | All settlements | Yes | Yes | Yes | Appraiser Portal, Local Authority Portal |
| **MUNICIPALITY** | No | Own settlement only | No | Yes (own settlement) | No | Local Authority Portal only |
| **APPRAISER** | Yes | All settlements | Yes | No | No | Appraiser Portal only |

### Seeded Users

| Full Name | Username | Password | Role | Settlement |
|-----------|----------|----------|------|------------|
| David Cohen | `david.cohen` | `david123` | MINISTRY | — |
| Hanna Gold | `hanna.gold` | `hanna123` | MINISTRY | — |
| Sarah Levy | `sarah.levy` | `sarah123` | APPRAISER | — |
| Yosef Avital | `yosef.avital` | `yosef123` | APPRAISER | — |
| Moshe Ben | `moshe.ben` | `moshe123` | MUNICIPALITY | Jerusalem |
| Rachel Shapira | `rachel.shapira` | `rachel123` | MUNICIPALITY | Tel Aviv |
| Yaakov Katz | `yaakov.katz` | `yaakov123` | MUNICIPALITY | Tiberias |

---

## API Reference

### Authentication & Users
```
POST   /auth/login              # Login with username + password
GET    /users                   # List all users (with passwords for reference)
```

### Buildings & Reports
```
GET    /reports                 # List buildings (filtered by role/settlement)
POST   /reports                 # Create new damage report
GET    /reports/:id             # Get building details
PATCH  /reports/:id/status      # Update building status
PATCH  /reports/:id/budget-request  # Open budget request (MINISTRY only)
```

### Appraisals & Approvals
```
PATCH  /reports/:id/appraisal           # Update damage assessment
PATCH  /reports/:id/permit-approval     # Update local authority approval
```

### Re-Occupation Files
```
POST   /buildings/:id/return-home-package          # Generate single PDF
POST   /buildings/batch-return-home-packages       # Batch generate for settlement
```

### Notifications
```
POST   /notifications/send            # Send notification
GET    /notifications                 # List all sent notifications
GET    /notifications/status          # Get current notification mode
POST   /notifications/status          # Set notification mode
```

### Settlement Processes & Logs
```
GET    /settlement-processes          # List all settlement processes
GET    /settlement-processes/:id      # Get specific process
GET    /process-logs                  # Get all process log entries
```

### System Health
```
GET    /system-health                 # System metrics (processes, notifications, performance)
```

### Action History
```
GET    /actions                       # List all actions
GET    /buildings/:id/actions         # Actions for specific building
```

---

## Logs & Monitoring

### Log Files

| File | Format | Purpose |
|------|--------|---------|
| `data/processLogs.json` | JSON-lines | Structured process events (settlement + building level) |
| `data/notifications.csv` | CSV | Notification audit trail (sent/failed + idempotency key) |
| `data/actions.json` | JSON | User action audit trail |

### Process Log Structure

Each line in `processLogs.json`:
```json
{
  "timestamp": "2026-07-23T18:30:00.000Z",
  "level": "INFO",
  "event": "BUILDING_PDF_START",
  "processId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "settlement": "Jerusalem",
  "buildingId": 1,
  "attempt": null,
  "error": null
}
```

### Viewing Logs

**In the UI:** Navigate to **Settlement Processes** → click **View Logs** next to any process.

**From the command line:**
```bash
# View all logs
node -e "require('fs').readFileSync('data/processLogs.json','utf8').trim().split('\n').forEach(l => console.log(JSON.stringify(JSON.parse(l),null,2)))"

# Filter by processId
node -e "const pid='YOUR-PROCESS-UUID'; require('fs').readFileSync('data/processLogs.json','utf8').trim().split('\n').map(l=>JSON.parse(l)).filter(e=>e.processId===pid).forEach(e=>console.log(JSON.stringify(e)))"

# View notification history
cat data/notifications.csv
```

### System Health

Access the **System Health** screen from the main toolbar for a live snapshot:
- Settlement Processes: Completed / Processing
- Notifications: Successful / Failed / Retry Count
- Performance: Average Settlement Duration

---

## Status Flow

```
WAITING_FOR_VALIDATION
        │
        ▼
       NEW
        │
        ▼
    IN_REVIEW
        │
        ▼
Building in the process of restoration
        │
        ▼
Restoration process completed
```

---

## License

Internal project — Ministry of Construction and Housing.
