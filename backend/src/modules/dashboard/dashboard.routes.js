import { Router } from 'express';
import { handle } from '../../shared/utils/handle.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { DashboardService } from './DashboardService.js';

const router = Router();

router.get('/stats', authenticate, handle(DashboardService.stats));

export const dashboardRoutes = router;
