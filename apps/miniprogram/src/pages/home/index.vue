<template>
  <view class="tb-page tb-safe-bottom">
    <PageHeader
      title="Talkbook"
    />

    <view class="tb-content home-content">
      <view class="intro-card">
        <text class="intro-card__title">通过对话，把珍贵回忆慢慢整理成一本书。</text>
        <text class="intro-card__desc">先开口讲述，再慢慢整理，适合把家人、经历和记忆沉淀成可读的书稿。</text>
      </view>

      <view class="progress-card">
        <view class="progress-card__head">
          <text class="tb-section-title">最近进度</text>
          <button
            v-if="appStore.isLoggedIn && bookCount"
            class="progress-card__link"
            @tap="goProfile"
          >
            查看我的书稿
          </button>
        </view>

        <view v-if="appStore.isLoggedIn && bookCount" class="progress-card__body">
          <text class="progress-card__title">你已经整理了 {{ bookCount }} 本书稿</text>
          <text class="progress-card__text">最近一份是 {{ latestBookTitle }}，可以继续补充素材，或直接回看预览。</text>
        </view>
        <view v-else-if="appStore.isLoggedIn" class="progress-card__body">
          <text class="progress-card__title">还没有书稿</text>
          <text class="progress-card__text">先选一个类型开始采访，生成的预览会自动进入“我的书稿”。</text>
        </view>
        <view v-else class="progress-card__body">
          <text class="progress-card__title">登录后可同步你的创作进度</text>
          <text class="progress-card__text">点击开始创作后会先完成微信登录。登录后，采访记录和书稿会按你的身份保存。</text>
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
            <view class="type-card__body">
              <text class="type-card__title">{{ item.label }}</text>
              <text class="type-card__desc">{{ item.description }}</text>
            </view>
            <view class="type-card__state">
              <view v-if="item.key === selectedBookType" class="type-card__check" />
            </view>
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
import type { BookType, MyBookItem } from '@talkbook/contracts';
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
const pendingAutoStart = ref(false);
const myBooks = ref<MyBookItem[]>([]);

const canStart = computed(() => appStore.isLoggedIn);
const bookCount = computed(() => myBooks.value.length);
const latestBookTitle = computed(() => myBooks.value[0]?.title || '最近书稿');

function choose(bookType: BookType) {
  creationStore.setBookType(bookType);
}

function goLogin() {
  uni.navigateTo({
    url: `/pages/login/index?redirect=${encodeURIComponent('/pages/home/index')}`
  });
}

function goProfile() {
  if (!appStore.isLoggedIn) {
    goLogin();
    return;
  }

  uni.reLaunch({ url: '/pages/profile/index' });
}

async function loadMyBooks() {
  if (!appStore.isLoggedIn) {
    myBooks.value = [];
    return;
  }

  try {
    const result = await getMyBooks();
    myBooks.value = result.items;
  } catch (error) {
    console.error(error);
  }
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
  loadMyBooks();

  if (pendingAutoStart.value && appStore.isLoggedIn && !creating.value) {
    pendingAutoStart.value = false;
    start();
  }
});
</script>

<style scoped>
.home-content {
  padding-top: 18rpx;
}

.intro-card {
  padding: 30rpx 28rpx;
  border-radius: 20rpx;
  background: #fff;
}

.intro-card__title {
  display: block;
  font-size: 40rpx;
  line-height: 1.3;
  font-weight: 700;
  color: var(--tb-text);
}

.intro-card__desc {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.72;
  color: var(--tb-text-muted);
}

.progress-card {
  margin-top: 18rpx;
  padding: 28rpx;
  border-radius: 20rpx;
  background: #fff;
}

.progress-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.progress-card__link {
  min-height: 56rpx;
  padding: 0 20rpx;
  border-radius: 10rpx;
  background: #f6f6f6;
  font-size: 22rpx;
  font-weight: 600;
  color: var(--tb-secondary);
}

.progress-card__body {
  margin-top: 18rpx;
}

.progress-card__title {
  display: block;
  font-size: 32rpx;
  line-height: 1.42;
  font-weight: 700;
  color: var(--tb-text);
}

.progress-card__text {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--tb-text-muted);
}

.section {
  margin-top: 24rpx;
}

.type-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 18rpx;
  overflow: hidden;
  border-radius: 20rpx;
  background: #fff;
}

.type-card {
  width: 100%;
  min-height: 122rpx;
  padding: 24rpx 26rpx;
  border-radius: 0;
  background: transparent;
  border: 0;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 22rpx;
  text-align: left;
}

.type-card + .type-card {
  border-top: 2rpx solid var(--tb-outline);
}

.type-card--active {
  background: #f7fffb;
  box-shadow: none;
}

.type-card__body {
  flex: 1;
  min-width: 0;
}

.type-card__title {
  display: block;
  font-size: 30rpx;
  line-height: 1.35;
  font-weight: 700;
  color: var(--tb-text);
}

.type-card__desc {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--tb-text-muted);
}

.type-card__state {
  width: 42rpx;
  height: 42rpx;
  border-radius: 999rpx;
  border: 3rpx solid var(--tb-outline);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.type-card--active .type-card__state {
  border-color: var(--tb-primary);
  background: var(--tb-primary);
}

.type-card__check {
  width: 18rpx;
  height: 10rpx;
  border-left: 4rpx solid #fff;
  border-bottom: 4rpx solid #fff;
  transform: rotate(-45deg) translate(1rpx, -1rpx);
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
