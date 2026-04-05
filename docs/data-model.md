# Talkbook 核心数据模型定义

## 目标

定义 MVP 阶段最少需要的核心实体，避免工程初始化后数据库结构频繁变更。

## MVP 身份策略说明

MVP 产品流要求用户先完成微信登录，再进入创作链路。

因此：

- 线上与提测环境中，`openId` 与 `userId` 必须可落库并参与会话归属
- 本地联调阶段允许使用 mock 登录数据，但字段结构必须与正式微信登录保持一致
- `sessions`、`books`、`orders` 均按有用户归属设计，不再按匿名模式设计主流程

## 1. User

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 用户 ID |
| openId | string | 微信 openId |
| nickname | string | 用户昵称 |
| avatarUrl | string | 头像 |
| membershipStatus | enum | 会员状态 |
| createdAt | datetime | 创建时间 |

## 2. Session

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 会话 ID |
| userId | string | 所属用户 |
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
| userId | string | 所属用户 |
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
- 本地 mock 登录返回的 `userId/openId` 字段也必须参与接口联调与数据关联验证。
- `orders` 可以在打通内容预览后再正式接入。
- 如果赶时间，章节正文可先作为异步生成任务，先返回目录和摘要。
