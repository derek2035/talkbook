import { env } from '../config/env.js';
import { ApiError } from './api-error.js';
import { createAudioTranscription } from './providers/openai-compatible.js';
import {
  createVolcengineFlashRecognition,
  createVolcengineStandardRecognition
} from './providers/volcengine-speech.js';

function canUseOpenAiCompatibleAsr() {
  return Boolean(env.asrApiKey && env.asrBaseUrl && env.asrModel && !shouldUseVolcengineSpeechApi());
}

function hasVolcengineSpeechCredentials() {
  return Boolean(env.asrApiKey && env.asrResourceId);
}

function shouldUseVolcengineSpeechApi() {
  return env.asrProvider === 'doubao' && (!!env.asrAppKey || !!env.asrResourceId.match(/^volc\./) || env.asrBaseUrl.includes('openspeech.bytedance.com'));
}

function decodeAudioBase64(audioBase64: string) {
  try {
    return Buffer.from(audioBase64, 'base64');
  } catch {
    throw new ApiError(400, '音频数据格式无效，无法解析。');
  }
}

export function getAsrMode() {
  if (!env.asrProvider || env.asrProvider === 'mock') {
    return 'mock';
  }

  return canUseVolcengineSpeechAsr() || canUseOpenAiCompatibleAsr() ? 'real' : 'mock';
}

function isVolcengineFlashResource(resourceId: string) {
  return resourceId === 'volc.bigasr.auc_turbo';
}

function canUseVolcengineSpeechAsr() {
  return hasVolcengineSpeechCredentials() && isVolcengineFlashResource(env.asrResourceId);
}

export async function transcribeAudio(input: {
  audioBase64: string;
  audioMimeType?: string;
  audioFileName?: string;
  audioUrl?: string;
}) {
  if (env.asrProvider !== 'doubao') {
    throw new ApiError(503, `当前 ASR Provider "${env.asrProvider}" 还未完成服务端接入。`);
  }

  if (shouldUseVolcengineSpeechApi()) {
    if (!hasVolcengineSpeechCredentials()) {
      throw new ApiError(503, '火山语音识别尚未配置完成，请先补充 ASR_API_KEY 与 ASR_RESOURCE_ID。');
    }

    if (isVolcengineFlashResource(env.asrResourceId)) {
      return createVolcengineFlashRecognition({
        baseUrl: env.asrBaseUrl,
        apiKey: env.asrApiKey,
        appKey: env.asrAppKey,
        resourceId: env.asrResourceId,
        requestModel: env.asrRequestModel,
        fileName: input.audioFileName || 'talkbook-audio.mp3',
        mimeType: input.audioMimeType || 'audio/mpeg',
        audioBase64: input.audioBase64
      }).then((result) => result.transcript);
    }

    if (!input.audioUrl) {
      throw new ApiError(
        503,
        '当前火山语音标准版需要可公网访问的音频 URL；Talkbook 现有录音直传链路请改用资源 ID volc.bigasr.auc_turbo。'
      );
    }

    return createVolcengineStandardRecognition({
      baseUrl: env.asrBaseUrl,
      apiKey: env.asrApiKey,
      appKey: env.asrAppKey,
      resourceId: env.asrResourceId,
      requestModel: env.asrRequestModel,
      audioUrl: input.audioUrl
    }).then((result) => result.transcript);
  }

  if (!canUseOpenAiCompatibleAsr()) {
    throw new ApiError(503, '语音识别服务尚未配置完成，请先补充 ASR API 凭证。');
  }

  return createAudioTranscription({
    baseUrl: env.asrBaseUrl,
    apiKey: env.asrApiKey,
    model: env.asrModel,
    fileName: input.audioFileName || 'talkbook-audio.pcm',
    mimeType: input.audioMimeType || 'audio/pcm',
    audioBytes: decodeAudioBase64(input.audioBase64)
  });
}
