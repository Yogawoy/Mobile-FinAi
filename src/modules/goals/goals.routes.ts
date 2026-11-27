import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  contributeGoalHandler,
  createGoalHandler,
  deleteGoalHandler,
  getGoalDetailHandler,
  listGoalsHandler,
  updateGoalHandler,
  withdrawGoalHandler,
} from './goals.controller';
import {
  contributeGoalSchema,
  createGoalSchema,
  goalIdParamSchema,
  updateGoalSchema,
  withdrawGoalSchema,
} from './goals.schema';

const goalsRouter = Router();

goalsRouter.use(authenticate);

goalsRouter.get('/', listGoalsHandler);
goalsRouter.get(
  '/:id',
  validate({ params: goalIdParamSchema }),
  getGoalDetailHandler
);
goalsRouter.post('/', validate({ body: createGoalSchema }), createGoalHandler);
goalsRouter.put(
  '/:id',
  validate({ params: goalIdParamSchema, body: updateGoalSchema }),
  updateGoalHandler
);
goalsRouter.post(
  '/:id/contribute',
  validate({ params: goalIdParamSchema, body: contributeGoalSchema }),
  contributeGoalHandler
);
goalsRouter.patch(
  '/:id/contribute',
  validate({ params: goalIdParamSchema, body: contributeGoalSchema }),
  contributeGoalHandler
);
goalsRouter.post(
  '/:id/withdraw',
  validate({ params: goalIdParamSchema, body: withdrawGoalSchema }),
  withdrawGoalHandler
);
goalsRouter.delete(
  '/:id',
  validate({ params: goalIdParamSchema }),
  deleteGoalHandler
);

export { goalsRouter };
