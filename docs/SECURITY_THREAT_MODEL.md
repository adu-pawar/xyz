# BugSlayer Security Threat Model & Hardening Specification

## 1. Threat Model & Asset Valuation

BugSlayer operates automated browser workers that execute dynamic interactions against target web applications. Because browser automation can potentially be abused for denial of service, internal network scanning, or unauthorized probing, BugSlayer enforces a **Zero-Trust Security Architecture**.

### Key Assets:
1. **User Credentials & JWT Tokens**: Guarded against interception and Cross-Site Scripting (XSS).
2. **Target Application Infrastructure**: Protected against unauthorized test floods, destructive actions, and non-authorized probing.
3. **Internal Host Network & Cloud Metadata**: Guarded against Server-Side Request Forgery (SSRF) and DNS rebinding.
4. **Captured Test Evidence**: Scoped strictly to the owning user/organization.

---

## 2. Attack Vectors & Mitigations

| Threat Vector | Severity | BugSlayer Hardening Mitigation |
| :--- | :--- | :--- |
| **Server-Side Request Forgery (SSRF)** | Critical | Target URL is checked against an IP allowlist before browser navigation. Private IP blocks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.169.254`, `::1`) are strictly rejected. Only explicit HTTP/HTTPS allowed. |
| **Unauthorized Target Testing** | High | Every test execution requires explicit user authorization confirmation (`authorizedConfirmed: true`) and verification that the destination origin matches the project's authorized target origins allowlist. |
| **Cross-User Data Exposure (BOLA/IDOR)** | Critical | Every database query on Projects, Tests, Runs, Bugs, and Reports enforces `{ ownerId: req.userId }`. Attempting to access another tenant's asset returns `404 Not Found` without disclosing resource existence. |
| **Token Theft & Session Hijacking** | High | Authentication tokens are transmitted exclusively inside secure HTTP-only cookies (`httpOnly: true`, `sameSite: 'lax'`, `secure: production`). Tokens are never stored in localStorage or exposed to JavaScript. |
| **Credential Stuffing & DoS** | Medium | Rate limiters applied to authentication endpoints (`authLimiter`: 30 attempts per 15 min) and expensive test execution workers (`executionLimiter`: 10 runs per minute per IP). |
| **Sandbox & Worker Escape** | Critical | Playwright Chromium workers run in isolated browser contexts with restricted privileges, disabling setuid sandboxes and binding headless execution. Each test case runs in a clean, disposable context. |
| **Password Enumeration** | Low | Forgot-password endpoint returns an identical generic response whether an account exists or not, preventing email enumeration. |

---

## 3. Security Verification Checklist

- [x] Passwords hashed with bcrypt (salt rounds: 10)
- [x] JWT sessions issued in HTTP-only, secure, SameSite cookies
- [x] Rate limiting active on `/api/v1/auth/*` and `/api/v1/projects/:id/runs`
- [x] Helmet security headers active (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`)
- [x] SSRF guard with IPv4 & IPv6 private range validation
- [x] Strict Zod input validation on all mutation endpoints
- [x] Multi-tenant isolation verified by automated unit tests
- [x] Expired password reset tokens pruned automatically via MongoDB TTL index
- [x] Zero plaintext secret logging
