import type { Request, Response } from 'express';
import type { BookDetailResponse, MyBooksResponse } from '@talkbook/contracts';

import { getBook, getMyBooks } from '../lib/talkbook-store.js';

export function getBookHandler(req: Request<{ bookId: string }>, res: Response<BookDetailResponse | { error: string }>) {
  const userId = req.auth?.userId;

  if (!userId) {
    res.status(401).json({ error: '缺少登录凭证，请重新登录' });
    return;
  }

  const book = getBook(req.params.bookId, userId);

  if (!book) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }

  res.json(book);
}

export function getMyBooksHandler(_req: Request, res: Response<MyBooksResponse>) {
  const userId = _req.auth?.userId;

  if (!userId) {
    res.status(401).json({ items: [] });
    return;
  }

  res.json(getMyBooks(userId));
}
