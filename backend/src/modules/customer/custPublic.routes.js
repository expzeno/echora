import { Router } from 'express';
import { z } from 'zod';
import { handle } from '../../shared/utils/handle.js';
import { validate } from '../../shared/middleware/validate.js';
import { CustPublicService } from './custPublic.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email().max(255),
  displayName: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
});

const verifyOtpSchema = z.object({
  otp: z.string().length(6),
});

router.post('/register', validate(registerSchema), handle(CustPublicService.register));

// customerId from path, otp from body — inline handler to bridge path param into service
router.post('/:customerId/verifyOtp', validate(verifyOtpSchema), async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    if (!customerId) return res.status(400).json({ ok: false, message: 'Invalid customer ID' });
    const data = req.validatedData ?? req.body.data ?? req.body;
    const result = await CustPublicService.verifyOtp(customerId, data);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

export const custPublicRoutes = router;
