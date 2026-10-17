import crypto from 'crypto';
import { User } from '../models/User.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { createToken, setAuthCookie, clearAuthCookie } from '../middleware/auth.middleware.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return sendError(res, 'An account with this email address already exists.', 409);
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
    });

    const token = createToken(user);
    setAuthCookie(res, token);

    return sendSuccess(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          preferences: user.preferences,
        },
      },
      'Registration successful',
      201
    );
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    let user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    // Keep the seeded demo login working for databases created before the BugSlayer rebrand.
    if (!user && normalizedEmail === 'engineer@bugslayer.io') {
      user = await User.findOne({ email: 'engineer@veriqa.io' }).select('+passwordHash');
    }
    if (!user) {
      return sendError(res, 'Invalid email or password credentials.', 401);
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return sendError(res, 'Invalid email or password credentials.', 401);
    }

    if (user.email === 'engineer@veriqa.io' && normalizedEmail === 'engineer@bugslayer.io') {
      user.email = normalizedEmail;
      await user.save();
    }

    const token = createToken(user);
    setAuthCookie(res, token);

    return sendSuccess(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          preferences: user.preferences,
        },
      },
      'Login successful'
    );
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res) => {
  clearAuthCookie(res);
  return sendSuccess(res, null, 'Logged out successfully');
};

export const getMe = async (req, res) => {
  return sendSuccess(res, {
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      preferences: req.user.preferences,
      createdAt: req.user.createdAt,
    },
  });
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always respond with generic message to prevent email enumeration
    if (!user) {
      return sendSuccess(
        res,
        null,
        'If an account exists with this email, password reset instructions have been generated.'
      );
    }

    // Generate secure random reset token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    await PasswordResetToken.create({
      userId: user._id,
      hashedToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiration
    });

    // In development/test mode, we provide token in response for testing convenience
    const isDev = process.env.NODE_ENV !== 'production';

    return sendSuccess(
      res,
      isDev ? { devResetToken: rawToken } : null,
      'If an account exists with this email, password reset instructions have been generated.'
    );
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await PasswordResetToken.findOne({
      hashedToken,
      expiresAt: { $gt: new Date() },
      usedAt: null,
    });

    if (!resetRecord) {
      return sendError(res, 'Password reset token is invalid or has expired.', 400);
    }

    const user = await User.findById(resetRecord.userId);
    if (!user) {
      return sendError(res, 'User account associated with this token not found.', 404);
    }

    user.passwordHash = await User.hashPassword(password);
    await user.save();

    resetRecord.usedAt = new Date();
    await resetRecord.save();

    return sendSuccess(res, null, 'Password has been reset successfully. You may now log in.');
  } catch (err) {
    next(err);
  }
};
