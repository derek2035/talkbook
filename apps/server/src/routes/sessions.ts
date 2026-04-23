import type { Request, Response } from 'express';
import {
  type AudioUploadResponse,
  type PreviewGenerateResponse,
  type SessionAudioUploadRequest,
  type SessionCreateRequest,
  type SessionCreateResponse,
  type SessionDetailResponse,
  type SkipQuestionResponse
} from '@talkbook/contracts';
import {
  createSession,
  generatePreview,
  getSession,
  skipQuestion,
  submitAudioTranscript
} from '../lib/talkbook-store.js';

export function createSessionHandler(
  req: Request<unknown, SessionCreateResponse, SessionCreateRequest>,
  res: Response<SessionCreateResponse>
) {
  const userId = req.auth?.userId;

  if (!userId) {
    res.status(401).end();
    return;
  }

  res.json(createSession(userId, req.body?.bookType));
}

export function getSessionHandler(req: Request<{ sessionId: string }>, res: Response<SessionDetailResponse>) {
  const userId = req.auth?.userId;

  if (!userId) {
    res.status(401).json({
      sessionId: req.params.sessionId,
      bookType: 'memoir',
      status: 'collecting',
      currentQuestion: '',
      messages: [],
      canGenerate: false,
      answerCount: 0
    });
    return;
  }

  const session = getSession(req.params.sessionId, userId);

  if (!session) {
    res.status(404).json({
      sessionId: req.params.sessionId,
      bookType: 'memoir',
      status: 'collecting',
      currentQuestion: '',
      messages: [],
      canGenerate: false,
      answerCount: 0
    });
    return;
  }

  res.json(session);
}

export async function uploadAudioHandler(
  req: Request<{ sessionId: string }, AudioUploadResponse, SessionAudioUploadRequest>,
  res: Response<AudioUploadResponse | { error: string }>
) {
  const userId = req.auth?.userId;

  if (!userId) {
    res.status(401).json({ error: '缺少登录凭证，请重新登录' });
    return;
  }

  const result = await submitAudioTranscript(req.params.sessionId, userId, req.body);

  if (!result) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json(result);
}

export function skipQuestionHandler(
  req: Request<{ sessionId: string }>,
  res: Response<SkipQuestionResponse | { error: string }>
) {
  const userId = req.auth?.userId;

  if (!userId) {
    res.status(401).json({ error: '缺少登录凭证，请重新登录' });
    return;
  }

  const result = skipQuestion(req.params.sessionId, userId);

  if (!result) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json(result);
}

export async function generatePreviewHandler(
  req: Request<{ sessionId: string }>,
  res: Response<PreviewGenerateResponse | { error: string }>
) {
  const userId = req.auth?.userId;

  if (!userId) {
    res.status(401).json({ error: '缺少登录凭证，请重新登录' });
    return;
  }

  const preview = await generatePreview(req.params.sessionId, userId);

  if (!preview) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json(preview);
}
