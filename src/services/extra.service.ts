import { apiRequest } from '@/lib/api-client';
import type {
  AIChatRequest,
  AIChatResponseData,
  UpdateSettingsPayload,
  UserSettings,
} from '@/types/api';

export const settingsService = {
  getSettings() {
    return apiRequest<{ settings: UserSettings }>('/api/settings');
  },

  updateSettings(payload: UpdateSettingsPayload) {
    return apiRequest<{ settings: UserSettings }>('/api/settings', {
      method: 'PATCH',
      body: payload,
    });
  },
};

export const aiService = {
  sendChatMessage(payload: AIChatRequest) {
    return apiRequest<AIChatResponseData>('/api/ai/chat', {
      method: 'POST',
      body: payload,
      timeoutMs: 60000,
    });
  },
};
