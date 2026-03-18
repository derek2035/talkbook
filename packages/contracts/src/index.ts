export type BookType = 'novel' | 'autobiography' | 'memoir' | 'family-story';

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

export interface SessionCreateResponse {
  sessionId: string;
  bookType: BookType;
  firstQuestion: string;
}

export interface SessionMessage {
  role: 'assistant' | 'user' | 'system';
  content: string;
}

export interface SessionDetailResponse {
  sessionId: string;
  bookType: BookType;
  messages: SessionMessage[];
  canGenerate: boolean;
}

export interface AudioUploadResponse {
  messageId: string;
  transcript: string;
  nextQuestion: string;
  canGenerate: boolean;
}

export interface PreviewGenerateResponse {
  bookId: string;
  title: string;
  summary: string;
  outline: Array<{ title: string; summary: string }>;
  paymentRequired: boolean;
}
