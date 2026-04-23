<template>
  <view class="tb-page">
    <PageHeader title="用户协议" back @back="goBack" />

    <scroll-view scroll-y class="policy-scroll">
      <view class="tb-content policy-content">
        <view class="policy-card">
          <text class="policy-card__title">Talkbook 用户协议</text>
          <text class="policy-card__meta">最后更新时间：2026-04-12</text>

          <view class="policy-section">
            <text class="policy-section__title">1. 服务说明</text>
            <text class="policy-section__text">Talkbook 提供基于采访流程的创作辅助服务，帮助用户通过语音或文字整理故事素材，并生成结构化书稿预览。</text>
          </view>

          <view class="policy-section">
            <text class="policy-section__title">2. 账号与登录</text>
            <text class="policy-section__text">你需要通过微信身份登录后才能进入完整创作链路。你应确保所提供的身份信息真实、可用，并妥善保管自己的登录状态。</text>
          </view>

          <view class="policy-section">
            <text class="policy-section__title">3. 用户内容责任</text>
            <text class="policy-section__text">你应保证提交的文字、语音转写和生成请求不包含违法违规、侵权、恶意骚扰或其他高风险内容。服务端会对明显高风险内容做基础拦截。</text>
          </view>

          <view class="policy-section">
            <text class="policy-section__title">4. 服务边界</text>
            <text class="policy-section__text">当前版本的预览结果主要用于创作整理与产品验证，不承诺达到正式出版质量。真实 ASR、LLM、支付和导出能力将在后续版本逐步接入。</text>
          </view>

          <view class="policy-section">
            <text class="policy-section__title">5. 知识产权</text>
            <text class="policy-section__text">你提交的原始内容仍归你或合法权利人所有。你同意在为你提供采访、预览生成和功能调试所必需的范围内，允许系统处理这些内容。</text>
          </view>

          <view class="policy-section">
            <text class="policy-section__title">6. 协议变更与终止</text>
            <text class="policy-section__text">随着产品进入正式上线阶段，本协议可能根据业务、合规和平台要求更新。继续使用服务即表示你接受更新后的有效条款。</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import PageHeader from '../../components/PageHeader.vue';

function goBack() {
  uni.navigateBack();
}
</script>

<style scoped>
.policy-scroll {
  height: calc(100vh - 112rpx);
}

.policy-content {
  padding-top: 18rpx;
  padding-bottom: 40rpx;
}

.policy-card {
  padding: 32rpx 28rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.88);
}

.policy-card__title {
  display: block;
  font-size: 40rpx;
  line-height: 1.35;
  font-weight: 700;
  color: var(--tb-primary);
}

.policy-card__meta {
  display: block;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: var(--tb-text-muted);
}

.policy-section {
  margin-top: 28rpx;
}

.policy-section__title {
  display: block;
  font-size: 28rpx;
  line-height: 1.45;
  font-weight: 700;
  color: var(--tb-text);
}

.policy-section__text {
  display: block;
  margin-top: 12rpx;
  font-size: 25rpx;
  line-height: 1.82;
  color: var(--tb-text-muted);
}
</style>
