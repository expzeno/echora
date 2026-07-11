import { Router } from 'express';
import { handle } from '../../shared/utils/handle.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { AuthService } from './AuthService.js';
import { loginSchema, refreshTokenSchema } from './auth.schema.js';

const router = Router();

router.post('/login', (req, res, next) => {
  req.querier = { ip: req.ip, userAgent: req.headers['user-agent'] };
  next();
}, validate(loginSchema), handle(AuthService.login));

router.post('/refreshToken', validate(refreshTokenSchema), handle(AuthService.refreshToken));
router.get('/profile', authenticate, handle(AuthService.profile));
router.post('/logout', authenticate, handle(AuthService.logout));

export const authRoutes = router;
