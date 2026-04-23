export class ApiError extends Error {
  statusCode: number;

  expose: boolean;

  constructor(statusCode: number, message: string, options?: { expose?: boolean }) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.expose = options?.expose ?? true;
  }
}
