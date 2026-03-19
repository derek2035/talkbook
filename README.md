# Talkbook / 口书

Talkbook（口书）是一个**独立仓库**的 AI 成书项目，目标是让普通用户仅通过语音聊天，逐步整理出可阅读、可扩展的书稿内容。

> 当前仓库已完成工程骨架初始化，现阶段进入 **MVP 需求封版与开发阶段**。
> 这意味着：范围、页面、接口、数据模型先对齐，再按文档直接推进开发。

## 当前阶段

目前仓库聚焦 4 件事：

1. 封版 MVP 产品需求与页面范围
2. 对齐接口契约与数据模型
3. 保持本地开发环境和独立仓库约束清晰
4. 直接进入 MVP 主链路开发

## 文档导航

- `docs/product-plan.md`：产品定位、目标用户、MVP 范围
- `docs/product-requirements-prd.md`：更细粒度的 MVP 产品需求文档（PRD）
- `docs/test-cases-mvp.md`：覆盖全部需求点的 MVP 测试用例
- `docs/test-checklist-dev.md`：开发自测清单
- `docs/test-checklist-release.md`：提测与验收清单
- `docs/api-test-cases-mvp.md`：接口专项测试用例
- `docs/architecture.md`：技术路线、模块拆分、阶段开发建议
- `docs/development-roadmap.md`：分阶段开发路线图
- `docs/mvp-spec.md`：MVP 页面、状态与交互说明
- `docs/api-contract.md`：服务端 MVP 接口定义
- `docs/data-model.md`：核心数据模型定义
- `docs/local-setup.md`：本地拉取与独立仓库说明

## 下一步开发顺序

建议严格按照以下顺序推进：

1. 按封版文档实现首页与书籍类型选择
2. 打通会话创建、回读与多轮问答
3. 先用文字模拟转写，预留真实录音上传接口
4. 生成书稿预览并写入“我的书稿”
5. 再接入真实 ASR / LLM / 支付等外部能力

## 本地使用原则

- `talkbook` 必须单独 clone 到独立目录。
- 不要把它放到 `vennix-website` 目录里。
- 不要把两个项目做成一个工作区。

详细说明见 `docs/local-setup.md`。

## 当前工程状态

- `apps/miniprogram`：uni-app 小程序工程骨架与 MVP 页面
- `apps/server`：Node.js + TypeScript 服务端骨架与 MVP API
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
