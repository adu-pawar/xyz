import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
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
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      enum: ['pdf', 'json', 'csv'],
      required: true,
    },
    storageReference: {
      type: String, // local relative path or URL
      required: true,
    },
    metrics: {
      totalTests: Number,
      passedTests: Number,
      failedTests: Number,
      durationMs: Number,
      passRate: Number,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

reportSchema.index({ ownerId: 1, createdAt: -1 });

export const Report = mongoose.model('Report', reportSchema);
