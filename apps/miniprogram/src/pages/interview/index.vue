<template>
  <view class="page">
    <view class="hero">
      <text class="eyebrow">AI 采访</text>
      <text class="title">{{ selectedBookTypeLabel }}</text>
      <text class="subtitle">当前先用文字模拟语音转写，后面可无缝替换成真实录音上传。</text>
    </view>

    <view class="panel">
      <text class="label">当前会话</text>
      <text class="value">{{ sessionId || '尚未创建' }}</text>
      <text class="tip">已回答 {{ answerCount }} 次，{{ canGenerate ? '可以生成书稿预览' : '至少完成 2 次回答后可生成预览' }}</text>
    </view>

    <view class="panel">
      <text class="label">AI 当前问题</text>
      <text class="question">{{ currentQuestion || '开始创作后会出现第一问。' }}</text>
    </view>

    <view class="panel">
      <text class="label">采访记录</text>
      <view v-if="messages.length" class="message-list">
        <view
          v-for="message in messages"
          :key="message.id"
          class="message-item"
          :class="message.role"
        >
          <text class="message-role">{{ message.role === 'assistant' ? 'AI' : '你' }}</text>
          <text class="message-content">{{ message.content }}</text>
        </view>
      </view>
      <text v-else class="empty">还没有采访记录。</text>
    </view>

    <view class="panel">
      <text class="label">文字模拟回答</text>
      <textarea
        v-model="draftTranscript"
        class="input"
        maxlength="300"
        placeholder="先用文字补充内容，后续这里会接真实录音转写。"
      />
      <text v-if="errorMessage" class="error">{{ errorMessage }}</text>
      <view class="actions">
        <button class="secondary" :loading="skipping" :disabled="!sessionId || sending" @tap="handleSkip">
          跳过这一问
        </button>
        <button class="primary" :loading="sending" :disabled="!sessionId || !draftTranscript.trim()" @tap="handleSubmit">
          提交回答
        </button>
      </view>
      <button class="ghost" :loading="generating" :disabled="!sessionId || !canGenerate" @tap="goPreview">
        生成书稿预览
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { storeToRefs } from 'pinia';

import { getSession, postAudioTranscript, postPreview, postSkipQuestion } from '../../services/api';
import { useCreationStore } from '../../stores/useCreationStore';

const store = useCreationStore();
const { answerCount, canGenerate, currentQuestion, messages, selectedBookTypeLabel, sessionId } = storeToRefs(store);
const draftTranscript = ref('');
const sending = ref(false);
const skipping = ref(false);
const generating = ref(false);
const errorMessage = ref('');

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

async function handleSubmit() {
  if (!sessionId.value || !draftTranscript.value.trim()) {
    return;
  }

  sending.value = true;
  errorMessage.value = '';

  try {
    await postAudioTranscript(sessionId.value, draftTranscript.value.trim());
    draftTranscript.value = '';
    await syncSession();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '提交回答失败。';
  } finally {
    sending.value = false;
  }
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
</script>

<style scoped>
.page { padding: 32rpx; }
.hero {
  padding: 32rpx;
  border-radius: 30rpx;
  background: linear-gradient(135deg, #17324d 0%, #24557a 48%, #d89b5b 100%);
  color: #fff;
  margin-bottom: 24rpx;
}
.eyebrow { display:block; font-size:22rpx; letter-spacing:4rpx; opacity:0.78; }
.title { display:block; margin-top:12rpx; font-size:46rpx; font-weight:700; }
.subtitle { display:block; margin-top:14rpx; font-size:26rpx; line-height:1.6; color:rgba(255, 255, 255, 0.78); }
.panel {
  background:#fffdf9;
  border-radius:28rpx;
  padding:24rpx;
  margin-bottom:24rpx;
  box-shadow:0 16rpx 32rpx rgba(16, 37, 66, 0.06);
}
.label { display:block; color:#6b7280; font-size:24rpx; }
.value, .question { display:block; margin-top:12rpx; font-size:32rpx; font-weight:600; line-height:1.5; }
.tip { display:block; margin-top:12rpx; color:#6b7280; font-size:24rpx; }
.message-list { margin-top:18rpx; }
.message-item {
  margin-bottom:16rpx;
  padding:18rpx 20rpx;
  border-radius:22rpx;
  background:#f7f4ee;
}
.message-item.user { background:#eef3ff; }
.message-role { display:block; font-size:22rpx; color:#6b7280; }
.message-content { display:block; margin-top:8rpx; font-size:28rpx; line-height:1.6; color:#172033; }
.empty { display:block; margin-top:16rpx; color:#8b95a7; }
.input {
  width:100%;
  min-height:220rpx;
  margin-top:18rpx;
  padding:20rpx;
  border-radius:24rpx;
  background:#f7f4ee;
  box-sizing:border-box;
}
.error { display:block; margin-top:16rpx; color:#b42318; font-size:24rpx; }
.actions { display:flex; gap:16rpx; margin-top:18rpx; }
.primary, .secondary, .ghost { border-radius:999rpx; }
.primary {
  flex:1;
  background:#17324d;
  color:#fff;
}
.secondary {
  flex:1;
  background:#f3ede2;
  color:#17324d;
}
.ghost {
  margin-top:18rpx;
  border:2rpx solid #17324d;
  background:transparent;
  color:#17324d;
}
</style>
