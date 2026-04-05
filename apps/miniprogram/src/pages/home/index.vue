<template>
  <view class="tb-page tb-safe-bottom">
    <view class="tb-content">
      <view class="intro-card">
        <text class="intro-card__title">通过对话，把珍贵回忆慢慢整理成一本书。</text>
      </view>

      <view class="section">
        <text class="tb-section-title">选择书稿类型</text>
        <view class="type-grid">
          <button
            v-for="item in bookTypes"
            :key="item.key"
            class="type-card"
            :class="{ 'type-card--active': item.key === selectedBookType }"
            @tap="choose(item.key)"
          >
            <text class="type-card__title">{{ item.label }}</text>
            <text class="type-card__desc">{{ item.description }}</text>
            <text v-if="item.key === selectedBookType" class="type-card__tag">已选择</text>
          </button>
        </view>
      </view>

      <text v-if="errorMessage" class="error-message">{{ errorMessage }}</text>

      <button class="tb-primary-button start-button" :loading="creating" @tap="start">
        开始创作
      </button>
    </view>

    <BottomNav current="create" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import type { BookType } from '@talkbook/contracts';
import { storeToRefs } from 'pinia';

import BottomNav from '../../components/BottomNav.vue';
import { postSession } from '../../services/api';
import { useAppStore } from '../../stores/useAppStore';
import { useCreationStore } from '../../stores/useCreationStore';

const appStore = useAppStore();
const creationStore = useCreationStore();
const { bookTypes, selectedBookType } = storeToRefs(creationStore);

const creating = ref(false);
const errorMessage = ref('');
const pendingAutoStart = ref(false);

const canStart = computed(() => appStore.isLoggedIn);

function choose(bookType: BookType) {
  creationStore.setBookType(bookType);
}

async function start() {
  if (!canStart.value) {
    pendingAutoStart.value = true;
    uni.navigateTo({
      url: `/pages/login/index?redirect=${encodeURIComponent('/pages/home/index?autoStart=1')}`
    });
    return;
  }

  creating.value = true;
  errorMessage.value = '';

  try {
    const session = await postSession(selectedBookType.value);
    creationStore.setSession(session);
    uni.navigateTo({
      url: `/pages/interview/index?sessionId=${session.sessionId}`
    });
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '创建会话失败，请确认本地服务端已启动。';
  } finally {
    creating.value = false;
  }
}

onLoad((query) => {
  pendingAutoStart.value = query?.autoStart === '1';
});

onShow(() => {
  if (pendingAutoStart.value && appStore.isLoggedIn && !creating.value) {
    pendingAutoStart.value = false;
    start();
  }
});
</script>

<style scoped>
.intro-card {
  padding: 36rpx 32rpx;
  border-radius: 36rpx;
  background: linear-gradient(180deg, #fff1ed 0%, #fdeae4 100%);
}

.intro-card__title {
  display: block;
  font-size: 46rpx;
  line-height: 1.28;
  font-weight: 700;
  color: var(--tb-primary);
}

.section {
  margin-top: 28rpx;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
  margin-top: 18rpx;
}

.type-card {
  min-height: 228rpx;
  padding: 26rpx;
  border-radius: 28rpx;
  background: var(--tb-surface-card);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  text-align: left;
}

.type-card--active {
  background: #ffd9cd;
  box-shadow: inset 0 0 0 2rpx rgba(155, 63, 30, 0.18);
}

.type-card__title {
  font-size: 32rpx;
  line-height: 1.35;
  font-weight: 700;
  color: var(--tb-text);
}

.type-card__desc {
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--tb-text-muted);
}

.type-card__tag {
  margin-top: 18rpx;
  padding: 8rpx 16rpx;
  border-radius: var(--tb-radius-pill);
  font-size: 22rpx;
  font-weight: 600;
  color: var(--tb-secondary);
  background: rgba(255, 255, 255, 0.72);
}

.error-message {
  display: block;
  margin-top: 22rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--tb-danger);
}

.start-button {
  width: 100%;
  margin-top: 28rpx;
}
</style>
