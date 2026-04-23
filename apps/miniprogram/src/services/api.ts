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

function resolveBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
  return configured.replace(/\/+$/, '');
}

export const API_BASE_URL = resolveBaseUrl();

interface RequestOptions {
  path: string;
  method?: 'GET' | 'POST';
  data?: string | Record<string, unknown> | ArrayBuffer;
}

interface ErrorPayload {
  error?: string;
}

function buildHeaders() {
  const session = loadUserSession();

  if (!session?.token) {
    return {};
  }

  return {
    Authorization: `Bearer ${session.token}`
  };
}

function request<T>({ path, method = 'GET', data }: RequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method,
      data,
      header: buildHeaders(),
      success: (result) => {
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
      },
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
