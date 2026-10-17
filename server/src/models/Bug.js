import mongoose from 'mongoose';

const bugNoteSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const bugSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    runId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestRun',
      required: true,
      index: true,
    },
    testCaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestCase',
      index: true,
    },
    testResultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestResult',
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Bug title is required'],
      trim: true,
      maxlength: 250,
    },
    description: {
      type: String,
      default: '',
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'high',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'ignored'],
      default: 'open',
      index: true,
    },
    evidenceReferences: {
      screenshots: [String],
      consoleLogs: [mongoose.Schema.Types.Mixed],
      stackTrace: String,
      networkLogs: [mongoose.Schema.Types.Mixed],
      failedLocator: String,
      failedUrl: String,
    },
    aiInvestigation: {
      probableCause: { type: String, default: '' },
      supportingEvidence: { type: [String], default: [] },
      confidenceLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
      },
      recommendedNextSteps: { type: [String], default: [] },
      userFeedback: {
        type: String,
        enum: ['useful', 'incorrect', 'unresolved', null],
        default: null,
      },
      analyzedAt: Date,
    },
    notes: [bugNoteSchema],
  },
  {
    timestamps: true,
  }
);

bugSchema.index({ projectId: 1, status: 1, severity: 1, createdAt: -1 });

export const Bug = mongoose.model('Bug', bugSchema);
