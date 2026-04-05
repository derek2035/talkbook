<template>
  <view class="tb-page">
    <PageHeader :title="currentChapter?.title || '章节预览'" back @back="goBack" />

    <scroll-view scroll-y class="chapter-scroll">
      <view class="tb-content chapter-content">
        <view v-if="currentChapter" class="chapter-header">
          <text class="chapter-header__tag">{{ currentChapterTag }}</text>
          <text class="chapter-header__title">{{ currentChapter.title }}</text>
          <text class="chapter-header__summary">{{ currentChapter.summary }}</text>
        </view>

        <view v-if="currentChapter" class="chapter-body">
          <text
            v-for="(paragraph, index) in paragraphs"
            :key="`${currentChapter.title}_${index}`"
            class="chapter-body__paragraph"
            :class="{ 'chapter-body__paragraph--lead': index === 0 }"
          >
            {{ paragraph }}
          </text>
        </view>

        <view v-else class="empty-card">
          <text class="empty-card__title">没有可展示的章节内容</text>
          <text class="empty-card__text">请先生成书稿预览，再进入章节页查看。</text>
        </view>
      </view>
    </scroll-view>

    <view v-if="bookDetail && currentChapter" class="chapter-footer">
      <button class="chapter-footer__ghost" :disabled="!hasPrevious" @tap="goPrevious">上一章</button>
      <button class="chapter-footer__primary" @tap="continueCollecting">继续补充素材</button>
      <button class="chapter-footer__ghost" :disabled="!hasNext" @tap="goNext">下一章</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import type { BookDetailResponse } from '@talkbook/contracts';

import PageHeader from '../../components/PageHeader.vue';
import { getBook } from '../../services/api';

const bookDetail = ref<BookDetailResponse | null>(null);
const currentIndex = ref(0);
const activeSessionId = ref('');

const currentChapter = computed(() => bookDetail.value?.chapters[currentIndex.value] ?? null);
const currentChapterTag = computed(() => `第${currentIndex.value + 1}章`);
const hasPrevious = computed(() => currentIndex.value > 0);
const hasNext = computed(() => {
  if (!bookDetail.value) {
    return false;
  }

  return currentIndex.value < bookDetail.value.chapters.length - 1;
});

const paragraphs = computed(() => {
  const content = currentChapter.value?.content?.trim();
  if (!content) {
    return [];
  }

  const result = content
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return result.length > 0 ? result : [content];
});

function goBack() {
  uni.navigateBack();
}

function goPrevious() {
  if (hasPrevious.value) {
    currentIndex.value -= 1;
  }
}

function goNext() {
  if (hasNext.value) {
    currentIndex.value += 1;
  }
}

function continueCollecting() {
  if (!activeSessionId.value) {
    uni.showToast({
      title: '当前没有可继续的会话',
      icon: 'none'
    });
    return;
  }

  uni.navigateTo({
    url: `/pages/interview/index?sessionId=${activeSessionId.value}`
  });
}

async function loadChapter(bookId: string, chapterIndex: number, sessionId?: string) {
  try {
    const detail = await getBook(bookId);
    bookDetail.value = detail;
    activeSessionId.value = sessionId || detail.sessionId;
    currentIndex.value = Math.min(Math.max(chapterIndex, 0), Math.max(detail.chapters.length - 1, 0));
  } catch (error) {
    console.error(error);
    uni.showToast({
      title: '获取章节失败',
      icon: 'none'
    });
  }
}

onLoad((query) => {
  const bookId = typeof query?.bookId === 'string' ? query.bookId : '';
  const chapterIndex = Number(typeof query?.chapterIndex === 'string' ? query.chapterIndex : '0');
  const sessionId = typeof query?.sessionId === 'string' ? query.sessionId : '';

  if (!bookId) {
    uni.showToast({
      title: '缺少书稿标识',
      icon: 'none'
    });
    return;
  }

  loadChapter(bookId, Number.isNaN(chapterIndex) ? 0 : chapterIndex, sessionId);
});
</script>

<style scoped>
.chapter-scroll {
  height: calc(100vh - 112rpx);
}

.chapter-content {
  padding-bottom: 188rpx;
}

.chapter-header {
  padding: 18rpx 4rpx 8rpx;
}

.chapter-header__tag {
  display: inline-flex;
  min-height: 48rpx;
  align-items: center;
  padding: 0 20rpx;
  border-radius: var(--tb-radius-pill);
  background: var(--tb-surface-card);
  font-size: 22rpx;
  font-weight: 600;
  color: var(--tb-primary);
}

.chapter-header__title {
  display: block;
  margin-top: 20rpx;
  font-size: 50rpx;
  line-height: 1.28;
  font-weight: 700;
  color: var(--tb-text);
}

.chapter-header__summary {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--tb-text-muted);
}

.chapter-body {
  margin-top: 24rpx;
  padding: 30rpx;
  border-radius: 34rpx;
  background: #fffdfa;
  box-shadow: 0 20rpx 48rpx rgba(155, 63, 30, 0.05);
}

.chapter-body__paragraph {
  display: block;
  font-size: 30rpx;
  line-height: 1.95;
  color: var(--tb-text);
  text-indent: 2em;
}

.chapter-body__paragraph + .chapter-body__paragraph {
  margin-top: 20rpx;
}

.chapter-body__paragraph--lead {
  position: relative;
}

.chapter-body__paragraph--lead::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10rpx;
  width: 10rpx;
  height: 58rpx;
  border-radius: 999rpx;
  background: rgba(155, 63, 30, 0.16);
}

.empty-card {
  margin-top: 24rpx;
  padding: 30rpx;
  border-radius: 30rpx;
  background: var(--tb-surface-low);
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

.chapter-footer {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(env(safe-area-inset-bottom) + 20rpx);
  display: flex;
  gap: 16rpx;
  padding: 16rpx;
  border-radius: 32rpx;
  background: var(--tb-surface-card-strong);
  box-shadow: 0 12rpx 26rpx rgba(155, 63, 30, 0.08);
}

.chapter-footer__ghost,
.chapter-footer__primary {
  min-height: 88rpx;
  border-radius: 24rpx;
  font-size: 24rpx;
  font-weight: 600;
}

.chapter-footer__ghost {
  flex: 1;
  background: rgba(255, 255, 255, 0.74);
  color: var(--tb-secondary);
}

.chapter-footer__ghost[disabled] {
  opacity: 0.4;
}

.chapter-footer__primary {
  flex: 1.4;
  background: var(--tb-primary);
  color: #fff;
}
</style>
