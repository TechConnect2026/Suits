import api from '@/lib/axios';

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'openrouter' | 'groq';

export interface ApiKeyItem {
  id: string;
  provider: AIProvider;
  key_hint: string;
  is_active: boolean;
  model_preference?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddApiKeyPayload {
  provider: AIProvider;
  api_key: string;
  model_preference?: string;
  set_active?: boolean;
}

export interface TestApiKeyPayload {
  provider: AIProvider;
  api_key?: string;
  key_id?: string;
  model?: string;
}

export interface TestApiKeyResult {
  success: boolean;
  message: string;
  provider: string;
  latency_ms?: number;
  model?: string;
}

export const apiKeysService = {
  async listKeys(): Promise<ApiKeyItem[]> {
    const res = await api.get<ApiKeyItem[]>('/user/api-keys');
    return res.data;
  },

  async addKey(payload: AddApiKeyPayload): Promise<ApiKeyItem> {
    const res = await api.post<ApiKeyItem>('/user/api-keys', payload);
    return res.data;
  },

  async testKey(payload: TestApiKeyPayload): Promise<TestApiKeyResult> {
    const res = await api.post<TestApiKeyResult>('/user/api-keys/test', payload);
    return res.data;
  },

  async activateKey(keyId: string): Promise<ApiKeyItem> {
    const res = await api.patch<ApiKeyItem>(`/user/api-keys/${keyId}/activate`);
    return res.data;
  },

  async deactivateAll(): Promise<{ success: boolean; message: string }> {
    const res = await api.patch<{ success: boolean; message: string }>('/user/api-keys/deactivate-all');
    return res.data;
  },

  async deleteKey(keyId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<{ success: boolean; message: string }>(`/user/api-keys/${keyId}`);
    return res.data;
  },
};
