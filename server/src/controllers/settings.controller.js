import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { TestCase } from '../models/TestCase.js';
import { TestRun } from '../models/TestRun.js';
import { Bug } from '../models/Bug.js';
import { Report } from '../models/Report.js';
import { env } from '../config/env.js';
import { clearAuthCookie } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const getSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return sendError(res, 'User not found.', 404);

    const hasLlmKey = !!(env.LLM_API_KEY && env.LLM_API_KEY.length > 5);
    const maskedKey = hasLlmKey ? `${env.LLM_API_KEY.slice(0, 4)}...${env.LLM_API_KEY.slice(-3)}` : null;

    return sendSuccess(res, {
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      preferences: user.preferences,
      systemConfig: {
        llmProvider: env.LLM_PROVIDER,
        llmModel: env.LLM_MODEL,
        hasCustomApiKey: hasLlmKey,
        maskedApiKey: maskedKey,
        allowLocalTesting: env.ALLOW_LOCAL_TESTING,
        maxConcurrentRuns: env.MAX_CONCURRENT_RUNS,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const { name, preferences } = req.body;
    const update = {};

    if (name) update.name = name.trim();
    if (preferences) {
      if (preferences.theme) update['preferences.theme'] = preferences.theme;
      if (preferences.defaultBrowser) update['preferences.defaultBrowser'] = preferences.defaultBrowser;
      if (preferences.defaultTimeoutMs) update['preferences.defaultTimeoutMs'] = preferences.defaultTimeoutMs;
      if (preferences.viewport) update['preferences.viewport'] = preferences.viewport;
      if (preferences.emailNotifications !== undefined) update['preferences.emailNotifications'] = preferences.emailNotifications;
    }

    const user = await User.findByIdAndUpdate(req.userId, { $set: update }, { new: true }).lean();
    return sendSuccess(res, { user }, 'Preferences updated successfully');
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return sendError(res, 'New password must be at least 8 characters long.', 400);
    }

    const user = await User.findById(req.userId).select('+passwordHash');
    if (!user) return sendError(res, 'User not found.', 404);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return sendError(res, 'Current password verification failed.', 400);
    }

    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();

    return sendSuccess(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const { confirmationPassword } = req.body;

    const user = await User.findById(req.userId).select('+passwordHash');
    if (!user) return sendError(res, 'User not found.', 404);

    const isMatch = await user.comparePassword(confirmationPassword);
    if (!isMatch) {
      return sendError(res, 'Incorrect password. Account deletion aborted.', 400);
    }

    // Cascade delete all assets
    await Promise.all([
      Project.deleteMany({ ownerId: user._id }),
      TestCase.deleteMany({ ownerId: user._id }),
      TestRun.deleteMany({ ownerId: user._id }),
      Bug.deleteMany({ ownerId: user._id }),
      Report.deleteMany({ ownerId: user._id }),
      User.findByIdAndDelete(user._id),
    ]);

    clearAuthCookie(res);
    return sendSuccess(res, null, 'Account and all data permanently deleted');
  } catch (err) {
    next(err);
  }
};
