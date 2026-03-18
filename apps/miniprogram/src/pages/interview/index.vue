<template>
  <view class="page">
    <view class="panel">
      <text class="label">当前会话</text>
      <text class="value">{{ sessionId || '尚未创建' }}</text>
    </view>

    <view class="panel">
      <text class="label">AI 当前问题</text>
      <text class="question">{{ currentQuestion || '开始创作后会出现第一问。' }}</text>
    </view>

    <button class="primary" :disabled="!sessionId" @tap="goPreview">生成书稿预览</button>
  </view>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';

import { useCreationStore } from '../../stores/useCreationStore';

const store = useCreationStore();
const { sessionId, currentQuestion } = storeToRefs(store);

function goPreview() {
  uni.navigateTo({ url: '/pages/preview/index' });
}
</script>

<style scoped>
.page { padding: 32rpx; }
.panel { background:#fff; border-radius:24rpx; padding:24rpx; margin-bottom:24rpx; }
.label { display:block; color:#6b7280; font-size:24rpx; }
.value, .question { display:block; margin-top:12rpx; font-size:32rpx; font-weight:600; }
.primary { background:#4f46e5; color:#fff; border-radius:999rpx; }
</style>
