<template>
  <view class="page">
    <view class="panel">
      <text class="title">我的</text>
      <text class="item">草稿：0</text>
      <text class="item">书稿：0</text>
      <text class="item">会员：未开通</text>
    </view>
  </view>
</template>

<script setup lang="ts"></script>

<style scoped>
.page { padding: 32rpx; }
.panel { background:#fff; border-radius:24rpx; padding:24rpx; }
.title { display:block; font-size:36rpx; font-weight:700; margin-bottom:16rpx; }
.item { display:block; margin-top:10rpx; color:#4b5563; }
</style>
