import { Router } from 'express';
import { handle } from '../../shared/utils/handle.js';
import { FeedbackService } from './feedbackService.js';

// Dev-mode feedback sink: writes to ~/projects/{project}/feedback.json
// Intentionally public — mount only when !isProduction so it doesn't reach prod.
// Status contract: pending → progressing → approval-needed → resolved.
// Body limit (10mb) comes from the global express.json in server.js — covers base64 screenshots.
const router = Router();

router.post('/submit', handle(FeedbackService.submit));
router.get('/list', handle(FeedbackService.list));
router.patch('/:id/status', handle(FeedbackService.updateStatus, { paramOrder: ['id'] }));

export const feedbackRoutes = router;
