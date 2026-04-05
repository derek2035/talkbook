<template>
  <view class="tb-page">
    <PageHeader title="智能访谈" back @back="goBack" />

    <scroll-view scroll-y class="interview-scroll">
      <view class="tb-content interview-content">
        <view class="question-card">
          <text class="tb-section-title">当前提问</text>
          <text class="question-card__title">{{ currentQuestion || '开始创作后会出现第一问。' }}</text>
          <text class="question-card__tip">
            已完成 {{ answerCount }} 次回答，{{ canGenerate ? '现在可以生成书稿预览。' : '至少完成 2 次有效回答后可生成预览。' }}
          </text>
        </view>

        <view class="section">
          <view class="segmented">
            <button
              class="segmented__item"
              :class="{ 'segmented__item--active': activeView === 'audio' }"
              @tap="activeView = 'audio'"
            >
              语音播放
            </button>
            <button
              class="segmented__item"
              :class="{ 'segmented__item--active': activeView === 'text' }"
              @tap="activeView = 'text'"
            >
              文字记录
            </button>
          </view>
        </view>

        <view class="section">
          <view v-if="messages.length" class="timeline">
            <view
              v-for="message in messages"
              :key="message.id"
              class="timeline__item"
              :class="message.role === 'user' ? 'timeline__item--user' : 'timeline__item--assistant'"
            >
              <text class="timeline__meta">
                {{ message.role === 'assistant' ? '采访助手' : '我的讲述' }} ·
                {{ message.timeLabel || formatMessageTime(message.createdAt) }}
              </text>

              <view v-if="message.role === 'assistant' || activeView === 'text'" class="timeline__bubble">
                <text class="timeline__text">{{ message.transcript || message.content }}</text>
              </view>

              <view v-else class="audio-card">
                <view
                  v-if="message.segments?.length"
                  v-for="segment in message.segments"
                  :key="`${message.id}_${segment.segmentIndex}`"
                  class="audio-segment"
                >
                  <view class="audio-segment__head">
                    <text class="audio-segment__title">{{ segment.segmentTitle }}</text>
                    <text class="audio-segment__duration">{{ formatDuration(segment.duration) }}</text>
                  </view>
                  <view class="audio-segment__player">
                    <button
                      class="audio-segment__button"
                      @tap="togglePlayback(`${message.id}_${segment.segmentIndex}`)"
                    >
                      {{ playingSegmentId === `${message.id}_${segment.segmentIndex}` ? '暂停' : '播放' }}
                    </button>
                    <view class="audio-segment__track">
                      <view
                        class="audio-segment__progress"
                        :style="{ width: playingSegmentId === `${message.id}_${segment.segmentIndex}` ? '68%' : '34%' }"
                      />
                    </view>
                  </view>
                  <text class="audio-segment__transcript">{{ segment.transcript }}</text>
                </view>

                <view v-else class="audio-segment">
                  <view class="audio-segment__head">
                    <text class="audio-segment__title">第1段</text>
                    <text class="audio-segment__duration">{{ formatDuration(message.duration || 12) }}</text>
                  </view>
                  <view class="audio-segment__player">
                    <button class="audio-segment__button" @tap="togglePlayback(message.id)">
                      {{ playingSegmentId === message.id ? '暂停' : '播放' }}
                    </button>
                    <view class="audio-segment__track">
                      <view
                        class="audio-segment__progress"
                        :style="{ width: playingSegmentId === message.id ? '68%' : '34%' }"
                      />
                    </view>
                  </view>
                  <text class="audio-segment__transcript">{{ message.transcript || message.content }}</text>
                </view>
              </view>
            </view>
          </view>

          <view v-else class="empty-card">
            <text class="empty-card__text">还没有采访记录，点击下方“开始录音”即可进入第一轮讲述。</text>
          </view>
        </view>

        <view class="section tb-card recorder-card">
          <view class="recorder-card__head">
            <view>
              <text class="recorder-card__title">{{ recordingStatusTitle }}</text>
              <text class="recorder-card__desc">{{ recordingStatusDesc }}</text>
            </view>
            <view class="status-badge" :class="`status-badge--${recordingStatus}`">
              {{ recordingStatusText }}
            </view>
          </view>

          <view class="recorder-card__timer">
            <text class="recorder-card__timer-label">当前时长</text>
            <text class="recorder-card__timer-value">{{ formatDuration(recordingDuration) }}</text>
          </view>

          <view class="tip-card">
            <text class="tip-card__title">长录音自动分段</text>
            <text class="tip-card__text">
              连续讲述较长时，系统会优先按语义边界切分成更易回看的小段，避免一句话被从中间截断。
            </text>
          </view>

          <textarea
            v-model="draftTranscript"
            class="draft-input"
            maxlength="800"
            placeholder="这里先输入本次讲述的文字稿或补充说明，后续会直接替换为真实语音转写。"
          />

          <text v-if="errorMessage" class="error-message">{{ errorMessage }}</text>

          <view class="recorder-card__actions">
            <button
              v-if="recordingStatus === 'idle'"
              class="tb-primary-button"
              :disabled="!sessionId"
              @tap="startRecording"
            >
              开始录音
            </button>

            <template v-else-if="recordingStatus === 'recording' || recordingStatus === 'locked'">
              <button class="tb-secondary-button action-half" @tap="pauseRecording">暂停录音</button>
              <button class="tb-ghost-button action-half" @tap="finishRecording">结束录音</button>
            </template>

            <template v-else>
              <button class="tb-secondary-button action-half" @tap="resumeRecording">继续录音</button>
              <button class="tb-ghost-button action-half" @tap="finishRecording">结束录音</button>
            </template>
          </view>

          <view class="submit-actions">
            <button
              class="tb-ghost-button submit-actions__button"
              :loading="skipping"
              :disabled="!sessionId || sending || recordingStatus !== 'idle'"
              @tap="handleSkip"
            >
              跳过这一问
            </button>
            <button
              class="tb-secondary-button submit-actions__button"
              :loading="sending"
              :disabled="!sessionId || !draftTranscript.trim() || recordingStatus !== 'idle'"
              @tap="handleManualSubmit"
            >
              提交文字记录
            </button>
          </view>

          <button
            class="tb-primary-button preview-button"
            :loading="generating"
            :disabled="!sessionId || !canGenerate || recordingStatus !== 'idle'"
            @tap="goPreview"
          >
            生成书稿预览
          </button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { storeToRefs } from 'pinia';
import type {
  RecordingMode,
  RecordingStatus,
  SessionAudioUploadRequest
} from '@talkbook/contracts';

import PageHeader from '../../components/PageHeader.vue';
import {
  getSession,
  postAudioTranscript,
  postPreview,
  postSkipQuestion
} from '../../services/api';
import { useCreationStore } from '../../stores/useCreationStore';

const store = useCreationStore();
const { answerCount, canGenerate, currentQuestion, messages, sessionId } = storeToRefs(store);

const draftTranscript = ref('');
const activeView = ref<'audio' | 'text'>('audio');
const sending = ref(false);
const skipping = ref(false);
const generating = ref(false);
const errorMessage = ref('');
const recordingStatus = ref<RecordingStatus>('idle');
const recordingDuration = ref(0);
const playingSegmentId = ref('');

let recordingTimer: ReturnType<typeof setInterval> | null = null;
let activeSessionId = '';
let currentRecordingMode: RecordingMode = 'locked';

const recordingStatusText = computed(() => {
  if (recordingStatus.value === 'recording' || recordingStatus.value === 'locked') {
    return '正在录音';
  }

  if (recordingStatus.value === 'paused') {
    return '录音暂停';
  }

  return '待开始';
});

const recordingStatusTitle = computed(() => {
  if (recordingStatus.value === 'recording' || recordingStatus.value === 'locked') {
    return '这一轮内容正在采集中';
  }

  if (recordingStatus.value === 'paused') {
    return '录音已暂停，可以继续补充';
  }

  return '准备开始一段新的讲述';
});

const recordingStatusDesc = computed(() => {
  if (recordingStatus.value === 'recording' || recordingStatus.value === 'locked') {
    return '当前为锁定录音模式，开始后无需一直按住手机。';
  }

  if (recordingStatus.value === 'paused') {
    return '可以继续录音，也可以直接结束并整理这一轮内容。';
  }

  return '建议先开始录音，再把本轮讲述整理成书稿素材。';
});

function goBack() {
  uni.navigateBack();
}

function formatDuration(seconds: number) {
  const normalized = Math.max(0, Math.round(seconds));
  const minutes = `${Math.floor(normalized / 60)}`.padStart(2, '0');
  const remainSeconds = `${normalized % 60}`.padStart(2, '0');
  return `${minutes}:${remainSeconds}`;
}

function formatMessageTime(createdAt: string) {
  const date = new Date(createdAt);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

function clearRecordingTicker() {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
}

function startRecordingTicker() {
  clearRecordingTicker();
  recordingTimer = setInterval(() => {
    recordingDuration.value += 1;
  }, 1000);
}

async function syncSession(sessionIdToLoad = activeSessionId) {
  if (!sessionIdToLoad) {
    uni.redirectTo({ url: '/pages/home/index' });
    return;
  }

  try {
    const detail = await getSession(sessionIdToLoad);
    if (detail.messages.length === 0) {
      throw new Error('当前会话不存在，请重新开始创作。');
    }

    store.hydrateSession(detail);
    activeSessionId = detail.sessionId;
    errorMessage.value = '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '获取会话失败。';
  }
}

async function submitTranscript(payload: SessionAudioUploadRequest) {
  if (!activeSessionId) {
    return;
  }

  sending.value = true;
  errorMessage.value = '';

  try {
    await postAudioTranscript(activeSessionId, payload);
    draftTranscript.value = '';
    recordingDuration.value = 0;
    currentRecordingMode = 'press-hold';
    await syncSession(activeSessionId);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '提交回答失败。';
  } finally {
    sending.value = false;
  }
}

function startRecording() {
  if (!activeSessionId || recordingStatus.value !== 'idle') {
    return;
  }

  currentRecordingMode = 'locked';
  recordingStatus.value = 'locked';
  recordingDuration.value = 0;
  errorMessage.value = '';
  startRecordingTicker();
}

function pauseRecording() {
  if (recordingStatus.value !== 'locked' && recordingStatus.value !== 'recording') {
    return;
  }

  recordingStatus.value = 'paused';
  clearRecordingTicker();
}

function resumeRecording() {
  if (recordingStatus.value !== 'paused') {
    return;
  }

  currentRecordingMode = 'locked';
  recordingStatus.value = 'locked';
  startRecordingTicker();
}

async function finishRecording() {
  if (recordingStatus.value === 'idle' || !activeSessionId) {
    return;
  }

  clearRecordingTicker();

  const payload: SessionAudioUploadRequest = {
    transcript: draftTranscript.value.trim(),
    duration: recordingDuration.value || 12,
    format: 'mock-audio',
    recordingMode: currentRecordingMode,
    isLocked: true
  };

  recordingStatus.value = 'idle';
  await submitTranscript(payload);
}

async function handleManualSubmit() {
  if (!activeSessionId || !draftTranscript.value.trim()) {
    return;
  }

  await submitTranscript({
    transcript: draftTranscript.value.trim(),
    duration: Math.max(12, Math.round(draftTranscript.value.trim().length * 1.6)),
    format: 'mock-text',
    recordingMode: 'locked',
    isLocked: false
  });
}

async function handleSkip() {
  if (!activeSessionId) {
    return;
  }

  skipping.value = true;
  errorMessage.value = '';

  try {
    await postSkipQuestion(activeSessionId);
    await syncSession(activeSessionId);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '跳过问题失败。';
  } finally {
    skipping.value = false;
  }
}

function togglePlayback(segmentId: string) {
  playingSegmentId.value = playingSegmentId.value === segmentId ? '' : segmentId;
}

async function goPreview() {
  if (!activeSessionId || !canGenerate.value) {
    return;
  }

  generating.value = true;
  errorMessage.value = '';

  try {
    const preview = await postPreview(activeSessionId);
    store.setPreview(preview);
    uni.navigateTo({
      url: `/pages/preview/index?bookId=${preview.bookId}&sessionId=${activeSessionId}`
    });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '生成预览失败。';
  } finally {
    generating.value = false;
  }
}

onLoad((query) => {
  activeSessionId =
    typeof query?.sessionId === 'string' && query.sessionId ? query.sessionId : sessionId.value;

  if (!activeSessionId) {
    uni.redirectTo({ url: '/pages/home/index' });
    return;
  }

  syncSession(activeSessionId);
});

onUnload(() => {
  clearRecordingTicker();
});
</script>

<style scoped>
.interview-scroll {
  height: calc(100vh - 112rpx);
}

.interview-content {
  padding-bottom: 48rpx;
}

.section {
  margin-top: 24rpx;
}

.question-card {
  padding: 30rpx;
  border-radius: 32rpx;
  background: linear-gradient(180deg, #fff1ed 0%, #f8e4de 100%);
}

.question-card__title {
  display: block;
  margin-top: 18rpx;
  font-size: 40rpx;
  line-height: 1.5;
  font-weight: 700;
  color: var(--tb-text);
}

.question-card__tip {
  display: block;
  margin-top: 18rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--tb-text-muted);
}

.segmented {
  display: flex;
  gap: 10rpx;
  padding: 10rpx;
  border-radius: var(--tb-radius-pill);
  background: var(--tb-surface-card);
}

.segmented__item {
  flex: 1;
  min-height: 76rpx;
  border-radius: var(--tb-radius-pill);
  font-size: 24rpx;
  font-weight: 600;
  color: var(--tb-text-muted);
}

.segmented__item--active {
  background: var(--tb-secondary-soft);
  color: var(--tb-secondary);
}

.timeline__item + .timeline__item {
  margin-top: 24rpx;
}

.timeline__item--user {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.timeline__item--assistant {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.timeline__meta {
  font-size: 22rpx;
  color: var(--tb-text-muted);
  margin-bottom: 10rpx;
}

.timeline__bubble {
  max-width: 88%;
  padding: 22rpx 24rpx;
  border-radius: 28rpx;
  background: var(--tb-surface-card);
}

.timeline__item--user .timeline__bubble {
  background: #f7d8ca;
}

.timeline__text {
  font-size: 28rpx;
  line-height: 1.7;
  color: var(--tb-text);
}

.audio-card {
  width: 100%;
}

.audio-segment {
  padding: 24rpx;
  border-radius: 28rpx;
  background: var(--tb-surface-card);
}

.audio-segment + .audio-segment {
  margin-top: 14rpx;
}

.audio-segment__head,
.audio-segment__player {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.audio-segment__title {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--tb-text);
}

.audio-segment__duration {
  font-size: 22rpx;
  color: var(--tb-text-muted);
}

.audio-segment__player {
  margin-top: 16rpx;
}

.audio-segment__button {
  min-width: 108rpx;
  min-height: 62rpx;
  padding: 0 20rpx;
  border-radius: var(--tb-radius-pill);
  font-size: 24rpx;
  font-weight: 600;
  background: #fff;
  color: var(--tb-primary);
}

.audio-segment__track {
  flex: 1;
  height: 14rpx;
  border-radius: 999rpx;
  background: rgba(155, 63, 30, 0.12);
  overflow: hidden;
}

.audio-segment__progress {
  height: 100%;
  background: var(--tb-primary);
  border-radius: 999rpx;
}

.audio-segment__transcript {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--tb-text-muted);
}

.empty-card {
  padding: 30rpx;
  border-radius: 30rpx;
  background: var(--tb-surface-low);
}

.empty-card__text {
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--tb-text-muted);
}

.recorder-card {
  padding: 28rpx;
}

.recorder-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.recorder-card__title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--tb-text);
}

.recorder-card__desc {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.65;
  color: var(--tb-text-muted);
}

.status-badge {
  min-width: 120rpx;
  min-height: 52rpx;
  padding: 0 18rpx;
  border-radius: var(--tb-radius-pill);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 600;
}

.status-badge--idle {
  background: rgba(255, 255, 255, 0.72);
  color: var(--tb-text-muted);
}

.status-badge--locked,
.status-badge--recording {
  background: rgba(186, 26, 26, 0.08);
  color: var(--tb-danger);
}

.status-badge--paused {
  background: rgba(255, 189, 167, 0.6);
  color: var(--tb-secondary);
}

.recorder-card__timer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 24rpx;
  padding: 22rpx 24rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.66);
}

.recorder-card__timer-label {
  font-size: 24rpx;
  color: var(--tb-text-muted);
}

.recorder-card__timer-value {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--tb-primary);
  letter-spacing: 2rpx;
}

.tip-card {
  margin-top: 22rpx;
  padding: 22rpx 24rpx;
  border-radius: 24rpx;
  background: var(--tb-surface-low);
}

.tip-card__title {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--tb-text);
}

.tip-card__text {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--tb-text-muted);
}

.draft-input {
  width: 100%;
  min-height: 220rpx;
  margin-top: 22rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background: #fff;
  font-size: 28rpx;
  line-height: 1.7;
  color: var(--tb-text);
}

.error-message {
  display: block;
  margin-top: 18rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--tb-danger);
}

.recorder-card__actions,
.submit-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 22rpx;
}

.action-half,
.submit-actions__button {
  flex: 1;
}

.preview-button {
  width: 100%;
  margin-top: 22rpx;
}
</style>
