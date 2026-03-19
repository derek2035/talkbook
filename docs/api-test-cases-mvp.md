# Talkbook MVP 接口专项测试用例

## 1. 文档目的

本文档聚焦服务端 API 专项测试，覆盖：

- 正向流程
- 错误流程
- 字段完整性
- 状态流转
- 与页面主链路相关的接口契约

## 2. 测试前提

- 服务端已启动
- 服务端基地址：`http://localhost:3000`
- 接口前缀：`/api/v1`
- 当前阶段采用 mock 文本转写策略

## 3. 公共校验规则

所有接口均需关注以下通用项：

- 返回 HTTP 状态码是否正确
- 返回 JSON 结构是否符合文档
- 必填字段是否存在
- 字段类型是否符合预期
- 错误返回是否包含 `error`

## 4. 接口测试用例

## 4.1 `POST /api/v1/sessions`

### API-TC-SESSION-001 创建会话成功

- 测试目标：验证可成功创建会话
- 请求体：

```json
{
  "bookType": "memoir"
}
```

- 预期结果：
  1. 返回 `200`
  2. 返回 `sessionId`
  3. 返回 `bookType=memoir`
  4. 返回 `firstQuestion`

### API-TC-SESSION-002 不同会话 ID 唯一

- 测试目标：验证连续创建会话时 `sessionId` 唯一
- 步骤：
  1. 连续发送两次创建请求
- 预期结果：
  1. 两次 `sessionId` 不相同

### API-TC-SESSION-003 缺省书籍类型处理

- 测试目标：验证缺少 `bookType` 时服务端行为明确
- 请求体：

```json
{}
```

- 预期结果：
  1. 返回默认书籍类型，或返回明确参数错误
  2. 行为与实现保持一致且可解释

### API-TC-SESSION-004 非法书籍类型处理

- 测试目标：验证非法 `bookType` 不会导致服务异常
- 请求体：

```json
{
  "bookType": "invalid-type"
}
```

- 预期结果：
  1. 服务不崩溃
  2. 返回默认值或可读错误

## 4.2 `GET /api/v1/sessions/:sessionId`

### API-TC-GETSESSION-001 获取会话详情成功

- 测试目标：验证能获取会话详情
- 前置条件：已创建一个会话
- 预期结果：
  1. 返回 `200`
  2. 返回 `sessionId`
  3. 返回 `bookType`
  4. 返回 `status`
  5. 返回 `currentQuestion`
  6. 返回 `messages`
  7. 返回 `canGenerate`
  8. 返回 `answerCount`

### API-TC-GETSESSION-002 初始消息验证

- 测试目标：验证创建会话后初始消息列表中已有 AI 首问
- 前置条件：已创建会话
- 预期结果：
  1. `messages` 非空
  2. 第一条消息角色为 `assistant`
  3. 第一条消息内容与 `firstQuestion` 一致

### API-TC-GETSESSION-003 消息字段完整性

- 测试目标：验证消息对象字段完整
- 前置条件：已创建会话
- 预期结果：
  1. 每条消息包含 `id`
  2. 每条消息包含 `role`
  3. 每条消息包含 `content`
  4. 每条消息包含 `createdAt`

### API-TC-GETSESSION-004 不存在会话

- 测试目标：验证不存在的 `sessionId` 返回明确错误
- 请求路径：`/api/v1/sessions/sess_not_exists`
- 预期结果：
  1. 返回 `404` 或明确资源不存在的返回结构
  2. 返回体可读

## 4.3 `POST /api/v1/sessions/:sessionId/audio`

### API-TC-AUDIO-001 模拟转写成功

- 测试目标：验证当前 mock 文本转写模式可正常工作
- 前置条件：已创建会话
- 请求体：

```json
{
  "transcript": "我最想写的是我的母亲，她很坚强。",
  "duration": 12,
  "format": "mock-text"
}
```

- 预期结果：
  1. 返回 `200`
  2. 返回 `messageId`
  3. 返回 `transcript`
  4. 返回 `nextQuestion`
  5. 返回 `canGenerate`
  6. 返回 `answerCount`

### API-TC-AUDIO-002 回答次数累加

- 测试目标：验证每次提交回答后 `answerCount` 增加
- 前置条件：已创建会话
- 步骤：
  1. 连续提交两次回答
- 预期结果：
  1. 第一次返回 `answerCount=1`
  2. 第二次返回 `answerCount=2`

### API-TC-AUDIO-003 解锁预览状态

- 测试目标：验证达到阈值后 `canGenerate=true`
- 前置条件：新建会话
- 步骤：
  1. 提交两次有效回答
- 预期结果：
  1. 第二次返回 `canGenerate=true`

### API-TC-AUDIO-004 空 transcript 处理

- 测试目标：验证空转写内容不会导致服务异常
- 前置条件：已创建会话
- 请求体：

```json
{
  "transcript": ""
}
```

- 预期结果：
  1. 服务不崩溃
  2. 行为清晰，可接受默认补全文本或返回明确错误

### API-TC-AUDIO-005 不存在会话上传

- 测试目标：验证不存在会话时返回明确错误
- 请求路径：`/api/v1/sessions/sess_not_exists/audio`
- 预期结果：
  1. 返回 `404`
  2. 返回 `error`

### API-TC-AUDIO-006 字段兼容性检查

- 测试目标：验证接口结构兼容未来真实音频上传
- 检查项：
  1. 请求体当前支持 `transcript`
  2. 文档预留 `audioFile`
  3. 文档预留 `duration`
  4. 文档预留 `format`
- 预期结果：
  1. 当前 mock 模式和未来真实音频模式兼容

## 4.4 `POST /api/v1/sessions/:sessionId/skip`

### API-TC-SKIP-001 跳过问题成功

- 测试目标：验证跳过问题可返回下一问
- 前置条件：已创建会话
- 预期结果：
  1. 返回 `200`
  2. 返回 `nextQuestion`
  3. 返回 `canGenerate`
  4. 返回 `skippedCount`

### API-TC-SKIP-002 连续跳过计数

- 测试目标：验证连续跳过时 `skippedCount` 正确累加
- 前置条件：已创建会话
- 步骤：
  1. 连续调用两次跳过
- 预期结果：
  1. 第一次 `skippedCount=1`
  2. 第二次 `skippedCount=2`

### API-TC-SKIP-003 跳过不影响会话可用性

- 测试目标：验证跳过后仍能继续提交回答
- 前置条件：已创建会话
- 步骤：
  1. 调用跳过
  2. 再调用 audio 接口提交回答
- 预期结果：
  1. 跳过后仍可正常提交回答

### API-TC-SKIP-004 不存在会话跳过

- 测试目标：验证不存在的会话跳过返回明确错误
- 预期结果：
  1. 返回 `404`
  2. 返回 `error`

## 4.5 `POST /api/v1/sessions/:sessionId/generate-preview`

### API-TC-PREVIEW-001 生成预览成功

- 测试目标：验证可成功生成书稿预览
- 前置条件：已创建会话并提交至少两次回答
- 预期结果：
  1. 返回 `200`
  2. 返回 `bookId`
  3. 返回 `title`
  4. 返回 `summary`
  5. 返回 `outline`
  6. 返回 `paymentRequired`

### API-TC-PREVIEW-002 目录字段完整性

- 测试目标：验证 `outline` 中每项都有标题和摘要
- 前置条件：生成预览成功
- 预期结果：
  1. `outline` 为数组
  2. 每一项包含 `title`
  3. 每一项包含 `summary`

### API-TC-PREVIEW-003 未达到阈值时生成预览

- 测试目标：验证未达到阈值时服务端行为可解释
- 前置条件：仅提交 0 或 1 次回答
- 预期结果：
  1. 服务不崩溃
  2. 行为与当前实现一致，可接受生成简版预览或返回明确限制

### API-TC-PREVIEW-004 不存在会话生成预览

- 测试目标：验证不存在会话时生成预览返回明确错误
- 预期结果：
  1. 返回 `404`
  2. 返回 `error`

## 4.6 `GET /api/v1/books/:bookId`

### API-TC-BOOK-001 获取书稿详情成功

- 测试目标：验证可获取书稿详情
- 前置条件：已生成预览
- 预期结果：
  1. 返回 `200`
  2. 返回 `bookId`
  3. 返回 `sessionId`
  4. 返回 `title`
  5. 返回 `summary`
  6. 返回 `status`
  7. 返回 `outline`
  8. 返回 `chapters`
  9. 返回 `updatedAt`

### API-TC-BOOK-002 章节字段完整性

- 测试目标：验证章节结构完整
- 前置条件：已生成预览
- 预期结果：
  1. `chapters` 为数组
  2. 每章包含 `title`
  3. 每章包含 `summary`
  4. 每章包含 `content`

### API-TC-BOOK-003 书稿与会话关联正确

- 测试目标：验证书稿来源会话可追溯
- 前置条件：已生成预览
- 预期结果：
  1. `sessionId` 与生成预览的会话一致

### API-TC-BOOK-004 不存在书稿详情

- 测试目标：验证不存在的书稿返回明确错误
- 预期结果：
  1. 返回 `404`
  2. 返回 `error`

## 4.7 `GET /api/v1/me/books`

### API-TC-MYBOOKS-001 获取我的书稿列表成功

- 测试目标：验证可获取书稿列表
- 前置条件：已生成至少 1 条预览
- 预期结果：
  1. 返回 `200`
  2. 返回 `items`
  3. 每项包含 `bookId/sessionId/title/summary/status/updatedAt`

### API-TC-MYBOOKS-002 空列表返回

- 测试目标：验证没有书稿时列表结构仍正确
- 前置条件：当前无书稿
- 预期结果：
  1. 返回 `200`
  2. `items` 为空数组

### API-TC-MYBOOKS-003 列表排序验证

- 测试目标：验证书稿按最近更新时间倒序返回
- 前置条件：已生成至少 2 条书稿
- 步骤：
  1. 连续生成两条书稿
  2. 请求列表
- 预期结果：
  1. 最近生成/更新的记录排在前面

## 5. 主链路接口回归顺序

每次修改接口后，建议按以下顺序回归：

1. 创建会话
2. 获取会话详情
3. 提交第一次回答
4. 提交第二次回答
5. 生成预览
6. 获取书稿详情
7. 获取我的书稿列表
8. 构造不存在的 `sessionId`
9. 构造不存在的 `bookId`

## 6. 通过标准

- 所有正向接口用例通过
- 资源不存在类错误返回清晰
- 关键字段无缺失
- 主链路接口可连续串联执行

