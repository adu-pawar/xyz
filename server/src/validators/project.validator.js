import { z } from 'zod';

const environmentSchema = z.object({
  name: z.string().min(1, 'Environment name is required'),
  url: z.string().url('Environment target must be a valid URL'),
  isDefault: z.boolean().optional().default(false),
});

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(120),
  description: z.string().max(1000).optional().default(''),
  authorizedTargetOrigins: z
    .array(z.string().url('Target origin must be a valid URL (e.g. https://example.com)'))
    .min(1, 'At least one authorized target origin is required'),
  environments: z.array(environmentSchema).optional().default([]),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(1000).optional(),
  authorizedTargetOrigins: z.array(z.string().url()).min(1).optional(),
  environments: z.array(environmentSchema).optional(),
  status: z.enum(['active', 'archived']).optional(),
});
