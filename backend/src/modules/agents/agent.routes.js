import { Router } from 'express';
import { handle } from '../../shared/utils/handle.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { AgentService } from './agent.service.js';

const router = Router();

// All agent-management routes require a valid admin/agent JWT.
router.get('/', authenticate, handle(AgentService.list));
router.get('/:id', authenticate, handle(AgentService.getById, { paramOrder: ['id'] }));
router.post('/', authenticate, handle(AgentService.create));
router.patch('/:id', authenticate, handle(AgentService.update, { paramOrder: ['id'] }));
router.patch('/:id/toggle', authenticate, handle(AgentService.toggleActive, { paramOrder: ['id'] }));
router.delete('/:id', authenticate, handle(AgentService.delete, { paramOrder: ['id'] }));

export const agentRoutes = router;
