import mongoose from 'mongoose';

const testRunSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    testCaseIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestCase',
      },
    ],
    targetEnvironment: {
      name: { type: String, default: 'Default' },
      url: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'passed', 'failed', 'cancelled', 'timed_out'],
      default: 'queued',
      index: true,
    },
    browser: {
      type: String,
      default: 'chromium',
    },
    viewport: {
      width: { type: Number, default: 1280 },
      height: { type: Number, default: 720 },
    },
    timeoutMs: {
      type: Number,
      default: 30000,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    summary: {
      totalTests: { type: Number, default: 0 },
      passedTests: { type: Number, default: 0 },
      failedTests: { type: Number, default: 0 },
      blockedTests: { type: Number, default: 0 },
    },
    errorSummary: {
      type: String,
      default: '',
    },
    triggerSource: {
      type: String,
      enum: ['manual', 'ai_suite', 'scheduled', 'rerun'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
);

testRunSchema.index({ projectId: 1, createdAt: -1 });
testRunSchema.index({ ownerId: 1, status: 1, createdAt: -1 });

export const TestRun = mongoose.model('TestRun', testRunSchema);
