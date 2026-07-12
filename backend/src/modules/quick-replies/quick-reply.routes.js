import { Router } from 'express';
import { handle } from '../../shared/utils/handle.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { QuickReplyService } from './quick-reply.service.js';

const router = Router();

// All quick-reply routes require a valid admin/agent JWT.
router.get('/', authenticate, handle(QuickReplyService.list));
router.post('/', authenticate, handle(QuickReplyService.create));
router.delete('/:id', authenticate, handle(QuickReplyService.delete, { paramOrder: ['id'] }));

export const quickReplyRoutes = router;
