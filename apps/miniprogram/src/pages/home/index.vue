<template>
  <view class="page">
    <view class="hero">
      <text class="title">口书</text>
      <text class="desc">选类型、聊故事、生成书稿。</text>
    </view>

    <view class="card">
      <text class="section-title">选择一本你想完成的书</text>
      <view
        v-for="item in bookTypes"
        :key="item.key"
        class="book-type"
        :class="{ active: item.key === selectedBookType }"
        @tap="choose(item.key)"
      >
        <text class="name">{{ item.label }}</text>
        <text class="description">{{ item.description }}</text>
      </view>
    </view>

    <button class="primary" @tap="start">开始创作</button>
  </view>
</template>

<script setup lang="ts">
import type { BookType } from '@talkbook/contracts';
import { storeToRefs } from 'pinia';

import { postSession } from '../../services/api';
import { useCreationStore } from '../../stores/useCreationStore';

const store = useCreationStore();
const { bookTypes, selectedBookType } = storeToRefs(store);

function choose(bookType: BookType) {
  store.setBookType(bookType);
}

async function start() {
  const result = await postSession(selectedBookType.value);
  const data = result.data as { sessionId: string; firstQuestion: string };
  store.setSession(data.sessionId, data.firstQuestion);
  uni.navigateTo({ url: '/pages/interview/index' });
}
</script>

<style scoped>
.page { padding: 32rpx; }
.hero { margin: 40rpx 0; }
.title { display:block; font-size:56rpx; font-weight:700; }
.desc { display:block; margin-top:12rpx; color:#6b7280; }
.card { background:#fff; border-radius:24rpx; padding:24rpx; }
.section-title { display:block; margin-bottom:20rpx; font-size:32rpx; font-weight:600; }
.book-type { border:2rpx solid #e5e7eb; border-radius:20rpx; padding:24rpx; margin-bottom:16rpx; }
.book-type.active { border-color:#4f46e5; background:#eef2ff; }
.name { display:block; font-size:30rpx; font-weight:600; }
.description { display:block; margin-top:8rpx; color:#6b7280; font-size:26rpx; }
.primary { margin-top:28rpx; background:#111827; color:#fff; border-radius:999rpx; }
</style>
