import { ApiError } from '../api-error.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
}

interface AudioTranscriptionRequest {
  baseUrl: string;
  apiKey: string;
  model: string;
  fileName: string;
  mimeType: string;
  audioBytes: Uint8Array;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '');
}

function buildErrorMessage(status: number, payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const message = (payload as { error?: { message?: string } | string }).error;

    if (typeof message === 'string') {
      return `${fallback}（HTTP ${status}）：${message}`;
    }

    if (message && typeof message === 'object' && typeof message.message === 'string') {
      return `${fallback}（HTTP ${status}）：${message.message}`;
    }
  }

  return `${fallback}（HTTP ${status}）`;
}

export async function createChatCompletion({
  baseUrl,
  apiKey,
  model,
  messages,
  temperature = 0.7
}: ChatCompletionRequest) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature
    })
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        choices?: Array<{
          message?: {
            content?: string | Array<{ type?: string; text?: string }>;
          };
        }>;
        error?: { message?: string } | string;
      }
    | null;

  if (!response.ok) {
    throw new ApiError(502, buildErrorMessage(response.status, payload, 'AI 服务调用失败'));
  }

  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === 'string' && content.trim()) {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((item) => item?.text || '')
      .join('')
      .trim();

    if (text) {
      return text;
    }
  }

  throw new ApiError(502, 'AI 服务未返回可用内容。');
}

export async function createAudioTranscription({
  baseUrl,
  apiKey,
  model,
  fileName,
  mimeType,
  audioBytes
}: AudioTranscriptionRequest) {
  const formData = new FormData();
  const audioBlob = new Blob([Buffer.from(audioBytes)], {
    type: mimeType || 'audio/pcm'
  });

  formData.append('model', model);
  formData.append('file', audioBlob, fileName);

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        text?: string;
        error?: { message?: string } | string;
      }
    | null;

  if (!response.ok) {
    throw new ApiError(502, buildErrorMessage(response.status, payload, '语音识别服务调用失败'));
  }

  if (!payload?.text?.trim()) {
    throw new ApiError(502, '语音识别服务未返回可用文本。');
  }

  return payload.text.trim();
}
