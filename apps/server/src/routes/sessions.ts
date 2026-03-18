import type { Request, Response } from 'express';
import {
  BOOK_TYPES,
  type AudioUploadResponse,
  type PreviewGenerateResponse,
  type SessionCreateRequest,
  type SessionCreateResponse,
  type SessionDetailResponse
} from '@talkbook/contracts';

const mockQuestions = [
  '你最想写的人是谁？先简单介绍一下 TA。',
  '这个故事大概发生在什么阶段？',
  '你最难忘的一件事是什么？'
];

export function createSessionHandler(req: Request<unknown, SessionCreateResponse, SessionCreateRequest>, res: Response) {
  const bookType = req.body.bookType ?? BOOK_TYPES[0].key;

  res.json({
    sessionId: `sess_${Date.now()}`,
    bookType,
    firstQuestion: mockQuestions[0]
  });
}

export function getSessionHandler(req: Request<{ sessionId: string }>, res: Response<SessionDetailResponse>) {
  res.json({
    sessionId: req.params.sessionId,
    bookType: 'memoir',
    messages: [
      { role: 'assistant', content: mockQuestions[0] },
      { role: 'user', content: '我最想写的是我的母亲。' }
    ],
    canGenerate: true
  });
}

export function uploadAudioHandler(req: Request<{ sessionId: string }>, res: Response<AudioUploadResponse>) {
  const nextQuestion = mockQuestions[1];

  res.json({
    messageId: `msg_${Date.now()}`,
    transcript: '这是一个示例转写结果，后续将接入真实语音识别。',
    nextQuestion,
    canGenerate: false
  });
}

export function skipQuestionHandler(_req: Request<{ sessionId: string }>, res: Response<{ nextQuestion: string }>) {
  res.json({
    nextQuestion: mockQuestions[2]
  });
}

export function generatePreviewHandler(req: Request<{ sessionId: string }>, res: Response<PreviewGenerateResponse>) {
  res.json({
    bookId: `book_${req.params.sessionId}`,
    title: '《时光里的母亲》',
    summary: '一部围绕母亲人生经历展开的家庭回忆录。',
    outline: [
      { title: '第一章：童年的背影', summary: '讲述家庭早期记忆。' },
      { title: '第二章：最艰难的岁月', summary: '讲述家庭转折与情感变化。' }
    ],
    paymentRequired: true
  });
}
