<template>
  <view class="tb-page">
    <PageHeader title="微信登录" back @back="goBack" />

    <view class="tb-content login-content">
      <view class="login-card">
        <text class="login-card__title">继续之前，先确认你的身份</text>
        <text class="login-card__desc">
          当前阶段先使用 mock 登录跑通小程序主链路。后续会替换成真实微信授权登录。
        </text>

        <view class="login-card__tips">
          <text class="login-card__tip">登录后才能进入创作链路和我的书稿。</text>
          <text class="login-card__tip">登录成功后会自动回到你刚才要去的页面。</text>
        </view>

        <button class="tb-primary-button login-card__button" @tap="handleLogin">使用微信身份继续</button>
        <button class="tb-ghost-button login-card__button" @tap="goBack">暂不登录</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

import PageHeader from '../../components/PageHeader.vue';
import { useAppStore } from '../../stores/useAppStore';

const appStore = useAppStore();
const redirectUrl = ref('/pages/home/index');

function goBack() {
  const pageCount = getCurrentPages().length;

  if (pageCount > 1) {
    uni.navigateBack();
    return;
  }

  uni.reLaunch({ url: '/pages/home/index' });
}

function handleLogin() {
  appStore.mockLogin();
  uni.showToast({
    title: '已进入 mock 登录态',
    icon: 'none'
  });

  setTimeout(() => {
    uni.reLaunch({ url: redirectUrl.value });
  }, 250);
}

onLoad((query) => {
  if (typeof query?.redirect === 'string' && query.redirect) {
    redirectUrl.value = decodeURIComponent(query.redirect);
  }
});
</script>

<style scoped>
.login-content {
  padding-top: 56rpx;
}

.login-card {
  padding: 38rpx 30rpx;
  border-radius: 36rpx;
  background: linear-gradient(180deg, #fff1ed 0%, #fdeae4 100%);
  box-shadow: var(--tb-shadow);
}

.login-card__title {
  display: block;
  font-size: 42rpx;
  line-height: 1.35;
  font-weight: 700;
  color: var(--tb-primary);
}

.login-card__desc {
  display: block;
  margin-top: 16rpx;
  font-size: 28rpx;
  line-height: 1.75;
  color: var(--tb-text-muted);
}

.login-card__tips {
  margin-top: 26rpx;
  padding: 24rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.7);
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
</style>
