import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { wechatLoginHandler } from './routes/auth.js';
import { getBookHandler, getMyBooksHandler } from './routes/books.js';
import { bookTypesHandler } from './routes/book-types.js';
import { healthHandler } from './routes/health.js';
import {
  createSessionHandler,
  generatePreviewHandler,
  getSessionHandler,
  skipQuestionHandler,
  uploadAudioHandler
} from './routes/sessions.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', healthHandler);
app.post('/api/v1/auth/wechat/login', wechatLoginHandler);
app.get('/api/v1/book-types', bookTypesHandler);
app.post('/api/v1/sessions', createSessionHandler);
app.get('/api/v1/sessions/:sessionId', getSessionHandler);
app.post('/api/v1/sessions/:sessionId/audio', uploadAudioHandler);
app.post('/api/v1/sessions/:sessionId/skip', skipQuestionHandler);
app.post('/api/v1/sessions/:sessionId/generate-preview', generatePreviewHandler);
app.get('/api/v1/books/:bookId', getBookHandler);
app.get('/api/v1/me/books', getMyBooksHandler);

app.listen(env.port, () => {
  console.log(`talkbook server listening on http://localhost:${env.port}`);
});
