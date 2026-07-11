import { Router } from 'express';
import { handle } from '../../shared/utils/handle.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, requireRole } from '../../shared/middleware/authenticate.js';
import { MerchantService } from './MerchantService.js';
import { createMerchantSchema, updateMerchantSchema } from './merchant.schema.js';

const router = Router();

router.get('/list', authenticate, handle(MerchantService.basicList));
router.get('/:id', authenticate, handle(MerchantService.detail, { paramOrder: ['id'] }));
router.post('/create', authenticate, requireRole('admin', 'manager'), validate(createMerchantSchema), handle(MerchantService.create));
router.post('/:id/update', authenticate, requireRole('admin', 'manager'), validate(updateMerchantSchema), handle(MerchantService.update, { paramOrder: ['id'] }));

export const merchantRoutes = router;
