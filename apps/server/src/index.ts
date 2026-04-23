import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { attachRequestContext } from './middleware/request-context.js';
import { createRateLimitMiddleware } from './middleware/rate-limit.js';
import { applySecurityHeaders } from './middleware/security.js';
import { wechatLoginHandler } from './routes/auth.js';
import { getBookHandler, getMyBooksHandler } from './routes/books.js';
import { bookTypesHandler } from './routes/book-types.js';
import { healthHandler } from './routes/health.js';
import { readyHandler } from './routes/ready.js';
import {
  createSessionHandler,
  generatePreviewHandler,
  getSessionHandler,
  skipQuestionHandler,
  uploadAudioHandler
} from './routes/sessions.js';

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(attachRequestContext);
app.use(applySecurityHeaders);
app.use(express.json({ limit: '1mb' }));

app.get('/health', healthHandler);
app.get('/ready', readyHandler);
app.post('/api/v1/auth/wechat/login', wechatLoginHandler);
app.get('/api/v1/book-types', bookTypesHandler);
app.post(
  '/api/v1/sessions',
  createRateLimitMiddleware({ name: 'create-session', windowMs: 60_000, max: 20 }),
  requireAuth,
  createSessionHandler
);
app.get(
  '/api/v1/sessions/:sessionId',
  createRateLimitMiddleware({ name: 'get-session', windowMs: 60_000, max: 120 }),
  requireAuth,
  getSessionHandler
);
app.post(
  '/api/v1/sessions/:sessionId/audio',
  createRateLimitMiddleware({ name: 'submit-audio', windowMs: 60_000, max: 60 }),
  requireAuth,
  uploadAudioHandler
);
app.post(
  '/api/v1/sessions/:sessionId/skip',
  createRateLimitMiddleware({ name: 'skip-question', windowMs: 60_000, max: 60 }),
  requireAuth,
  skipQuestionHandler
);
app.post(
  '/api/v1/sessions/:sessionId/generate-preview',
  createRateLimitMiddleware({ name: 'generate-preview', windowMs: 60_000, max: 20 }),
  requireAuth,
  generatePreviewHandler
);
app.get('/api/v1/books/:bookId', requireAuth, getBookHandler);
app.get('/api/v1/me/books', requireAuth, getMyBooksHandler);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`talkbook server listening on http://localhost:${env.port}`);
});
