<script setup lang="ts">
defineProps<{
  uploads: { id: string; name: string; uploadTime: string; size: string }[]
}>()
</script>

<template>
  <div class="widget glass-card">
    <div class="widget-header">
      <h3 class="widget-title">最近上传</h3>
    </div>
    <div class="upload-list">
      <div v-for="upload in uploads" :key="upload.id" class="upload-item">
        <div class="upload-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007aff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div class="upload-info">
          <div class="upload-name">{{ upload.name }}</div>
          <div class="upload-meta">
            <span>{{ upload.uploadTime }}</span>
            <span class="meta-dot">·</span>
            <span>{{ upload.size }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.widget {
  padding: 20px;
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.widget-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.upload-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.upload-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.upload-item:last-child {
  border-bottom: none;
}

.upload-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(0, 122, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.upload-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-meta {
  font-size: 11px;
  color: var(--text-secondary);
}

.meta-dot {
  margin: 0 4px;
}
</style>
