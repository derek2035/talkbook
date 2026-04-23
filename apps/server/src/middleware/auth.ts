import type { NextFunction, Request, Response } from 'express';

import { getUserById } from '../lib/talkbook-store.js';
import { verifyAuthToken } from '../lib/auth-token.js';

function readBearerToken(req: Request) {
  const authorization = req.header('authorization')?.trim();

  if (!authorization) {
    return '';
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() ?? '';
}

export function requireAuth(req: Request, res: Response<{ error: string }>, next: NextFunction) {
  const token = readBearerToken(req);

  if (!token) {
    res.status(401).json({ error: '缺少登录凭证，请重新登录' });
    return;
  }

  const payload = verifyAuthToken(token);

  if (!payload) {
    res.status(401).json({ error: '登录凭证无效，请重新登录' });
    return;
  }

  const user = getUserById(payload.userId);

  if (!user || user.openId !== payload.openId) {
    res.status(401).json({ error: '登录状态已失效，请重新登录' });
    return;
  }

  req.auth = {
    userId: payload.userId,
    openId: payload.openId,
    token
  };

  next();
}
