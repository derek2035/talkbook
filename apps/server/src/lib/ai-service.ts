import type { BookChapter, BookType, PreviewOutlineItem, SessionMessage } from '@talkbook/contracts';

import { env } from '../config/env.js';
import { ApiError } from './api-error.js';
import { parseModelJson } from './provider-json.js';
import { createChatCompletion } from './providers/openai-compatible.js';

interface PreviewDraft {
  title: string;
  summary: string;
  outline: PreviewOutlineItem[];
  chapters: BookChapter[];
}

interface FollowupDraft {
  nextQuestion: string;
}

function buildBookTypeLabel(bookType: BookType) {
  switch (bookType) {
    case 'novel':
      return '小说';
    case 'autobiography':
      return '自传';
    case 'family-story':
      return '家庭故事';
    case 'memoir':
    default:
      return '回忆录';
  }
}

function canUseRealAi() {
  return Boolean(env.aiApiKey && env.aiBaseUrl && env.aiModel);
}

async function callDoubaoJson<T>(systemPrompt: string, userPrompt: string) {
  if (!canUseRealAi()) {
    throw new ApiError(503, 'AI 服务尚未配置完成，请先补充 AI API 凭证。');
  }

  const content = await createChatCompletion({
    baseUrl: env.aiBaseUrl,
    apiKey: env.aiApiKey,
    model: env.aiModel,
    temperature: 0.6,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  });

  return parseModelJson<T>(content);
}

function formatMessages(messages: SessionMessage[]) {
  return messages
    .filter((message) => message.role === 'assistant' || message.role === 'user')
    .map((message, index) => `${index + 1}. [${message.role === 'assistant' ? '采访助手' : '用户'}] ${message.content}`)
    .join('\n');
}

export function getAiMode() {
  if (!env.aiProvider || env.aiProvider === 'mock') {
    return 'mock';
  }

  return canUseRealAi() ? 'real' : 'mock';
}

export async function generateFollowupQuestion(input: {
  bookType: BookType;
  messages: SessionMessage[];
  answerCount: number;
}) {
  if (getAiMode() !== 'real' || env.aiProvider !== 'doubao') {
    return null;
  }

  const draft = await callDoubaoJson<FollowupDraft>(
    [
      '你是一个中文采访式写作助手。',
      '你的任务是根据已有对话，生成下一轮追问。',
      '要求：',
      '1. 只输出 JSON。',
      '2. JSON 结构为 {"nextQuestion":"..."}。',
      '3. 问题必须简洁、具体、温和，适合继续采访。',
      '4. 不要重复已经问过的问题，不要解释。'
    ].join('\n'),
    [
      `书籍类型：${buildBookTypeLabel(input.bookType)}`,
      `当前已回答次数：${input.answerCount}`,
      '已有对话：',
      formatMessages(input.messages)
    ].join('\n\n')
  );

  const nextQuestion = draft.nextQuestion?.trim();

  if (!nextQuestion) {
    throw new ApiError(502, 'AI 服务未生成下一轮问题。');
  }

  return nextQuestion;
}

export async function generatePreviewDraft(input: {
  bookType: BookType;
  messages: SessionMessage[];
}) {
  if (getAiMode() !== 'real' || env.aiProvider !== 'doubao') {
    return null;
  }

  const draft = await callDoubaoJson<PreviewDraft>(
    [
      '你是一个中文成书助手，要把采访记录整理为结构化书稿预览。',
      '只输出 JSON，结构必须为：',
      '{"title":"...","summary":"...","outline":[{"title":"...","summary":"..."}],"chapters":[{"title":"...","summary":"...","content":"..."}]}',
      '要求：',
      '1. title、summary、outline、chapters 都必须填写。',
      '2. 至少生成 3 章，outline 与 chapters 数量一致。',
      '3. 全部使用自然、可读的简体中文。',
      '4. 不要添加 markdown、解释或额外字段。'
    ].join('\n'),
    [
      `书籍类型：${buildBookTypeLabel(input.bookType)}`,
      '采访记录：',
      formatMessages(input.messages)
    ].join('\n\n')
  );

  if (!draft.title?.trim() || !draft.summary?.trim()) {
    throw new ApiError(502, 'AI 服务返回的预览结果不完整。');
  }

  const outline = Array.isArray(draft.outline) ? draft.outline.filter((item) => item?.title && item?.summary) : [];
  const chapters = Array.isArray(draft.chapters)
    ? draft.chapters.filter((item) => item?.title && item?.summary && item?.content)
    : [];

  if (outline.length === 0 || chapters.length === 0 || outline.length !== chapters.length) {
    throw new ApiError(502, 'AI 服务返回的章节结构无效。');
  }

  return {
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    outline: outline.map((item) => ({
      title: item.title.trim(),
      summary: item.summary.trim()
    })),
    chapters: chapters.map((item) => ({
      title: item.title.trim(),
      summary: item.summary.trim(),
      content: item.content.trim()
    }))
  };
}
