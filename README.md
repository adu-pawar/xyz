# BugSlayer — Autonomous AI QA Engineer

BugSlayer is a production-oriented, full-stack enterprise web application for autonomous software testing. It accepts an authorized website URL, analyzes pages, generates structured test cases from natural-language objectives, executes browser tests automatically via Playwright, detects and investigates failures with AI root-cause analysis, captures screenshots and logs, and produces downloadable PDF, CSV, and JSON audit reports.

---

## Key Highlights

- **Autonomous Browser Automation**: Playwright-powered Chromium workers execute real browser navigation, element interaction, form submissions, and assertions with automatic screenshot capture and network error tracking.
- **Natural Language Test Synthesis**: Enter plain English objectives like *"Test the login page with valid credentials, invalid credentials, and empty fields"*; BugSlayer translates them into executable Playwright step definitions using Gemini / LLM or deterministic rule-based engines.
- **AI Root Cause Failure Analysis**: When tests fail, BugSlayer compiles assertions, console logs, and screenshots, determining probable causes, confidence ratings, and recommended remediation steps.
- **Real-Time Live Runner**: Monitor running tests with live SSE telemetry, active step status, locator execution times, and cancellation support.
- **Defect Explorer & Collaboration**: Triage defects with status tracking (Open, Investigating, Resolved, Ignored), engineering notes, and AI analysis feedback.
- **Multi-Tenant Security Architecture**: Zero-Trust design with SSRF protection against private IP ranges, DNS revalidation, rate limiting, and per-user MongoDB isolation.
- **Zero-Friction Local Database**: Automatically connects to external MongoDB (`MONGODB_URI`), with an embedded isolated MongoDB fallback that runs seamlessly without manual installation.
- **Built-in Target Sandbox**: Includes an integrated target demo web app at `/demo-app` so you can test login and forms out of the box with zero external dependencies.

---

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6, Axios, Recharts, Lucide React, Zod.
- **Backend**: Node.js (ES Modules), Express.js, MongoDB with Mongoose, JWT in secure HTTP-only cookies, bcrypt, Playwright, PDFKit, Zod.
- **Testing**: Vitest, Supertest.

---

## Monorepo Directory Structure

```
project/
├── client/                      # Frontend Application (React + Vite)
│   ├── src/
│   │   ├── api/                 # Axios API clients
│   │   ├── components/          # Reusable UI & Layout components
│   │   ├── contexts/            # AuthContext & ThemeContext
│   │   ├── layouts/             # AppLayout & AuthLayout
│   │   └── pages/               # Dashboard, Projects, Runner, Bugs, etc.
│   ├── package.json
│   └── vite.config.js           # Dev server with proxy to backend
├── server/                      # Backend API & Workers (Express + MongoDB)
│   ├── src/
│   │   ├── config/              # Environment & Database connectors
│   │   ├── controllers/         # REST API Controllers
│   │   ├── middleware/          # Auth, RateLimiting, Error Handling
│   │   ├── models/              # Mongoose schemas & indexes
│   │   ├── routes/              # Express API Routes
│   │   ├── services/            # AI Synthesis & PDF/CSV Export
│   │   ├── workers/             # Playwright browser runner & SSRF guard
│   │   ├── scripts/             # Database seed script
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/                   # Backend unit and integration test suites
│   ├── vitest.config.js
│   └── package.json
├── docs/                        # API & Security Specifications
│   ├── API_DOCUMENTATION.md
│   └── SECURITY_THREAT_MODEL.md
├── .env.example
├── README.md
└── package.json                 # Monorepo workspaces coordinator
```

---

## Quickstart & Installation

### 1. Prerequisites
- Node.js v18+ (tested on Node v20/v24)
- npm v9+

### 2. Install All Dependencies
Run from the root directory:
```bash
npm install
```
This automatically installs dependencies across both `client` and `server` workspaces.

### 3. Install Playwright Chromium Browser
```bash
npx playwright install chromium --workspace=server
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Default settings run immediately out of the box with embedded MongoDB and sandbox testing enabled!)*

---

## Running the Application

### Option A: Run Both Client & Server Concurrently (Recommended)
From the root directory:
```bash
npm run dev
```
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **Target Sandbox**: `http://localhost:5000/demo-app`

### Option B: Run Independently
```bash
# Terminal 1 - Start Server
npm run dev:server

# Terminal 2 - Start Frontend
npm run dev:client
```

---

## Seed Demo Data

To populate the database with a pre-configured demo user, project, test suites, and sample defect investigations:
```bash
npm run seed
```
**Demo Account Credentials:**
- **Email**: `engineer@bugslayer.io`
- **Password**: `Password123!`

*(You can also use the "Fill Demo Credentials" button on the `/login` page for 1-click access!)*

---

## Automated Testing

Run the full automated test suite (Authentication, Multi-Tenant Isolation, SSRF Guard, AI Fallback):
```bash
npm test
```

Build production bundle:
```bash
npm run build
```

---

## BugSlayer Autonomous Workflow Guide

1. **Register or Log in** with your engineer account.
2. **Projects Tab**: Create a project and authorize your target URL (e.g. `http://localhost:5000/demo-app` or your public staging environment).
3. **New Test**:
   - Enter your natural language testing objective.
   - Click **Generate Test Suite with AI**.
   - Preview and approve generated steps.
   - Check the **Target Authorization** confirmation box.
   - Click **Start Browser Execution**.
4. **Live Runner**: Watch the Playwright worker navigate the target, perform assertions, and stream step logs in real time.
5. **Inspect Defect**: If a test fails, review the captured screenshot, console logs, and AI root cause hypothesis in the **Bug Explorer**.
6. **Reports**: Download real PDF, CSV, and JSON audit reports for compliance and engineering reviews.
