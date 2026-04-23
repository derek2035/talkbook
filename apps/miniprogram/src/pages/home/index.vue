<template>
  <view class="tb-page tb-safe-bottom">
    <PageHeader
      title="Talkbook"
      :show-login="!appStore.isLoggedIn"
      :avatar-text="appStore.isLoggedIn ? appStore.userProfile?.avatarText : ''"
      @login="goLogin"
      @avatar-tap="goProfile"
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
          <text class="progress-card__text">顶部可直接微信登录。登录后，采访记录和书稿会按你的身份保存。</text>
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
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.72;
  color: var(--tb-text-muted);
}

.progress-card {
  margin-top: 24rpx;
  padding: 28rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.82);
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
  border-radius: var(--tb-radius-pill);
  background: var(--tb-surface-low);
  font-size: 22rpx;
  font-weight: 600;
  color: var(--tb-primary);
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
