import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { apiRateLimiter } from './middlewares/rateLimit.middleware';
import { aiRouter } from './modules/ai/ai.routes';
import { authRouter } from './modules/auth/auth.routes';
import { budgetsRouter } from './modules/budgets/budgets.routes';
import { categoriesRouter } from './modules/categories/categories.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { goalsRouter } from './modules/goals/goals.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { recurringRouter } from './modules/recurring/recurring.routes';
import { transactionsRouter } from './modules/transactions/transactions.routes';
import { walletsRouter } from './modules/wallets/wallets.routes';
import { sendError, sendSuccess } from './utils/response';

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa Origin header (React Native / Expo Mobile, curl, Postman)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin tidak diizinkan oleh CORS: ${origin}`));
    },
    credentials: true,
  })
);
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
if (env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    if (!req.originalUrl.startsWith('/api/')) {
      return next();
    }
    const startNs = process.hrtime.bigint();
    res.on('finish', () => {
      const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
      console.log(`[PERF] ${req.method} ${req.originalUrl} - ${elapsedMs.toFixed(1)}ms`);
    });
    next();
  });
}
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  return sendSuccess(res, 'Smart Finance API aktif', {
    status: 'ok',
    health: '/api/health',
  });
});

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return sendSuccess(res, 'Smart Finance API sehat', {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Healthcheck database gagal:', err);
    return sendError(res, 'Koneksi database bermasalah', 503, {
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

app.use('/api', apiRateLimiter);
app.use('/api/auth', authRouter);
app.use('/api/ai', aiRouter);
app.use('/api/wallets', walletsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/recurring', recurringRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/dashboard', dashboardRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
