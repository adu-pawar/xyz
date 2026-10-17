import { Router } from 'express';
import * as bugController from '../controllers/bug.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', bugController.listBugs);
router.get('/:id', bugController.getBug);
router.patch('/:id', bugController.updateBug);
router.post('/:id/notes', bugController.addBugNote);
router.post('/:id/investigate', bugController.triggerBugReinvestigation);

export default router;
