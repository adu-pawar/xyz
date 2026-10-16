import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { TestRun } from '../models/TestRun.js';
import { TestResult } from '../models/TestResult.js';
import { TestCase } from '../models/TestCase.js';
import { Bug } from '../models/Bug.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { analyzeFailureWithAI } from '../services/ai.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure screenshot evidence directory exists
const SCREENSHOTS_DIR = path.resolve(env.EVIDENCE_STORAGE_PATH, 'screenshots');
await fs.mkdir(SCREENSHOTS_DIR, { recursive: true }).catch(() => {});

// Active running executions map for cancellation and SSE stream broadcasting
const activeRuns = new Map();
const runEventListeners = new Map();

/**
 * Register an SSE listener for live test runner updates
 */
export const subscribeToRunEvents = (runId, res) => {
  if (!runEventListeners.has(runId)) {
    runEventListeners.set(runId, new Set());
  }
  const listeners = runEventListeners.get(runId);
  listeners.add(res);

  res.on('close', () => {
    listeners.delete(res);
    if (listeners.size === 0) {
      runEventListeners.delete(runId);
    }
  });
};

/**
 * Emit event to all subscribers of a run
 */
export const emitRunEvent = (runId, eventType, data) => {
  const listeners = runEventListeners.get(runId);
  if (!listeners || listeners.size === 0) return;

  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of listeners) {
    try {
      client.write(payload);
    } catch {
      // Ignore closed socket write errors
    }
  }
};

/**
 * Cancel an ongoing run
 */
export const cancelRun = async (runId) => {
  const active = activeRuns.get(runId);
  if (!active) {
    return false;
  }

  active.isCancelled = true;
  if (active.browserContext) {
    await active.browserContext.close().catch(() => {});
  }
  if (active.browser) {
    await active.browser.close().catch(() => {});
  }

  await TestRun.findByIdAndUpdate(runId, {
    status: 'cancelled',
    completedAt: new Date(),
    errorSummary: 'Run was cancelled by user.',
  });

  emitRunEvent(runId, 'run_status', {
    status: 'cancelled',
    message: 'Test execution cancelled by user.',
  });

  activeRuns.delete(runId);
  return true;
};

/**
 * Execute a test step inside Playwright page
 */
const executeStep = async (page, step, timeoutMs) => {
  const stepStart = Date.now();
  const { action, target, value } = step;

  try {
    switch (action) {
      case 'navigate': {
        const dest = target || value;
        await page.goto(dest, { waitUntil: 'load', timeout: timeoutMs });
        break;
      }
      case 'click': {
        await page.locator(target).first().click({ timeout: timeoutMs });
        break;
      }
      case 'fill': {
        await page.locator(target).first().fill(value || '', { timeout: timeoutMs });
        break;
      }
      case 'select': {
        await page.locator(target).first().selectOption(value, { timeout: timeoutMs });
        break;
      }
      case 'hover': {
        await page.locator(target).first().hover({ timeout: timeoutMs });
        break;
      }
      case 'assert_text': {
        const locator = page.locator(target).first();
        await locator.waitFor({ state: 'visible', timeout: timeoutMs });
        const text = await locator.innerText();
        if (!text.includes(value)) {
          throw new Error(`Expected text '${value}' not found in target '${target}'. Found: '${text.slice(0, 100)}'`);
        }
        break;
      }
      case 'assert_visible': {
        const locator = page.locator(target).first();
        await locator.waitFor({ state: 'visible', timeout: timeoutMs });
        break;
      }
      case 'assert_url': {
        const currentUrl = page.url();
        if (!currentUrl.includes(value)) {
          throw new Error(`Expected URL to contain '${value}', but current URL is '${currentUrl}'`);
        }
        break;
      }
      case 'wait': {
        const duration = parseInt(value, 10) || 1000;
        await page.waitForTimeout(Math.min(duration, 10000));
        break;
      }
      default:
        throw new Error(`Unsupported step action '${action}'`);
    }

    return {
      status: 'passed',
      durationMs: Date.now() - stepStart,
    };
  } catch (err) {
    return {
      status: 'failed',
      durationMs: Date.now() - stepStart,
      error: err.message,
    };
  }
};

/**
 * Main worker loop for executing a full TestRun
 */
export const executeTestRun = async (runId) => {
  const run = await TestRun.findById(runId);
  if (!run) return;

  const testCases = await TestCase.find({ _id: { $in: run.testCaseIds } });
  if (!testCases || testCases.length === 0) {
    run.status = 'failed';
    run.errorSummary = 'No test cases associated with this run.';
    await run.save();
    return;
  }

  // Update status to RUNNING
  run.status = 'running';
  run.startedAt = new Date();
  await run.save();

  emitRunEvent(runId, 'run_status', {
    status: 'running',
    startedAt: run.startedAt,
    totalTests: testCases.length,
  });

  const active = {
    isCancelled: false,
    browser: null,
    browserContext: null,
  };
  activeRuns.set(runId, active);

  let passedCount = 0;
  let failedCount = 0;
  let blockedCount = 0;

  try {
    // Launch Chromium in isolated headless mode
    active.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const runStartTime = Date.now();

    for (const testCase of testCases) {
      if (active.isCancelled) break;

      emitRunEvent(runId, 'test_started', {
        testCaseId: testCase._id,
        title: testCase.title,
      });

      // Create new isolated context per test case
      active.browserContext = await active.browser.newContext({
        viewport: run.viewport || { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        userAgent: 'BugSlayer-Automated-QA-Bot/1.0',
      });

      const page = await active.browserContext.newPage();
      const consoleErrors = [];
      const networkFailures = [];

      // Collect console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push({
            type: 'error',
            text: msg.text(),
            timestamp: new Date(),
          });
        }
      });

      // Collect network failures (4xx, 5xx, or failed responses)
      page.on('response', (response) => {
        if (response.status() >= 400) {
          networkFailures.push({
            url: response.url(),
            status: response.status(),
            method: response.request().method(),
            errorText: response.statusText(),
          });
        }
      });

      const executedSteps = [];
      const assertions = [];
      let testStatus = 'passed';
      let errorDetails = { message: '', stack: '', failingLocator: '' };
      const screenshotRefs = [];
      const caseStartTime = Date.now();

      // Navigate to initial target URL if the first step is not a navigate action
      try {
        if (testCase.steps.length > 0 && testCase.steps[0].action !== 'navigate') {
          await page.goto(run.targetEnvironment.url, {
            waitUntil: 'load',
            timeout: run.timeoutMs || 30000,
          });
        }
      } catch (navErr) {
        testStatus = 'failed';
        errorDetails = {
          message: `Failed initial page load: ${navErr.message}`,
          stack: navErr.stack || '',
          failingLocator: run.targetEnvironment.url,
        };
      }

      // Execute each step sequentially if initial load succeeded
      if (testStatus === 'passed') {
        for (const step of testCase.steps) {
          if (active.isCancelled) {
            testStatus = 'cancelled';
            break;
          }

          emitRunEvent(runId, 'step_executing', {
            testCaseId: testCase._id,
            stepNumber: step.stepNumber,
            action: step.action,
            target: step.target,
          });

          const stepResult = await executeStep(page, step, run.timeoutMs || 30000);

          executedSteps.push({
            stepNumber: step.stepNumber,
            action: step.action,
            target: step.target,
            value: step.value,
            status: stepResult.status,
            durationMs: stepResult.durationMs,
            error: stepResult.error || '',
          });

          if (step.action.startsWith('assert_')) {
            assertions.push({
              description: step.expectedOutcome || `${step.action} on ${step.target}`,
              passed: stepResult.status === 'passed',
              expected: step.value || 'visible',
              actual: stepResult.status === 'passed' ? 'matched' : (stepResult.error || 'failed'),
            });
          }

          emitRunEvent(runId, 'step_completed', {
            testCaseId: testCase._id,
            stepNumber: step.stepNumber,
            status: stepResult.status,
            error: stepResult.error,
          });

          if (stepResult.status === 'failed') {
            testStatus = 'failed';
            errorDetails = {
              message: stepResult.error,
              stack: '',
              failingLocator: step.target || step.value || '',
            };
            break; // Stop remaining steps on first failure
          }
        }
      }

      // Capture screenshot if failed or upon completion
      try {
        const screenshotFileName = `run_${runId}_case_${testCase._id}_${Date.now()}.png`;
        const screenshotFullPath = path.join(SCREENSHOTS_DIR, screenshotFileName);
        await page.screenshot({ path: screenshotFullPath, fullPage: false });
        screenshotRefs.push(`/evidence/screenshots/${screenshotFileName}`);
      } catch (ssErr) {
        logger.warn(`Could not capture screenshot for test case ${testCase._id}: ${ssErr.message}`);
      }

      // Persist TestResult to MongoDB
      const testResult = await TestResult.create({
        runId: run._id,
        testCaseId: testCase._id,
        status: testStatus,
        executedSteps,
        assertions,
        errorDetails,
        screenshotReferences: screenshotRefs,
        consoleErrors: consoleErrors.slice(0, 50),
        networkFailures: networkFailures.slice(0, 50),
        durationMs: Date.now() - caseStartTime,
      });

      if (testStatus === 'passed') {
        passedCount++;
      } else if (testStatus === 'failed') {
        failedCount++;

        // Trigger AI Failure Investigation and Create Bug Record!
        try {
          const aiInvestigation = await analyzeFailureWithAI({
            testTitle: testCase.title,
            errorMessage: errorDetails.message,
            failingLocator: errorDetails.failingLocator,
            targetUrl: run.targetEnvironment.url,
            consoleErrors,
            networkFailures,
          });

          await Bug.create({
            projectId: run.projectId,
            runId: run._id,
            testCaseId: testCase._id,
            testResultId: testResult._id,
            ownerId: run.ownerId,
            title: `Failure in '${testCase.title}': ${errorDetails.message.slice(0, 100)}`,
            description: `Automated test failed during execution step. Locator: ${errorDetails.failingLocator || 'N/A'}\n\nError: ${errorDetails.message}`,
            severity: testCase.riskLevel === 'critical' ? 'critical' : 'high',
            status: 'open',
            evidenceReferences: {
              screenshots: screenshotRefs,
              consoleLogs: consoleErrors,
              stackTrace: errorDetails.stack,
              networkLogs: networkFailures,
              failedLocator: errorDetails.failingLocator,
              failedUrl: run.targetEnvironment.url,
            },
            aiInvestigation,
          });
        } catch (bugErr) {
          logger.error(`Failed to create bug record for test failure: ${bugErr.message}`);
        }
      } else {
        blockedCount++;
      }

      emitRunEvent(runId, 'test_completed', {
        testCaseId: testCase._id,
        status: testStatus,
        durationMs: Date.now() - caseStartTime,
        error: errorDetails.message,
        screenshots: screenshotRefs,
      });

      await active.browserContext.close().catch(() => {});
      active.browserContext = null;
    }

    if (active.browser) {
      await active.browser.close().catch(() => {});
      active.browser = null;
    }

    // Determine final run status
    let finalStatus = 'passed';
    if (active.isCancelled) {
      finalStatus = 'cancelled';
    } else if (failedCount > 0) {
      finalStatus = 'failed';
    }

    run.status = finalStatus;
    run.completedAt = new Date();
    run.durationMs = Date.now() - runStartTime;
    run.summary = {
      totalTests: testCases.length,
      passedTests: passedCount,
      failedTests: failedCount,
      blockedTests: blockedCount,
    };
    if (failedCount > 0) {
      run.errorSummary = `${failedCount} of ${testCases.length} tests failed during execution.`;
    }
    await run.save();

    emitRunEvent(runId, 'run_status', {
      status: finalStatus,
      completedAt: run.completedAt,
      summary: run.summary,
    });
  } catch (globalErr) {
    logger.error(`Fatal execution failure on run ${runId}: ${globalErr.message}`, globalErr);
    run.status = 'failed';
    run.completedAt = new Date();
    run.errorSummary = `Execution error: ${globalErr.message}`;
    await run.save().catch(() => {});

    emitRunEvent(runId, 'run_status', {
      status: 'failed',
      error: globalErr.message,
    });
  } finally {
    if (active.browserContext) {
      await active.browserContext.close().catch(() => {});
    }
    if (active.browser) {
      await active.browser.close().catch(() => {});
    }
    activeRuns.delete(runId);
  }
};
