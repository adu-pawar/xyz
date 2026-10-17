import { z } from 'zod';

const testStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  action: z.enum(['navigate', 'click', 'fill', 'select', 'hover', 'assert_text', 'assert_visible', 'assert_url', 'wait']),
  target: z.string().optional().default(''),
  value: z.string().optional().default(''),
  expectedOutcome: z.string().optional().default(''),
});

export const createTestCaseSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  title: z.string().min(3, 'Test case title must be at least 3 characters').max(200),
  description: z.string().optional().default(''),
  testType: z.enum(['smoke', 'regression', 'functional', 'security_auth', 'form_validation']).default('functional'),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  preconditions: z.array(z.string()).optional().default([]),
  steps: z.array(testStepSchema).min(1, 'At least one step is required'),
  expectedResults: z.array(z.string()).optional().default([]),
  generationSource: z.enum(['ai_generated', 'manual', 'rule_fallback']).default('manual'),
});

export const generateTestCasesSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  targetUrl: z.string().url('Target URL must be a valid URL'),
  objective: z.string().min(5, 'Objective must be at least 5 characters'),
  testType: z.enum(['smoke', 'regression', 'functional', 'security_auth', 'form_validation']).default('functional'),
  numCases: z.number().int().min(1).max(10).optional().default(3),
});
