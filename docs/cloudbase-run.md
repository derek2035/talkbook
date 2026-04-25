# 微信云托管部署说明

本文档用于把 Talkbook 服务端部署到微信云托管，并让小程序通过 `wx.cloud.callContainer` 调用后端。

## 目标架构

```text
小程序
  -> wx.cloud.callContainer
  -> 微信云托管服务 talkbook-api
  -> apps/server Node.js 服务
```

这样可以先绕开自有域名、HTTPS 证书和 ICP 备案问题。后续如果要接入自有域名，可以再切回 `VITE_API_BASE_URL`。

## 1. 开通环境

在微信开发者工具或云开发控制台中：

1. 开通云开发环境。
2. 记录云环境 ID，例如 `prod-xxxxxx`。
3. 创建云托管服务，建议服务名为 `talkbook-api`。

## 2. 部署服务端

云托管服务使用仓库根目录作为构建上下文，Dockerfile 路径填写：

```text
Dockerfile
```

服务端监听端口：

```text
3000
```

健康检查路径可使用：

```text
/health
```

## 3. 云托管环境变量

在云托管服务的环境变量中配置：

```bash
NODE_ENV=production
PORT=3000
WECHAT_APP_ID=<小程序 AppID>
WECHAT_APP_SECRET=<小程序 AppSecret>
ALLOW_MOCK_WECHAT_LOGIN=false
AUTH_TOKEN_SECRET=<至少 32 位随机字符串>
DATABASE_PATH=/data/talkbook.sqlite
AI_PROVIDER=doubao
AI_MODEL=<火山方舟模型 ID>
AI_API_KEY=<模型 API Key>
AI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ASR_PROVIDER=mock
```

如果要启用真实 ASR，再补：

```bash
ASR_PROVIDER=doubao
ASR_API_KEY=<火山语音 API Key>
ASR_BASE_URL=https://openspeech.bytedance.com
ASR_RESOURCE_ID=volc.bigasr.auc_turbo
ASR_REQUEST_MODEL=bigmodel
```

注意：当前 SQLite 路径设置为 `/data/talkbook.sqlite`，适合后续挂载持久化存储。正式上线前应确认云托管实例重启和重新部署后数据不会丢失；如果不能保证，应迁移到云数据库或腾讯云数据库。

## 当前部署信息

当前测试环境：

```text
环境 ID：talkbook-prod-d1gcxuvsbd9cb6803
服务名：talkbook-api
服务类型：容器型云托管
当前版本：talkbook-api-002
公网域名：https://talkbook-api-250189-6-1305316063.sh.run.tcloudbase.com
```

当前云端环境已经关闭 mock 登录：

```bash
NODE_ENV=production
ALLOW_MOCK_WECHAT_LOGIN=false
```

可用以下接口检查状态：

```bash
curl https://talkbook-api-250189-6-1305316063.sh.run.tcloudbase.com/health
curl https://talkbook-api-250189-6-1305316063.sh.run.tcloudbase.com/ready
```

## 4. 小程序连接云托管

在 `apps/miniprogram/.env` 中配置：

```bash
VITE_API_BASE_URL=https://talkbook-api-250189-6-1305316063.sh.run.tcloudbase.com/api/v1
VITE_WECHAT_CLOUD_ENV_ID=talkbook-prod-d1gcxuvsbd9cb6803
VITE_WECHAT_CLOUD_SERVICE_NAME=talkbook-api
```

配置了 `VITE_WECHAT_CLOUD_ENV_ID` 和 `VITE_WECHAT_CLOUD_SERVICE_NAME` 后，小程序会优先使用 `wx.cloud.callContainer`。微信开发者工具本地模拟器会自动回退到 `VITE_API_BASE_URL`，方便本地排查；真机预览和正式环境仍会走云托管调用。留空时始终使用 `VITE_API_BASE_URL`。

修改环境变量后重新构建：

```bash
pnpm --filter @talkbook/miniprogram build:mp-weixin
```

## 5. 验证路径

1. 在微信开发者工具中重新导入或重新编译 `apps/miniprogram/dist/build/mp-weixin`。
2. 真机预览小程序。
3. 走完整链路：登录 -> 创建会话 -> 提交文字或语音 -> 生成预览 -> 我的书稿。
4. 如果请求失败，先检查云环境 ID、云托管服务名和云托管日志。

## 6. 本地开发保持不变

如果要回到本地开发，把这两个变量留空：

```bash
VITE_WECHAT_CLOUD_ENV_ID=
VITE_WECHAT_CLOUD_SERVICE_NAME=
```

小程序会继续请求：

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1
```
