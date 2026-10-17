import { z } from 'zod';

export const createRunSchema = z.object({
  targetUrl: z.string().url('Target URL must be a valid URL'),
  environmentName: z.string().optional().default('Custom'),
  testCaseIds: z.array(z.string()).min(1, 'Please select at least one test case to run'),
  authorizedConfirmed: z.boolean().refine((val) => val === true, {
    message: 'You must confirm you are authorized to run automated tests against this target URL.',
  }),
  browser: z.enum(['chromium', 'firefox', 'webkit']).optional().default('chromium'),
  viewport: z
    .object({
      width: z.number().int().min(320).max(3840).default(1280),
      height: z.number().int().min(240).max(2160).default(720),
    })
    .optional()
    .default({ width: 1280, height: 720 }),
  timeoutMs: z.number().int().min(5000).max(120000).optional().default(30000),
});
