import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config();

const defaultDatabasePath = fileURLToPath(new URL('../../../../.local/talkbook.sqlite', import.meta.url));

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  aiProvider: process.env.AI_PROVIDER ?? 'doubao',
  asrProvider: process.env.ASR_PROVIDER ?? 'mock',
  aiApiKey: process.env.AI_API_KEY?.trim() || process.env.ARK_API_KEY?.trim() || '',
  aiBaseUrl: process.env.AI_BASE_URL?.trim() || process.env.ARK_BASE_URL?.trim() || 'https://ark.cn-beijing.volces.com/api/v3',
  aiModel: process.env.AI_MODEL?.trim() || '',
  asrApiKey: process.env.ASR_API_KEY?.trim() || process.env.ARK_API_KEY?.trim() || '',
  asrBaseUrl: process.env.ASR_BASE_URL?.trim() || 'https://openspeech.bytedance.com',
  asrModel: process.env.ASR_MODEL?.trim() || '',
  asrResourceId: process.env.ASR_RESOURCE_ID?.trim() || process.env.ASR_MODEL?.trim() || '',
  asrRequestModel: process.env.ASR_REQUEST_MODEL?.trim() || 'bigmodel',
  asrAppKey: process.env.ASR_APP_KEY?.trim() || '',
  wechatAppId: process.env.WECHAT_APP_ID ?? '',
  wechatAppSecret: process.env.WECHAT_APP_SECRET ?? '',
  allowMockWeChatLogin: process.env.ALLOW_MOCK_WECHAT_LOGIN !== 'false',
  authTokenSecret: process.env.AUTH_TOKEN_SECRET || 'talkbook-dev-secret',
  databasePath: process.env.DATABASE_PATH?.trim() || defaultDatabasePath
};

if (env.nodeEnv === 'production') {
  if (!env.wechatAppId || !env.wechatAppSecret) {
    throw new Error('生产环境必须配置 WECHAT_APP_ID 和 WECHAT_APP_SECRET');
  }

  if (env.allowMockWeChatLogin) {
    throw new Error('生产环境必须关闭 ALLOW_MOCK_WECHAT_LOGIN');
  }

  if (!process.env.AUTH_TOKEN_SECRET || env.authTokenSecret === 'talkbook-dev-secret') {
    throw new Error('生产环境必须配置非默认 AUTH_TOKEN_SECRET');
  }

  if (!process.env.DATABASE_PATH) {
    throw new Error('生产环境必须显式配置 DATABASE_PATH');
  }
}
