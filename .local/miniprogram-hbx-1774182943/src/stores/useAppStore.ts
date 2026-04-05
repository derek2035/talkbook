import { defineStore } from 'pinia';

interface MockUserProfile {
  nickname: string;
  avatarText: string;
}

const STORAGE_KEY = 'talkbook_mock_user';

function loadProfile(): MockUserProfile | null {
  try {
    const value = uni.getStorageSync(STORAGE_KEY);
    if (!value) {
      return null;
    }

    return value as MockUserProfile;
  } catch {
    return null;
  }
}

function saveProfile(profile: MockUserProfile | null) {
  try {
    if (profile) {
      uni.setStorageSync(STORAGE_KEY, profile);
      return;
    }

    uni.removeStorageSync(STORAGE_KEY);
  } catch {
    // ignore storage errors in mock mode
  }
}

export const useAppStore = defineStore('app', {
  state: () => ({
    userProfile: loadProfile() as MockUserProfile | null
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.userProfile)
  },
  actions: {
    mockLogin() {
      this.userProfile = {
        nickname: '讲述者',
        avatarText: '讲'
      };
      saveProfile(this.userProfile);
    },
    logout() {
      this.userProfile = null;
      saveProfile(null);
    }
  }
});
