import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SESSION_TOKEN_KEY = 'finai_session_token';
const API_URL_OVERRIDE_KEY = 'finai_api_url_override';

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getSessionToken(): Promise<string | null> {
  return getItem(SESSION_TOKEN_KEY);
}

export async function setSessionToken(token: string): Promise<void> {
  await setItem(SESSION_TOKEN_KEY, token);
}

export async function clearSessionToken(): Promise<void> {
  await deleteItem(SESSION_TOKEN_KEY);
}

export async function getApiUrlOverride(): Promise<string | null> {
  return getItem(API_URL_OVERRIDE_KEY);
}

export async function setApiUrlOverride(url: string | null): Promise<void> {
  if (!url || !url.trim()) {
    await deleteItem(API_URL_OVERRIDE_KEY);
    return;
  }
  await setItem(API_URL_OVERRIDE_KEY, url.trim().replace(/\/+$/, ''));
}
