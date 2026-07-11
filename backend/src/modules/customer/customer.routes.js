import { Router } from 'express';
import { handle } from '../../shared/utils/handle.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, requireRole } from '../../shared/middleware/authenticate.js';
import { CustomerService } from './CustomerService.js';
import { createCustomerSchema, updateCustomerSchema } from './customer.schema.js';

const router = Router();

router.get('/list', authenticate, handle(CustomerService.basicList));
router.get('/:id', authenticate, handle(CustomerService.detail, { paramOrder: ['id'] }));
router.post('/create', authenticate, requireRole('admin', 'manager'), validate(createCustomerSchema), handle(CustomerService.create));
router.post('/:id/update', authenticate, requireRole('admin', 'manager'), validate(updateCustomerSchema), handle(CustomerService.update, { paramOrder: ['id'] }));

export const customerRoutes = router;
