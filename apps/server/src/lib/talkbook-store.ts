import {
  BOOK_TYPES,
  type AudioUploadResponse,
  type BookDetailResponse,
  type BookStatus,
  type BookType,
  type MyBooksResponse,
  type PreviewGenerateResponse,
  type PreviewOutlineItem,
  type SessionAudioSegment,
  type SessionAudioUploadRequest,
  type SessionDetailResponse,
  type SessionMessage,
  type SessionStatus
} from '@talkbook/contracts';

import { database, runInTransaction } from './database.js';
import { generateFollowupQuestion, generatePreviewDraft } from './ai-service.js';
import { getAsrMode, transcribeAudio } from './asr-service.js';
import { assertSafeUserContent } from './content-safety.js';

interface UserRecord {
  id: string;
  openId: string;
  nickname: string;
  avatarUrl: string;
  membershipStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionRecord {
  id: string;
  userId: string;
  bookType: BookType;
  status: SessionStatus;
  answerCount: number;
  skippedCount: number;
  currentQuestionIndex: number;
  currentQuestion: string;
  bookId: string | null;
  createdAt: string;
  updatedAt: string;
}

const readyPrompt = '素材已经达到预览标准，你可以先生成书稿预览，也可以继续补充更多细节。';

const questionBanks: Record<BookType, string[]> = {
  novel: [
    '这部小说里你最想写的主角是谁？先说说 TA 的身份和性格。',
    '故事开始时，主角正处在怎样的生活状态？',
    '真正推动情节变化的关键事件是什么？',
    '如果把情绪推到最高点，最想写哪场冲突？'
  ],
  autobiography: [
    '如果把你的人生写成一本书，你最想从哪段经历开始？',
    '哪一次选择最深地改变了你后来的方向？',
    '回头看，那段经历里你最想保留下来的感受是什么？',
    '如果读者只能记住你的一句话，你希望那句话是什么？'
  ],
  memoir: [
    '你最想写的人是谁？先简单介绍一下 TA。',
    '这个故事大概发生在什么阶段？',
    '你最难忘的一件事是什么？',
    '如果要总结那段岁月的情绪底色，你会怎么形容？'
  ],
  'family-story': [
    '这个家庭里最值得被写下来的人物是谁？',
    '你最想记录的家庭记忆发生在什么时候？',
    '在这个家庭故事里，哪件事最能代表彼此之间的感情？',
    '如果把家风或传承说成一句话，你会怎么说？'
  ]
};

function nowIso() {
  return new Date().toISOString();
}

function toTimeLabel(iso: string) {
  const date = new Date(iso);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createMessage(
  role: SessionMessage['role'],
  content: string,
  overrides: Partial<SessionMessage> = {}
): SessionMessage {
  const createdAt = overrides.createdAt ?? nowIso();

  return {
    id: makeId('msg'),
    role,
    content,
    createdAt,
    timeLabel: toTimeLabel(createdAt),
    ...overrides
  };
}

function parseJson<T>(value: string | null | undefined, fallback: T) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapUser(row: Record<string, unknown> | null | undefined): UserRecord | null {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    openId: String(row.open_id),
    nickname: String(row.nickname),
    avatarUrl: String(row.avatar_url),
    membershipStatus: String(row.membership_status),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function mapSession(row: Record<string, unknown> | null | undefined): SessionRecord | null {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    userId: String(row.user_id),
    bookType: row.book_type as BookType,
    status: row.status as SessionStatus,
    answerCount: Number(row.answer_count),
    skippedCount: Number(row.skipped_count),
    currentQuestionIndex: Number(row.current_question_index),
    currentQuestion: String(row.current_question),
    bookId: row.book_id ? String(row.book_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function mapMessage(row: Record<string, unknown>): SessionMessage {
  return {
    id: String(row.id),
    role: row.role as SessionMessage['role'],
    content: String(row.content),
    createdAt: String(row.created_at),
    displayType: row.display_type ? (String(row.display_type) as SessionMessage['displayType']) : undefined,
    transcript: row.transcript ? String(row.transcript) : undefined,
    duration: row.duration === null || row.duration === undefined ? undefined : Number(row.duration),
    timeLabel: row.time_label ? String(row.time_label) : undefined,
    recordingMode: row.recording_mode
      ? (String(row.recording_mode) as SessionMessage['recordingMode'])
      : undefined,
    statusLabel: row.status_label ? String(row.status_label) : undefined,
    segments: parseJson<SessionAudioSegment[]>(row.segments_json ? String(row.segments_json) : '', [])
  };
}

function loadSession(sessionId: string, userId: string) {
  const row = database
    .prepare(
      `
        SELECT id, user_id, book_type, status, answer_count, skipped_count,
               current_question_index, current_question, book_id, created_at, updated_at
        FROM sessions
        WHERE id = ? AND user_id = ?
      `
    )
    .get(sessionId, userId) as Record<string, unknown> | undefined;

  return mapSession(row ?? null);
}

function loadMessages(sessionId: string) {
  const rows = database
    .prepare(
      `
        SELECT id, role, content, created_at, display_type, transcript, duration, time_label,
               recording_mode, status_label, segments_json
        FROM messages
        WHERE session_id = ?
        ORDER BY created_at ASC, rowid ASC
      `
    )
    .all(sessionId) as Array<Record<string, unknown>>;

  return rows.map((row) => mapMessage(row));
}

function isBookType(value: string | undefined): value is BookType {
  return BOOK_TYPES.some((item) => item.key === value);
}

function getQuestions(bookType: BookType) {
  return questionBanks[bookType];
}

function getNextQuestion(session: SessionRecord) {
  const questions = getQuestions(session.bookType);
  const nextIndex = session.currentQuestionIndex + 1;

  if (nextIndex >= questions.length) {
    return {
      nextQuestion: readyPrompt,
      nextQuestionIndex: session.currentQuestionIndex
    };
  }

  return {
    nextQuestion: questions[nextIndex],
    nextQuestionIndex: nextIndex
  };
}

function canGeneratePreview(session: SessionRecord) {
  return session.answerCount >= 2;
}

function buildFallbackTranscript(session: SessionRecord) {
  const option = BOOK_TYPES.find((item) => item.key === session.bookType);
  return `我想继续补充一些关于${option?.label ?? '这本书'}的细节，方便后面生成更完整的内容。`;
}

function compactText(value: string, limit = 22) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  return normalized.length > limit ? `${normalized.slice(0, limit)}...` : normalized;
}

function splitIntoSentences(transcript: string) {
  const normalized = transcript.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return [];
  }

  const sentences = normalized
    .split(/(?<=[。！？；!?;])/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (sentences.length > 0) {
    return sentences;
  }

  return normalized
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildSegments(transcript: string, duration: number, createdAt: string): SessionAudioSegment[] {
  const normalizedDuration = Math.max(1, Math.round(duration || 12));
  const targetSegmentCount = Math.max(1, Math.ceil(normalizedDuration / 60));
  const sentences = splitIntoSentences(transcript);
  const workingSentences = sentences.length > 0 ? sentences : [transcript.trim()];
  const chunkSize = Math.max(1, Math.ceil(workingSentences.length / targetSegmentCount));

  const sentenceGroups: string[][] = [];

  for (let index = 0; index < workingSentences.length; index += chunkSize) {
    sentenceGroups.push(workingSentences.slice(index, index + chunkSize));
  }

  const segments = sentenceGroups.map((group, index) => {
    const segmentCount = sentenceGroups.length;
    const remaining = normalizedDuration - Math.floor(normalizedDuration / segmentCount) * index;
    const segmentDuration =
      index === segmentCount - 1
        ? remaining
        : Math.max(1, Math.round(normalizedDuration / segmentCount));

    return {
      segmentIndex: index + 1,
      segmentTitle: `第${index + 1}段`,
      duration: segmentDuration,
      transcript: group.join(' ').trim(),
      time: toTimeLabel(createdAt)
    };
  });

  return segments.length > 0
    ? segments
    : [
        {
          segmentIndex: 1,
          segmentTitle: '第1段',
          duration: normalizedDuration,
          transcript,
          time: toTimeLabel(createdAt)
        }
      ];
}

function buildTitle(session: SessionRecord, highlights: string[]) {
  const seed = compactText(highlights[0], 10);

  switch (session.bookType) {
    case 'novel':
      return seed ? `《${seed}》` : '《尚未命名的故事》';
    case 'autobiography':
      return seed ? `《我把人生写给你看：${seed}》` : '《我把人生写给你看》';
    case 'family-story':
      return seed ? `《家里的故事：${seed}》` : '《家里的故事》';
    case 'memoir':
    default:
      return seed ? `《记忆里的${seed}》` : '《记忆里的那个人》';
  }
}

function buildSummary(session: SessionRecord, highlights: string[]) {
  if (highlights.length === 0) {
    return '这是一份正在整理中的书稿预览，后续会随着采访内容继续丰富。';
  }

  const lead = highlights[0];
  const supplement = highlights[1]
    ? `同时也延伸到了“${compactText(highlights[1], 24)}”这样的关键片段。`
    : '目前已经形成了人物、经历与情绪主线的基本轮廓。';

  return `这是一部围绕“${compactText(lead, 28)}”展开的${BOOK_TYPES.find((item) => item.key === session.bookType)?.label ?? '书稿'}，${supplement}`;
}

function buildOutline(session: SessionRecord, highlights: string[]): PreviewOutlineItem[] {
  const first = compactText(highlights[0] ?? '故事的开端');
  const second = compactText(highlights[1] ?? '真正改变走向的那件事');
  const third = compactText(highlights[2] ?? '最后留下来的感受');

  return [
    {
      title: '第一章：故事从哪里开始',
      summary: `围绕“${first}”建立人物关系和故事背景。`
    },
    {
      title: '第二章：命运发生转折的时候',
      summary: `重点展开“${second}”背后的冲突、选择与情绪变化。`
    },
    {
      title: '第三章：回望之后留下什么',
      summary: `把“${third}”沉淀成这本书真正想表达的主题。`
    }
  ];
}

function buildChapters(outline: PreviewOutlineItem[], highlights: string[]) {
  return outline.map((chapter, index) => ({
    title: chapter.title,
    summary: chapter.summary,
    content:
      highlights[index] ??
      '当前阶段仅生成目录与摘要，章节正文会在接入真实模型能力后补齐。'
  }));
}

function toSessionDetail(session: SessionRecord): SessionDetailResponse {
  return {
    sessionId: session.id,
    bookType: session.bookType,
    status: session.status,
    currentQuestion: session.currentQuestion,
    messages: loadMessages(session.id),
    canGenerate: canGeneratePreview(session),
    answerCount: session.answerCount
  };
}

async function resolveTranscript(session: SessionRecord, payload: SessionAudioUploadRequest | undefined) {
  const manualTranscript = payload?.transcript?.trim();

  if (manualTranscript) {
    return {
      transcript: manualTranscript,
      statusLabel: payload?.format === 'mock-text' ? '文字录入' : payload?.isLocked ? '锁定录音' : '按住录音'
    };
  }

  if (payload?.audioBase64 && getAsrMode() === 'real') {
    const transcript = await transcribeAudio({
      audioBase64: payload.audioBase64,
      audioMimeType: payload.audioMimeType,
      audioFileName: payload.audioFileName
    });

    return {
      transcript,
      statusLabel: '实时转写'
    };
  }

  return {
    transcript: buildFallbackTranscript(session),
    statusLabel: payload?.isLocked ? '锁定录音' : '按住录音'
  };
}

export function upsertUser(payload: { userId: string; openId: string; nickname: string; avatarUrl: string }) {
  const timestamp = nowIso();

  runInTransaction(() => {
    database
      .prepare(
        `
          INSERT INTO users (id, open_id, nickname, avatar_url, membership_status, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'standard', ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            open_id = excluded.open_id,
            nickname = excluded.nickname,
            avatar_url = excluded.avatar_url,
            updated_at = excluded.updated_at
        `
      )
      .run(payload.userId, payload.openId, payload.nickname, payload.avatarUrl, timestamp, timestamp);
  });
}

export function getUserById(userId: string) {
  const row = database
    .prepare(
      `
        SELECT id, open_id, nickname, avatar_url, membership_status, created_at, updated_at
        FROM users
        WHERE id = ?
      `
    )
    .get(userId) as Record<string, unknown> | undefined;

  return mapUser(row ?? null);
}

export function createSession(userId: string, bookType: string | undefined) {
  const normalizedBookType = isBookType(bookType) ? bookType : BOOK_TYPES[0].key;
  const firstQuestion = getQuestions(normalizedBookType)[0];
  const sessionId = makeId('sess');
  const createdAt = nowIso();
  const firstMessage = createMessage('assistant', firstQuestion, {
    createdAt
  });

  runInTransaction(() => {
    database
      .prepare(
        `
          INSERT INTO sessions (
            id, user_id, book_type, status, answer_count, skipped_count,
            current_question_index, current_question, book_id, created_at, updated_at
          )
          VALUES (?, ?, ?, 'collecting', 0, 0, 0, ?, NULL, ?, ?)
        `
      )
      .run(sessionId, userId, normalizedBookType, firstQuestion, createdAt, createdAt);

    database
      .prepare(
        `
          INSERT INTO messages (
            id, session_id, role, content, created_at, display_type, transcript, duration,
            time_label, recording_mode, status_label, segments_json
          )
          VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, NULL, NULL, NULL)
        `
      )
      .run(
        firstMessage.id,
        sessionId,
        firstMessage.role,
        firstMessage.content,
        firstMessage.createdAt,
        firstMessage.timeLabel ?? null
      );
  });

  return {
    sessionId,
    bookType: normalizedBookType,
    firstQuestion
  };
}

export function getSession(sessionId: string, userId: string) {
  const session = loadSession(sessionId, userId);
  return session ? toSessionDetail(session) : null;
}

export async function submitAudioTranscript(
  sessionId: string,
  userId: string,
  payload: SessionAudioUploadRequest | undefined
): Promise<AudioUploadResponse | null> {
  const session = loadSession(sessionId, userId);

  if (!session) {
    return null;
  }

  const messageHistoryBeforeAnswer = loadMessages(sessionId);
  const transcriptResult = await resolveTranscript(session, payload);
  const normalizedTranscript = transcriptResult.transcript.trim();
  assertSafeUserContent(normalizedTranscript);
  const createdAt = nowIso();
  const duration = Math.max(8, Math.round(payload?.duration ?? Math.max(12, normalizedTranscript.length * 1.8)));
  const isTextSubmission = payload?.format === 'mock-text';
  const segments = isTextSubmission ? [] : buildSegments(normalizedTranscript, duration, createdAt);
  const userMessage = createMessage('user', normalizedTranscript, {
    id: makeId('msg'),
    createdAt,
    displayType: isTextSubmission ? 'text' : 'audio',
    transcript: normalizedTranscript,
    duration,
    recordingMode: payload?.isLocked ? 'locked' : payload?.recordingMode ?? 'press-hold',
    statusLabel: transcriptResult.statusLabel,
    segments
  });
  const fallbackNext = getNextQuestion(session);
  const nextQuestion =
    (await generateFollowupQuestion({
      bookType: session.bookType,
      messages: [...messageHistoryBeforeAnswer, userMessage],
      answerCount: session.answerCount + 1
    })) || fallbackNext.nextQuestion;
  const nextQuestionIndex = fallbackNext.nextQuestionIndex;
  const assistantMessage = createMessage('assistant', nextQuestion);
  const answerCount = session.answerCount + 1;
  const nextStatus: SessionStatus = answerCount >= 2 ? 'preview-ready' : 'collecting';

  runInTransaction(() => {
    database
      .prepare(
        `
          INSERT INTO messages (
            id, session_id, role, content, created_at, display_type, transcript, duration,
            time_label, recording_mode, status_label, segments_json
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        userMessage.id,
        sessionId,
        userMessage.role,
        userMessage.content,
        userMessage.createdAt,
        userMessage.displayType ?? null,
        userMessage.transcript ?? null,
        userMessage.duration ?? null,
        userMessage.timeLabel ?? null,
        userMessage.recordingMode ?? null,
        userMessage.statusLabel ?? null,
        JSON.stringify(userMessage.segments ?? [])
      );

    database
      .prepare(
        `
          INSERT INTO messages (
            id, session_id, role, content, created_at, display_type, transcript, duration,
            time_label, recording_mode, status_label, segments_json
          )
          VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, NULL, NULL, NULL)
        `
      )
      .run(
        assistantMessage.id,
        sessionId,
        assistantMessage.role,
        assistantMessage.content,
        assistantMessage.createdAt,
        assistantMessage.timeLabel ?? null
      );

    database
      .prepare(
        `
          UPDATE sessions
          SET answer_count = ?, current_question_index = ?, current_question = ?, status = ?, updated_at = ?
          WHERE id = ? AND user_id = ?
        `
      )
      .run(answerCount, nextQuestionIndex, nextQuestion, nextStatus, createdAt, sessionId, userId);
  });

  return {
    messageId: userMessage.id,
    transcript: normalizedTranscript,
    segments,
    nextQuestion,
    canGenerate: answerCount >= 2,
    answerCount
  };
}

export function skipQuestion(sessionId: string, userId: string) {
  const session = loadSession(sessionId, userId);

  if (!session) {
    return null;
  }

  const timestamp = nowIso();
  const { nextQuestion, nextQuestionIndex } = getNextQuestion(session);
  const assistantMessage = createMessage('assistant', nextQuestion, { createdAt: timestamp });
  const skippedCount = session.skippedCount + 1;

  runInTransaction(() => {
    database
      .prepare(
        `
          INSERT INTO messages (
            id, session_id, role, content, created_at, display_type, transcript, duration,
            time_label, recording_mode, status_label, segments_json
          )
          VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, NULL, NULL, NULL)
        `
      )
      .run(
        assistantMessage.id,
        sessionId,
        assistantMessage.role,
        assistantMessage.content,
        assistantMessage.createdAt,
        assistantMessage.timeLabel ?? null
      );

    database
      .prepare(
        `
          UPDATE sessions
          SET skipped_count = ?, current_question_index = ?, current_question = ?, updated_at = ?
          WHERE id = ? AND user_id = ?
        `
      )
      .run(skippedCount, nextQuestionIndex, nextQuestion, timestamp, sessionId, userId);
  });

  return {
    nextQuestion,
    canGenerate: canGeneratePreview(session),
    skippedCount
  };
}

export async function generatePreview(sessionId: string, userId: string): Promise<PreviewGenerateResponse | null> {
  const session = loadSession(sessionId, userId);

  if (!session) {
    return null;
  }

  const messageHistory = loadMessages(sessionId);
  const highlights = messageHistory.filter((message) => message.role === 'user').map((message) => message.content);
  const aiDraft = await generatePreviewDraft({
    bookType: session.bookType,
    messages: messageHistory
  });
  const outline = aiDraft?.outline ?? buildOutline(session, highlights);
  const summary = aiDraft?.summary ?? buildSummary(session, highlights);
  const title = aiDraft?.title ?? buildTitle(session, highlights);
  const bookId = session.bookId ?? makeId('book');
  const status: BookStatus = 'preview';
  const updatedAt = nowIso();
  const chapters = aiDraft?.chapters ?? buildChapters(outline, highlights);

  runInTransaction(() => {
    database
      .prepare(
        `
          INSERT INTO books (id, user_id, session_id, title, summary, status, outline_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            summary = excluded.summary,
            status = excluded.status,
            outline_json = excluded.outline_json,
            updated_at = excluded.updated_at
        `
      )
      .run(bookId, userId, sessionId, title, summary, status, JSON.stringify(outline), updatedAt, updatedAt);

    database.prepare(`DELETE FROM chapters WHERE book_id = ?`).run(bookId);

    const insertChapter = database.prepare(
      `
        INSERT INTO chapters (id, book_id, sort_order, title, summary, content)
        VALUES (?, ?, ?, ?, ?, ?)
      `
    );

    chapters.forEach((chapter, index) => {
      insertChapter.run(makeId('chapter'), bookId, index + 1, chapter.title, chapter.summary, chapter.content);
    });

    database
      .prepare(
        `
          UPDATE sessions
          SET book_id = ?, status = 'preview-ready', updated_at = ?
          WHERE id = ? AND user_id = ?
        `
      )
      .run(bookId, updatedAt, sessionId, userId);
  });

  return {
    bookId,
    title,
    summary,
    outline,
    paymentRequired: true
  };
}

export function getBook(bookId: string, userId: string) {
  const row = database
    .prepare(
      `
        SELECT id, session_id, title, summary, status, outline_json, updated_at
        FROM books
        WHERE id = ? AND user_id = ?
      `
    )
    .get(bookId, userId) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  const chapterRows = database
    .prepare(
      `
        SELECT title, summary, content
        FROM chapters
        WHERE book_id = ?
        ORDER BY sort_order ASC, rowid ASC
      `
    )
    .all(bookId) as Array<Record<string, unknown>>;

  return {
    bookId: String(row.id),
    sessionId: String(row.session_id),
    title: String(row.title),
    summary: String(row.summary),
    status: row.status as BookStatus,
    outline: parseJson<PreviewOutlineItem[]>(String(row.outline_json), []),
    chapters: chapterRows.map((chapter) => ({
      title: String(chapter.title),
      summary: String(chapter.summary),
      content: String(chapter.content)
    })),
    updatedAt: String(row.updated_at)
  } satisfies BookDetailResponse;
}

export function getMyBooks(userId: string): MyBooksResponse {
  const rows = database
    .prepare(
      `
        SELECT id, session_id, title, summary, status, updated_at
        FROM books
        WHERE user_id = ?
        ORDER BY updated_at DESC, rowid DESC
      `
    )
    .all(userId) as Array<Record<string, unknown>>;

  const items = rows.map((book) => ({
    bookId: String(book.id),
    sessionId: String(book.session_id),
    title: String(book.title),
    summary: String(book.summary),
    status: book.status as BookStatus,
    updatedAt: String(book.updated_at)
  }));

  return { items };
}
