# Talkbook MVP 接口草案

## 设计原则

- 小程序端只做展示与交互，不直接调用第三方 AI / ASR。
- 所有外部能力统一由服务端代理。
- 接口先围绕 MVP 主链路设计，不提前扩张。

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

#### 表单字段
- `audioFile`
- `duration`
- `format`

#### 返回体
```json
{
  "messageId": "msg_xxx",
  "transcript": "这是语音转写后的内容",
  "nextQuestion": "这件事大概发生在什么时候？",
  "canGenerate": false
}
```

## 3. 跳过当前问题

### `POST /api/v1/sessions/:sessionId/skip`

#### 返回体
```json
{
  "nextQuestion": "那我们换一个角度，你最难忘的一件事是什么？"
}
```

## 4. 获取会话详情

### `GET /api/v1/sessions/:sessionId`

#### 返回体
```json
{
  "sessionId": "sess_xxx",
  "bookType": "memoir",
  "messages": [
    {
      "role": "assistant",
      "content": "你最想写的人是谁？先介绍一下 TA。"
    },
    {
      "role": "user",
      "content": "我想写我的母亲。"
    }
  ],
  "canGenerate": true
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
  "title": "《时光里的母亲》",
  "status": "preview",
  "outline": [],
  "chapters": []
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
      "title": "《时光里的母亲》",
      "status": "preview",
      "updatedAt": "2026-03-18T00:00:00Z"
    }
  ]
}
```

## 后续但不在当前 MVP 首批实现

- 微信登录换取用户身份
- 支付下单与支付回调
- 完整版书稿导出
- 会员权益校验
