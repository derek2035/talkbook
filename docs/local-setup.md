# Talkbook 本地初始化说明

## 重要原则

`talkbook` 是一个**独立仓库**。它必须作为单独项目存在，不能放进 `vennix-website` 中，也不能与 `vennix-website` 共享一个工作区。

## 为什么会出现代码冲突

如果把 `talkbook` 放进另一个已有 Git 仓库（例如 `vennix-website`）里，常见问题会包括：

- Git 状态混乱：新文件会被上层仓库识别为自己的改动。
- 依赖配置混乱：两个项目的 `package.json`、锁文件、脚本可能互相干扰。
- 工作区冲突：上层项目如果是 monorepo，会把 `talkbook` 误纳入管理。
- 命令误执行：在错误目录执行 `git add .`、`pnpm install`、`git commit` 时，容易把两个项目混在一起。

## 正确目录结构

```text
~/Code/
  ├─ vennix-website/
  └─ talkbook/
```

## 正确克隆方式

```bash
cd ~/Code
git clone <your-talkbook-repo-url> talkbook
cd talkbook
```

## 不推荐方式

```bash
cd ~/Code/vennix-website
git clone <your-talkbook-repo-url> talkbook
```

也不要把 `talkbook` 的文件直接复制到这些目录中：

```text
vennix-website/apps/
vennix-website/packages/
vennix-website/src/
```

## 拉取后的检查命令

进入 `talkbook` 目录后，建议先运行：

```bash
pwd
git remote -v
git status
```

理想状态：

- 当前路径是独立的 `talkbook` 目录
- `git remote -v` 指向 `talkbook` 自己的仓库
- `git status` 不包含 `vennix-website` 的文件

## 当前仓库状态说明

当前仓库已完成基础工程初始化，当前重点是：

- 封版产品需求与接口范围
- 按文档推进 MVP 主链路开发
- 保持仓库独立、环境清晰、联调稳定

所以现在本地 clone 完成后，优先阅读：

- `README.md`
- `docs/product-plan.md`
- `docs/product-requirements-prd.md`
- `docs/architecture.md`
- `docs/development-roadmap.md`

完成依赖安装后，建议执行：

```bash
pnpm install
pnpm typecheck
pnpm build:server
```

## 本地环境变量

当前项目已经支持通过环境变量配置小程序请求地址和服务端端口，避免把联调地址写死在代码里。

### 小程序端

在 `apps/miniprogram` 下创建 `.env` 文件，可参考：

[`apps/miniprogram/.env.example`](/Users/derek/code/talkbook/apps/miniprogram/.env.example)

```bash
cp apps/miniprogram/.env.example apps/miniprogram/.env
```

默认配置：

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

如果后续要做真机联调，把这个值替换成手机可访问的测试域名即可。

### 服务端

在 `apps/server` 下创建 `.env` 文件，可参考：

[`apps/server/.env.example`](/Users/derek/code/talkbook/apps/server/.env.example)

```bash
cp apps/server/.env.example apps/server/.env
```

常用字段：

- `PORT`：服务端监听端口
- `AI_PROVIDER`：后续真实模型接入时使用
- `ASR_PROVIDER`：后续真实语音识别接入时使用
- `WECHAT_APP_ID`：服务端换取微信用户身份时使用
- `WECHAT_APP_SECRET`：服务端换取微信用户身份时使用
- `ALLOW_MOCK_WECHAT_LOGIN`：本地未配置微信密钥时，是否允许自动回退到开发登录

## 如果已经放错目录怎么办

### 情况 1：只是克隆到了 `vennix-website/talkbook`

删除错误目录后重新 clone：

```bash
rm -rf ~/Code/vennix-website/talkbook
cd ~/Code
git clone <your-talkbook-repo-url> talkbook
```

### 情况 2：已经把文件复制进 `vennix-website`

建议顺序：

1. 先停止继续修改。
2. 在 `vennix-website` 中执行 `git status`。
3. 把属于 `talkbook` 的文件移出或回退。
4. 再在独立目录重新 clone `talkbook`。
