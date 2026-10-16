import { Router } from 'express';
import * as testController from '../controllers/test.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { executionLimiter } from '../middleware/rateLimiter.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { createTestCaseSchema, generateTestCasesSchema } from '../validators/test.validator.js';

const router = Router();

router.use(requireAuth);

router.post('/', validateRequest(createTestCaseSchema), testController.createTestCase);
router.post('/generate', executionLimiter, validateRequest(generateTestCasesSchema), testController.generateTestCases);
router.get('/:id', testController.getTestCase);
router.patch('/:id', testController.updateTestCase);
router.post('/:id/duplicate', testController.duplicateTestCase);

export default router;
