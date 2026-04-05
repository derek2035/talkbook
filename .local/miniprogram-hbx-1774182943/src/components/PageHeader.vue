<template>
  <view class="tb-topbar">
    <view class="tb-topbar__side">
      <button v-if="back" class="back-button" @tap="$emit('back')">
        <text class="back-button__arrow">‹</text>
        <text class="back-button__label">返回</text>
      </button>
    </view>

    <text class="tb-topbar__title">{{ title }}</text>

    <view class="tb-topbar__side tb-topbar__side--right">
      <button v-if="showLogin" class="login-entry" @tap="$emit('login')">
        <image class="login-entry__icon" src="/static/wechat.svg" mode="aspectFit" />
        <text class="login-entry__label">微信登录</text>
      </button>
      <button v-else-if="avatarText" class="avatar-entry" @tap="$emit('avatarTap')">
        <text class="avatar-entry__text">{{ avatarText }}</text>
      </button>
      <view v-else class="placeholder" />
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  back?: boolean;
  showLogin?: boolean;
  avatarText?: string;
}>();

defineEmits<{
  back: [];
  login: [];
  avatarTap: [];
}>();
</script>

<style scoped>
.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  min-height: 72rpx;
  padding: 0 10rpx 0 0;
  color: var(--tb-primary);
}

.back-button__arrow {
  font-size: 40rpx;
  line-height: 1;
}

.back-button__label {
  font-size: 26rpx;
  font-weight: 600;
}

.login-entry {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  min-height: 68rpx;
  padding: 0 24rpx;
  border-radius: var(--tb-radius-pill);
  background: var(--tb-surface-low);
}

.login-entry__icon {
  width: 32rpx;
  height: 32rpx;
}

.login-entry__label {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--tb-primary);
}

.avatar-entry {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  background: var(--tb-secondary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-entry__text {
  color: var(--tb-secondary);
  font-size: 26rpx;
  font-weight: 700;
}

.placeholder {
  width: 68rpx;
  height: 68rpx;
}
</style>
