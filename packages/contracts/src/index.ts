export type BookType = 'novel' | 'autobiography' | 'memoir' | 'family-story';
export type SessionStatus = 'collecting' | 'preview-ready' | 'completed';
export type BookStatus = 'preview' | 'paid' | 'exported';
export type RecordingMode = 'press-hold' | 'locked';
export type RecordingStatus = 'idle' | 'recording' | 'locked' | 'paused';

export interface BookTypeOption {
  key: BookType;
  label: string;
  description: string;
}

export const BOOK_TYPES: BookTypeOption[] = [
  { key: 'novel', label: '小说', description: '适合虚构故事、人物成长与情节推进。' },
  { key: 'autobiography', label: '自传', description: '适合梳理人生经历和重要转折。' },
  { key: 'memoir', label: '回忆录', description: '适合记录家庭记忆、岁月故事与情感线。' },
  { key: 'family-story', label: '家庭故事', description: '适合沉淀家族故事与亲情传承。' }
];

export interface SessionCreateRequest {
  bookType: BookType;
}

export interface WeChatLoginRequest {
  code: string;
}

export interface WeChatLoginResponse {
  userId: string;
  openId: string;
  nickname: string;
  avatarUrl: string;
  token: string;
  loginMode?: 'wechat' | 'mock';
}

export interface SessionCreateResponse {
  sessionId: string;
  bookType: BookType;
  firstQuestion: string;
}

export interface SessionAudioUploadRequest {
  transcript?: string;
  duration?: number;
  format?: string;
  recordingMode?: RecordingMode;
  isLocked?: boolean;
  segmentIndex?: number;
  segmentCount?: number;
  startedAt?: string;
  endedAt?: string;
}

export interface SessionAudioSegment {
  segmentIndex: number;
  segmentTitle: string;
  duration: number;
  transcript: string;
  time: string;
}

export interface SessionMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content: string;
  createdAt: string;
  displayType?: 'text' | 'audio';
  transcript?: string;
  duration?: number;
  timeLabel?: string;
  recordingMode?: RecordingMode;
  statusLabel?: string;
  segments?: SessionAudioSegment[];
}

export interface SessionDetailResponse {
  sessionId: string;
  bookType: BookType;
  status: SessionStatus;
  currentQuestion: string;
  messages: SessionMessage[];
  canGenerate: boolean;
  answerCount: number;
}

export interface AudioUploadResponse {
  messageId: string;
  transcript: string;
  segments: SessionAudioSegment[];
  nextQuestion: string;
  canGenerate: boolean;
  answerCount: number;
}

export interface SkipQuestionResponse {
  nextQuestion: string;
  canGenerate: boolean;
  skippedCount: number;
}

export interface PreviewOutlineItem {
  title: string;
  summary: string;
}

export interface PreviewGenerateResponse {
  bookId: string;
  title: string;
  summary: string;
  outline: PreviewOutlineItem[];
  paymentRequired: boolean;
}

export interface BookChapter {
  title: string;
  summary: string;
  content: string;
}

export interface BookDetailResponse {
  bookId: string;
  sessionId: string;
  title: string;
  summary: string;
  status: BookStatus;
  outline: PreviewOutlineItem[];
  chapters: BookChapter[];
  updatedAt: string;
}

export interface MyBookItem {
  bookId: string;
  sessionId: string;
  title: string;
  summary: string;
  status: BookStatus;
  updatedAt: string;
}

export interface MyBooksResponse {
  items: MyBookItem[];
}
