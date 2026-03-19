<template>
  <view class="page">
    <view class="hero">
      <text class="eyebrow">Talkbook / 口书</text>
      <text class="title">把一次次讲述，整理成一本真正的书。</text>
      <text class="desc">先在本地跑通 MVP：选类型、模拟采访、生成目录预览。</text>
      <view class="hero-meta">
        <view class="meta-card">
          <text class="meta-label">最近书稿</text>
          <text class="meta-value">{{ bookCount }}</text>
        </view>
        <view class="meta-card">
          <text class="meta-label">当前状态</text>
          <text class="meta-value">{{ latestBookTitle }}</text>
        </view>
      </view>
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

    <text v-if="errorMessage" class="error">{{ errorMessage }}</text>
    <button class="primary" :loading="creating" @tap="start">开始创作</button>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import type { BookType } from '@talkbook/contracts';
import { storeToRefs } from 'pinia';

import { getMyBooks, postSession } from '../../services/api';
import { useCreationStore } from '../../stores/useCreationStore';

const store = useCreationStore();
const { bookTypes, selectedBookType } = storeToRefs(store);
const creating = ref(false);
const errorMessage = ref('');
const bookCount = ref(0);
const latestBookTitle = computed(() => {
  if (bookCount.value === 0) {
    return '还没有生成预览';
  }

  return latestBookLabel.value;
});
const latestBookLabel = ref('已有草稿');

function choose(bookType: BookType) {
  store.setBookType(bookType);
}

async function loadMyBooks() {
  try {
    const result = await getMyBooks();
    bookCount.value = result.items.length;
    latestBookLabel.value = result.items[0]?.title ?? '已有草稿';
  } catch (error) {
    console.error(error);
  }
}

async function start() {
  creating.value = true;
  errorMessage.value = '';

  try {
    const session = await postSession(selectedBookType.value);
    store.setSession(session);
    uni.navigateTo({ url: '/pages/interview/index' });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '创建会话失败，请确认本地服务端已启动。';
  } finally {
    creating.value = false;
  }
}

onShow(() => {
  loadMyBooks();
});
</script>

<style scoped>
.page { padding: 32rpx; }
.hero {
  margin: 24rpx 0 32rpx;
  padding: 36rpx 32rpx;
  border-radius: 32rpx;
  background: linear-gradient(140deg, #102542 0%, #1f3c88 52%, #d4a373 100%);
  color: #fffdf8;
}
.eyebrow { display:block; font-size:22rpx; letter-spacing:4rpx; opacity:0.78; text-transform:uppercase; }
.title { display:block; margin-top:16rpx; font-size:54rpx; line-height:1.2; font-weight:700; }
.desc { display:block; margin-top:18rpx; color:rgba(255, 253, 248, 0.82); font-size:28rpx; line-height:1.6; }
.hero-meta { display:flex; gap:16rpx; margin-top:28rpx; }
.meta-card {
  flex:1;
  padding:20rpx;
  border-radius:24rpx;
  background:rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12rpx);
}
.meta-label { display:block; font-size:22rpx; opacity:0.74; }
.meta-value { display:block; margin-top:8rpx; font-size:28rpx; font-weight:600; }
.card { background:#fffdf9; border-radius:28rpx; padding:24rpx; box-shadow:0 18rpx 40rpx rgba(16, 37, 66, 0.08); }
.section-title { display:block; margin-bottom:20rpx; font-size:32rpx; font-weight:600; }
.book-type { border:2rpx solid #e6ded2; border-radius:24rpx; padding:24rpx; margin-bottom:16rpx; background:#fff; }
.book-type.active { border-color:#1f3c88; background:#eef3ff; }
.name { display:block; font-size:30rpx; font-weight:600; }
.description { display:block; margin-top:8rpx; color:#5b6578; font-size:26rpx; line-height:1.5; }
.error { display:block; margin-top:20rpx; color:#b42318; font-size:24rpx; }
.primary { margin-top:28rpx; background:#102542; color:#fff; border-radius:999rpx; }
</style>
