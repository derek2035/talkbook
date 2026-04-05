import type {
  AudioUploadResponse,
  BookDetailResponse,
  BookType,
  MyBooksResponse,
  PreviewGenerateResponse,
  SessionAudioUploadRequest,
  SessionCreateResponse,
  SessionDetailResponse,
  SkipQuestionResponse
} from '@talkbook/contracts';

const BASE_URL = 'http://localhost:3000/api/v1';

interface RequestOptions {
  path: string;
  method?: 'GET' | 'POST';
  data?: string | Record<string, unknown> | ArrayBuffer;
}

interface ErrorPayload {
  error?: string;
}

function request<T>({ path, method = 'GET', data }: RequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${path}`,
      method,
      data,
      success: (result) => {
        const statusCode = result.statusCode ?? 500;

        if (statusCode >= 200 && statusCode < 300) {
          resolve(result.data as T);
          return;
        }

        const payload = (result.data ?? {}) as ErrorPayload;
        reject(new Error(payload.error ?? `Request failed with status ${statusCode}`));
      },
      fail: (error) => reject(error)
    });
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
