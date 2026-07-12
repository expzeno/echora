import { Router } from 'express';
import { handle } from '../../shared/utils/handle.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { ConversationService } from './ConversationService.js';

const router = Router();

// All conversation routes require a valid admin/agent JWT.
router.get('/', authenticate, handle(ConversationService.list));
router.get('/:id', authenticate, handle(ConversationService.detail, { paramOrder: ['id'] }));
router.get('/:id/messages', authenticate, handle(ConversationService.messages, { paramOrder: ['id'] }));
router.post('/:id/messages', authenticate, handle(ConversationService.sendMessage, { paramOrder: ['id'] }));
router.patch('/:id/status', authenticate, handle(ConversationService.updateStatus, { paramOrder: ['id'] }));
// Assign / unassign the conversation to an agent — body: { assignedAgentId: <uuid>|null }.
router.patch('/:id', authenticate, handle(ConversationService.assign, { paramOrder: ['id'] }));

export const conversationRoutes = router;
