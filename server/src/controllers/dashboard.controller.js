import { Project } from '../models/Project.js';
import { TestRun } from '../models/TestRun.js';
import { TestCase } from '../models/TestCase.js';
import { Bug } from '../models/Bug.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getDashboardSummary = async (req, res, next) => {
  try {
    const ownerId = req.userId;

    const [totalProjects, totalTestCases, totalRuns, completedRuns, recentRuns, recentBugs] =
      await Promise.all([
        Project.countDocuments({ ownerId, status: 'active' }),
        TestCase.countDocuments({ ownerId }),
        TestRun.countDocuments({ ownerId }),
        TestRun.find({
          ownerId,
          status: { $in: ['passed', 'failed'] },
        }).lean(),
        TestRun.find({ ownerId })
          .populate('projectId', 'name')
          .sort({ createdAt: -1 })
          .limit(6)
          .lean(),
        Bug.find({ ownerId })
          .populate('projectId', 'name')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ]);

    // Aggregate test totals from completed runs
    let totalTestsExecuted = 0;
    let passedTests = 0;
    let failedTests = 0;
    let blockedTests = 0;

    for (const run of completedRuns) {
      if (run.summary) {
        totalTestsExecuted += run.summary.totalTests || 0;
        passedTests += run.summary.passedTests || 0;
        failedTests += run.summary.failedTests || 0;
        blockedTests += run.summary.blockedTests || 0;
      }
    }

    const successRate =
      totalTestsExecuted > 0 ? Math.round((passedTests / totalTestsExecuted) * 100) : 0;

    // Project health breakdown
    const projects = await Project.find({ ownerId, status: 'active' }).limit(5).lean();
    const projectHealth = await Promise.all(
      projects.map(async (p) => {
        const lastRun = await TestRun.findOne({ projectId: p._id }).sort({ createdAt: -1 }).lean();
        const bugCount = await Bug.countDocuments({
          projectId: p._id,
          status: { $in: ['open', 'investigating'] },
        });
        return {
          id: p._id,
          name: p.name,
          environmentsCount: p.environments.length,
          lastRunStatus: lastRun ? lastRun.status : 'never_run',
          lastRunDate: lastRun ? lastRun.createdAt : null,
          openBugsCount: bugCount,
        };
      })
    );

    return sendSuccess(res, {
      metrics: {
        totalProjects,
        totalTestCases,
        totalRuns,
        totalTestsExecuted,
        passedTests,
        failedTests,
        blockedTests,
        successRate,
      },
      recentRuns,
      recentBugs,
      projectHealth,
    });
  } catch (err) {
    next(err);
  }
};

export const getDashboardTrends = async (req, res, next) => {
  try {
    const ownerId = req.userId;

    // Fetch the latest 15 completed runs, then return them oldest-to-newest for charting.
    const runs = await TestRun.find({
      ownerId,
      status: { $in: ['passed', 'failed', 'cancelled', 'timed_out'] },
    })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    const trends = runs.reverse().map((r, idx) => ({
      runIndex: `Run #${idx + 1}`,
      date: new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      passed: r.summary?.passedTests || 0,
      failed: r.summary?.failedTests || 0,
      durationSec: Math.round((r.durationMs || 0) / 1000),
      status: r.status,
    }));

    return sendSuccess(res, { trends });
  } catch (err) {
    next(err);
  }
};
