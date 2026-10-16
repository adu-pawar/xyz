import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/summary', dashboardController.getDashboardSummary);
router.get('/trends', dashboardController.getDashboardTrends);

export default router;
