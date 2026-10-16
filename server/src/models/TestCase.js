import mongoose from 'mongoose';

const testStepSchema = new mongoose.Schema(
  {
    stepNumber: {
      type: Number,
      required: true,
    },
    action: {
      type: String,
      enum: ['navigate', 'click', 'fill', 'select', 'hover', 'assert_text', 'assert_visible', 'assert_url', 'wait'],
      required: true,
    },
    target: {
      type: String, // selector or URL
      default: '',
    },
    value: {
      type: String, // text to fill, expected text, or wait duration
      default: '',
    },
    expectedOutcome: {
      type: String,
      default: '',
    },
  },
  { _id: true }
);

const testCaseSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: [true, 'Test case title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    testType: {
      type: String,
      enum: ['smoke', 'regression', 'functional', 'security_auth', 'form_validation'],
      default: 'functional',
      index: true,
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    preconditions: {
      type: [String],
      default: [],
    },
    steps: {
      type: [testStepSchema],
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'A test case must contain at least one step.',
      },
    },
    expectedResults: {
      type: [String],
      default: [],
    },
    generationSource: {
      type: String,
      enum: ['ai_generated', 'manual', 'rule_fallback'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
);

testCaseSchema.index({ projectId: 1, createdAt: -1 });

export const TestCase = mongoose.model('TestCase', testCaseSchema);
