import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import {
  aiChatRateLimiter,
  aiRateLimiter,
} from '../../middlewares/rateLimit.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  aiChatHandler,
  dismissAnomalyHandler,
  generateAdvisorHandler,
  getAdvisorHandler,
  getForecastHandler,
} from './ai.controller';
import {
  aiChatSchema,
  anomalyIdParamSchema,
  generateAdvisorSchema,
} from './ai.schema';

const aiRouter = Router();

aiRouter.use(authenticate);

aiRouter.get('/forecast', getForecastHandler);
aiRouter.patch(
  '/anomalies/:id/dismiss',
  validate({ params: anomalyIdParamSchema }),
  dismissAnomalyHandler
);
aiRouter.get('/advisor', getAdvisorHandler);
aiRouter.post(
  '/advisor/generate',
  aiRateLimiter,
  validate({ body: generateAdvisorSchema }),
  generateAdvisorHandler
);
aiRouter.post(
  '/chat',
  aiChatRateLimiter,
  validate({ body: aiChatSchema }),
  aiChatHandler
);

export { aiRouter };
