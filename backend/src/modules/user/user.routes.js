import { Router } from 'express';
import { handle } from '../../shared/utils/handle.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate, requireRole } from '../../shared/middleware/authenticate.js';
import { UserService } from './UserService.js';
import { createUserSchema, updateUserSchema } from './user.schema.js';

const router = Router();

router.get('/list', authenticate, requireRole('admin'), handle(UserService.basicList));
router.post('/create', authenticate, requireRole('admin'), validate(createUserSchema), handle(UserService.create));
router.post('/:id/update', authenticate, requireRole('admin'), validate(updateUserSchema), handle(UserService.update, { paramOrder: ['id'] }));

export const userRoutes = router;
