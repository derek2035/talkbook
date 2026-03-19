<template>
  <view class="page">
    <view class="panel">
      <text class="title">我的</text>
      <text class="item">书稿：{{ books.length }}</text>
      <text class="item">会员：未开通</text>
      <text class="item">说明：当前列表来自本地内存服务，仅用于 MVP 演示。</text>
    </view>

    <view v-if="books.length" class="panel">
      <text class="section-title">最近生成</text>
      <view
        v-for="book in books"
        :key="book.bookId"
        class="book-card"
      >
        <text class="book-title">{{ book.title }}</text>
        <text class="book-summary">{{ book.summary }}</text>
        <text class="book-meta">{{ book.status }} · {{ book.updatedAt }}</text>
      </view>
    </view>

    <view v-else class="panel">
      <text class="empty">还没有生成过书稿预览，先去首页开始创作。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import type { MyBookItem } from '@talkbook/contracts';

import { getMyBooks } from '../../services/api';

const books = ref<MyBookItem[]>([]);

async function loadBooks() {
  try {
    const result = await getMyBooks();
    books.value = result.items;
  } catch (error) {
    console.error(error);
  }
}

onShow(() => {
  loadBooks();
});
</script>

<style scoped>
.page { padding: 32rpx; }
.panel {
  background:#fffdf9;
  border-radius:28rpx;
  padding:24rpx;
  margin-bottom:24rpx;
  box-shadow:0 16rpx 30rpx rgba(16, 37, 66, 0.06);
}
.title { display:block; font-size:36rpx; font-weight:700; margin-bottom:16rpx; }
.item { display:block; margin-top:10rpx; color:#4b5563; }
.section-title { display:block; font-size:28rpx; font-weight:600; color:#8c6a43; }
.book-card {
  margin-top:18rpx;
  padding:18rpx 20rpx;
  border-radius:22rpx;
  background:#f7f4ee;
}
.book-title { display:block; font-size:30rpx; font-weight:600; color:#172033; }
.book-summary { display:block; margin-top:8rpx; color:#5f6980; line-height:1.6; }
.book-meta { display:block; margin-top:8rpx; color:#8b95a7; font-size:22rpx; }
.empty { display:block; color:#6b7280; line-height:1.6; }
</style>
