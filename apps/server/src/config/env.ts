import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 3000),
  aiProvider: process.env.AI_PROVIDER ?? 'doubao',
  asrProvider: process.env.ASR_PROVIDER ?? 'iflytek',
  wechatAppId: process.env.WECHAT_APP_ID ?? '',
  wechatAppSecret: process.env.WECHAT_APP_SECRET ?? '',
  allowMockWeChatLogin: process.env.ALLOW_MOCK_WECHAT_LOGIN !== 'false'
};
