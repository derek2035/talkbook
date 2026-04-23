declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        openId: string;
        token: string;
      };
      requestId?: string;
    }
  }
}

export {};
