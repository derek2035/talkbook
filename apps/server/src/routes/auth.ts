import { createHash } from 'node:crypto';

import type { Request, Response } from 'express';
import type { WeChatLoginRequest, WeChatLoginResponse } from '@talkbook/contracts';

import { env } from '../config/env.js';
import { createAuthToken } from '../lib/auth-token.js';
import { upsertUser } from '../lib/talkbook-store.js';

interface WeChatCode2SessionResponse {
  openid?: string;
  errcode?: number;
  errmsg?: string;
}

function buildUserId(openId: string) {
  return `user_${createHash('sha256').update(openId).digest('hex').slice(0, 12)}`;
}

function buildToken(userId: string, openId: string) {
  return createAuthToken(userId, openId);
}

async function exchangeCodeForOpenId(code: string) {
  if (env.wechatAppId && env.wechatAppSecret) {
    const params = new URLSearchParams({
      appid: env.wechatAppId,
      secret: env.wechatAppSecret,
      js_code: code,
      grant_type: 'authorization_code'
    });
    const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`微信登录请求失败（HTTP ${response.status}）`);
    }

    const payload = (await response.json()) as WeChatCode2SessionResponse;

    if (payload.errcode) {
      throw new Error(payload.errmsg || `微信登录失败（${payload.errcode}）`);
    }

    if (!payload.openid) {
      throw new Error('微信登录失败：未返回 openid');
    }

    return {
      openId: payload.openid,
      loginMode: 'wechat' as const
    };
  }

  if (env.allowMockWeChatLogin) {
    const normalizedCode = code.trim() || 'talkbook_dev';
    return {
      openId: `mock_openid_${createHash('sha256').update(normalizedCode).digest('hex').slice(0, 16)}`,
      loginMode: 'mock' as const
    };
  }

  throw new Error('服务端未配置微信登录环境变量');
}

export async function wechatLoginHandler(
  req: Request<unknown, WeChatLoginResponse | { error: string }, WeChatLoginRequest>,
  res: Response<WeChatLoginResponse | { error: string }>
) {
  const code = req.body?.code?.trim();

  if (!code) {
    res.status(400).json({ error: '缺少微信登录 code' });
    return;
  }

  try {
    const session = await exchangeCodeForOpenId(code);
    const userId = buildUserId(session.openId);
    const nickname = session.loginMode === 'wechat' ? '微信用户' : '开发环境用户';
    const avatarUrl = '';

    upsertUser({
      userId,
      openId: session.openId,
      nickname,
      avatarUrl
    });

    res.json({
      userId,
      openId: session.openId,
      nickname,
      avatarUrl,
      token: buildToken(userId, session.openId),
      loginMode: session.loginMode
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : '微信登录失败'
    });
  }
}
