import { ApiError } from './api-error.js';

function extractFirstJsonObject(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new ApiError(502, 'AI 服务未返回有效内容。');
  }

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');

  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

export function parseModelJson<T>(value: string): T {
  try {
    return JSON.parse(extractFirstJsonObject(value)) as T;
  } catch {
    throw new ApiError(502, 'AI 服务返回了无法解析的结果。');
  }
}
