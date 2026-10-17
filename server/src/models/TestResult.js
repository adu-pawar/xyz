import mongoose from 'mongoose';

const executedStepSchema = new mongoose.Schema(
  {
    stepNumber: Number,
    action: String,
    target: String,
    value: String,
    status: {
      type: String,
      enum: ['passed', 'failed', 'skipped'],
      default: 'passed',
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
      default: '',
    },
    screenshotPath: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const assertionSchema = new mongoose.Schema(
  {
    description: String,
    passed: Boolean,
    expected: String,
    actual: String,
  },
  { _id: false }
);

const testResultSchema = new mongoose.Schema(
  {
    runId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestRun',
      required: true,
      index: true,
    },
    testCaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestCase',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['passed', 'failed', 'timed_out', 'cancelled', 'skipped'],
      required: true,
      index: true,
    },
    executedSteps: [executedStepSchema],
    assertions: [assertionSchema],
    errorDetails: {
      message: { type: String, default: '' },
      stack: { type: String, default: '' },
      failingLocator: { type: String, default: '' },
    },
    screenshotReferences: [String],
    consoleErrors: [
      {
        type: { type: String, default: 'error' },
        text: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    networkFailures: [
      {
        url: String,
        status: Number,
        method: String,
        errorText: String,
      },
    ],
    durationMs: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

testResultSchema.index({ runId: 1, status: 1 });

export const TestResult = mongoose.model('TestResult', testResultSchema);
