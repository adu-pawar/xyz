import { Router } from 'express';
import * as runController from '../controllers/run.controller.js';
import * as reportController from '../controllers/report.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { executionLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', runController.listRuns);
router.get('/:id', runController.getRun);
router.get('/:id/events', runController.streamRunEvents);
router.post('/:id/cancel', runController.cancelRunExecution);
router.post('/:id/rerun', executionLimiter, runController.rerunTestRun);
router.post('/:id/reports', reportController.createRunReport);

export default router;
