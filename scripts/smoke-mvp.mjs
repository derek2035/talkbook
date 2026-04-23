import { strict as assert } from 'node:assert';
import { execSync, spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const cwd = '/Users/derek/code/talkbook';
const port = 3101;
const databaseDir = join(cwd, '.local', 'smoke-tests');
const databasePath = join(databaseDir, 'talkbook-smoke.sqlite');
const baseUrl = `http://127.0.0.1:${port}`;

mkdirSync(databaseDir, { recursive: true });
rmSync(databasePath, { force: true });
rmSync(`${databasePath}-shm`, { force: true });
rmSync(`${databasePath}-wal`, { force: true });

execSync('pnpm build:server', { cwd, stdio: 'inherit' });

const server = spawn('node', ['apps/server/dist/index.js'], {
  cwd,
  env: {
    ...process.env,
    PORT: String(port),
    DATABASE_PATH: databasePath,
    AUTH_TOKEN_SECRET: 'talkbook-smoke-secret'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverOutput = '';

server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString();
});

server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString();
});

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // wait for the server process to come up
    }

    await delay(200);
  }

  throw new Error(`服务端未在预期时间内启动。\n${serverOutput}`);
}

async function request(path, { method = 'GET', token = '', body } = {}) {
  const headers = {};

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  return {
    status: response.status,
    body: payload
  };
}

async function login(code) {
  const response = await request('/api/v1/auth/wechat/login', {
    method: 'POST',
    body: { code }
  });

  assert.equal(response.status, 200, `登录失败: ${JSON.stringify(response.body)}`);
  assert.ok(response.body?.token, '登录后未返回 token');
  return response.body;
}

try {
  await waitForServer();

  const userA = await login('smoke-user-a');
  const userB = await login('smoke-user-b');

  assert.notEqual(userA.userId, userB.userId, '不同 mock code 应产生不同用户');

  const createSession = await request('/api/v1/sessions', {
    method: 'POST',
    token: userA.token,
    body: { bookType: 'memoir' }
  });

  assert.equal(createSession.status, 200, `创建会话失败: ${JSON.stringify(createSession.body)}`);
  assert.ok(createSession.body?.sessionId, '创建会话未返回 sessionId');

  const sessionId = createSession.body.sessionId;

  const firstAnswer = await request(`/api/v1/sessions/${sessionId}/audio`, {
    method: 'POST',
    token: userA.token,
    body: {
      transcript: '我最想写的是我的母亲，她总是在最困难的时候把家撑住。',
      duration: 18,
      format: 'mock-text'
    }
  });

  assert.equal(firstAnswer.status, 200, `第一次提交失败: ${JSON.stringify(firstAnswer.body)}`);
  assert.equal(firstAnswer.body?.answerCount, 1, '第一次提交后 answerCount 不正确');

  const secondAnswer = await request(`/api/v1/sessions/${sessionId}/audio`, {
    method: 'POST',
    token: userA.token,
    body: {
      transcript: '那段故事发生在我上初中的时候，家里压力很大，但她始终没有退缩。',
      duration: 22,
      format: 'mock-text'
    }
  });

  assert.equal(secondAnswer.status, 200, `第二次提交失败: ${JSON.stringify(secondAnswer.body)}`);
  assert.equal(secondAnswer.body?.canGenerate, true, '两次回答后没有解锁预览');

  const preview = await request(`/api/v1/sessions/${sessionId}/generate-preview`, {
    method: 'POST',
    token: userA.token
  });

  assert.equal(preview.status, 200, `生成预览失败: ${JSON.stringify(preview.body)}`);
  assert.ok(preview.body?.bookId, '生成预览未返回 bookId');

  const myBooksA = await request('/api/v1/me/books', { token: userA.token });
  const myBooksB = await request('/api/v1/me/books', { token: userB.token });

  assert.equal(myBooksA.status, 200, '用户 A 获取我的书稿失败');
  assert.equal(myBooksB.status, 200, '用户 B 获取我的书稿失败');
  assert.equal(myBooksA.body?.items?.length, 1, '用户 A 应有 1 本书稿');
  assert.equal(myBooksB.body?.items?.length, 0, '用户 B 不应看到用户 A 的书稿');

  const sessionAsUserB = await request(`/api/v1/sessions/${sessionId}`, { token: userB.token });
  const bookAsUserB = await request(`/api/v1/books/${preview.body.bookId}`, { token: userB.token });
  const noAuthBooks = await request('/api/v1/me/books');

  assert.equal(sessionAsUserB.status, 404, '用户 B 不应读取用户 A 的会话');
  assert.equal(bookAsUserB.status, 404, '用户 B 不应读取用户 A 的书稿');
  assert.equal(noAuthBooks.status, 401, '未登录请求应返回 401');

  console.log(
    JSON.stringify(
      {
        ok: true,
        sessionId,
        bookId: preview.body.bookId,
        userABookCount: myBooksA.body.items.length,
        userBBookCount: myBooksB.body.items.length
      },
      null,
      2
    )
  );
} finally {
  server.kill('SIGTERM');
  await delay(200);
}
