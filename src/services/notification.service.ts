import { apiRequest } from '@/lib/api';

export interface BackendNotification {
  id: string;
  userId: string;
  type:
    | 'BUDGET_ALERT'
    | 'ANOMALY_ALERT'
    | 'RECURRING_REMINDER'
    | 'GOAL_MILESTONE'
    | 'SYSTEM';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface BackendAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

export const notificationService = {
  getNotifications() {
    return apiRequest<{
      unreadCount: number;
      items: BackendNotification[];
    }>('/notifications');
  },

  markAsRead(id: string) {
    return apiRequest<BackendNotification>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  markAllRead() {
    return apiRequest<{ updatedCount: number }>('/notifications/read-all', {
      method: 'PATCH',
    });
  },

  getAuditLogs() {
    return apiRequest<BackendAuditLog[]>('/notifications/audit-logs');
  },
};
