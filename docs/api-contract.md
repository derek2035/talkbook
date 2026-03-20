# Talkbook MVP 接口定义

## 设计原则

- 小程序端只做展示与交互，不直接调用第三方 AI / ASR。
- 所有外部能力统一由服务端代理。
- 接口先围绕 MVP 主链路设计，不提前扩张。
- MVP 第一阶段允许以前端文本模拟转写结果，后续再替换为真实语音上传。

## 1. 创建会话

### `POST /api/v1/sessions`

#### 请求体
```json
{
  "bookType": "memoir"
}
```

#### 返回体
```json
{
  "sessionId": "sess_xxx",
  "bookType": "memoir",
  "firstQuestion": "你最想写的人是谁？先介绍一下 TA。"
}
```

## 2. 上传语音并转写

### `POST /api/v1/sessions/:sessionId/audio`

#### MVP 当前请求体
```json
{
  "transcript": "我最想写的是我的母亲，她很坚强。",
  "duration": 12,
  "format": "mock-text",
  "recordingMode": "press-hold",
  "isLocked": false
}
```

#### 后续扩展

接入正式录音能力后，请求体需要兼容以下字段：

- `audioFile`
- `duration`
- `format`
- `recordingMode`
- `isLocked`
- `segmentIndex`
- `segmentCount`
- `startedAt`
- `endedAt`

#### 返回体
```json
{
  "messageId": "msg_xxx",
  "transcript": "这是语音转写后的内容",
  "segments": [
    {
      "segmentIndex": 1,
      "segmentTitle": "第1段",
      "duration": 58,
      "transcript": "这是第一段整理后的转写",
      "time": "09:41"
    }
  ],
  "nextQuestion": "这件事大概发生在什么时候？",
  "canGenerate": false,
  "answerCount": 1
}
```

#### 分段规则说明

- 当单次连续录音时间较长时，服务端应将录音按语义边界自动切分为约 1 分钟一段
- 自动切分应尽量避开一句话中间，优先选择自然停顿、句末或语义边界
- 若本次录音未触发分段，`segments` 可仅返回 1 条

## 3. 跳过当前问题

### `POST /api/v1/sessions/:sessionId/skip`

#### 返回体
```json
{
  "nextQuestion": "那我们换一个角度，你最难忘的一件事是什么？",
  "canGenerate": false,
  "skippedCount": 1
}
```

## 4. 获取会话详情

### `GET /api/v1/sessions/:sessionId`

#### 返回体
```json
{
  "sessionId": "sess_xxx",
  "bookType": "memoir",
  "status": "collecting",
  "currentQuestion": "你最想写的人是谁？先介绍一下 TA。",
  "messages": [
    {
      "id": "msg_001",
      "role": "assistant",
      "content": "你最想写的人是谁？先介绍一下 TA。",
      "createdAt": "2026-03-19T08:00:00Z"
    },
    {
      "id": "msg_002",
      "role": "user",
      "content": "我想写我的母亲。",
      "createdAt": "2026-03-19T08:01:00Z"
    }
  ],
  "canGenerate": false,
  "answerCount": 1
}
```

## 5. 生成书稿预览

### `POST /api/v1/sessions/:sessionId/generate-preview`

#### 返回体
```json
{
  "bookId": "book_xxx",
  "title": "《时光里的母亲》",
  "summary": "一部围绕母亲人生经历展开的家庭回忆录。",
  "outline": [
    { "title": "第一章：童年的背影", "summary": "讲述家庭早期记忆。" },
    { "title": "第二章：最艰难的岁月", "summary": "讲述家庭转折与情感变化。" }
  ],
  "paymentRequired": true
}
```

## 6. 获取书稿详情

### `GET /api/v1/books/:bookId`

#### 返回体
```json
{
  "bookId": "book_xxx",
  "sessionId": "sess_xxx",
  "title": "《时光里的母亲》",
  "summary": "一部围绕母亲人生经历展开的家庭回忆录。",
  "status": "preview",
  "outline": [
    { "title": "第一章：童年的背影", "summary": "讲述家庭早期记忆。" }
  ],
  "chapters": [
    {
      "title": "第一章：童年的背影",
      "summary": "讲述家庭早期记忆。",
      "content": "当前阶段正文仍可继续补充。"
    }
  ],
  "updatedAt": "2026-03-19T08:10:00Z"
}
```

## 7. 获取我的书稿列表

### `GET /api/v1/me/books`

#### 返回体
```json
{
  "items": [
    {
      "bookId": "book_xxx",
      "sessionId": "sess_xxx",
      "title": "《时光里的母亲》",
      "summary": "一部围绕母亲人生经历展开的家庭回忆录。",
      "status": "preview",
      "updatedAt": "2026-03-18T00:00:00Z"
    }
  ]
}
```

## 错误返回约定

- `400`：参数错误
- `404`：会话或书稿不存在
- `500`：服务异常

错误返回建议结构：

```json
{
  "error": "Session not found"
}
```

## 后续但不在当前 MVP 首批实现

- 微信登录换取用户身份
- 支付下单与支付回调
- 完整版书稿导出
- 会员权益校验
