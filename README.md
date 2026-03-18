# Talkbook / 口书

Talkbook（口书）是一个**独立仓库**的 AI 成书项目，目标是让普通用户仅通过语音聊天，就能完成小说、自传、回忆录等完整书稿的生成。

> 当前仓库已按“重新开始”的方式清理为 **产品与研发基线阶段**。
> 这意味着：先把方向、范围、接口边界和阶段计划定清楚，再进入正式编码。

## 当前阶段

目前仓库聚焦 4 件事：

1. 明确产品定位与 MVP 边界
2. 明确技术路线与模块拆分
3. 明确本地开发方式，确保项目始终独立于 `vennix-website`
4. 为下一步正式初始化代码仓做准备

## 文档导航

- `docs/product-plan.md`：产品定位、目标用户、MVP 范围
- `docs/architecture.md`：技术路线、模块拆分、阶段开发建议
- `docs/development-roadmap.md`：分阶段开发路线图
- `docs/mvp-spec.md`：MVP 页面、状态与交互说明
- `docs/api-contract.md`：服务端 MVP 接口草案
- `docs/data-model.md`：核心数据模型草案
- `docs/local-setup.md`：本地拉取与独立仓库说明

## 下一步开发顺序

建议严格按照以下顺序推进：

1. 确认首发平台：微信小程序
2. 确认前端方案：uni-app
3. 确认后端方案：Node.js + TypeScript
4. 确认外部能力：语音识别、大模型、支付、存储
5. 完成真实工程初始化
6. 打通 MVP 主链路：选类型 → 语音回答 → AI 追问 → 生成书稿

## 本地使用原则

- `talkbook` 必须单独 clone 到独立目录。
- 不要把它放到 `vennix-website` 目录里。
- 不要把两个项目做成一个工作区。

详细说明见 `docs/local-setup.md`。

## 当前工程状态

- `apps/miniprogram`：uni-app 小程序工程骨架
- `apps/server`：Node.js + TypeScript 服务端骨架
- `packages/contracts`：前后端共享接口与类型


## GitHub 自动推送

仓库已增加版本化 git hook：

- `.githooks/post-commit`
- `scripts/git-auto-push.sh`

启用后，每次 `git commit` 后都会自动尝试执行：

```bash
git push origin <current-branch>
```

如果你想临时关闭自动 push，可以在提交前设置：

```bash
TALKBOOK_DISABLE_AUTO_PUSH=1 git commit -m "your message"
```

> 注意：自动 push 仍然依赖当前环境能访问 GitHub，并且已经正确配置 `origin`。
