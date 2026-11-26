import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  contributeGoalHandler,
  createGoalHandler,
  deleteGoalHandler,
  listGoalsHandler,
  updateGoalHandler,
} from './goals.controller';
import {
  contributeGoalSchema,
  createGoalSchema,
  goalIdParamSchema,
  updateGoalSchema,
} from './goals.schema';

const goalsRouter = Router();

goalsRouter.use(authenticate);

goalsRouter.get('/', listGoalsHandler);
goalsRouter.post('/', validate({ body: createGoalSchema }), createGoalHandler);
goalsRouter.put(
  '/:id',
  validate({ params: goalIdParamSchema, body: updateGoalSchema }),
  updateGoalHandler
);
goalsRouter.patch(
  '/:id/contribute',
  validate({ params: goalIdParamSchema, body: contributeGoalSchema }),
  contributeGoalHandler
);
goalsRouter.delete(
  '/:id',
  validate({ params: goalIdParamSchema }),
  deleteGoalHandler
);

export { goalsRouter };
