import { TestRun } from '../models/TestRun.js';
import { TestResult } from '../models/TestResult.js';
import { Project } from '../models/Project.js';
import { TestCase } from '../models/TestCase.js';
import { Bug } from '../models/Bug.js';
import { validateTargetUrl } from '../workers/ssrfGuard.js';
import { executeTestRun, cancelRun, subscribeToRunEvents } from '../workers/testRunner.worker.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const createRun = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const { targetUrl, environmentName, testCaseIds, browser = 'chromium', viewport, timeoutMs = 30000 } = req.body;

    const project = await Project.findOne({ _id: projectId, ownerId: req.userId });
    if (!project) {
      return sendError(res, 'Project not found or access denied.', 404);
    }

    // SSRF Security Guard
    const ssrfCheck = await validateTargetUrl(targetUrl, project.authorizedTargetOrigins);
    if (!ssrfCheck.valid) {
      return sendError(res, `Security authorization error: ${ssrfCheck.error}`, 400);
    }

    // Verify test cases belong to project
    const validCases = await TestCase.find({
      _id: { $in: testCaseIds },
      projectId: project._id,
    });

    if (validCases.length === 0) {
      return sendError(res, 'No valid test cases found for this project to execute.', 400);
    }

    // Create TestRun in QUEUED state
    const run = await TestRun.create({
      projectId: project._id,
      ownerId: req.userId,
      testCaseIds: validCases.map((c) => c._id),
      targetEnvironment: {
        name: environmentName || 'Custom Target',
        url: targetUrl,
      },
      status: 'queued',
      browser,
      viewport: viewport || { width: 1280, height: 720 },
      timeoutMs: timeoutMs || 30000,
      summary: {
        totalTests: validCases.length,
        passedTests: 0,
        failedTests: 0,
        blockedTests: 0,
      },
    });

    // Launch worker asynchronously in background
    setImmediate(() => {
      executeTestRun(run._id).catch((err) => {
        console.error(`Error launching run ${run._id}:`, err);
      });
    });

    return sendSuccess(res, { run }, 'Test run queued successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const listRuns = async (req, res, next) => {
  try {
    const { projectId, status, page = 1, limit = 20 } = req.query;
    const query = { ownerId: req.userId };

    if (projectId) {
      query.projectId = projectId;
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await TestRun.countDocuments(query);
    const runs = await TestRun.find(query)
      .populate('projectId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    return sendSuccess(res, {
      runs,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getRun = async (req, res, next) => {
  try {
    const run = await TestRun.findOne({ _id: req.params.id, ownerId: req.userId })
      .populate('projectId', 'name authorizedTargetOrigins')
      .populate('testCaseIds')
      .lean();

    if (!run) {
      return sendError(res, 'Test run not found or access denied.', 404);
    }

    const [results, bugs] = await Promise.all([
      TestResult.find({ runId: run._id }).populate('testCaseId', 'title testType riskLevel').lean(),
      Bug.find({ runId: run._id }).lean(),
    ]);

    return sendSuccess(res, {
      run,
      results,
      bugs,
    });
  } catch (err) {
    next(err);
  }
};

export const streamRunEvents = async (req, res) => {
  const { id: runId } = req.params;

  const run = await TestRun.findOne({ _id: runId, ownerId: req.userId });
  if (!run) {
    return sendError(res, 'Run not found or access denied.', 404);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial state
  res.write(`event: initial_state\ndata: ${JSON.stringify({ status: run.status, summary: run.summary })}\n\n`);

  subscribeToRunEvents(runId, res);
};

export const cancelRunExecution = async (req, res, next) => {
  try {
    const run = await TestRun.findOne({ _id: req.params.id, ownerId: req.userId });
    if (!run) {
      return sendError(res, 'Test run not found or access denied.', 404);
    }

    if (!['queued', 'running'].includes(run.status)) {
      return sendError(res, `Cannot cancel run in '${run.status}' state.`, 400);
    }

    const cancelled = await cancelRun(run._id.toString());
    return sendSuccess(res, { cancelled }, 'Cancellation requested');
  } catch (err) {
    next(err);
  }
};

export const rerunTestRun = async (req, res, next) => {
  try {
    const original = await TestRun.findOne({ _id: req.params.id, ownerId: req.userId }).lean();
    if (!original) {
      return sendError(res, 'Test run not found or access denied.', 404);
    }

    // Create a new separate run instance
    const newRun = await TestRun.create({
      projectId: original.projectId,
      ownerId: req.userId,
      testCaseIds: original.testCaseIds,
      targetEnvironment: original.targetEnvironment,
      status: 'queued',
      browser: original.browser,
      viewport: original.viewport,
      timeoutMs: original.timeoutMs,
      triggerSource: 'rerun',
      summary: {
        totalTests: original.testCaseIds.length,
        passedTests: 0,
        failedTests: 0,
        blockedTests: 0,
      },
    });

    setImmediate(() => {
      executeTestRun(newRun._id).catch((err) => {
        console.error(`Rerun execution error on ${newRun._id}:`, err);
      });
    });

    return sendSuccess(res, { run: newRun }, 'Rerun initiated successfully', 201);
  } catch (err) {
    next(err);
  }
};
