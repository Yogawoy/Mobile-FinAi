import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authRateLimiter } from '../../middlewares/rateLimit.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  getMeHandler,
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
  setupHandler,
  updateMeHandler,
} from './auth.controller';
import {
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  setupSchema,
  updateMeSchema,
} from './auth.schema';

const authRouter = Router();

authRouter.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  registerHandler
);

authRouter.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  loginHandler
);

authRouter.post(
  '/refresh',
  authRateLimiter,
  validate({ body: refreshSchema }),
  refreshHandler
);

authRouter.post(
  '/logout',
  authenticate,
  validate({ body: logoutSchema }),
  logoutHandler
);

authRouter.get('/me', authenticate, getMeHandler);

authRouter.put(
  '/me',
  authenticate,
  validate({ body: updateMeSchema }),
  updateMeHandler
);

authRouter.post(
  '/setup',
  authenticate,
  validate({ body: setupSchema }),
  setupHandler
);

export { authRouter };
