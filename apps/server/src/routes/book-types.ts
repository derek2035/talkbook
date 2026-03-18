import type { Request, Response } from 'express';
import { BOOK_TYPES } from '@talkbook/contracts';

export function bookTypesHandler(_req: Request, res: Response) {
  res.json({ items: BOOK_TYPES });
}
