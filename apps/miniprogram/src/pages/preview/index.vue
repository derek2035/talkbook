<template>
  <view class="page">
    <view class="hero">
      <text class="eyebrow">Preview</text>
      <text class="title">{{ preview?.title || '书稿预览' }}</text>
      <text class="desc">{{ preview?.summary || '当前阶段将先展示预览结构，后续再接入真实生成内容。' }}</text>
    </view>

    <view class="panel status-card">
      <text class="label">生成状态</text>
      <text class="status">{{ preview?.paymentRequired ? '已生成预览，完整版需要后续支付能力' : '已可直接导出' }}</text>
      <text class="book-id">Book ID: {{ preview?.bookId || '尚未生成' }}</text>
    </view>

    <view v-if="preview?.outline?.length" class="panel">
      <text class="section-title">目录草稿</text>
      <view
        v-for="chapter in preview.outline"
        :key="chapter.title"
        class="chapter-card"
      >
        <text class="chapter">{{ chapter.title }}</text>
        <text class="summary">{{ chapter.summary }}</text>
      </view>
    </view>

    <view v-else class="panel">
      <text class="summary">还没有可展示的预览，请先回到采访页完成至少两次回答。</text>
    </view>

    <button class="secondary" @tap="backToInterview">继续补充素材</button>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { storeToRefs } from 'pinia';

import { postPreview } from '../../services/api';
import { useCreationStore } from '../../stores/useCreationStore';

const store = useCreationStore();
const { preview, sessionId } = storeToRefs(store);

async function ensurePreview() {
  if (preview.value || !sessionId.value) {
    return;
  }

  try {
    const result = await postPreview(sessionId.value);
    store.setPreview(result);
  } catch (error) {
    console.error(error);
  }
}

function backToInterview() {
  uni.navigateBack();
}

onLoad(() => {
  ensurePreview();
});
</script>

<style scoped>
.page { padding: 32rpx; }
.hero {
  padding: 32rpx;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #f3ede2 0%, #fff7ed 100%);
  margin-bottom: 24rpx;
}
.eyebrow { display:block; font-size:22rpx; letter-spacing:4rpx; color:#8c6a43; text-transform:uppercase; }
.title { display:block; margin-top:14rpx; font-size:44rpx; font-weight:700; color:#172033; }
.desc { display:block; margin-top:12rpx; color:#5f6980; line-height:1.6; }
.panel {
  background:#fffdf9;
  border-radius:28rpx;
  padding:24rpx;
  margin-bottom:20rpx;
  box-shadow:0 16rpx 30rpx rgba(16, 37, 66, 0.06);
}
.label, .section-title { display:block; color:#8c6a43; font-size:24rpx; }
.status { display:block; margin-top:10rpx; font-size:30rpx; font-weight:600; color:#172033; }
.book-id { display:block; margin-top:10rpx; color:#6b7280; font-size:24rpx; }
.chapter-card {
  margin-top:18rpx;
  padding:20rpx;
  border-radius:22rpx;
  background:#f7f4ee;
}
.chapter { display:block; font-size:30rpx; font-weight:600; color:#172033; }
.summary { display:block; margin-top:10rpx; color:#5f6980; line-height:1.6; }
.secondary {
  background:#17324d;
  color:#fff;
  border-radius:999rpx;
}
</style>
