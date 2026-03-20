<template>
  <view class="page">
    <view class="hero">
      <text class="eyebrow">Talkbook 采访</text>
      <text class="title">{{ selectedBookTypeLabel }}</text>
      <text class="subtitle">支持锁定录音、语音回放和文字记录切换，长录音会自动整理成更易回看的片段。</text>
    </view>

    <view class="panel">
      <text class="label">当前会话</text>
      <text class="value">{{ sessionId || '尚未创建' }}</text>
      <text class="tip">已回答 {{ answerCount }} 次，{{ canGenerate ? '可以生成书稿预览' : '至少完成 2 次回答后可生成预览' }}</text>
    </view>

    <view class="panel">
      <text class="label">当前提问</text>
      <text class="question">{{ currentQuestion || '开始创作后会出现第一问。' }}</text>
    </view>

    <view class="panel">
      <view class="panel-header">
        <text class="label">采访记录</text>
        <view class="view-switch">
          <view
            class="view-tab"
            :class="{ active: activeView === 'audio' }"
            @tap="activeView = 'audio'"
          >
            语音播放
          </view>
          <view
            class="view-tab"
            :class="{ active: activeView === 'text' }"
            @tap="activeView = 'text'"
          >
            文字记录
          </view>
        </view>
      </view>

      <view v-if="messages.length" class="message-list">
        <view
          v-for="message in messages"
          :key="message.id"
          class="message-item"
          :class="message.role"
        >
          <view class="message-meta">
            <text class="message-role">{{ message.role === 'assistant' ? '采访助手' : '我的讲述' }}</text>
            <text class="message-time">{{ message.timeLabel || formatMessageTime(message.createdAt) }}</text>
          </view>

          <template v-if="message.role === 'assistant' || activeView === 'text'">
            <text class="message-content">{{ message.transcript || message.content }}</text>
          </template>

          <template v-else>
            <view v-if="message.segments?.length" class="segment-list">
              <view
                v-for="segment in message.segments"
                :key="`${message.id}_${segment.segmentIndex}`"
                class="segment-card"
              >
                <view class="segment-head">
                  <text class="segment-title">{{ segment.segmentTitle }}</text>
                  <text class="segment-time">{{ segment.time }}</text>
                </view>
                <view class="segment-player">
                  <button class="play-button" size="mini" @tap="togglePlayback(`${message.id}_${segment.segmentIndex}`)">
                    {{ playingSegmentId === `${message.id}_${segment.segmentIndex}` ? '暂停' : '播放' }}
                  </button>
                  <view class="wave-track">
                    <view class="wave-progress" :style="{ width: playingSegmentId === `${message.id}_${segment.segmentIndex}` ? '68%' : '36%' }" />
                  </view>
                  <text class="segment-duration">{{ formatDuration(segment.duration) }}</text>
                </view>
                <text class="segment-transcript">{{ segment.transcript }}</text>
              </view>
            </view>

            <view v-else class="segment-card">
              <view class="segment-player">
                <button class="play-button" size="mini" @tap="togglePlayback(message.id)">
                  {{ playingSegmentId === message.id ? '暂停' : '播放' }}
                </button>
                <view class="wave-track">
                  <view class="wave-progress" :style="{ width: playingSegmentId === message.id ? '68%' : '36%' }" />
                </view>
                <text class="segment-duration">{{ formatDuration(message.duration || 12) }}</text>
              </view>
              <text class="segment-transcript">{{ message.transcript || message.content }}</text>
            </view>
          </template>
        </view>
      </view>
      <text v-else class="empty">还没有采访记录。</text>
    </view>

    <view class="panel">
      <view class="panel-header">
        <text class="label">录音与整理</text>
        <text class="status-pill" :class="recordingStatus">{{ recordingStatusText }}</text>
      </view>

      <view class="recording-card">
        <view class="status-row">
          <view>
            <text class="status-title">{{ recordingStatusTitle }}</text>
            <text class="status-desc">{{ recordingStatusDesc }}</text>
          </view>
          <text class="timer">{{ formatDuration(recordingDuration) }}</text>
        </view>

        <view v-if="recordingStatus === 'recording' || recordingStatus === 'locked'" class="lock-banner">
          <text class="lock-icon">🔒</text>
          <text>已锁定录音，你可以持续讲述。当前录音结束后，系统会自动按语义切成约 1 分钟一段。</text>
        </view>

        <view v-if="recordingStatus === 'paused'" class="lock-tip">
          <text>录音已暂停，可以继续补充或直接结束本次讲述。</text>
        </view>
      </view>

      <view class="helper-card">
        <text class="helper-title">长录音自动分段</text>
        <text class="helper-text">连续讲述较长时，系统会优先按句子和语义边界切分为约 1 分钟的小音频，避免从一句话中间硬切开。</text>
      </view>

      <textarea
        v-model="draftTranscript"
        class="input"
        maxlength="800"
        placeholder="这里先输入本次讲述的文字稿或补充说明，后续可直接替换成真实语音转写。"
      />

      <text v-if="errorMessage" class="error">{{ errorMessage }}</text>

      <view class="recording-actions">
        <button
          v-if="recordingStatus === 'idle'"
          class="primary"
          :disabled="!sessionId"
          @tap="startRecording"
        >
          开始录音
        </button>

        <template v-else-if="recordingStatus === 'recording' || recordingStatus === 'locked'">
          <button class="secondary" @tap="pauseRecording">暂停录音</button>
          <button class="ghost" @tap="finishRecording">结束录音</button>
        </template>

        <template v-else>
          <button class="secondary" @tap="resumeRecording">继续录音</button>
          <button class="ghost" @tap="finishRecording">结束录音</button>
        </template>
      </view>

      <view class="actions">
        <button class="secondary" :loading="skipping" :disabled="!sessionId || sending || recordingStatus !== 'idle'" @tap="handleSkip">
          跳过这一问
        </button>
        <button class="primary" :loading="sending" :disabled="!sessionId || !draftTranscript.trim() || recordingStatus !== 'idle'" @tap="handleManualSubmit">
          提交文字记录
        </button>
      </view>
      <button class="ghost preview-button" :loading="generating" :disabled="!sessionId || !canGenerate || recordingStatus !== 'idle'" @tap="goPreview">
        生成书稿预览
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { storeToRefs } from 'pinia';
import type { RecordingMode, RecordingStatus, SessionAudioUploadRequest, SessionMessage } from '@talkbook/contracts';

import { getSession, postAudioTranscript, postPreview, postSkipQuestion } from '../../services/api';
import { useCreationStore } from '../../stores/useCreationStore';

const store = useCreationStore();
const { answerCount, canGenerate, currentQuestion, messages, selectedBookTypeLabel, sessionId } = storeToRefs(store);
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
let currentRecordingMode: RecordingMode = 'locked';

const recordingStatusText = computed(() => {
  if (recordingStatus.value === 'recording' || recordingStatus.value === 'locked') {
    return '已锁定录音';
  }

  if (recordingStatus.value === 'paused') {
    return '暂停录音';
  }

  return '待开始';
});

const recordingStatusTitle = computed(() => {
  if (recordingStatus.value === 'recording' || recordingStatus.value === 'locked') {
    return '正在录音（已锁定）';
  }

  if (recordingStatus.value === 'paused') {
    return '录音已暂停';
  }

  return '准备开始一段新的讲述';
});

const recordingStatusDesc = computed(() => {
  if (recordingStatus.value === 'recording' || recordingStatus.value === 'locked') {
    return '点一下按钮即可开始录音，无需一直按住手机。';
  }

  if (recordingStatus.value === 'paused') {
    return '可以继续补充，也可以直接结束并整理当前内容。';
  }

  return '建议先开始录音，再把这一轮讲述整理成书稿素材。';
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

async function syncSession() {
  if (!sessionId.value) {
    uni.redirectTo({ url: '/pages/home/index' });
    return;
  }

  try {
    const detail = await getSession(sessionId.value);
    if (detail.messages.length === 0) {
      throw new Error('当前会话不存在，请重新创建。');
    }

    store.hydrateSession(detail);
    errorMessage.value = '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '获取会话失败。';
  }
}

async function submitTranscript(payload: SessionAudioUploadRequest) {
  if (!sessionId.value) {
    return;
  }

  sending.value = true;
  errorMessage.value = '';

  try {
    await postAudioTranscript(sessionId.value, payload);
    draftTranscript.value = '';
    recordingDuration.value = 0;
    currentRecordingMode = 'press-hold';
    await syncSession();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '提交回答失败。';
  } finally {
    sending.value = false;
  }
}

function startRecording() {
  if (!sessionId.value || recordingStatus.value !== 'idle') {
    return;
  }

  errorMessage.value = '';
  currentRecordingMode = 'locked';
  recordingStatus.value = 'locked';
  recordingDuration.value = 0;
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
  if (recordingStatus.value === 'idle' || !sessionId.value) {
    return;
  }

  clearRecordingTicker();
  const payload: SessionAudioUploadRequest = {
    transcript: draftTranscript.value.trim(),
    duration: recordingDuration.value || 12,
    format: 'mock-audio',
    recordingMode: 'locked',
    isLocked: true
  };

  recordingStatus.value = 'idle';
  await submitTranscript(payload);
}

async function handleManualSubmit() {
  if (!sessionId.value || !draftTranscript.value.trim()) {
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
  if (!sessionId.value) {
    return;
  }

  skipping.value = true;
  errorMessage.value = '';

  try {
    await postSkipQuestion(sessionId.value);
    await syncSession();
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
  if (!sessionId.value || !canGenerate.value) {
    return;
  }

  generating.value = true;
  errorMessage.value = '';

  try {
    const preview = await postPreview(sessionId.value);
    store.setPreview(preview);
    uni.navigateTo({ url: '/pages/preview/index' });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '生成预览失败。';
  } finally {
    generating.value = false;
  }
}

onLoad(() => {
  if (!sessionId.value) {
    uni.redirectTo({ url: '/pages/home/index' });
    return;
  }

  syncSession();
});

onUnload(() => {
  clearRecordingTicker();
});
</script>

<style scoped>
.page {
  padding: 32rpx;
  background: #f6f1e8;
}

.hero {
  padding: 32rpx;
  border-radius: 30rpx;
  background: linear-gradient(135deg, #d8e6dc 0%, #edf3ee 45%, #f7efe2 100%);
  color: #24352b;
  margin-bottom: 24rpx;
}

.eyebrow {
  display: block;
  font-size: 22rpx;
  letter-spacing: 4rpx;
  color: #5e6f65;
}

.title {
  display: block;
  margin-top: 12rpx;
  font-size: 44rpx;
  font-weight: 700;
}

.subtitle {
  display: block;
  margin-top: 14rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: #5d665f;
}

.panel {
  background: #fffdf8;
  border-radius: 28rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 16rpx 32rpx rgba(40, 52, 45, 0.06);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.label {
  display: block;
  color: #697167;
  font-size: 24rpx;
}

.value,
.question {
  display: block;
  margin-top: 12rpx;
  font-size: 32rpx;
  font-weight: 600;
  line-height: 1.6;
  color: #25342c;
}

.question {
  font-size: 36rpx;
}

.tip {
  display: block;
  margin-top: 12rpx;
  color: #697167;
  font-size: 24rpx;
}

.view-switch {
  display: flex;
  background: #eef1eb;
  border-radius: 999rpx;
  padding: 6rpx;
}

.view-tab {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  color: #55635b;
  font-size: 24rpx;
}

.view-tab.active {
  background: #496257;
  color: #fff;
}

.message-list {
  margin-top: 18rpx;
}

.message-item {
  margin-bottom: 18rpx;
  padding: 20rpx;
  border-radius: 24rpx;
  background: #f5f2ea;
}

.message-item.user {
  background: #eef4ef;
}

.message-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.message-role,
.message-time,
.segment-time {
  font-size: 22rpx;
  color: #6f766f;
}

.message-content {
  display: block;
  margin-top: 10rpx;
  font-size: 28rpx;
  line-height: 1.7;
  color: #24312a;
}

.segment-list {
  margin-top: 12rpx;
}

.segment-card {
  margin-top: 12rpx;
  padding: 18rpx;
  border-radius: 20rpx;
  background: #fff;
}

.segment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.segment-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #27352e;
}

.segment-player {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-top: 12rpx;
}

.play-button {
  margin: 0;
  min-width: 108rpx;
  border-radius: 999rpx;
  background: #496257;
  color: #fff;
  line-height: 1.8;
}

.wave-track {
  flex: 1;
  height: 12rpx;
  border-radius: 999rpx;
  background: #e2e8df;
  overflow: hidden;
}

.wave-progress {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #496257 0%, #8ea89c 100%);
}

.segment-duration {
  font-size: 22rpx;
  color: #6f766f;
}

.segment-transcript {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #4e5b53;
}

.empty {
  display: block;
  margin-top: 16rpx;
  color: #889187;
}

.status-pill {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  background: #eef1eb;
  color: #506057;
}

.status-pill.recording,
.status-pill.locked {
  background: #dce8df;
  color: #294239;
}

.status-pill.paused {
  background: #f2e9d9;
  color: #735429;
}

.recording-card,
.helper-card {
  margin-top: 18rpx;
  padding: 22rpx;
  border-radius: 24rpx;
  background: #f5f2ea;
}

.status-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.status-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #24312a;
}

.status-desc,
.helper-text,
.lock-tip text,
.lock-banner text {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #5f675f;
}

.timer {
  font-size: 34rpx;
  font-weight: 700;
  color: #24312a;
}

.lock-tip,
.lock-banner {
  margin-top: 18rpx;
  padding: 18rpx;
  border-radius: 20rpx;
  background: #fff;
}

.lock-banner {
  display: flex;
  gap: 12rpx;
}

.lock-icon {
  font-size: 28rpx;
  line-height: 1.4;
}

.helper-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #24312a;
}

.input {
  width: 100%;
  min-height: 220rpx;
  margin-top: 18rpx;
  padding: 20rpx;
  border-radius: 24rpx;
  background: #fff;
  box-sizing: border-box;
}

.error {
  display: block;
  margin-top: 16rpx;
  color: #b42318;
  font-size: 24rpx;
}

.recording-actions,
.actions {
  display: flex;
  gap: 16rpx;
  margin-top: 18rpx;
}

.primary,
.secondary,
.ghost {
  flex: 1;
  border-radius: 999rpx;
}

.primary {
  background: #243d34;
  color: #fff;
}

.secondary {
  background: #ece4d7;
  color: #243d34;
}

.ghost {
  border: 2rpx solid #243d34;
  background: transparent;
  color: #243d34;
}

.preview-button {
  margin-top: 18rpx;
}
</style>
