<template>
  <view class="tb-topbar" :class="{ 'tb-topbar--back': back }">
    <button v-if="back" class="back-button" @tap="$emit('back')">
      <text class="back-button__arrow">‹</text>
      <text class="back-button__label">返回</text>
    </button>

    <text class="tb-topbar__title">{{ title }}</text>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  back?: boolean;
}>();

defineEmits<{
  back: [];
}>();
</script>

<style scoped>
.back-button {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  min-height: 88rpx;
  padding: 0 10rpx 0 0;
  color: var(--tb-text);
}

.back-button__arrow {
  font-size: 40rpx;
  line-height: 1;
}

.back-button__label {
  font-size: 26rpx;
  font-weight: 400;
}
</style>
