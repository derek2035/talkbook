<template>
  <view class="page">
    <view class="panel">
      <text class="title">书稿预览</text>
      <text class="desc">当前阶段将先展示预览结构，后续再接入真实生成内容。</text>
    </view>

    <view class="panel">
      <text class="chapter">第一章：童年的背影</text>
      <text class="summary">讲述家庭早期记忆与人物关系。</text>
    </view>

    <view class="panel">
      <text class="chapter">第二章：最艰难的岁月</text>
      <text class="summary">讲述转折、情绪变化与成长。</text>
    </view>
  </view>
</template>

<script setup lang="ts"></script>

<style scoped>
.page { padding: 32rpx; }
.panel { background:#fff; border-radius:24rpx; padding:24rpx; margin-bottom:20rpx; }
.title { display:block; font-size:36rpx; font-weight:700; }
.desc, .summary { display:block; margin-top:12rpx; color:#6b7280; }
.chapter { display:block; font-size:30rpx; font-weight:600; }
</style>
