<template>
  <view class="tb-bottom-nav">
    <button
      class="tb-bottom-nav__item"
      :class="{ 'tb-bottom-nav__item--active': current === 'create' }"
      @tap="go('/pages/home/index', current !== 'create')"
    >
      创作
    </button>
    <button
      class="tb-bottom-nav__item"
      :class="{ 'tb-bottom-nav__item--active': current === 'books' }"
      @tap="go('/pages/profile/index', current !== 'books')"
    >
      我的书稿
    </button>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  current: 'create' | 'books';
}>();

function go(url: string, shouldJump: boolean) {
  if (!shouldJump) {
    return;
  }

  uni.reLaunch({ url });
}
</script>
