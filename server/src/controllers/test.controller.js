import { TestCase } from '../models/TestCase.js';
import { Project } from '../models/Project.js';
import { TestResult } from '../models/TestResult.js';
import { generateTestCasesWithAI } from '../services/ai.service.js';
import { validateTargetUrl } from '../workers/ssrfGuard.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const listProjectTests = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const { testType, search } = req.query;

    const project = await Project.findOne({ _id: projectId, ownerId: req.userId });
    if (!project) {
      return sendError(res, 'Project not found or access denied.', 404);
    }

    const query = { projectId };
    if (testType && testType !== 'all') {
      query.testType = testType;
    }
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const testCases = await TestCase.find(query).sort({ createdAt: -1 }).lean();
    return sendSuccess(res, { testCases });
  } catch (err) {
    next(err);
  }
};

export const createTestCase = async (req, res, next) => {
  try {
    const { projectId, title, description, testType, riskLevel, preconditions, steps, expectedResults, generationSource } = req.body;

    const project = await Project.findOne({ _id: projectId, ownerId: req.userId });
    if (!project) {
      return sendError(res, 'Project not found or access denied.', 404);
    }

    const testCase = await TestCase.create({
      projectId,
      ownerId: req.userId,
      title,
      description,
      testType: testType || 'functional',
      riskLevel: riskLevel || 'medium',
      preconditions: preconditions || [],
      steps,
      expectedResults: expectedResults || [],
      generationSource: generationSource || 'manual',
    });

    return sendSuccess(res, { testCase }, 'Test case created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const getTestCase = async (req, res, next) => {
  try {
    const testCase = await TestCase.findOne({ _id: req.params.id, ownerId: req.userId }).lean();
    if (!testCase) {
      return sendError(res, 'Test case not found or access denied.', 404);
    }

    // Get last execution results
    const results = await TestResult.find({ testCaseId: testCase._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return sendSuccess(res, {
      testCase,
      lastResult: results[0] || null,
      history: results,
    });
  } catch (err) {
    next(err);
  }
};

export const updateTestCase = async (req, res, next) => {
  try {
    const testCase = await TestCase.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!testCase) {
      return sendError(res, 'Test case not found or access denied.', 404);
    }

    return sendSuccess(res, { testCase }, 'Test case updated successfully');
  } catch (err) {
    next(err);
  }
};

export const duplicateTestCase = async (req, res, next) => {
  try {
    const original = await TestCase.findOne({ _id: req.params.id, ownerId: req.userId }).lean();
    if (!original) {
      return sendError(res, 'Test case not found or access denied.', 404);
    }

    const { _id, createdAt, updatedAt, ...rest } = original;
    const duplicated = await TestCase.create({
      ...rest,
      title: `${original.title} (Copy)`,
      generationSource: 'manual',
    });

    return sendSuccess(res, { testCase: duplicated }, 'Test case duplicated successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const generateTestCases = async (req, res, next) => {
  try {
    const { projectId, targetUrl, objective, testType = 'functional', numCases = 3 } = req.body;

    const project = await Project.findOne({ _id: projectId, ownerId: req.userId });
    if (!project) {
      return sendError(res, 'Project not found or access denied.', 404);
    }

    // SSRF and Destination validation
    const ssrfCheck = await validateTargetUrl(targetUrl, project.authorizedTargetOrigins);
    if (!ssrfCheck.valid) {
      return sendError(res, `Security validation failed: ${ssrfCheck.error}`, 400);
    }

    const result = await generateTestCasesWithAI({
      targetUrl,
      objective,
      testType,
      numCases,
    });

    return sendSuccess(res, {
      cases: result.cases,
      source: result.source,
      note: result.note || null,
      warning: result.warning || null,
    }, 'Test cases generated successfully');
  } catch (err) {
    next(err);
  }
};
