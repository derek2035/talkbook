import type {
  AudioUploadResponse,
  BookDetailResponse,
  BookType,
  MyBooksResponse,
  PreviewGenerateResponse,
  SessionAudioUploadRequest,
  SessionCreateResponse,
  SessionDetailResponse,
  SkipQuestionResponse,
  WeChatLoginRequest,
  WeChatLoginResponse
} from '@talkbook/contracts';

import { loadUserSession, saveUserSession } from '../utils/auth-storage';

const DEFAULT_BASE_URL = 'http://localhost:3000/api/v1';
const WECHAT_CLOUD_API_PREFIX = '/api/v1';

function resolveBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
  return configured.replace(/\/+$/, '');
}

export const API_BASE_URL = resolveBaseUrl();
export const WECHAT_CLOUD_ENV_ID = import.meta.env.VITE_WECHAT_CLOUD_ENV_ID?.trim() || '';
export const WECHAT_CLOUD_SERVICE_NAME = import.meta.env.VITE_WECHAT_CLOUD_SERVICE_NAME?.trim() || '';
export const API_TRANSPORT = WECHAT_CLOUD_ENV_ID && WECHAT_CLOUD_SERVICE_NAME ? 'wechat-cloud' : 'http';

interface RequestOptions {
  path: string;
  method?: 'GET' | 'POST';
  data?: string | Record<string, unknown> | ArrayBuffer;
}

interface ErrorPayload {
  error?: string;
}

interface RequestResult {
  statusCode?: number;
  data?: unknown;
}

interface WeChatCloudApi {
  init: (options: { env: string; traceUser?: boolean }) => void;
  callContainer: (options: {
    config: { env: string };
    path: string;
    method: string;
    data?: string | Record<string, unknown> | ArrayBuffer;
    header?: Record<string, string>;
    success: (result: RequestResult) => void;
    fail: (error: unknown) => void;
  }) => void;
}

declare const wx:
  | {
      cloud?: WeChatCloudApi;
    }
  | undefined;

let isWechatCloudInitialized = false;

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json'
  };
  const session = loadUserSession();

  if (!session?.token) {
    return headers;
  }

  return {
    ...headers,
    Authorization: `Bearer ${session.token}`
  };
}

function handleRequestResult<T>(result: RequestResult, resolve: (value: T) => void, reject: (reason?: unknown) => void) {
  const statusCode = result.statusCode ?? 500;

  if (statusCode >= 200 && statusCode < 300) {
    resolve(result.data as T);
    return;
  }

  if (statusCode === 401) {
    saveUserSession(null);
  }

  const payload = (result.data ?? {}) as ErrorPayload;
  reject(
    new Error(
      statusCode === 401 ? payload.error ?? '登录状态已失效，请重新登录' : payload.error ?? `Request failed with status ${statusCode}`
    )
  );
}

function shouldUseWechatCloud() {
  return API_TRANSPORT === 'wechat-cloud' && Boolean(getWechatCloud()) && !isWechatDevtools();
}

function getWechatCloud() {
  if (typeof wx === 'undefined') {
    return null;
  }

  return wx.cloud ?? null;
}

function isWechatDevtools() {
  try {
    return uni.getSystemInfoSync().platform === 'devtools';
  } catch (error) {
    return false;
  }
}

function ensureWechatCloudInitialized() {
  const cloud = getWechatCloud();

  if (isWechatCloudInitialized || !cloud) {
    return;
  }

  cloud.init({
    env: WECHAT_CLOUD_ENV_ID,
    traceUser: true
  });
  isWechatCloudInitialized = true;
}

function request<T>({ path, method = 'GET', data }: RequestOptions): Promise<T> {
  if (shouldUseWechatCloud()) {
    ensureWechatCloudInitialized();
    const cloud = getWechatCloud();

    return new Promise((resolve, reject) => {
      if (!cloud) {
        reject(new Error('微信云托管环境不可用'));
        return;
      }

      cloud.callContainer({
        config: {
          env: WECHAT_CLOUD_ENV_ID
        },
        path: `${WECHAT_CLOUD_API_PREFIX}${path}`,
        method,
        data,
        header: {
          ...buildHeaders(),
          'X-WX-SERVICE': WECHAT_CLOUD_SERVICE_NAME
        },
        success: (result) => handleRequestResult<T>(result, resolve, reject),
        fail: (error) => reject(error)
      });
    });
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method,
      data,
      header: buildHeaders(),
      success: (result) => handleRequestResult<T>(result, resolve, reject),
      fail: (error) => reject(error)
    });
  });
}

export function postWeChatLogin(payload: WeChatLoginRequest) {
  return request<WeChatLoginResponse>({
    path: '/auth/wechat/login',
    method: 'POST',
    data: payload as unknown as Record<string, unknown>
  });
}

export function postSession(bookType: BookType) {
  return request<SessionCreateResponse>({
    path: '/sessions',
    method: 'POST',
    data: { bookType }
  });
}

export function getSession(sessionId: string) {
  return request<SessionDetailResponse>({
    path: `/sessions/${sessionId}`
  });
}

export function postAudioTranscript(sessionId: string, payload: SessionAudioUploadRequest) {
  return request<AudioUploadResponse>({
    path: `/sessions/${sessionId}/audio`,
    method: 'POST',
    data: payload as Record<string, unknown>
  });
}

export function postSkipQuestion(sessionId: string) {
  return request<SkipQuestionResponse>({
    path: `/sessions/${sessionId}/skip`,
    method: 'POST'
  });
}

export function postPreview(sessionId: string) {
  return request<PreviewGenerateResponse>({
    path: `/sessions/${sessionId}/generate-preview`,
    method: 'POST'
  });
}

export function getMyBooks() {
  return request<MyBooksResponse>({
    path: '/me/books'
  });
}

export function getBook(bookId: string) {
  return request<BookDetailResponse>({
    path: `/books/${bookId}`
  });
}
