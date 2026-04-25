<template>
  <view class="tb-page">
    <PageHeader title="微信登录" back @back="goBack" />

    <view class="tb-content login-content">
      <view class="login-card">
        <text class="login-card__title">继续之前，先确认你的身份</text>
        <text class="login-card__desc">点击后会发起微信登录授权，并在服务端换取用户身份。</text>

        <view class="profile-form">
          <view class="profile-form__row">
            <view class="profile-form__header">
              <text class="profile-form__label">微信头像</text>
              <text class="profile-form__hint">点击头像可重新选择</text>
            </view>

            <button class="avatar-picker" open-type="chooseAvatar" @chooseavatar="handleChooseAvatar">
              <image v-if="draftAvatarUrl" class="avatar-picker__image" :src="draftAvatarUrl" mode="aspectFill" />
              <view v-else class="avatar-picker__placeholder">
                <text class="avatar-picker__icon">头像</text>
                <text class="avatar-picker__tip">点此选择</text>
              </view>
            </button>
          </view>

          <view class="profile-form__row">
            <view class="profile-form__header">
              <text class="profile-form__label">微信昵称</text>
              <text class="profile-form__hint">用于在“我的书稿”中展示</text>
            </view>

            <input
              v-model.trim="draftNickname"
              class="profile-form__input"
              type="nickname"
              maxlength="20"
              placeholder="请输入或选择微信昵称"
              placeholder-class="profile-form__placeholder"
            />
          </view>
        </view>

        <view class="login-card__tips">
          <text class="login-card__tip">登录后才能进入创作链路和我的书稿。</text>
          <text class="login-card__tip">登录成功后会自动回到你刚才要去的页面。</text>
          <text class="login-card__tip">头像和昵称会展示在“我的书稿”页面。</text>
        </view>

        <button class="tb-primary-button login-card__button" :loading="loggingIn" @tap="handleLogin">
          使用微信身份继续
        </button>
        <button class="tb-ghost-button login-card__button" @tap="goBack">暂不登录</button>

        <view class="agreement-row">
          <text class="agreement-row__text">继续即表示你已阅读并同意</text>
          <button class="agreement-row__link" @tap="openPolicy('terms')">《用户协议》</button>
          <text class="agreement-row__text">和</text>
          <button class="agreement-row__link" @tap="openPolicy('privacy')">《隐私政策》</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { WeChatLoginResponse } from '@talkbook/contracts';
import { onLoad } from '@dcloudio/uni-app';

import PageHeader from '../../components/PageHeader.vue';
import { API_BASE_URL, postWeChatLogin } from '../../services/api';
import { useAppStore } from '../../stores/useAppStore';

const appStore = useAppStore();
const redirectUrl = ref('/pages/home/index');
const loggingIn = ref(false);
const draftNickname = ref('');
const draftAvatarUrl = ref('');

function goBack() {
  const pageCount = getCurrentPages().length;

  if (pageCount > 1) {
    uni.navigateBack();
    return;
  }

  uni.reLaunch({ url: '/pages/home/index' });
}

function requestLoginCode() {
  return new Promise<string>((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (result) => {
        if (result.code) {
          resolve(result.code);
          return;
        }

        reject(new Error('未获取到微信登录 code'));
      },
      fail: (error) => reject(error)
    });
  });
}

function isLocalApiBaseUrl() {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(API_BASE_URL);
}

function isRealDevicePreview() {
  const systemInfo = uni.getSystemInfoSync();
  return systemInfo.platform !== 'devtools';
}

function buildPreviewMockSession(code: string): WeChatLoginResponse {
  const suffix = code.slice(-6) || 'preview';

  return {
    userId: `user_preview_${suffix}`,
    openId: `preview_openid_${suffix}`,
    nickname: '开发预览用户',
    avatarUrl: '',
    token: `tk_preview_${Date.now()}`,
    loginMode: 'mock'
  };
}

function handleChooseAvatar(event: { detail?: { avatarUrl?: string } }) {
  if (event.detail?.avatarUrl) {
    draftAvatarUrl.value = event.detail.avatarUrl;
  }
}

function applyProfileDraft(session: WeChatLoginResponse): WeChatLoginResponse {
  return {
    ...session,
    nickname: draftNickname.value || session.nickname,
    avatarUrl: draftAvatarUrl.value || session.avatarUrl
  };
}

function openPolicy(type: 'privacy' | 'terms') {
  uni.navigateTo({
    url: type === 'privacy' ? '/pages/privacy/index' : '/pages/terms/index'
  });
}

async function handleLogin() {
  loggingIn.value = true;

  try {
    const code = await requestLoginCode();
    const session =
      isRealDevicePreview() && isLocalApiBaseUrl()
        ? buildPreviewMockSession(code)
        : await postWeChatLogin({ code });
    appStore.setLoginSession(applyProfileDraft(session));
    uni.showToast({
      title:
        session.loginMode === 'mock' && isLocalApiBaseUrl()
          ? '预览环境已进入开发登录态'
          : session.loginMode === 'mock'
            ? '已进入开发登录态'
            : '微信登录成功',
      icon: 'none'
    });

    setTimeout(() => {
      uni.reLaunch({ url: redirectUrl.value });
    }, 250);
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : '微信登录失败',
      icon: 'none'
    });
  } finally {
    loggingIn.value = false;
  }
}

onLoad((query) => {
  if (typeof query?.redirect === 'string' && query.redirect) {
    redirectUrl.value = decodeURIComponent(query.redirect);
  }
});
</script>

<style scoped>
.login-content {
  padding-top: 36rpx;
}

.login-card {
  padding: 38rpx 30rpx;
  border-radius: 20rpx;
  background: #fff;
  box-shadow: none;
}

.login-card__title {
  display: block;
  font-size: 42rpx;
  line-height: 1.35;
  font-weight: 700;
  color: var(--tb-text);
}

.login-card__desc {
  display: block;
  margin-top: 16rpx;
  font-size: 28rpx;
  line-height: 1.75;
  color: var(--tb-text-muted);
}

.profile-form {
  margin-top: 28rpx;
  padding: 24rpx 24rpx 8rpx;
  border-radius: 16rpx;
  background: var(--tb-surface-low);
  border: 2rpx solid var(--tb-outline);
}

.profile-form__row {
  margin-bottom: 18rpx;
  padding: 20rpx;
  border-radius: 14rpx;
  background: #fff;
}

.profile-form__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
}

.avatar-picker {
  width: 152rpx;
  height: 152rpx;
  margin-top: 18rpx;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  overflow: hidden;
  background: var(--tb-secondary-soft);
  border: 3rpx solid rgba(7, 193, 96, 0.18);
  color: var(--tb-primary);
  font-size: 24rpx;
  font-weight: 700;
}

.avatar-picker::after {
  border: none;
}

.avatar-picker__image {
  width: 100%;
  height: 100%;
}

.avatar-picker__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.avatar-picker__icon {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--tb-primary);
}

.avatar-picker__tip {
  font-size: 20rpx;
  line-height: 1;
  color: var(--tb-text-muted);
}

.profile-form__label {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--tb-text);
}

.profile-form__hint {
  font-size: 22rpx;
  color: var(--tb-text-muted);
}

.profile-form__input {
  width: 100%;
  margin-top: 18rpx;
  min-height: 88rpx;
  padding: 0 24rpx;
  border-radius: 12rpx;
  background: #fff;
  border: 2rpx solid var(--tb-outline);
  font-size: 30rpx;
  color: var(--tb-text);
}

.profile-form__placeholder {
  color: #9d8b85;
}

.login-card__tips {
  margin-top: 26rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background: var(--tb-surface-low);
}

.login-card__tip {
  display: block;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--tb-text);
}

.login-card__tip + .login-card__tip {
  margin-top: 10rpx;
}

.login-card__button {
  width: 100%;
  margin-top: 22rpx;
}

.agreement-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  margin-top: 22rpx;
}

.agreement-row__text,
.agreement-row__link {
  font-size: 22rpx;
  line-height: 1.7;
}

.agreement-row__text {
  color: var(--tb-text-muted);
}

.agreement-row__link {
  color: var(--tb-primary);
  font-weight: 600;
}
</style>
