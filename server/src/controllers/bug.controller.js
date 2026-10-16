import { Bug } from '../models/Bug.js';
import { analyzeFailureWithAI } from '../services/ai.service.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const listBugs = async (req, res, next) => {
  try {
    const { projectId, severity, status, search, page = 1, limit = 20 } = req.query;
    const query = { ownerId: req.userId };

    if (projectId) query.projectId = projectId;
    if (severity && severity !== 'all') query.severity = severity;
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Bug.countDocuments(query);
    const bugs = await Bug.find(query)
      .populate('projectId', 'name')
      .populate('testCaseId', 'title testType')
      .populate('runId', 'targetEnvironment status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    return sendSuccess(res, {
      bugs,
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

export const getBug = async (req, res, next) => {
  try {
    const bug = await Bug.findOne({ _id: req.params.id, ownerId: req.userId })
      .populate('projectId', 'name authorizedTargetOrigins')
      .populate('testCaseId')
      .populate('runId')
      .lean();

    if (!bug) {
      return sendError(res, 'Bug not found or access denied.', 404);
    }

    return sendSuccess(res, { bug });
  } catch (err) {
    next(err);
  }
};

export const updateBug = async (req, res, next) => {
  try {
    const { status, severity, userFeedback } = req.body;
    const update = {};

    if (status) update.status = status;
    if (severity) update.severity = severity;
    if (userFeedback !== undefined) {
      update['aiInvestigation.userFeedback'] = userFeedback;
    }

    const bug = await Bug.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.userId },
      { $set: update },
      { new: true }
    );

    if (!bug) {
      return sendError(res, 'Bug not found or access denied.', 404);
    }

    return sendSuccess(res, { bug }, 'Bug updated successfully');
  } catch (err) {
    next(err);
  }
};

export const addBugNote = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return sendError(res, 'Note text cannot be empty.', 400);
    }

    const bug = await Bug.findOne({ _id: req.params.id, ownerId: req.userId });
    if (!bug) {
      return sendError(res, 'Bug not found or access denied.', 404);
    }

    bug.notes.push({
      authorId: req.userId,
      authorName: req.user.name || 'QA Engineer',
      text: text.trim(),
      createdAt: new Date(),
    });

    await bug.save();

    return sendSuccess(res, { notes: bug.notes }, 'Investigation note added successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const triggerBugReinvestigation = async (req, res, next) => {
  try {
    const bug = await Bug.findOne({ _id: req.params.id, ownerId: req.userId }).populate('testCaseId');
    if (!bug) {
      return sendError(res, 'Bug not found or access denied.', 404);
    }

    const aiInvestigation = await analyzeFailureWithAI({
      testTitle: bug.testCaseId?.title || bug.title,
      errorMessage: bug.description,
      failingLocator: bug.evidenceReferences?.failedLocator,
      targetUrl: bug.evidenceReferences?.failedUrl || '',
      consoleErrors: bug.evidenceReferences?.consoleLogs || [],
      networkFailures: bug.evidenceReferences?.networkLogs || [],
    });

    bug.aiInvestigation = aiInvestigation;
    await bug.save();

    return sendSuccess(res, { aiInvestigation }, 'Failure reinvestigation completed');
  } catch (err) {
    next(err);
  }
};
