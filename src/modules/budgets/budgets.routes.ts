import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  deleteBudgetHandler,
  listBudgetsHandler,
  upsertBudgetHandler,
} from './budgets.controller';
import { budgetIdParamSchema, upsertBudgetSchema } from './budgets.schema';

const budgetsRouter = Router();

budgetsRouter.use(authenticate);

budgetsRouter.get('/', listBudgetsHandler);
budgetsRouter.post('/', validate({ body: upsertBudgetSchema }), upsertBudgetHandler);
budgetsRouter.delete(
  '/:id',
  validate({ params: budgetIdParamSchema }),
  deleteBudgetHandler
);

export { budgetsRouter };
