import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { env } from '../config/env.js';

mkdirSync(dirname(env.databasePath), { recursive: true });

export const database = new DatabaseSync(env.databasePath);

database.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    open_id TEXT NOT NULL UNIQUE,
    nickname TEXT NOT NULL,
    avatar_url TEXT NOT NULL,
    membership_status TEXT NOT NULL DEFAULT 'standard',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    book_type TEXT NOT NULL,
    status TEXT NOT NULL,
    answer_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    current_question_index INTEGER NOT NULL DEFAULT 0,
    current_question TEXT NOT NULL,
    book_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    display_type TEXT,
    transcript TEXT,
    duration INTEGER,
    time_label TEXT,
    recording_mode TEXT,
    status_label TEXT,
    segments_json TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_messages_session_id_created_at ON messages (session_id, created_at);

  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    status TEXT NOT NULL,
    outline_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (session_id) REFERENCES sessions (id)
  );

  CREATE INDEX IF NOT EXISTS idx_books_user_id_updated_at ON books (user_id, updated_at DESC);

  CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_chapters_book_id_sort_order ON chapters (book_id, sort_order);
`);

export function runInTransaction<T>(work: () => T) {
  database.exec('BEGIN');

  try {
    const result = work();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
