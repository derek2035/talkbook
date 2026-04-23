import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../lib/api-error.js';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  name: string;
}

interface CounterEntry {
  count: number;
  expiresAt: number;
}

const counters = new Map<string, CounterEntry>();

function getClientKey(req: Request, name: string) {
  const forwarded = req.header('x-forwarded-for')?.split(',')[0]?.trim();
  const clientIp = forwarded || req.ip || 'unknown';
  return `${name}:${clientIp}`;
}

export function createRateLimitMiddleware(options: RateLimitOptions) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = getClientKey(req, options.name);
    const current = counters.get(key);

    if (!current || current.expiresAt <= now) {
      counters.set(key, {
        count: 1,
        expiresAt: now + options.windowMs
      });
      next();
      return;
    }

    if (current.count >= options.max) {
      next(new ApiError(429, '请求过于频繁，请稍后再试。'));
      return;
    }

    current.count += 1;
    counters.set(key, current);
    next();
  };
}
