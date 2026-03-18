import type { Request, Response } from 'express';

export function getBookHandler(req: Request<{ bookId: string }>, res: Response) {
  res.json({
    bookId: req.params.bookId,
    title: '《时光里的母亲》',
    status: 'preview',
    outline: [],
    chapters: []
  });
}

export function getMyBooksHandler(_req: Request, res: Response) {
  res.json({
    items: [
      {
        bookId: 'book_demo_001',
        title: '《时光里的母亲》',
        status: 'preview',
        updatedAt: new Date().toISOString()
      }
    ]
  });
}
