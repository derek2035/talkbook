import { randomUUID } from 'node:crypto';

import { ApiError } from '../api-error.js';

interface VolcengineFlashRecognitionRequest {
  baseUrl: string;
  apiKey: string;
  appKey?: string;
  resourceId: string;
  requestModel: string;
  fileName: string;
  mimeType: string;
  audioBase64: string;
}

interface VolcengineStandardRecognitionRequest {
  baseUrl: string;
  apiKey: string;
  appKey?: string;
  resourceId: string;
  requestModel: string;
  audioUrl: string;
}

interface VolcengineRecognitionResult {
  transcript: string;
  durationMs?: number;
}

interface VolcengineResponsePayload {
  message?: string;
  result?: {
    text?: string;
    additions?: {
      duration?: string;
    };
  };
  text?: string;
  id?: string;
}

const STANDARD_SUBMIT_PATH = '/api/v3/auc/bigmodel/submit';
const STANDARD_QUERY_PATH = '/api/v3/auc/bigmodel/query';
const FLASH_RECOGNIZE_PATH = '/api/v3/auc/bigmodel/recognize/flash';

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '');
}

function buildAuthHeaders(input: {
  apiKey: string;
  appKey?: string;
  resourceId: string;
  requestId: string;
  sequence?: string;
}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Api-Resource-Id': input.resourceId,
    'X-Api-Request-Id': input.requestId
  };

  if (input.sequence) {
    headers['X-Api-Sequence'] = input.sequence;
  }

  if (input.appKey) {
    headers['X-Api-App-Key'] = input.appKey;
    headers['X-Api-Access-Key'] = input.apiKey;
  } else {
    headers['X-Api-Key'] = input.apiKey;
  }

  return headers;
}

function parseDurationMs(payload: VolcengineResponsePayload | null) {
  const value = payload?.result?.additions?.duration;
  const durationMs = Number(value);
  return Number.isFinite(durationMs) && durationMs > 0 ? durationMs : undefined;
}

function extractTranscript(payload: VolcengineResponsePayload | null) {
  const transcript = payload?.result?.text?.trim() || payload?.text?.trim() || '';

  if (!transcript) {
    throw new ApiError(502, '火山语音识别未返回可用文本。');
  }

  return transcript;
}

function getVolcengineErrorMessage(response: Response, payload: VolcengineResponsePayload | null, fallback: string) {
  const headerMessage = response.headers.get('X-Api-Message')?.trim();
  const payloadMessage = payload?.message?.trim();
  const statusCode = response.headers.get('X-Api-Status-Code')?.trim() || `${response.status}`;
  const message = headerMessage || payloadMessage;

  return message ? `${fallback}（${statusCode}）：${message}` : `${fallback}（${statusCode}）`;
}

function inferAudioConfig(fileName: string, mimeType: string) {
  const normalizedMimeType = mimeType.toLowerCase();
  const lowerFileName = fileName.toLowerCase();

  if (normalizedMimeType.includes('mpeg') || lowerFileName.endsWith('.mp3')) {
    return { format: 'mp3' };
  }

  if (normalizedMimeType.includes('wav') || lowerFileName.endsWith('.wav')) {
    return { format: 'wav' };
  }

  if (normalizedMimeType.includes('ogg') || lowerFileName.endsWith('.ogg') || lowerFileName.endsWith('.opus')) {
    return {
      format: 'ogg',
      codec: 'opus'
    };
  }

  throw new ApiError(400, '当前音频格式暂不支持火山语音识别，请使用 mp3、wav 或 ogg/opus。');
}

async function parseJsonResponse(response: Response) {
  return (await response.json().catch(() => null)) as VolcengineResponsePayload | null;
}

export async function createVolcengineFlashRecognition(
  input: VolcengineFlashRecognitionRequest
): Promise<VolcengineRecognitionResult> {
  const requestId = randomUUID();
  const response = await fetch(`${normalizeBaseUrl(input.baseUrl)}${FLASH_RECOGNIZE_PATH}`, {
    method: 'POST',
    headers: buildAuthHeaders({
      apiKey: input.apiKey,
      appKey: input.appKey,
      resourceId: input.resourceId,
      requestId,
      sequence: '-1'
    }),
    body: JSON.stringify({
      user: {
        uid: input.appKey || 'talkbook'
      },
      audio: {
        ...inferAudioConfig(input.fileName, input.mimeType),
        data: input.audioBase64
      },
      request: {
        model_name: input.requestModel
      }
    })
  });

  const payload = await parseJsonResponse(response);

  if (!response.ok || response.headers.get('X-Api-Status-Code') !== '20000000') {
    throw new ApiError(502, getVolcengineErrorMessage(response, payload, '火山语音极速识别调用失败'));
  }

  return {
    transcript: extractTranscript(payload),
    durationMs: parseDurationMs(payload)
  };
}

export async function createVolcengineStandardRecognition(
  input: VolcengineStandardRecognitionRequest
): Promise<VolcengineRecognitionResult> {
  const requestId = randomUUID();
  const submitResponse = await fetch(`${normalizeBaseUrl(input.baseUrl)}${STANDARD_SUBMIT_PATH}`, {
    method: 'POST',
    headers: buildAuthHeaders({
      apiKey: input.apiKey,
      appKey: input.appKey,
      resourceId: input.resourceId,
      requestId
    }),
    body: JSON.stringify({
      user: {
        uid: input.appKey || 'talkbook'
      },
      audio: {
        url: input.audioUrl
      },
      request: {
        model_name: input.requestModel
      }
    })
  });

  const submitPayload = await parseJsonResponse(submitResponse);

  if (!submitResponse.ok || submitResponse.headers.get('X-Api-Status-Code') !== '20000000') {
    throw new ApiError(502, getVolcengineErrorMessage(submitResponse, submitPayload, '火山语音识别任务提交失败'));
  }

  const taskId = submitPayload?.id?.trim() || requestId;
  const startedAt = Date.now();
  const timeoutMs = 60_000;

  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 1_500));

    const queryResponse = await fetch(`${normalizeBaseUrl(input.baseUrl)}${STANDARD_QUERY_PATH}`, {
      method: 'POST',
      headers: buildAuthHeaders({
        apiKey: input.apiKey,
        appKey: input.appKey,
        resourceId: input.resourceId,
        requestId: taskId
      }),
      body: JSON.stringify({})
    });

    const queryPayload = await parseJsonResponse(queryResponse);
    const statusCode = queryResponse.headers.get('X-Api-Status-Code');

    if (!queryResponse.ok) {
      throw new ApiError(502, getVolcengineErrorMessage(queryResponse, queryPayload, '火山语音识别结果查询失败'));
    }

    if (statusCode === '20000001' || statusCode === '20000002') {
      continue;
    }

    if (statusCode !== '20000000') {
      throw new ApiError(502, getVolcengineErrorMessage(queryResponse, queryPayload, '火山语音识别处理失败'));
    }

    return {
      transcript: extractTranscript(queryPayload),
      durationMs: parseDurationMs(queryPayload)
    };
  }

  throw new ApiError(504, '火山语音识别超时，请稍后重试。');
}
