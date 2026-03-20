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
  res.json(createSession(req.body?.bookType));
}

export function getSessionHandler(req: Request<{ sessionId: string }>, res: Response<SessionDetailResponse>) {
  const session = getSession(req.params.sessionId);

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

export function uploadAudioHandler(
  req: Request<{ sessionId: string }, AudioUploadResponse, SessionAudioUploadRequest>,
  res: Response<AudioUploadResponse | { error: string }>
) {
  const result = submitAudioTranscript(req.params.sessionId, req.body);

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
  const result = skipQuestion(req.params.sessionId);

  if (!result) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json(result);
}

export function generatePreviewHandler(
  req: Request<{ sessionId: string }>,
  res: Response<PreviewGenerateResponse | { error: string }>
) {
  const preview = generatePreview(req.params.sessionId);

  if (!preview) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json(preview);
}
