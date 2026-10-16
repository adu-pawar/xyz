import mongoose from 'mongoose';
import { connectDB, closeDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { TestCase } from '../models/TestCase.js';
import { TestRun } from '../models/TestRun.js';
import { TestResult } from '../models/TestResult.js';
import { Bug } from '../models/Bug.js';
import { Report } from '../models/Report.js';

export const seedDatabase = async ({ connect = true } = {}) => {
  console.log('[Seed] Starting database seed process...');
  if (connect) await connectDB();

  // Clean existing collections
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    TestCase.deleteMany({}),
    TestRun.deleteMany({}),
    TestResult.deleteMany({}),
    Bug.deleteMany({}),
    Report.deleteMany({}),
  ]);

  // 1. Create Default Demo Engineer
  const passwordHash = await User.hashPassword('Password123!');
  const demoUser = await User.create({
    name: 'Sarah Connor',
    email: 'engineer@bugslayer.io',
    passwordHash,
    role: 'engineer',
    preferences: {
      theme: 'dark',
      defaultBrowser: 'chromium',
      defaultTimeoutMs: 30000,
    },
  });

  console.log(`[Seed] Created demo user: ${demoUser.email} (Password: Password123!)`);

  // 2. Create Demo Project
  const project = await Project.create({
    ownerId: demoUser._id,
    name: 'E-Commerce Core & Auth Portal',
    description: 'Production web application handling enterprise payments, checkout flows, and customer authentication.',
    authorizedTargetOrigins: ['http://localhost:5000', 'https://example.com'],
    environments: [
      { name: 'Sandbox Target', url: 'http://localhost:5000/demo-app', isDefault: true },
      { name: 'Production', url: 'https://example.com', isDefault: false },
    ],
    status: 'active',
  });

  console.log(`[Seed] Created demo project: ${project.name}`);

  // 3. Create Sample Test Cases
  const case1 = await TestCase.create({
    projectId: project._id,
    ownerId: demoUser._id,
    title: 'Customer Authentication Flow',
    description: 'Verifies successful login with valid customer credentials and redirection to target dashboard.',
    testType: 'security_auth',
    riskLevel: 'high',
    generationSource: 'ai_generated',
    preconditions: ['Sandbox target server is running', 'Test customer registered'],
    steps: [
      { stepNumber: 1, action: 'navigate', target: 'http://localhost:5000/demo-app', value: 'http://localhost:5000/demo-app', expectedOutcome: 'Page loads' },
      { stepNumber: 2, action: 'assert_visible', target: '#email', expectedOutcome: 'Email input visible' },
      { stepNumber: 3, action: 'fill', target: '#email', value: 'qa_verified@bugslayer.io', expectedOutcome: 'Email field populated' },
      { stepNumber: 4, action: 'fill', target: '#password', value: 'ValidPass123!', expectedOutcome: 'Password field populated' },
      { stepNumber: 5, action: 'click', target: '#submitBtn', expectedOutcome: 'Submit button clicked' },
      { stepNumber: 6, action: 'wait', value: '1000', expectedOutcome: 'Wait for response' },
      { stepNumber: 7, action: 'assert_url', value: '/dashboard', expectedOutcome: 'Redirected to dashboard' },
    ],
    expectedResults: ['Customer session created', 'URL redirected to dashboard'],
  });

  const case2 = await TestCase.create({
    projectId: project._id,
    ownerId: demoUser._id,
    title: 'Checkout Promo Code Discount Validation',
    description: 'Tests checkout coupon application and cart summary price reduction assertion.',
    testType: 'functional',
    riskLevel: 'critical',
    generationSource: 'ai_generated',
    preconditions: ['Cart contains item'],
    steps: [
      { stepNumber: 1, action: 'navigate', target: 'http://localhost:5000/demo-app', value: 'http://localhost:5000/demo-app', expectedOutcome: 'Target loads' },
      { stepNumber: 2, action: 'assert_visible', target: '#promo-code-input', expectedOutcome: 'Promo input displayed' },
      { stepNumber: 3, action: 'click', target: '#apply-coupon-btn', expectedOutcome: 'Coupon applied' },
    ],
    expectedResults: ['Total reflects 20% discount'],
  });

  console.log('[Seed] Created sample test cases');

  // 4. Create Historical Run & Results
  const run1 = await TestRun.create({
    projectId: project._id,
    ownerId: demoUser._id,
    testCaseIds: [case1._id, case2._id],
    targetEnvironment: { name: 'Sandbox Target', url: 'http://localhost:5000/demo-app' },
    status: 'failed',
    browser: 'chromium',
    startedAt: new Date(Date.now() - 3600000),
    completedAt: new Date(Date.now() - 3570000),
    durationMs: 30000,
    summary: {
      totalTests: 2,
      passedTests: 1,
      failedTests: 1,
      blockedTests: 0,
    },
    errorSummary: '1 of 2 tests failed during execution.',
  });

  const result1 = await TestResult.create({
    runId: run1._id,
    testCaseId: case1._id,
    status: 'passed',
    executedSteps: [
      { stepNumber: 1, action: 'navigate', target: 'http://localhost:5000/demo-app', status: 'passed', durationMs: 400 },
      { stepNumber: 2, action: 'assert_visible', target: '#email', status: 'passed', durationMs: 50 },
      { stepNumber: 3, action: 'fill', target: '#email', value: 'qa_verified@bugslayer.io', status: 'passed', durationMs: 60 },
      { stepNumber: 4, action: 'fill', target: '#password', value: 'ValidPass123!', status: 'passed', durationMs: 60 },
      { stepNumber: 5, action: 'click', target: '#submitBtn', status: 'passed', durationMs: 120 },
      { stepNumber: 6, action: 'wait', value: '1000', status: 'passed', durationMs: 1000 },
      { stepNumber: 7, action: 'assert_url', value: '/dashboard', status: 'passed', durationMs: 40 },
    ],
    assertions: [
      { description: 'Email input visible', passed: true, expected: 'visible', actual: 'matched' },
      { description: 'Redirected to dashboard', passed: true, expected: '/dashboard', actual: 'matched' },
    ],
    durationMs: 1730,
  });

  const result2 = await TestResult.create({
    runId: run1._id,
    testCaseId: case2._id,
    status: 'failed',
    executedSteps: [
      { stepNumber: 1, action: 'navigate', target: 'http://localhost:5000/demo-app', status: 'passed', durationMs: 350 },
      { stepNumber: 2, action: 'assert_visible', target: '#promo-code-input', status: 'failed', durationMs: 5000, error: 'Timeout 5000ms exceeded waiting for locator("#promo-code-input")' },
    ],
    assertions: [
      { description: 'Promo input displayed', passed: false, expected: 'visible', actual: 'Timeout exceeded' },
    ],
    errorDetails: {
      message: 'Timeout 5000ms exceeded waiting for locator("#promo-code-input")',
      stack: 'Error: Timeout 5000ms exceeded at Page.waitForSelector',
      failingLocator: '#promo-code-input',
    },
    durationMs: 5350,
  });

  // 5. Create Sample Detected Bug with AI Investigation
  const sampleBug = await Bug.create({
    projectId: project._id,
    runId: run1._id,
    testCaseId: case2._id,
    testResultId: result2._id,
    ownerId: demoUser._id,
    title: "Failure in 'Checkout Promo Code Discount Validation': Element '#promo-code-input' not found",
    description: "Automated test failed waiting for promo code input. Locator: #promo-code-input\nError: Timeout 5000ms exceeded waiting for locator('#promo-code-input')",
    severity: 'critical',
    status: 'open',
    evidenceReferences: {
      screenshots: [],
      consoleLogs: [{ type: 'error', text: 'Uncaught ReferenceError: checkoutState is not defined' }],
      stackTrace: 'Error: Timeout 5000ms exceeded at Page.waitForSelector',
      networkLogs: [{ url: 'http://localhost:5000/api/promotions', status: 500, method: 'GET', errorText: 'Internal Server Error' }],
      failedLocator: '#promo-code-input',
      failedUrl: 'http://localhost:5000/demo-app',
    },
    aiInvestigation: {
      probableCause: 'The promotions microservice threw a 500 internal server error preventing the checkout module from rendering the promo input container.',
      supportingEvidence: [
        'Network error: GET /api/promotions returned HTTP 500',
        "Console log: 'checkoutState is not defined'",
        'Element #promo-code-input was never mounted in the DOM',
      ],
      confidenceLevel: 'high',
      recommendedNextSteps: [
        'Check promotions backend service logs for unhandled exception on GET /api/promotions',
        'Add fallback error boundary to checkout cart so input remains visible or displays graceful message',
      ],
      analyzedAt: new Date(),
    },
    notes: [
      {
        authorId: demoUser._id,
        authorName: demoUser.name,
        text: 'Confirmed this occurs when promotional campaigns are disabled in staging.',
        createdAt: new Date(),
      },
    ],
  });

  console.log(`[Seed] Created sample bug: ${sampleBug.title}`);
  console.log('[Seed] Database successfully seeded with demo data!');

  if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
    await closeDB();
    process.exit(0);
  }
};

// Run directly if invoked as script
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase().catch((err) => {
    console.error('Seed script error:', err);
    process.exit(1);
  });
}
