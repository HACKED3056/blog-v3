<template>
  <!-- 加了一个极其夸张的红色粗边框，和一行醒目的文字 -->
  <div style="border: 5px solid red !important; padding: 10px; margin: 20px 0;">
    <h3 style="color: red;">🔥 如果你看到这行字，说明覆盖成功了！</h3>
    
    <img :src="src" :alt="alt" style="width: 100%;" />
  </div>
</template>

<script setup lang="ts">
defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' }
})
</script>