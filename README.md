# Talkbook / 口书

Talkbook（口书）是一个**独立仓库**的 AI 成书项目，目标是让普通用户仅通过语音聊天，逐步整理出可阅读、可扩展的书稿内容。

> 当前仓库已进入 **MVP 主流程后半段**。
> 首页、登录、采访、预览、我的书稿主链路已可本地演示，服务端也已具备用户鉴权与 SQLite 持久化；真实 LLM 与火山语音 ASR 已完成代码接入，但仍待真实凭证联调，支付尚未接入。

## 当前阶段

目前仓库聚焦 4 件事：

1. 稳定首页 -> 采访 -> 预览 -> 我的书稿主链路
2. 保持接口契约、数据模型与页面封版稿一致
3. 用本地 mock 能力支撑联调，并保留真实 ASR / LLM 替换边界
4. 在进入商业化前先把鉴权、持久化、回归测试补齐

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

1. 继续补齐与封版稿仍有差距的页面细节和交互
2. 维持 `test:smoke` 通过，避免主链路回退
3. 用真实凭证联调 ASR / LLM，替换当前回退链路
4. 最后再接支付、会员、导出和上线准备

## 本地使用原则

- `talkbook` 必须单独 clone 到独立目录。
- 不要把它放到 `vennix-website` 目录里。
- 不要把两个项目做成一个工作区。

详细说明见 `docs/local-setup.md`。

## 当前工程状态

- `apps/miniprogram`：uni-app 小程序，已覆盖首页、登录、采访、预览、章节、我的书稿页
- `apps/server`：Node.js + TypeScript 服务端，已提供登录、会话、预览、书稿列表接口，并使用 SQLite 持久化用户与书稿数据
- `apps/server`：已接入真实能力抽象层，支持通过环境变量切换 Doubao LLM 和 Doubao ASR 的真实调用
- `packages/contracts`：前后端共享接口与类型
- `scripts/smoke-mvp.mjs`：本地冒烟测试，覆盖登录、创作、生成预览、用户隔离、未登录拦截

## 常用命令

```bash
pnpm install
pnpm typecheck
pnpm build:server
pnpm test:smoke
```

如需本地联调：

```bash
pnpm dev:server
pnpm dev:miniprogram
```

## 真实能力配置

服务端在未配置真实凭证时会自动回退到 mock。若要接入真实 Doubao 能力，至少需要补：

```bash
AI_PROVIDER=doubao
AI_MODEL=<你的聊天模型 ID>
ARK_API_KEY=<你的方舟 API Key>

ASR_PROVIDER=doubao
ASR_API_KEY=<你的火山语音 API Key，可直接复用方舟 API Key>
ASR_RESOURCE_ID=volc.bigasr.auc_turbo
ASR_REQUEST_MODEL=bigmodel
ASR_BASE_URL=https://openspeech.bytedance.com
```

说明：

- `AI_MODEL` 推荐填写火山方舟聊天接入点的 `Endpoint ID`
- 当前 Talkbook 录音链路是“小程序录音后直传音频文件”，最适配火山语音原生 **极速版** 资源 ID：`volc.bigasr.auc_turbo`
- 如果改用火山语音标准版资源（如 `volc.seedasr.auc`），官方接口需要公网可访问的音频 URL，当前仓库还没有接对象存储中转
- `ASR_MODEL` 仍保留兼容旧配置；新配置推荐显式填写 `ASR_RESOURCE_ID`

服务端启动后可通过 `/ready` 查看当前 `aiMode/asrMode` 是否为 `real`。


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
