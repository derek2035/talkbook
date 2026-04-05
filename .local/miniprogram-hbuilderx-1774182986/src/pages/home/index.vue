<template>
  <view class="tb-page tb-safe-bottom">
    <PageHeader
      title="Talkbook"
      :show-login="!appStore.isLoggedIn"
      :avatar-text="appStore.userProfile?.avatarText"
      @login="handleMockLogin"
      @avatar-tap="showLoginToast"
    />

    <view class="tb-content">
      <view class="intro-card">
        <text class="intro-card__title">通过对话，把珍贵回忆慢慢整理成一本书。</text>
        <text class="intro-card__desc">
          先选择想写的类型，再由 AI 一问一问带你开始。当前阶段先用 mock 登录跑通完整创作链路。
        </text>
        <view class="intro-card__meta">
          <view class="intro-card__meta-item">
            <text class="intro-card__meta-label">书稿数量</text>
            <text class="intro-card__meta-value">{{ bookCount }}</text>
          </view>
          <view class="intro-card__meta-item">
            <text class="intro-card__meta-label">最近书稿</text>
            <text class="intro-card__meta-value intro-card__meta-value--small">{{ latestBookTitle }}</text>
          </view>
        </view>
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

      <view class="section tb-card recent-card">
        <text class="recent-card__title">最近创作进度</text>
        <text class="recent-card__text">
          {{ bookCount > 0 ? `你最近整理的是《${latestBookTitle}》，可以继续补充素材。` : '你还没有生成书稿，先从一轮访谈开始。' }}
        </text>
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
import { onShow } from '@dcloudio/uni-app';
import type { BookType } from '@talkbook/contracts';
import { storeToRefs } from 'pinia';

import BottomNav from '../../components/BottomNav.vue';
import PageHeader from '../../components/PageHeader.vue';
import { getMyBooks, postSession } from '../../services/api';
import { useAppStore } from '../../stores/useAppStore';
import { useCreationStore } from '../../stores/useCreationStore';

const appStore = useAppStore();
const creationStore = useCreationStore();
const { bookTypes, selectedBookType } = storeToRefs(creationStore);

const creating = ref(false);
const errorMessage = ref('');
const bookCount = ref(0);
const latestBookTitle = ref('还没有书稿');

const canStart = computed(() => appStore.isLoggedIn);

function choose(bookType: BookType) {
  creationStore.setBookType(bookType);
}

function handleMockLogin() {
  appStore.mockLogin();
  uni.showToast({
    title: '已进入 mock 登录态',
    icon: 'none'
  });
}

function showLoginToast() {
  uni.showToast({
    title: appStore.userProfile?.nickname ?? '已登录',
    icon: 'none'
  });
}

async function loadMyBooks() {
  try {
    const result = await getMyBooks();
    bookCount.value = result.items.length;
    latestBookTitle.value = result.items[0]?.title ?? '还没有书稿';
  } catch (error) {
    console.error(error);
  }
}

async function start() {
  if (!canStart.value) {
    errorMessage.value = '请先点击右上角“微信登录”进入 mock 登录态。';
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

onShow(() => {
  loadMyBooks();
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

.intro-card__desc {
  display: block;
  margin-top: 20rpx;
  font-size: 28rpx;
  line-height: 1.65;
  color: var(--tb-text-muted);
}

.intro-card__meta {
  display: flex;
  gap: 16rpx;
  margin-top: 28rpx;
}

.intro-card__meta-item {
  flex: 1;
  min-height: 132rpx;
  padding: 24rpx;
  border-radius: var(--tb-radius-lg);
  background: rgba(255, 255, 255, 0.7);
}

.intro-card__meta-label {
  display: block;
  font-size: 22rpx;
  color: var(--tb-text-muted);
}

.intro-card__meta-value {
  display: block;
  margin-top: 12rpx;
  font-size: 34rpx;
  line-height: 1.35;
  font-weight: 700;
  color: var(--tb-text);
}

.intro-card__meta-value--small {
  font-size: 28rpx;
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

.recent-card {
  padding: 28rpx;
}

.recent-card__title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--tb-text);
}

.recent-card__text {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--tb-text-muted);
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
