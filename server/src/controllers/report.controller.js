import path from 'path';
import fs from 'fs';
import { Report } from '../models/Report.js';
import { TestRun } from '../models/TestRun.js';
import { TestResult } from '../models/TestResult.js';
import { Project } from '../models/Project.js';
import { Bug } from '../models/Bug.js';
import { generatePdfReport, generateCsvReport, generateJsonReport } from '../services/export.service.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

export const listReports = async (req, res, next) => {
  try {
    const { projectId, page = 1, limit = 20 } = req.query;
    const query = { ownerId: req.userId };
    if (projectId) query.projectId = projectId;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Report.countDocuments(query);
    const reports = await Report.find(query)
      .populate('projectId', 'name')
      .populate('runId', 'status startedAt durationMs')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    return sendSuccess(res, {
      reports,
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

export const createRunReport = async (req, res, next) => {
  try {
    const { id: runId } = req.params;
    const { format = 'pdf' } = req.body;

    const run = await TestRun.findOne({ _id: runId, ownerId: req.userId });
    if (!run) {
      return sendError(res, 'Test run not found or access denied.', 404);
    }

    const [project, results, bugs] = await Promise.all([
      Project.findById(run.projectId).lean(),
      TestResult.find({ runId: run._id }).lean(),
      Bug.find({ runId: run._id }).lean(),
    ]);

    const title = `BugSlayer Test Report - ${project?.name || 'Project'} (${new Date().toLocaleDateString()})`;
    const passRate = run.summary?.totalTests > 0 ? (run.summary.passedTests / run.summary.totalTests) * 100 : 0;

    let storageReference = '';
    if (format === 'pdf') {
      const generated = await generatePdfReport(run, results, bugs, project);
      storageReference = generated.storageReference;
    } else if (format === 'csv') {
      const csvData = generateCsvReport(run, results, bugs);
      const fileName = `report_${run._id}_${Date.now()}.csv`;
      const fullPath = path.join(env.EVIDENCE_STORAGE_PATH, 'reports', fileName);
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.promises.writeFile(fullPath, csvData);
      storageReference = `/evidence/reports/${fileName}`;
    } else {
      const jsonData = generateJsonReport(run, results, bugs, project);
      const fileName = `report_${run._id}_${Date.now()}.json`;
      const fullPath = path.join(env.EVIDENCE_STORAGE_PATH, 'reports', fileName);
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.promises.writeFile(fullPath, JSON.stringify(jsonData, null, 2));
      storageReference = `/evidence/reports/${fileName}`;
    }

    const report = await Report.create({
      projectId: run.projectId,
      runId: run._id,
      ownerId: req.userId,
      title,
      format,
      storageReference,
      metrics: {
        totalTests: run.summary?.totalTests || 0,
        passedTests: run.summary?.passedTests || 0,
        failedTests: run.summary?.failedTests || 0,
        durationMs: run.durationMs,
        passRate: Math.round(passRate),
      },
    });

    return sendSuccess(res, { report }, 'Report generated successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const downloadReport = async (req, res, next) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, ownerId: req.userId });
    if (!report) {
      return sendError(res, 'Report not found or access denied.', 404);
    }

    const relativePath = report.storageReference.replace('/evidence/', '');
    const absolutePath = path.resolve(env.EVIDENCE_STORAGE_PATH, relativePath);

    if (!fs.existsSync(absolutePath)) {
      return sendError(res, 'Report file is missing from storage.', 404);
    }

    res.download(absolutePath, path.basename(absolutePath));
  } catch (err) {
    next(err);
  }
};
