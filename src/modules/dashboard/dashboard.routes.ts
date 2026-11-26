import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { getDashboardSummaryHandler } from './dashboard.controller';

const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get('/summary', getDashboardSummaryHandler);

export { dashboardRouter };
