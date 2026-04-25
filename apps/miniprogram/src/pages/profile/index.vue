<template>
  <view class="tb-page tb-safe-bottom">
    <PageHeader title="我的书稿" />

    <view class="tb-content profile-content">
      <view class="account-card">
        <view v-if="userProfile?.avatarUrl" class="account-card__avatar">
          <image class="account-card__avatar-image" :src="userProfile.avatarUrl" mode="aspectFill" />
        </view>
        <view v-else class="account-card__avatar account-card__avatar--fallback">
          <text class="account-card__avatar-text">{{ userProfile?.avatarText || '我' }}</text>
        </view>

        <view class="account-card__body">
          <text class="account-card__name">{{ userProfile?.nickname || '微信用户' }}</text>
          <text class="account-card__meta">已使用微信身份登录</text>
        </view>
      </view>

      <view class="hero-card">
        <text class="hero-card__title">你的书稿都在这里</text>
        <text class="hero-card__desc">预览、继续创作、回看章节，都会从这个页面继续。</text>
        <view class="hero-card__meta">
          <view class="hero-card__stat">
            <text class="hero-card__stat-label">书稿总数</text>
            <text class="hero-card__stat-value">{{ books.length }}</text>
          </view>
          <button class="hero-card__new" @tap="startNewBook">开启新书</button>
        </view>
      </view>

      <view class="section">
        <text class="tb-section-title">书稿列表</text>

        <view v-if="books.length" class="book-list">
          <view v-for="book in books" :key="book.bookId" class="book-card">
            <text class="book-card__title">{{ book.title }}</text>
            <view class="book-card__meta">
              <text class="tb-chip" :class="book.status === 'preview' ? 'tb-chip--warm' : 'tb-chip--soft'">
                {{ formatStatus(book.status) }}
              </text>
              <text class="book-card__time">更新于 {{ formatDate(book.updatedAt) }}</text>
            </view>
            <text class="book-card__summary">{{ book.summary }}</text>
            <view class="book-card__actions">
              <button class="tb-primary-button book-card__button" @tap="continueWriting(book.sessionId)">
                继续创作
              </button>
              <button class="tb-ghost-button book-card__button" @tap="previewBook(book.bookId, book.sessionId)">
                预览
              </button>
            </view>
          </view>
        </view>

        <view v-else class="empty-card">
          <text class="empty-card__title">还没有书稿</text>
          <text class="empty-card__text">先回到创作页开始第一轮采访，生成的预览会自动出现在这里。</text>
        </view>
      </view>

      <view class="section utility-card">
        <button class="utility-card__item" @tap="showUtilityToast('会员权益')">
          <text class="utility-card__label">会员权益</text>
          <text class="utility-card__value">后续开放</text>
        </button>
        <button class="utility-card__item" @tap="showUtilityToast('订单记录')">
          <text class="utility-card__label">订单记录</text>
          <text class="utility-card__value">后续开放</text>
        </button>
        <button class="utility-card__item" @tap="openPolicy('privacy')">
          <text class="utility-card__label">隐私政策</text>
          <text class="utility-card__value">查看说明</text>
        </button>
        <button class="utility-card__item" @tap="openPolicy('terms')">
          <text class="utility-card__label">用户协议</text>
          <text class="utility-card__value">查看说明</text>
        </button>
      </view>
    </view>

    <BottomNav current="books" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import type { BookStatus, MyBookItem } from '@talkbook/contracts';

import BottomNav from '../../components/BottomNav.vue';
import PageHeader from '../../components/PageHeader.vue';
import { getMyBooks } from '../../services/api';
import { useAppStore } from '../../stores/useAppStore';

const appStore = useAppStore();
const books = ref<MyBookItem[]>([]);
const userProfile = computed(() => appStore.userProfile);

function formatStatus(status: BookStatus) {
  if (status === 'preview') {
    return '待扩写';
  }

  if (status === 'paid') {
    return '已解锁';
  }

  return '已导出';
}

function formatDate(value: string) {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function loadBooks() {
  try {
    const result = await getMyBooks();
    books.value = result.items;
  } catch (error) {
    console.error(error);
  }
}

function startNewBook() {
  uni.reLaunch({ url: '/pages/home/index' });
}

function continueWriting(sessionId: string) {
  uni.navigateTo({
    url: `/pages/interview/index?sessionId=${sessionId}`
  });
}

function previewBook(bookId: string, sessionId: string) {
  uni.navigateTo({
    url: `/pages/preview/index?bookId=${bookId}&sessionId=${sessionId}`
  });
}

function openPolicy(type: 'privacy' | 'terms') {
  uni.navigateTo({
    url: type === 'privacy' ? '/pages/privacy/index' : '/pages/terms/index'
  });
}

function showUtilityToast(label: string) {
  uni.showToast({
    title: `${label}后续接入`,
    icon: 'none'
  });
}

onShow(() => {
  if (!appStore.isLoggedIn) {
    uni.navigateTo({
      url: `/pages/login/index?redirect=${encodeURIComponent('/pages/profile/index')}`
    });
    return;
  }

  loadBooks();
});
</script>

<style scoped>
.profile-content {
  padding-top: 20rpx;
}

.account-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 24rpx;
  padding: 24rpx 26rpx;
  border-radius: 20rpx;
  background: #fff;
}

.account-card__avatar {
  width: 108rpx;
  height: 108rpx;
  border-radius: 999rpx;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--tb-secondary-soft);
}

.account-card__avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}

.account-card__avatar-image {
  width: 100%;
  height: 100%;
}

.account-card__avatar-text {
  font-size: 38rpx;
  font-weight: 700;
  color: var(--tb-primary-strong);
}

.account-card__body {
  min-width: 0;
}

.account-card__name {
  display: block;
  font-size: 34rpx;
  line-height: 1.3;
  font-weight: 700;
  color: var(--tb-text);
}

.account-card__meta {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--tb-text-muted);
}

.hero-card {
  padding: 34rpx 30rpx;
  border-radius: 20rpx;
  background: #fff;
}

.hero-card__title {
  display: block;
  font-size: 42rpx;
  font-weight: 700;
  color: var(--tb-text);
}

.hero-card__desc {
  display: block;
  margin-top: 14rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--tb-text-muted);
}

.hero-card__meta {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24rpx;
  margin-top: 24rpx;
}

.hero-card__stat {
  flex: 1;
  min-width: 0;
}

.hero-card__stat-label {
  display: block;
  font-size: 22rpx;
  color: var(--tb-text-muted);
}

.hero-card__stat-value {
  display: block;
  margin-top: 8rpx;
  font-size: 38rpx;
  font-weight: 700;
  color: var(--tb-text);
}

.hero-card__new {
  flex-shrink: 0;
  min-width: 220rpx;
  min-height: 88rpx;
  padding: 0 32rpx;
  border-radius: 12rpx;
  background: var(--tb-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: flex-end;
  font-size: 28rpx;
  font-weight: 600;
}

.section {
  margin-top: 28rpx;
}

.book-list {
  margin-top: 16rpx;
}

.book-card {
  margin-top: 14rpx;
  padding: 26rpx;
  border-radius: 20rpx;
  background: #fff;
}

.book-card__title {
  display: block;
  font-size: 32rpx;
  line-height: 1.45;
  font-weight: 700;
  color: var(--tb-text);
}

.book-card__meta {
  display: flex;
  align-items: center;
  gap: 14rpx;
  flex-wrap: wrap;
  margin-top: 14rpx;
}

.book-card__time {
  font-size: 22rpx;
  color: var(--tb-text-muted);
}

.book-card__summary {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.72;
  color: var(--tb-text-muted);
}

.book-card__actions {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.book-card__button {
  flex: 1;
}

.empty-card {
  margin-top: 16rpx;
  padding: 30rpx;
  border-radius: 20rpx;
  background: #fff;
}

.empty-card__title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--tb-text);
}

.empty-card__text {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--tb-text-muted);
}

.utility-card {
  padding: 12rpx 24rpx;
  border-radius: 20rpx;
  background: #fff;
}

.utility-card__item {
  min-height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.utility-card__item + .utility-card__item {
  border-top: 2rpx solid var(--tb-outline);
}

.utility-card__label {
  font-size: 28rpx;
  color: var(--tb-text);
}

.utility-card__value {
  font-size: 24rpx;
  color: var(--tb-text-muted);
}
</style>
