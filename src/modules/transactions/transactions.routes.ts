import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createTransactionHandler,
  deleteTransactionHandler,
  listTransactionsHandler,
  updateTransactionHandler,
} from './transactions.controller';
import {
  createTransactionSchema,
  transactionIdParamSchema,
  updateTransactionSchema,
} from './transactions.schema';

const transactionsRouter = Router();

transactionsRouter.use(authenticate);

transactionsRouter.get('/', listTransactionsHandler);
transactionsRouter.post(
  '/',
  validate({ body: createTransactionSchema }),
  createTransactionHandler
);
transactionsRouter.put(
  '/:id',
  validate({ params: transactionIdParamSchema, body: updateTransactionSchema }),
  updateTransactionHandler
);
transactionsRouter.delete(
  '/:id',
  validate({ params: transactionIdParamSchema }),
  deleteTransactionHandler
);

export { transactionsRouter };
