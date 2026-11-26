import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  listAuditLogsHandler,
  listNotificationsHandler,
  markAllReadHandler,
  markNotificationReadHandler,
} from './notifications.controller';

const notificationIdParamSchema = z.object({
  id: z.string().trim().min(1, 'ID notifikasi tidak valid'),
});

const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get('/', listNotificationsHandler);
notificationsRouter.patch('/read-all', markAllReadHandler);
notificationsRouter.patch(
  '/:id/read',
  validate({ params: notificationIdParamSchema }),
  markNotificationReadHandler
);
notificationsRouter.get('/audit-logs', listAuditLogsHandler);

export { notificationsRouter };
