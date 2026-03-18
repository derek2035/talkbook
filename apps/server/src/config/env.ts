import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 3000),
  aiProvider: process.env.AI_PROVIDER ?? 'doubao',
  asrProvider: process.env.ASR_PROVIDER ?? 'iflytek'
};
