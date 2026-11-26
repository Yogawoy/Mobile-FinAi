import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createRecurringHandler,
  deleteRecurringHandler,
  executeRecurringHandler,
  listRecurringHandler,
  updateRecurringHandler,
} from './recurring.controller';
import {
  createRecurringSchema,
  recurringIdParamSchema,
  updateRecurringSchema,
} from './recurring.schema';

const recurringRouter = Router();

recurringRouter.use(authenticate);

recurringRouter.get('/', listRecurringHandler);
recurringRouter.post('/', validate({ body: createRecurringSchema }), createRecurringHandler);
recurringRouter.put(
  '/:id',
  validate({ params: recurringIdParamSchema, body: updateRecurringSchema }),
  updateRecurringHandler
);
recurringRouter.delete(
  '/:id',
  validate({ params: recurringIdParamSchema }),
  deleteRecurringHandler
);
recurringRouter.post(
  '/:id/execute',
  validate({ params: recurringIdParamSchema }),
  executeRecurringHandler
);

export { recurringRouter };
