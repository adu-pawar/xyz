import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', settingsController.getSettings);
router.patch('/', settingsController.updateSettings);
router.patch('/password', settingsController.changePassword);
router.post('/delete-account', settingsController.deleteAccount);

export default router;
