import { defineStore } from 'pinia';
import { BOOK_TYPES, type BookType } from '@talkbook/contracts';

export const useCreationStore = defineStore('creation', {
  state: () => ({
    selectedBookType: 'memoir' as BookType,
    sessionId: '',
    currentQuestion: '',
    canGenerate: false
  }),
  getters: {
    bookTypes: () => BOOK_TYPES
  },
  actions: {
    setBookType(bookType: BookType) {
      this.selectedBookType = bookType;
    },
    setSession(sessionId: string, question: string) {
      this.sessionId = sessionId;
      this.currentQuestion = question;
    },
    setCanGenerate(value: boolean) {
      this.canGenerate = value;
    }
  }
});
