# BugSlayer API Specification (v1)

Base API Prefix: `/api/v1`

## Authentication & Authorization

All authenticated endpoints require either:
- An HTTP-only session cookie set upon login/registration.
- Or an `Authorization: Bearer <token>` HTTP header.

---

### Authentication Routes

#### 1. Register User
- **Method**: `POST`
- **Route**: `/api/v1/auth/register`
- **Body**:
  ```json
  {
    "name": "Sarah Connor",
    "email": "engineer@bugslayer.io",
    "password": "Password123!"
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "success": true,
    "message": "Registration successful",
    "data": {
      "user": {
        "id": "67...a1",
        "name": "Sarah Connor",
        "email": "engineer@bugslayer.io",
        "role": "engineer",
        "preferences": { "theme": "dark", "defaultBrowser": "chromium" }
      }
    }
  }
  ```

#### 2. Login User
- **Method**: `POST`
- **Route**: `/api/v1/auth/login`
- **Body**:
  ```json
  {
    "email": "engineer@bugslayer.io",
    "password": "Password123!"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": { "user": { ... } }
  }
  ```

#### 3. Current Authenticated User
- **Method**: `GET`
- **Route**: `/api/v1/auth/me`
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "data": { "user": { ... } }
  }
  ```

#### 4. Forgot Password
- **Method**: `POST`
- **Route**: `/api/v1/auth/forgot-password`
- **Body**: `{ "email": "engineer@bugslayer.io" }`
- **Response** (200 OK): Generic message protecting against user enumeration.

#### 5. Reset Password
- **Method**: `POST`
- **Route**: `/api/v1/auth/reset-password`
- **Body**: `{ "token": "...", "password": "NewPassword123!" }`
- **Response** (200 OK)

---

### Project Routes

#### 1. List Projects
- **Method**: `GET`
- **Route**: `/api/v1/projects?search=&status=active&page=1&limit=20`
- **Response** (200 OK): Paginated list of owned projects with latest run status.

#### 2. Create Project
- **Method**: `POST`
- **Route**: `/api/v1/projects`
- **Body**:
  ```json
  {
    "name": "Core E-Commerce",
    "description": "Storefront portal",
    "authorizedTargetOrigins": ["https://example.com"],
    "environments": [
      { "name": "Production", "url": "https://example.com", "isDefault": true }
    ]
  }
  ```

#### 3. Get Project Details
- **Method**: `GET`
- **Route**: `/api/v1/projects/:id`

#### 4. Update Project
- **Method**: `PATCH`
- **Route**: `/api/v1/projects/:id`

#### 5. Delete Project
- **Method**: `DELETE`
- **Route**: `/api/v1/projects/:id`

---

### Test Case Routes

#### 1. List Project Test Cases
- **Method**: `GET`
- **Route**: `/api/v1/projects/:id/tests?testType=all`

#### 2. Create Test Case
- **Method**: `POST`
- **Route**: `/api/v1/tests`
- **Body**:
  ```json
  {
    "projectId": "...",
    "title": "Valid Login Assertion",
    "description": "Checks email & password submission",
    "testType": "security_auth",
    "riskLevel": "high",
    "steps": [
      { "stepNumber": 1, "action": "navigate", "target": "https://example.com/login" },
      { "stepNumber": 2, "action": "fill", "target": "input[type='email']", "value": "qa@example.com" },
      { "stepNumber": 3, "action": "click", "target": "button[type='submit']" }
    ],
    "expectedResults": ["Redirects to dashboard"]
  }
  ```

#### 3. AI Test Generation
- **Method**: `POST`
- **Route**: `/api/v1/tests/generate`
- **Body**:
  ```json
  {
    "projectId": "...",
    "targetUrl": "https://example.com/login",
    "objective": "Test the login page with valid and invalid credentials",
    "testType": "security_auth",
    "numCases": 3
  }
  ```

---

### Execution & Live Runner Routes

#### 1. Trigger Test Run
- **Method**: `POST`
- **Route**: `/api/v1/projects/:id/runs`
- **Body**:
  ```json
  {
    "targetUrl": "https://example.com",
    "testCaseIds": ["..."],
    "authorizedConfirmed": true,
    "browser": "chromium",
    "timeoutMs": 30000
  }
  ```

#### 2. Get Run Details
- **Method**: `GET`
- **Route**: `/api/v1/runs/:id`

#### 3. Live SSE Execution Stream
- **Method**: `GET`
- **Route**: `/api/v1/runs/:id/events`
- **Headers**: `Accept: text/event-stream`
- **Events**:
  - `run_status`: State transitions (`queued`, `running`, `passed`, `failed`, `cancelled`)
  - `step_executing`: Real-time step and action telemetry
  - `step_completed`: Pass/fail status of step with duration
  - `test_completed`: Test case completion and screenshot notification

#### 4. Cancel Running Test
- **Method**: `POST`
- **Route**: `/api/v1/runs/:id/cancel`

#### 5. Rerun Suite
- **Method**: `POST`
- **Route**: `/api/v1/runs/:id/rerun`

---

### Bug & Report Routes

#### 1. List Bugs
- **Method**: `GET`
- **Route**: `/api/v1/bugs?severity=all&status=open`

#### 2. Update Bug Status / Feedback
- **Method**: `PATCH`
- **Route**: `/api/v1/bugs/:id`
- **Body**: `{ "status": "resolved", "userFeedback": "useful" }`

#### 3. Add Investigation Note
- **Method**: `POST`
- **Route**: `/api/v1/bugs/:id/notes`
- **Body**: `{ "text": "Confirmed fixed in hotfix release 2.1" }`

#### 4. Trigger AI Re-Investigation
- **Method**: `POST`
- **Route**: `/api/v1/bugs/:id/investigate`

#### 5. Download Report
- **Method**: `GET`
- **Route**: `/api/v1/reports/:id/download`
- **Formats**: PDF, CSV, JSON
