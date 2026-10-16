import { Router } from 'express';
import * as projectController from '../controllers/project.controller.js';
import * as testController from '../controllers/test.controller.js';
import * as runController from '../controllers/run.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { executionLimiter } from '../middleware/rateLimiter.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator.js';
import { createRunSchema } from '../validators/run.validator.js';

const router = Router();

router.use(requireAuth);

router.get('/', projectController.listProjects);
router.post('/', validateRequest(createProjectSchema), projectController.createProject);
router.get('/:id', projectController.getProject);
router.patch('/:id', validateRequest(updateProjectSchema), projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

// Nested routes for project's tests and runs
router.get('/:id/tests', testController.listProjectTests);
router.post('/:id/runs', executionLimiter, validateRequest(createRunSchema), runController.createRun);

export default router;
