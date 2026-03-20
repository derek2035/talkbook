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

interface SessionRecord {
  id: string;
  bookType: BookType;
  status: SessionStatus;
  messages: SessionMessage[];
  answerCount: number;
  skippedCount: number;
  currentQuestionIndex: number;
  bookId?: string;
  createdAt: string;
  updatedAt: string;
}

interface BookRecord extends BookDetailResponse {}

const sessions = new Map<string, SessionRecord>();
const books = new Map<string, BookRecord>();

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
    return readyPrompt;
  }

  session.currentQuestionIndex = nextIndex;
  return questions[nextIndex];
}

function canGeneratePreview(session: SessionRecord) {
  return session.answerCount >= 2;
}

function updateSessionStatus(session: SessionRecord) {
  session.status = canGeneratePreview(session) ? 'preview-ready' : 'collecting';
  session.updatedAt = nowIso();
}

function getCurrentQuestion(session: SessionRecord) {
  const latestAssistantMessage = [...session.messages].reverse().find((message) => message.role === 'assistant');
  return latestAssistantMessage?.content ?? '';
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
    currentQuestion: getCurrentQuestion(session),
    messages: session.messages,
    canGenerate: canGeneratePreview(session),
    answerCount: session.answerCount
  };
}

export function createSession(bookType: string | undefined) {
  const normalizedBookType = isBookType(bookType) ? bookType : BOOK_TYPES[0].key;
  const firstQuestion = getQuestions(normalizedBookType)[0];
  const session: SessionRecord = {
    id: makeId('sess'),
    bookType: normalizedBookType,
    status: 'collecting',
    messages: [createMessage('assistant', firstQuestion)],
    answerCount: 0,
    skippedCount: 0,
    currentQuestionIndex: 0,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  sessions.set(session.id, session);

  return {
    sessionId: session.id,
    bookType: session.bookType,
    firstQuestion
  };
}

export function getSession(sessionId: string) {
  const session = sessions.get(sessionId);
  return session ? toSessionDetail(session) : null;
}

export function submitAudioTranscript(
  sessionId: string,
  payload: SessionAudioUploadRequest | undefined
): AudioUploadResponse | null {
  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  const normalizedTranscript = payload?.transcript?.trim() || buildFallbackTranscript(session);
  const createdAt = nowIso();
  const duration = Math.max(8, Math.round(payload?.duration ?? Math.max(12, normalizedTranscript.length * 1.8)));
  const segments = buildSegments(normalizedTranscript, duration, createdAt);

  session.messages.push(
    createMessage('user', normalizedTranscript, {
      createdAt,
      displayType: 'audio',
      transcript: normalizedTranscript,
      duration,
      recordingMode: payload?.isLocked ? 'locked' : payload?.recordingMode ?? 'press-hold',
      statusLabel: payload?.isLocked ? '锁定录音' : '按住录音',
      segments
    })
  );
  session.answerCount += 1;

  const nextQuestion = getNextQuestion(session);
  session.messages.push(createMessage('assistant', nextQuestion));
  updateSessionStatus(session);

  return {
    messageId: session.messages[session.messages.length - 2]?.id ?? makeId('msg'),
    transcript: normalizedTranscript,
    segments,
    nextQuestion,
    canGenerate: canGeneratePreview(session),
    answerCount: session.answerCount
  };
}

export function skipQuestion(sessionId: string) {
  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  const nextQuestion = getNextQuestion(session);
  session.skippedCount += 1;
  session.messages.push(createMessage('assistant', nextQuestion));
  updateSessionStatus(session);

  return {
    nextQuestion,
    canGenerate: canGeneratePreview(session),
    skippedCount: session.skippedCount
  };
}

export function generatePreview(sessionId: string): PreviewGenerateResponse | null {
  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  const highlights = session.messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content);
  const outline = buildOutline(session, highlights);
  const summary = buildSummary(session, highlights);
  const title = buildTitle(session, highlights);
  const bookId = session.bookId ?? makeId('book');
  const status: BookStatus = 'preview';
  const updatedAt = nowIso();

  const book: BookRecord = {
    bookId,
    sessionId: session.id,
    title,
    summary,
    status,
    outline,
    chapters: buildChapters(outline, highlights),
    updatedAt
  };

  session.bookId = bookId;
  session.status = 'preview-ready';
  session.updatedAt = updatedAt;
  books.set(bookId, book);

  return {
    bookId,
    title,
    summary,
    outline,
    paymentRequired: true
  };
}

export function getBook(bookId: string) {
  return books.get(bookId) ?? null;
}

export function getMyBooks(): MyBooksResponse {
  const items = [...books.values()]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((book) => ({
      bookId: book.bookId,
      sessionId: book.sessionId,
      title: book.title,
      summary: book.summary,
      status: book.status,
      updatedAt: book.updatedAt
    }));

  return { items };
}
