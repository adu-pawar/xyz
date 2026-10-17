import { Project } from '../models/Project.js';
import { TestRun } from '../models/TestRun.js';
import { TestCase } from '../models/TestCase.js';
import { Bug } from '../models/Bug.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const listProjects = async (req, res, next) => {
  try {
    const { search, status = 'active', page = 1, limit = 20 } = req.query;
    const query = { ownerId: req.userId };

    if (status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    // Attach latest run stats to each project
    const projectIds = projects.map((p) => p._id);
    const latestRuns = await TestRun.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$projectId',
          latestRun: { $first: '$$ROOT' },
        },
      },
    ]);

    const runMap = new Map();
    for (const item of latestRuns) {
      runMap.set(item._id.toString(), item.latestRun);
    }

    const enhancedProjects = projects.map((p) => ({
      ...p,
      latestRun: runMap.get(p._id.toString()) || null,
    }));

    return sendSuccess(res, {
      projects: enhancedProjects,
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

export const createProject = async (req, res, next) => {
  try {
    const { name, description, authorizedTargetOrigins, environments } = req.body;

    const project = await Project.create({
      ownerId: req.userId,
      name,
      description,
      authorizedTargetOrigins,
      environments: environments && environments.length ? environments : [
        { name: 'Production', url: authorizedTargetOrigins[0], isDefault: true }
      ],
    });

    return sendSuccess(res, { project }, 'Project created successfully', 201);
  } catch (err) {
    next(err);
  }
};

export const getProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      ownerId: req.userId,
    }).lean();

    if (!project) {
      return sendError(res, 'Project not found or access denied.', 404);
    }

    // Fetch related counts and test suites
    const [testCount, runs, openBugsCount] = await Promise.all([
      TestCase.countDocuments({ projectId: project._id }),
      TestRun.find({ projectId: project._id }).sort({ createdAt: -1 }).limit(10).lean(),
      Bug.countDocuments({ projectId: project._id, status: { $in: ['open', 'investigating'] } }),
    ]);

    return sendSuccess(res, {
      project,
      stats: {
        testCount,
        recentRunsCount: runs.length,
        openBugsCount,
      },
      recentRuns: runs,
    });
  } catch (err) {
    next(err);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!project) {
      return sendError(res, 'Project not found or access denied.', 404);
    }

    return sendSuccess(res, { project }, 'Project updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.userId,
    });

    if (!project) {
      return sendError(res, 'Project not found or access denied.', 404);
    }

    // Cascade delete associated test cases, runs, and bugs
    await Promise.all([
      TestCase.deleteMany({ projectId: project._id }),
      TestRun.deleteMany({ projectId: project._id }),
      Bug.deleteMany({ projectId: project._id }),
    ]);

    return sendSuccess(res, null, 'Project and related test assets deleted successfully');
  } catch (err) {
    next(err);
  }
};
