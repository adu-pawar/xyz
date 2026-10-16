import { Router } from 'express';
import * as reportController from '../controllers/report.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', reportController.listReports);
router.get('/:id/download', reportController.downloadReport);

export default router;
