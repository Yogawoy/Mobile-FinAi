import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  deleteBudgetHandler,
  getBudgetByIdHandler,
  listBudgetsHandler,
  updateBudgetHandler,
  upsertBudgetHandler,
} from './budgets.controller';
import {
  budgetIdParamSchema,
  updateBudgetSchema,
  upsertBudgetSchema,
} from './budgets.schema';

const budgetsRouter = Router();

budgetsRouter.use(authenticate);

budgetsRouter.get('/', listBudgetsHandler);
budgetsRouter.get(
  '/:id',
  validate({ params: budgetIdParamSchema }),
  getBudgetByIdHandler
);
budgetsRouter.post('/', validate({ body: upsertBudgetSchema }), upsertBudgetHandler);
budgetsRouter.put(
  '/:id',
  validate({ params: budgetIdParamSchema, body: updateBudgetSchema }),
  updateBudgetHandler
);
budgetsRouter.patch(
  '/:id',
  validate({ params: budgetIdParamSchema, body: updateBudgetSchema }),
  updateBudgetHandler
);
budgetsRouter.delete(
  '/:id',
  validate({ params: budgetIdParamSchema }),
  deleteBudgetHandler
);

export { budgetsRouter };
