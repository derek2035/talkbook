<template>
  <view class="tb-page">
    <PageHeader title="隐私政策" back @back="goBack" />

    <scroll-view scroll-y class="policy-scroll">
      <view class="tb-content policy-content">
        <view class="policy-card">
          <text class="policy-card__title">Talkbook 隐私政策</text>
          <text class="policy-card__meta">最后更新时间：2026-04-12</text>

          <view class="policy-section">
            <text class="policy-section__title">1. 我们收集哪些信息</text>
            <text class="policy-section__text">为了完成登录、采访记录保存和书稿展示，我们会处理你的微信身份信息、书籍类型、采访文本、生成的预览结果以及最近更新时间。</text>
          </view>

          <view class="policy-section">
            <text class="policy-section__title">2. 这些信息用于什么</text>
            <text class="policy-section__text">这些信息仅用于创建你的创作会话、展示“我的书稿”、恢复历史记录，以及在后续版本中持续完善成书能力。</text>
          </view>

          <view class="policy-section">
            <text class="policy-section__title">3. 本地开发与测试说明</text>
            <text class="policy-section__text">当前开发阶段支持 mock 登录与 mock 采访内容。本地调试数据会写入服务端 SQLite 数据库，仅用于当前项目联调，不作为正式生产数据。</text>
          </view>

          <view class="policy-section">
            <text class="policy-section__title">4. 信息存储与安全</text>
            <text class="policy-section__text">服务端会为登录用户签发访问凭证，并按用户隔离保存会话和书稿数据。我们会继续补充更完整的生产监控、备份和权限控制措施。</text>
          </view>

          <view class="policy-section">
            <text class="policy-section__title">5. 你的权利</text>
            <text class="policy-section__text">你可以停止使用服务，也可以在后续正式版本中申请查询、导出或删除与账号关联的数据。开发阶段如需清理数据，应由项目维护者在服务端执行。</text>
          </view>

          <view class="policy-section">
            <text class="policy-section__title">6. 联系方式</text>
            <text class="policy-section__text">如果你对隐私处理方式有疑问，应通过产品正式发布时提供的客服或运营联系方式进行反馈。当前仓库阶段以开发文档说明为准。</text>
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
