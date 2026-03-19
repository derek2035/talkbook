import type { Request, Response } from 'express';
import type { BookDetailResponse, MyBooksResponse } from '@talkbook/contracts';

import { getBook, getMyBooks } from '../lib/talkbook-store.js';

export function getBookHandler(req: Request<{ bookId: string }>, res: Response<BookDetailResponse | { error: string }>) {
  const book = getBook(req.params.bookId);

  if (!book) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }

  res.json(book);
}

export function getMyBooksHandler(_req: Request, res: Response<MyBooksResponse>) {
  res.json(getMyBooks());
}
