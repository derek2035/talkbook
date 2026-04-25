<template>
  <view class="tb-bottom-nav">
    <button
      class="tb-bottom-nav__item"
      :class="{ 'tb-bottom-nav__item--active': current === 'create' }"
      @tap="go('/pages/home/index', current !== 'create')"
    >
      <view class="tb-bottom-nav__icon tb-bottom-nav__icon--create">
        <view class="tb-bottom-nav__icon-line" />
        <view class="tb-bottom-nav__icon-dot" />
      </view>
      <text class="tb-bottom-nav__label">创作</text>
    </button>
    <button
      class="tb-bottom-nav__item"
      :class="{ 'tb-bottom-nav__item--active': current === 'books' }"
      @tap="go('/pages/profile/index', current !== 'books')"
    >
      <view class="tb-bottom-nav__icon tb-bottom-nav__icon--books">
        <view class="tb-bottom-nav__book-line" />
        <view class="tb-bottom-nav__book-line" />
      </view>
      <text class="tb-bottom-nav__label">书稿</text>
    </button>
  </view>
</template>

<script setup lang="ts">
import { useAppStore } from '../stores/useAppStore';

defineProps<{
  current: 'create' | 'books';
}>();

const appStore = useAppStore();

function go(url: string, shouldJump: boolean) {
  if (!shouldJump) {
    return;
  }

  if (url === '/pages/profile/index' && !appStore.isLoggedIn) {
    uni.navigateTo({
      url: `/pages/login/index?redirect=${encodeURIComponent(url)}`
    });
    return;
  }

  uni.reLaunch({ url });
}
</script>
