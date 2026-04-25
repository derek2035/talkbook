<template>
  <view class="tb-page">
    <PageHeader title="智能访谈" back @back="goBack" />

    <scroll-view scroll-y class="interview-scroll">
      <view class="tb-content interview-content">
        <view class="context-row">
          <text class="tb-chip tb-chip--soft">{{ selectedBookTypeLabel }}</text>
          <text class="tb-chip tb-chip--soft">第 {{ answerCount + 1 }} 轮</text>
          <text class="tb-chip" :class="canGenerate ? 'tb-chip--warm' : 'tb-chip--soft'">
            {{ progressChipText }}
          </text>
        </view>

        <view class="question-card">
          <text class="question-card__eyebrow">本轮问题</text>
          <text class="question-card__title">{{ currentQuestion || '开始创作后会出现第一问。' }}</text>
          <text class="question-card__tip">
            {{
              canGenerate
                ? '素材已经达到预览标准，可以继续补充更多细节，也可以直接生成书稿预览。'
                : '完成两轮有效回答后可生成预览。'
            }}
          </text>
        </view>

        <view class="section">
          <view class="section-head">
            <view>
              <text class="section-head__title">采访记录</text>
              <text class="section-head__tip">
                {{ timelineViewMode === 'audio' ? '按轮次回听讲述。' : '查看整理后的文字。' }}
              </text>
            </view>

            <view class="timeline-switch">
              <button
                class="timeline-switch__item"
                :class="{ 'timeline-switch__item--active': timelineViewMode === 'audio' }"
                @tap="timelineViewMode = 'audio'"
              >
                语音播放
              </button>
              <button
                class="timeline-switch__item"
                :class="{ 'timeline-switch__item--active': timelineViewMode === 'text' }"
                @tap="timelineViewMode = 'text'"
              >
                文字记录
              </button>
            </view>
          </view>

          <view v-if="messages.length" class="timeline">
            <view
              v-for="message in messages"
              :key="message.id"
              class="message-card"
              :class="message.role === 'assistant' ? 'message-card--assistant' : 'message-card--user'"
            >
              <view class="message-card__head">
                <text class="message-card__author">
                  {{ message.role === 'assistant' ? '采访助手' : '我的讲述' }}
                </text>
                <text class="message-card__time">{{ message.timeLabel || formatMessageTime(message.createdAt) }}</text>
              </view>

              <view v-if="message.role === 'assistant'" class="assistant-bubble">
                <text class="assistant-bubble__text">{{ message.content }}</text>
              </view>

              <view
                v-else
                class="response-card"
                :class="isAudioMessage(message) ? 'response-card--audio' : 'response-card--text'"
              >
                <view v-if="timelineViewMode === 'text' || !isAudioMessage(message)" class="response-card__block">
                  <view class="response-card__head">
                    <text class="response-card__label">
                      {{ isAudioMessage(message) ? '转写文字' : '文字回答' }}
                    </text>
                    <text class="response-card__meta">
                      {{ isAudioMessage(message) ? message.statusLabel || '已保存' : '无音频' }}
                    </text>
                  </view>
                  <text class="response-card__text">{{ message.transcript || message.content }}</text>
                </view>

                <view v-else class="response-card__block">
                  <view class="response-card__head">
                    <text class="response-card__label">语音分段</text>
                    <text class="response-card__meta">{{ buildSegmentMeta(message) }}</text>
                  </view>

                  <view v-if="message.segments?.length" class="segment-list">
                    <view
                      v-for="segment in message.segments"
                      :key="`${message.id}_${segment.segmentIndex}`"
                      class="segment-item"
                    >
                      <view class="segment-item__head">
                        <text class="segment-item__title">{{ segment.segmentTitle }}</text>
                        <text class="segment-item__duration">{{ formatDuration(segment.duration) }}</text>
                      </view>
                      <view class="segment-item__player">
                        <button
                          class="segment-item__button"
                          @tap="togglePlayback(`${message.id}_${segment.segmentIndex}`)"
                        >
                          {{ playingSegmentId === `${message.id}_${segment.segmentIndex}` ? '暂停' : '播放' }}
                        </button>
                        <view class="segment-item__track">
                          <view
                            class="segment-item__progress"
                            :style="{ width: playingSegmentId === `${message.id}_${segment.segmentIndex}` ? '70%' : '38%' }"
                          />
                        </view>
                      </view>
                      <text class="segment-item__text">{{ segment.transcript }}</text>
                    </view>
                  </view>

                  <view v-else class="segment-item">
                    <view class="segment-item__head">
                      <text class="segment-item__title">完整录音</text>
                      <text class="segment-item__duration">{{ formatDuration(message.duration || 12) }}</text>
                    </view>
                    <view class="segment-item__player">
                      <button class="segment-item__button" @tap="togglePlayback(message.id)">
                        {{ playingSegmentId === message.id ? '暂停' : '播放' }}
                      </button>
                      <view class="segment-item__track">
                        <view
                          class="segment-item__progress"
                          :style="{ width: playingSegmentId === message.id ? '70%' : '38%' }"
                        />
                      </view>
                    </view>
                    <text class="segment-item__text">{{ message.transcript || message.content }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view v-else class="empty-card">
            <text class="empty-card__title">还没有采访记录</text>
            <text class="empty-card__text">先开始第一轮讲述，语音和文字记录都会出现在这里。</text>
          </view>
        </view>

        <view class="section tb-card composer-card">
          <view class="composer-card__head">
            <view>
              <text class="composer-card__title">回答这一问</text>
              <text class="composer-card__desc">先讲完整，再补关键词。</text>
            </view>
            <view class="status-badge" :class="`status-badge--${recordingStatus}`">
              {{ recordingStatusText }}
            </view>
          </view>

          <view class="mode-switch">
            <button
              class="mode-switch__item"
              :class="{ 'mode-switch__item--active': inputMode === 'audio' }"
              @tap="inputMode = 'audio'"
            >
              语音录入
            </button>
            <button
              class="mode-switch__item"
              :class="{ 'mode-switch__item--active': inputMode === 'text' }"
              @tap="inputMode = 'text'"
            >
              文字录入
            </button>
          </view>

          <view v-if="inputMode === 'audio'" class="composer-body">
            <view class="recorder-panel">
              <view class="recorder-panel__timer">
                <text class="recorder-panel__label">当前录音时长</text>
                <text class="recorder-panel__value">{{ formatDuration(recordingDuration) }}</text>
              </view>
              <text class="recorder-panel__hint">
                录完会自动保存到采访记录。
              </text>

              <view class="recorder-panel__actions">
                <button
                  v-if="recordingStatus === 'idle'"
                  class="tb-primary-button recorder-panel__button"
                  :disabled="!sessionId"
                  @tap="startRecording"
                >
                  开始录音
                </button>

                <template v-else-if="recordingStatus === 'recording' || recordingStatus === 'locked'">
                  <button class="tb-secondary-button recorder-panel__button" @tap="pauseRecording">暂停录音</button>
                  <button class="tb-primary-button recorder-panel__button" @tap="finishRecording">结束并保存</button>
                </template>

                <template v-else>
                  <button class="tb-secondary-button recorder-panel__button" @tap="resumeRecording">继续录音</button>
                  <button class="tb-primary-button recorder-panel__button" @tap="finishRecording">结束并保存</button>
                </template>
              </view>
            </view>

            <view class="notes-panel">
              <text class="notes-panel__label">补充文字说明（可选）</text>
              <textarea
                v-model="audioNotes"
                class="notes-panel__input"
                maxlength="800"
                placeholder="补充人物关系、时间地点或重要细节。"
              />
            </view>
          </view>

          <view v-else class="composer-body">
            <view class="notes-panel">
              <text class="notes-panel__label">直接输入这一轮回答</text>
              <textarea
                v-model="textDraft"
                class="notes-panel__input notes-panel__input--tall"
                maxlength="800"
                placeholder="写下这一轮回答。"
              />
            </view>

            <button
              class="tb-primary-button text-submit-button"
              :loading="sending"
              :disabled="!sessionId || !textDraft.trim()"
              @tap="handleManualSubmit"
            >
              提交文字记录
            </button>
          </view>

          <text v-if="errorMessage" class="error-message">{{ errorMessage }}</text>

          <view class="composer-footer">
            <button
              class="tb-ghost-button composer-footer__button"
              :loading="skipping"
              :disabled="!sessionId || sending || recordingStatus !== 'idle'"
              @tap="handleSkip"
            >
              跳过这一问
            </button>
            <button
              class="tb-primary-button composer-footer__button"
              :loading="generating"
              :disabled="!sessionId || !canGenerate || recordingStatus !== 'idle'"
              @tap="goPreview"
            >
              生成书稿预览
            </button>
          </view>
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
  SessionAudioUploadRequest,
  SessionMessage
} from '@talkbook/contracts';

import PageHeader from '../../components/PageHeader.vue';
import { getSession, postAudioTranscript, postPreview, postSkipQuestion } from '../../services/api';
import { useCreationStore } from '../../stores/useCreationStore';

const store = useCreationStore();
const { answerCount, canGenerate, currentQuestion, messages, selectedBookTypeLabel, sessionId } =
  storeToRefs(store);

const inputMode = ref<'audio' | 'text'>('audio');
const audioNotes = ref('');
const textDraft = ref('');
const sending = ref(false);
const skipping = ref(false);
const generating = ref(false);
const errorMessage = ref('');
const recordingStatus = ref<RecordingStatus>('idle');
const recordingDuration = ref(0);
const playingSegmentId = ref('');
const activeSessionId = ref('');
const timelineViewMode = ref<'audio' | 'text'>('audio');

let recordingTimer: ReturnType<typeof setInterval> | null = null;
let currentRecordingMode: RecordingMode = 'locked';
const recorderManager = typeof uni.getRecorderManager === 'function' ? uni.getRecorderManager() : null;

const progressChipText = computed(() => {
  if (canGenerate.value) {
    return '可生成预览';
  }

  return `${Math.min(answerCount.value, 2)}/2 解锁预览`;
});

const recordingStatusText = computed(() => {
  if (recordingStatus.value === 'recording' || recordingStatus.value === 'locked') {
    return '录音中';
  }

  if (recordingStatus.value === 'paused') {
    return '已暂停';
  }

  return '待开始';
});

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

function isAudioMessage(message: SessionMessage) {
  return message.displayType === 'audio' || (!message.displayType && Boolean(message.segments?.length));
}

function buildSegmentMeta(message: SessionMessage) {
  const segmentCount = message.segments?.length ?? 0;

  if (segmentCount > 0) {
    const totalDuration = message.segments?.reduce((sum, segment) => sum + segment.duration, 0) ?? 0;
    return `${segmentCount} 段 · ${formatDuration(totalDuration)}`;
  }

  return `1 段 · ${formatDuration(message.duration || 12)}`;
}

function goBack() {
  const pageCount = getCurrentPages().length;

  if (pageCount > 1) {
    uni.navigateBack();
    return;
  }

  uni.reLaunch({ url: '/pages/home/index' });
}

function clearRecordingTicker() {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
}

function getFileSystemManagerCompat() {
  return (
    (uni as typeof uni & { getFileSystemManager?: () => { readFile: (options: Record<string, unknown>) => void } })
      .getFileSystemManager?.() ||
    (globalThis as { wx?: { getFileSystemManager?: () => { readFile: (options: Record<string, unknown>) => void } } }).wx
      ?.getFileSystemManager?.() ||
    null
  );
}

function readFileAsBase64(filePath: string) {
  const fileSystemManager = getFileSystemManagerCompat();

  if (!fileSystemManager) {
    return Promise.reject(new Error('当前环境暂不支持读取录音文件。'));
  }

  return new Promise<string>((resolve, reject) => {
    fileSystemManager.readFile({
      filePath,
      encoding: 'base64',
      success: (result: { data?: string }) => resolve(result.data || ''),
      fail: (error: unknown) => reject(error)
    });
  });
}

function stopRealRecording() {
  if (!recorderManager) {
    return Promise.resolve<{
      audioBase64: string;
      duration: number;
      audioFileName: string;
      audioMimeType: string;
    } | null>(null);
  }

  return new Promise<{
    audioBase64: string;
    duration: number;
    audioFileName: string;
    audioMimeType: string;
  }>((resolve, reject) => {
    const cleanup = () => {
      recorderManager.offStop?.(handleStop);
      recorderManager.offError?.(handleError);
    };

    const handleError = (error: unknown) => {
      cleanup();
      reject(error);
    };

    const handleStop = async (result: { tempFilePath?: string; duration?: number }) => {
      cleanup();

      try {
        if (!result.tempFilePath) {
          throw new Error('录音文件不存在');
        }

        const audioBase64 = await readFileAsBase64(result.tempFilePath);
        resolve({
          audioBase64,
          duration: Math.max(1, Math.round((result.duration || recordingDuration.value * 1000) / 1000)),
          audioFileName: 'talkbook-recording.mp3',
          audioMimeType: 'audio/mpeg'
        });
      } catch (error) {
        reject(error);
      }
    };

    recorderManager.onStop?.(handleStop);
    recorderManager.onError?.(handleError);
    recorderManager.stop();
  });
}

function startRecordingTicker() {
  clearRecordingTicker();
  recordingTimer = setInterval(() => {
    recordingDuration.value += 1;
  }, 1000);
}

async function syncSession(sessionIdToLoad = activeSessionId.value) {
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
    activeSessionId.value = detail.sessionId;
    errorMessage.value = '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '获取会话失败。';
  }
}

async function submitTranscript(payload: SessionAudioUploadRequest, source: 'audio' | 'text') {
  if (!activeSessionId.value) {
    return;
  }

  sending.value = true;
  errorMessage.value = '';

  try {
    await postAudioTranscript(activeSessionId.value, payload);
    if (source === 'audio') {
      audioNotes.value = '';
    } else {
      textDraft.value = '';
      inputMode.value = 'audio';
    }
    recordingDuration.value = 0;
    currentRecordingMode = 'press-hold';
    await syncSession(activeSessionId.value);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '提交回答失败。';
  } finally {
    sending.value = false;
  }
}

function startRecording() {
  if (!activeSessionId.value || recordingStatus.value !== 'idle') {
    return;
  }

  currentRecordingMode = 'locked';
  recordingStatus.value = 'locked';
  recordingDuration.value = 0;
  errorMessage.value = '';

  if (recorderManager) {
    try {
      recorderManager.start({
        duration: 10 * 60 * 1000,
        format: 'mp3',
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 96000
      });
    } catch (error) {
      recordingStatus.value = 'idle';
      errorMessage.value = error instanceof Error ? error.message : '开始录音失败。';
      return;
    }
  }

  startRecordingTicker();
}

function pauseRecording() {
  if (recordingStatus.value !== 'locked' && recordingStatus.value !== 'recording') {
    return;
  }

  recordingStatus.value = 'paused';
  clearRecordingTicker();
  recorderManager?.pause?.();
}

function resumeRecording() {
  if (recordingStatus.value !== 'paused') {
    return;
  }

  currentRecordingMode = 'locked';
  recordingStatus.value = 'locked';
  recorderManager?.resume?.();
  startRecordingTicker();
}

async function finishRecording() {
  if (recordingStatus.value === 'idle' || !activeSessionId.value) {
    return;
  }

  clearRecordingTicker();

  let recordedAudio: {
    audioBase64: string;
    duration: number;
    audioFileName: string;
    audioMimeType: string;
  } | null = null;

  if (recorderManager) {
    try {
      recordedAudio = await stopRealRecording();
    } catch (error) {
      recordingStatus.value = 'idle';
      errorMessage.value = error instanceof Error ? error.message : '结束录音失败。';
      return;
    }
  }

  const payload: SessionAudioUploadRequest = {
    transcript: audioNotes.value.trim() || undefined,
    audioBase64: recordedAudio?.audioBase64,
    audioMimeType: recordedAudio?.audioMimeType,
    audioFileName: recordedAudio?.audioFileName,
    duration: recordedAudio?.duration || recordingDuration.value || 12,
    format: recordedAudio ? 'audio/mp3' : 'mock-audio',
    recordingMode: currentRecordingMode,
    isLocked: true
  };

  recordingStatus.value = 'idle';
  await submitTranscript(payload, 'audio');
}

async function handleManualSubmit() {
  if (!activeSessionId.value || !textDraft.value.trim()) {
    return;
  }

  await submitTranscript(
    {
      transcript: textDraft.value.trim(),
      duration: Math.max(12, Math.round(textDraft.value.trim().length * 1.6)),
      format: 'mock-text',
      recordingMode: 'locked',
      isLocked: false
    },
    'text'
  );
}

async function handleSkip() {
  if (!activeSessionId.value) {
    return;
  }

  skipping.value = true;
  errorMessage.value = '';

  try {
    await postSkipQuestion(activeSessionId.value);
    await syncSession(activeSessionId.value);
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
  if (!activeSessionId.value || !canGenerate.value) {
    return;
  }

  generating.value = true;
  errorMessage.value = '';

  try {
    const preview = await postPreview(activeSessionId.value);
    store.setPreview(preview);
    uni.navigateTo({
      url: `/pages/preview/index?bookId=${preview.bookId}&sessionId=${activeSessionId.value}`
    });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '生成预览失败。';
  } finally {
    generating.value = false;
  }
}

onLoad((query) => {
  activeSessionId.value =
    typeof query?.sessionId === 'string' && query.sessionId ? query.sessionId : sessionId.value;

  if (!activeSessionId.value) {
    uni.redirectTo({ url: '/pages/home/index' });
    return;
  }

  syncSession(activeSessionId.value);
});

onUnload(() => {
  clearRecordingTicker();
});
</script>

<style scoped>
.interview-scroll {
  height: calc(100vh - var(--tb-topbar-height));
}

.interview-content {
  padding-top: 18rpx;
  padding-bottom: 48rpx;
}

.section {
  margin-top: 28rpx;
}

.context-row {
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
}

.question-card {
  margin-top: 18rpx;
  padding: 28rpx 30rpx;
  border-radius: 20rpx;
  background: #fff;
}

.question-card__eyebrow {
  display: block;
  font-size: 22rpx;
  color: var(--tb-text-muted);
}

.question-card__title {
  display: block;
  margin-top: 14rpx;
  font-size: 38rpx;
  line-height: 1.38;
  font-weight: 700;
  color: var(--tb-text);
}

.question-card__tip {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--tb-text-muted);
}

.section-head {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16rpx;
}

.section-head__title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--tb-text);
}

.section-head__tip {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: var(--tb-text-muted);
}

.timeline-switch {
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  width: 360rpx;
  max-width: 100%;
  padding: 4rpx;
  border-radius: 10rpx;
  background: #f6f6f6;
  border: 2rpx solid rgba(0, 0, 0, 0.04);
}

.timeline-switch__item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 56rpx;
  padding: 0 12rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 600;
  color: var(--tb-text-muted);
  text-align: center;
}

.timeline-switch__item--active {
  background: var(--tb-primary);
  color: #fff;
}

.timeline {
  margin-top: 16rpx;
}

.message-card + .message-card {
  margin-top: 28rpx;
}

.message-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.message-card--user .message-card__head {
  justify-content: flex-end;
  gap: 16rpx;
}

.message-card__author {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--tb-text-muted);
}

.message-card__time {
  font-size: 22rpx;
  color: var(--tb-text-muted);
}

.assistant-bubble {
  max-width: 86%;
  padding: 22rpx 24rpx;
  border-radius: 10rpx;
  background: #fff;
}

.assistant-bubble__text {
  font-size: 28rpx;
  line-height: 1.7;
  color: var(--tb-text);
}

.response-card {
  padding: 24rpx;
  border-radius: 10rpx;
  border: 2rpx solid rgba(0, 0, 0, 0.04);
}

.response-card--text {
  background: #dcf8c6;
}

.response-card--audio {
  background: #fff;
}

.message-card--user .response-card {
  max-width: 86%;
  margin-left: auto;
}

.response-card__block + .response-card__block {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid rgba(0, 0, 0, 0.06);
}

.response-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.response-card__label {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--tb-text);
}

.response-card__meta {
  font-size: 22rpx;
  color: rgba(31, 31, 31, 0.58);
}

.response-card__text {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  line-height: 1.75;
  color: var(--tb-text);
}

.segment-list {
  margin-top: 12rpx;
}

.segment-item {
  padding: 20rpx;
  border-radius: 10rpx;
  background: var(--tb-surface-low);
}

.segment-item + .segment-item {
  margin-top: 12rpx;
}

.segment-item__head,
.segment-item__player {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.segment-item__title {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--tb-text);
}

.segment-item__duration {
  font-size: 22rpx;
  color: var(--tb-text-muted);
}

.segment-item__player {
  margin-top: 14rpx;
}

.segment-item__button {
  min-width: 104rpx;
  min-height: 60rpx;
  padding: 0 20rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  font-weight: 600;
  background: #fff;
  color: var(--tb-text);
}

.segment-item__track {
  flex: 1;
  height: 12rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.segment-item__progress {
  height: 100%;
  border-radius: 999rpx;
  background: var(--tb-primary);
}

.segment-item__text {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--tb-text-muted);
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

.composer-card {
  padding: 26rpx;
  border-radius: 20rpx;
}

.composer-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
}

.composer-card__title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--tb-text);
}

.composer-card__desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.5;
  color: var(--tb-text-muted);
}

.status-badge {
  min-width: 112rpx;
  min-height: 52rpx;
  padding: 0 18rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 600;
}

.status-badge--idle {
  background: #f6f6f6;
  color: var(--tb-text-muted);
}

.status-badge--locked,
.status-badge--recording {
  background: rgba(186, 26, 26, 0.08);
  color: var(--tb-danger);
}

.status-badge--paused {
  background: #fff7e6;
  color: #b26b00;
}

.mode-switch {
  display: flex;
  gap: 0;
  margin-top: 20rpx;
  padding: 4rpx;
  border-radius: 10rpx;
  background: var(--tb-surface-low);
}

.mode-switch__item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  line-height: 1;
  font-weight: 600;
  color: var(--tb-text-muted);
  text-align: center;
}

.mode-switch__item--active {
  background: #fff;
  color: var(--tb-primary);
}

.composer-body {
  margin-top: 18rpx;
}

.recorder-panel,
.notes-panel {
  padding: 20rpx 22rpx;
  border-radius: 16rpx;
  background: var(--tb-surface-low);
}

.notes-panel {
  margin-top: 16rpx;
}

.recorder-panel__timer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16rpx;
}

.recorder-panel__label {
  font-size: 24rpx;
  color: var(--tb-text-muted);
}

.recorder-panel__value {
  font-size: 38rpx;
  font-weight: 700;
  color: var(--tb-primary);
}

.recorder-panel__hint {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.55;
  color: var(--tb-text-muted);
}

.recorder-panel__actions {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.recorder-panel__button {
  flex: 1;
}

.notes-panel__label {
  display: block;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--tb-text);
}

.notes-panel__input {
  width: 100%;
  min-height: 128rpx;
  margin-top: 12rpx;
  padding: 22rpx;
  border-radius: 12rpx;
  background: #fff;
  font-size: 28rpx;
  line-height: 1.7;
  color: var(--tb-text);
}

.notes-panel__input--tall {
  min-height: 220rpx;
}

.text-submit-button {
  width: 100%;
  margin-top: 18rpx;
}

.error-message {
  display: block;
  margin-top: 18rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--tb-danger);
}

.composer-footer {
  display: flex;
  gap: 16rpx;
  margin-top: 22rpx;
}

.composer-footer__button {
  flex: 1;
}
</style>
