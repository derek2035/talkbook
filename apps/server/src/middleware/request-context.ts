import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

function readClientIp(req: Request) {
  const forwarded = req.header('x-forwarded-for');

  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || req.ip || 'unknown';
  }

  return req.ip || 'unknown';
}

export function attachRequestContext(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  const requestId = randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const payload = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      ip: readClientIp(req),
      userId: req.auth?.userId ?? '',
      userAgent: req.header('user-agent') ?? ''
    };

    console.log(JSON.stringify(payload));
  });

  next();
}
