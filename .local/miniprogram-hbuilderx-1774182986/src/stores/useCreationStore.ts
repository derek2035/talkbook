import { defineStore } from 'pinia';
import {
  BOOK_TYPES,
  type BookType,
  type PreviewGenerateResponse,
  type SessionCreateResponse,
  type SessionDetailResponse,
  type SessionMessage
} from '@talkbook/contracts';

function getCurrentQuestion(messages: SessionMessage[]) {
  const latestAssistant = [...messages].reverse().find((message) => message.role === 'assistant');
  return latestAssistant?.content ?? '';
}

export const useCreationStore = defineStore('creation', {
  state: () => ({
    selectedBookType: 'memoir' as BookType,
    sessionId: '',
    currentQuestion: '',
    canGenerate: false,
    answerCount: 0,
    messages: [] as SessionMessage[],
    preview: null as PreviewGenerateResponse | null
  }),
  getters: {
    bookTypes: () => BOOK_TYPES,
    selectedBookTypeLabel: (state) =>
      BOOK_TYPES.find((item) => item.key === state.selectedBookType)?.label ?? '未选择'
  },
  actions: {
    setBookType(bookType: BookType) {
      this.selectedBookType = bookType;
    },
    setSession(payload: SessionCreateResponse) {
      const assistantMessage: SessionMessage = {
        id: `${payload.sessionId}_first_question`,
        role: 'assistant',
        content: payload.firstQuestion,
        createdAt: new Date().toISOString(),
        timeLabel: new Date().toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      };

      this.sessionId = payload.sessionId;
      this.selectedBookType = payload.bookType;
      this.currentQuestion = payload.firstQuestion;
      this.canGenerate = false;
      this.answerCount = 0;
      this.messages = [assistantMessage];
      this.preview = null;
    },
    hydrateSession(payload: SessionDetailResponse) {
      this.sessionId = payload.sessionId;
      this.selectedBookType = payload.bookType;
      this.currentQuestion = payload.currentQuestion || getCurrentQuestion(payload.messages);
      this.canGenerate = payload.canGenerate;
      this.answerCount = payload.answerCount;
      this.messages = payload.messages;
    },
    setPreview(preview: PreviewGenerateResponse) {
      this.preview = preview;
    },
    resetCreation() {
      this.sessionId = '';
      this.currentQuestion = '';
      this.canGenerate = false;
      this.answerCount = 0;
      this.messages = [];
      this.preview = null;
    }
  }
});
