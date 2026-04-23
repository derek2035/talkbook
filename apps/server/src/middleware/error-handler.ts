import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../lib/api-error.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, `未找到接口：${req.method} ${req.originalUrl}`));
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) {
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: error.message,
      requestId: req.requestId ?? ''
    });
    return;
  }

  console.error(
    JSON.stringify({
      requestId: req.requestId ?? '',
      path: req.originalUrl,
      method: req.method,
      error: error instanceof Error ? error.message : String(error)
    })
  );

  res.status(500).json({
    error: '服务端发生未预期错误，请稍后再试。',
    requestId: req.requestId ?? ''
  });
}
