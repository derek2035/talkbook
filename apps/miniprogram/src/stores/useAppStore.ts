import { defineStore } from 'pinia';
import type { WeChatLoginResponse } from '@talkbook/contracts';

import {
  buildAvatarText,
  loadUserSession,
  saveUserSession,
  type UserSession
} from '../utils/auth-storage';

export const useAppStore = defineStore('app', {
  state: () => ({
    userProfile: loadUserSession() as UserSession | null
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.userProfile?.token),
    authToken: (state) => state.userProfile?.token ?? ''
  },
  actions: {
    setLoginSession(payload: WeChatLoginResponse) {
      this.userProfile = {
        ...payload,
        avatarText: buildAvatarText(payload.nickname)
      };
      saveUserSession(this.userProfile);
    },
    logout() {
      this.userProfile = null;
      saveUserSession(null);
    }
  }
});
