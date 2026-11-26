import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/errors';

export async function listNotifications(userId: string) {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return {
    unreadCount,
    items,
  };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!existing) {
    throw new AppError('Notifikasi tidak ditemukan', 404);
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { updatedCount: result.count };
}

export async function listAuditLogs(userId: string) {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}
