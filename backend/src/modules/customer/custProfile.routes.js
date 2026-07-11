import { Router } from 'express';
import { z } from 'zod';
import { handle } from '../../shared/utils/handle.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticateCustomer } from '../../shared/middleware/authenticate.js';
import { CustProfileService } from './custProfile.js';

const router = Router();
router.use(authenticateCustomer);

const updateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().max(20).nullable().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

router.post('/update', validate(updateSchema), handle(CustProfileService.update));
router.post('/changePassword', validate(changePasswordSchema), handle(CustProfileService.changePassword));
router.delete('/deleteAccount', handle(CustProfileService.deleteAccount));

export const custProfileRoutes = router;
