import { createHmac, timingSafeEqual } from 'node:crypto';

import { env } from '../config/env.js';

interface AuthTokenPayload {
  userId: string;
  openId: string;
  issuedAt: string;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(encodedPayload: string) {
  return createHmac('sha256', env.authTokenSecret).update(encodedPayload).digest('base64url');
}

export function createAuthToken(userId: string, openId: string) {
  const encodedPayload = encodeBase64Url(
    JSON.stringify({
      userId,
      openId,
      issuedAt: new Date().toISOString()
    } satisfies AuthTokenPayload)
  );
  const signature = sign(encodedPayload);

  return `tk.${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token: string) {
  const normalized = token.trim();
  const match = /^tk\.([^.]+)\.([^.]+)$/.exec(normalized);

  if (!match) {
    return null;
  }

  const [, encodedPayload, signature] = match;
  const expectedSignature = sign(encodedPayload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as Partial<AuthTokenPayload>;

    if (!payload.userId || !payload.openId || !payload.issuedAt) {
      return null;
    }

    return {
      userId: payload.userId,
      openId: payload.openId,
      issuedAt: payload.issuedAt
    };
  } catch {
    return null;
  }
}
