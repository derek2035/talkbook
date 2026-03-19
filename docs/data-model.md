# Talkbook 核心数据模型定义

## 目标

定义 MVP 阶段最少需要的核心实体，避免工程初始化后数据库结构频繁变更。

## MVP 身份策略说明

在正式登录接入前，MVP 第一阶段允许采用匿名用户或本地调试用户。

因此：

- `openId` 在当前阶段可以为空
- `userId` 在 `sessions`、`books`、`orders` 中可以先作为预留字段
- 第一阶段可先用内存存储或本地 mock 数据完成主链路验证

## 1. User

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 用户 ID |
| openId | string / nullable | 微信 openId，正式登录后接入 |
| nickname | string | 用户昵称 |
| avatarUrl | string | 头像 |
| membershipStatus | enum | 会员状态 |
| createdAt | datetime | 创建时间 |

## 2. Session

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 会话 ID |
| userId | string / nullable | 所属用户，MVP 可为空 |
| bookType | enum | 书籍类型 |
| status | enum | collecting / preview-ready / completed |
| currentQuestion | text | 当前问题 |
| answerCount | int | 已回答次数 |
| createdAt | datetime | 创建时间 |
| updatedAt | datetime | 更新时间 |

## 3. Message

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 消息 ID |
| sessionId | string | 所属会话 |
| role | enum | assistant / user / system |
| content | text | 文本内容 |
| audioUrl | string | 原始音频地址 |
| transcriptStatus | enum | pending / success / failed |
| createdAt | datetime | 创建时间 |

## 4. Book

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 书稿 ID |
| userId | string / nullable | 所属用户，MVP 可为空 |
| sessionId | string | 来源会话 |
| title | string | 书名 |
| subtitle | string | 副标题 |
| summary | text | 简介 |
| status | enum | preview / paid / exported |
| createdAt | datetime | 创建时间 |
| updatedAt | datetime | 更新时间 |

## 5. Chapter

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 章节 ID |
| bookId | string | 所属书稿 |
| sortOrder | int | 顺序 |
| title | string | 章节标题 |
| summary | text | 章节摘要 |
| content | longtext | 正文 |

## 6. Order

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 订单 ID |
| userId | string | 用户 ID |
| bookId | string | 对应书稿 |
| orderType | enum | single-book / membership |
| amount | decimal | 支付金额 |
| status | enum | pending / paid / closed |
| createdAt | datetime | 创建时间 |

## 实体关系

```text
User 1---n Session
Session 1---n Message
Session 1---1 Book
Book 1---n Chapter
User 1---n Order
Book 1---n Order
```

## MVP 阶段的实现建议

- 第一版数据库可以只先建 `users`、`sessions`、`messages`、`books`、`chapters`。
- 如果登录体系尚未接入，`userId` 相关字段可先预留不强制落库。
- `orders` 可以在打通内容预览后再正式接入。
- 如果赶时间，章节正文可先作为异步生成任务，先返回目录和摘要。
