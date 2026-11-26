import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import * as notificationsService from './notifications.service';

export async function listNotificationsHandler(req: Request, res: Response) {
  const data = await notificationsService.listNotifications(req.user!.userId);
  return sendSuccess(res, 'Daftar notifikasi berhasil diambil', data);
}

export async function markNotificationReadHandler(req: Request, res: Response) {
  const updated = await notificationsService.markNotificationRead(
    req.user!.userId,
    String(req.params.id)
  );
  return sendSuccess(res, 'Notifikasi ditandai sudah dibaca', updated);
}

export async function markAllReadHandler(req: Request, res: Response) {
  const result = await notificationsService.markAllNotificationsRead(req.user!.userId);
  return sendSuccess(res, 'Semua notifikasi ditandai sudah dibaca', result);
}

export async function listAuditLogsHandler(req: Request, res: Response) {
  const logs = await notificationsService.listAuditLogs(req.user!.userId);
  return sendSuccess(res, 'Riwayat audit log berhasil diambil', logs);
}
