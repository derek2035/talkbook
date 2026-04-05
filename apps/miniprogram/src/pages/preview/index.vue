<template>
  <view class="tb-page">
    <PageHeader title="书稿预览" back @back="goBack" />

    <scroll-view scroll-y class="preview-scroll">
      <view class="tb-content preview-content">
        <view class="preview-meta-card">
          <view class="preview-meta-card__item">
            <text class="preview-meta-card__label">书稿 ID</text>
            <text class="preview-meta-card__value preview-meta-card__value--mono">
              {{ activeBookId || preview?.bookId || '--' }}
            </text>
          </view>
          <view class="preview-meta-card__item">
            <text class="preview-meta-card__label">当前状态</text>
            <text class="preview-meta-card__value">{{ previewStatusLabel }}</text>
          </view>
        </view>

        <view class="title-card">
          <text class="tb-section-title">书名建议</text>
          <text class="title-card__title">{{ displayTitle }}</text>
        </view>

        <view class="summary-card">
          <text class="tb-section-title">一句话简介</text>
          <text class="summary-card__text">{{ displaySummary }}</text>
        </view>

        <view class="section">
          <view class="section-header">
            <text class="tb-section-title">章节目录</text>
            <text class="section-header__count">共 {{ chapterList.length }} 章</text>
          </view>

          <view v-if="chapterList.length" class="chapter-list">
            <button
              v-for="(chapter, index) in chapterList"
              :key="`${chapter.title}_${index}`"
              class="chapter-item"
              @tap="openChapter(index)"
            >
              <view class="chapter-item__head">
                <text class="chapter-item__index">{{ formatChapterNo(index) }}</text>
                <text class="chapter-item__title">{{ chapter.title }}</text>
              </view>
              <text class="chapter-item__summary">{{ chapter.summary }}</text>
              <text class="chapter-item__link">查看本章</text>
            </button>
          </view>

          <view v-else class="empty-card">
            <text class="empty-card__text">还没有可展示的预览内容，请先回到采访页完成至少两次回答。</text>
          </view>
        </view>

        <view class="unlock-card">
          <text class="unlock-card__title">完整版待解锁</text>
          <text class="unlock-card__text">
            当前先展示结构化预览。继续补充素材后，后续会接入更完整的章节生成、导出与商业化能力。
          </text>
        </view>

        <text v-if="errorMessage" class="error-message">{{ errorMessage }}</text>

        <view class="action-group">
          <button class="tb-primary-button" @tap="continueCollecting">继续补充素材</button>
          <button class="tb-ghost-button" @tap="shareDraft">分享</button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import type { BookDetailResponse, PreviewOutlineItem } from '@talkbook/contracts';
import { storeToRefs } from 'pinia';

import PageHeader from '../../components/PageHeader.vue';
import { getBook, postPreview } from '../../services/api';
import { useCreationStore } from '../../stores/useCreationStore';

const store = useCreationStore();
const { preview, sessionId } = storeToRefs(store);

const bookDetail = ref<BookDetailResponse | null>(null);
const activeSessionId = ref('');
const activeBookId = ref('');
const errorMessage = ref('');

const displayTitle = computed(() => bookDetail.value?.title ?? preview.value?.title ?? '书稿预览');
const displaySummary = computed(
  () => bookDetail.value?.summary ?? preview.value?.summary ?? '当前阶段先展示结构化书稿预览。'
);
const previewStatusLabel = computed(() => {
  if (bookDetail.value?.status === 'paid') {
    return '已解锁完整版';
  }

  if (bookDetail.value?.status === 'exported') {
    return '已导出';
  }

  if (preview.value?.paymentRequired) {
    return '预览已生成，完整版待解锁';
  }

  return '等待生成预览';
});
const chapterList = computed<PreviewOutlineItem[]>(() => {
  if (bookDetail.value?.chapters?.length) {
    return bookDetail.value.chapters.map((chapter) => ({
      title: chapter.title,
      summary: chapter.summary
    }));
  }

  return preview.value?.outline ?? [];
});

function formatChapterNo(index: number) {
  return `${index + 1}`.padStart(2, '0');
}

function goBack() {
  uni.navigateBack();
}

async function loadBookDetail(bookId: string) {
  const detail = await getBook(bookId);
  bookDetail.value = detail;
  activeBookId.value = detail.bookId;
  activeSessionId.value = detail.sessionId;
}

async function ensurePreview(queryBookId?: string, querySessionId?: string) {
  errorMessage.value = '';

  try {
    if (queryBookId) {
      await loadBookDetail(queryBookId);
      return;
    }

    const candidateSessionId = querySessionId || sessionId.value;
    if (!candidateSessionId) {
      throw new Error('没有找到关联会话，请回到首页重新开始。');
    }

    activeSessionId.value = candidateSessionId;

    if (!preview.value) {
      const generatedPreview = await postPreview(candidateSessionId);
      store.setPreview(generatedPreview);
    }

    if (preview.value?.bookId) {
      await loadBookDetail(preview.value.bookId);
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '获取预览失败。';
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

function shareDraft() {
  uni.showToast({
    title: '分享能力后续接入',
    icon: 'none'
  });
}

function openChapter(index: number) {
  if (!activeBookId.value) {
    uni.showToast({
      title: '当前还没有完整章节内容',
      icon: 'none'
    });
    return;
  }

  uni.navigateTo({
    url: `/pages/chapter/index?bookId=${activeBookId.value}&chapterIndex=${index}&sessionId=${activeSessionId.value}`
  });
}

onLoad((query) => {
  const queryBookId = typeof query?.bookId === 'string' ? query.bookId : '';
  const querySessionId = typeof query?.sessionId === 'string' ? query.sessionId : '';
  ensurePreview(queryBookId, querySessionId);
});
</script>

<style scoped>
.preview-scroll {
  height: calc(100vh - 112rpx);
}

.preview-content {
  padding-bottom: 40rpx;
}

.preview-meta-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
  margin-bottom: 22rpx;
}

.preview-meta-card__item {
  padding: 24rpx;
  border-radius: 28rpx;
  background: var(--tb-surface-card);
}

.preview-meta-card__label {
  display: block;
  font-size: 22rpx;
  color: var(--tb-text-muted);
}

.preview-meta-card__value {
  display: block;
  margin-top: 12rpx;
  font-size: 28rpx;
  line-height: 1.5;
  font-weight: 600;
  color: var(--tb-text);
}

.preview-meta-card__value--mono {
  font-size: 22rpx;
  font-family: 'SFMono-Regular', 'Menlo', 'Monaco', monospace;
  word-break: break-all;
}

.title-card,
.summary-card {
  padding: 28rpx;
  border-radius: 32rpx;
}

.title-card {
  background: var(--tb-surface-card-strong);
}

.summary-card {
  margin-top: 22rpx;
  background: var(--tb-surface-card);
}

.title-card__title {
  display: block;
  margin-top: 16rpx;
  font-size: 44rpx;
  line-height: 1.35;
  font-weight: 700;
  color: var(--tb-primary);
}

.summary-card__text {
  display: block;
  margin-top: 16rpx;
  font-size: 30rpx;
  line-height: 1.75;
  color: var(--tb-text);
}

.section {
  margin-top: 26rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-header__count {
  font-size: 22rpx;
  color: var(--tb-text-muted);
}

.chapter-list {
  margin-top: 16rpx;
}

.chapter-item {
  display: block;
  width: 100%;
  margin-top: 14rpx;
  padding: 24rpx;
  border-radius: 28rpx;
  background: var(--tb-surface-card);
  text-align: left;
}

.chapter-item__head {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.chapter-item__index {
  min-width: 48rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--tb-primary);
}

.chapter-item__title {
  flex: 1;
  font-size: 30rpx;
  line-height: 1.5;
  font-weight: 700;
  color: var(--tb-text);
}

.chapter-item__summary {
  display: block;
  margin-top: 14rpx;
  font-size: 26rpx;
  line-height: 1.75;
  color: var(--tb-text-muted);
}

.chapter-item__link {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--tb-primary);
}

.unlock-card {
  margin-top: 28rpx;
  padding: 28rpx;
  border-radius: 32rpx;
  background: linear-gradient(180deg, #fff1ed 0%, rgba(255, 189, 167, 0.52) 100%);
}

.unlock-card__title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: var(--tb-primary);
}

.unlock-card__text {
  display: block;
  margin-top: 14rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--tb-text-muted);
}

.empty-card {
  margin-top: 16rpx;
  padding: 28rpx;
  border-radius: 30rpx;
  background: var(--tb-surface-low);
}

.empty-card__text {
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--tb-text-muted);
}

.error-message {
  display: block;
  margin-top: 18rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--tb-danger);
}

.action-group {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 24rpx;
}
</style>
