import { Router } from 'express';
import { z } from 'zod';
import { handle } from '../../shared/utils/handle.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticateCustomer } from '../../shared/middleware/authenticate.js';
import { CustomerAuthService } from './CustomerAuthService.js';
import { loginSchema, refreshTokenSchema } from './auth.schema.js';

const router = Router();

const forgetPasswordSchema = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8).max(128),
});
const ssoSchema = z.object({
  credential: z.string().min(1),
  sdk: z.enum(['web', 'ios', 'android']).optional().default('web'),
  profile: z.object({ givenName: z.string().optional() }).optional(),
});

router.post('/login', (req, res, next) => {
  req.querier = { ip: req.ip, userAgent: req.headers['user-agent'] };
  next();
}, validate(loginSchema), handle(CustomerAuthService.login));

router.post('/refreshToken', validate(refreshTokenSchema), handle(CustomerAuthService.refreshToken));
router.get('/profile', authenticateCustomer, handle(CustomerAuthService.profile));
router.post('/logout', authenticateCustomer, handle(CustomerAuthService.logout));
router.post('/forgetPassword', validate(forgetPasswordSchema), handle(CustomerAuthService.forgetPassword));
router.post('/verifyOtpPasswordReset', validate(resetPasswordSchema), handle(CustomerAuthService.verifyOtpPasswordReset));

router.post('/ssoGoogle', (req, res, next) => {
  req.querier = { ip: req.ip, userAgent: req.headers['user-agent'] };
  next();
}, validate(ssoSchema), handle((q, d) => CustomerAuthService.ssoSocialLogin(q, d, 'google')));

router.post('/ssoApple', (req, res, next) => {
  req.querier = { ip: req.ip, userAgent: req.headers['user-agent'] };
  next();
}, validate(ssoSchema), handle((q, d) => CustomerAuthService.ssoSocialLogin(q, d, 'apple')));

export const customerAuthRoutes = router;
