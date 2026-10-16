import { Router } from 'express';

const router = Router();

// Built-in sandbox target app for live automated testing
router.get('/demo-app', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>BugSlayer Test Target Sandbox</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f4f6f8; color: #1e293b; padding: 40px; }
    .card { background: white; max-width: 500px; margin: 0 auto; padding: 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    h1 { margin-top: 0; color: #17271F; }
    label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; }
    input { width: 100%; box-sizing: border-box; padding: 10px 14px; margin-bottom: 18px; border: 1px solid #cbd5e1; border-radius: 6px; }
    button { width: 100%; background: #244B3C; color: white; padding: 12px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
    button:hover { background: #1B382D; }
    .alert { padding: 12px; border-radius: 6px; margin-bottom: 18px; display: none; }
    .alert-error { background: #fee2e2; color: #991b1b; }
    .alert-success { background: #dcfce7; color: #166534; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Sign In to Target Portal</h1>
    <p>Authorized sandbox target for BugSlayer automated test execution.</p>
    <div id="alertBox" class="alert"></div>
    <form id="loginForm" onsubmit="handleLogin(event)">
      <label for="email">Work Email</label>
      <input type="email" id="email" name="email" placeholder="name@company.com" required />
      <label for="password">Password</label>
      <input type="password" id="password" name="password" placeholder="••••••••" required />
      <button type="submit" id="submitBtn">Sign In</button>
    </form>
  </div>
  <script>
    function handleLogin(e) {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const alert = document.getElementById('alertBox');
      
      if (['qa_verified@bugslayer.io', 'qa_verified@veriqa.io'].includes(email) && password === 'ValidPass123!') {
        alert.className = 'alert alert-success';
        alert.innerText = 'Authentication successful! Redirecting...';
        alert.style.display = 'block';
        setTimeout(() => {
          window.location.href = '/demo-app/dashboard';
        }, 500);
      } else {
        alert.className = 'alert alert-error';
        alert.innerText = 'Invalid credentials. Access denied.';
        alert.style.display = 'block';
      }
    }
  </script>
</body>
</html>`);
});

router.get('/demo-app/dashboard', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Target Sandbox Dashboard</title>
  <style>
    body { font-family: system-ui; background: #f8fafc; padding: 40px; }
    .card { background: white; max-width: 600px; margin: 0 auto; padding: 32px; border-radius: 12px; }
    h1 { color: #244B3C; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Welcome to Dashboard</h1>
    <p>Authentication flow verification successful. Target portal active.</p>
  </div>
</body>
</html>`);
});

export default router;
