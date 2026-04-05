import type { WeChatLoginResponse } from '@talkbook/contracts';

export interface UserSession extends WeChatLoginResponse {
  avatarText: string;
}

export const USER_SESSION_STORAGE_KEY = 'talkbook_user_session';

export function buildAvatarText(nickname: string) {
  const normalized = nickname.trim();
  return normalized ? normalized.slice(0, 1).toUpperCase() : '我';
}

export function loadUserSession() {
  try {
    const value = uni.getStorageSync(USER_SESSION_STORAGE_KEY);
    if (!value) {
      return null;
    }

    return value as UserSession;
  } catch {
    return null;
  }
}

export function saveUserSession(session: UserSession | null) {
  try {
    if (session) {
      uni.setStorageSync(USER_SESSION_STORAGE_KEY, session);
      return;
    }

    uni.removeStorageSync(USER_SESSION_STORAGE_KEY);
  } catch {
    // ignore storage errors on client
  }
}
