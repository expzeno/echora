import { Router } from 'express';
import { handle } from '../../shared/utils/handle.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { WhatsappNumberService } from './whatsapp-number.service.js';

const router = Router();

// All WhatsApp-number management routes require a valid admin/agent JWT.
router.get('/', authenticate, handle(WhatsappNumberService.list));
router.get('/:id', authenticate, handle(WhatsappNumberService.getById, { paramOrder: ['id'] }));
router.post('/', authenticate, handle(WhatsappNumberService.create));
router.patch('/:id', authenticate, handle(WhatsappNumberService.update, { paramOrder: ['id'] }));
router.patch('/:id/toggle', authenticate, handle(WhatsappNumberService.toggleActive, { paramOrder: ['id'] }));
router.delete('/:id', authenticate, handle(WhatsappNumberService.delete, { paramOrder: ['id'] }));

export const whatsappNumberRoutes = router;
