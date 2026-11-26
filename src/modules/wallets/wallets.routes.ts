import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createWalletHandler,
  deleteWalletHandler,
  listWalletsHandler,
  updateWalletHandler,
} from './wallets.controller';
import {
  createWalletSchema,
  updateWalletSchema,
  walletIdParamSchema,
} from './wallets.schema';

const walletsRouter = Router();

walletsRouter.use(authenticate);

walletsRouter.get('/', listWalletsHandler);
walletsRouter.post('/', validate({ body: createWalletSchema }), createWalletHandler);
walletsRouter.put(
  '/:id',
  validate({ params: walletIdParamSchema, body: updateWalletSchema }),
  updateWalletHandler
);
walletsRouter.delete(
  '/:id',
  validate({ params: walletIdParamSchema }),
  deleteWalletHandler
);

export { walletsRouter };
