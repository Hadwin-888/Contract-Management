<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { CheckCheck } from 'lucide-vue-next'
import PageTransition from '@/components/common/PageTransition.vue'
import { fetchNotifications, markAsRead, markAllAsRead, fetchNotificationPreferences, updateNotificationPreferences } from '@/api/notifications'
import type { Notification, NotificationPreference } from '@/api/notifications'

const { t } = useI18n()

const notifications = ref<Notification[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const activeTab = ref<'all' | 'unread'>('all')
const preferences = ref<NotificationPreference[]>([])
const showPrefDialog = ref(false)

const typeLabels: Record<string, string> = {
  assigned: '任务分配',
  comment: '新评论',
  due_reminder: '到期提醒',
  overdue: '逾期提醒',
  dependency_complete: '依赖完成',
  approval: '审批通知',
}

onMounted(async () => {
  await loadNotifications()
})

async function loadNotifications() {
  loading.value = true
  try {
    const result = await fetchNotifications({
      page: page.value,
      pageSize: 20,
      unread: activeTab.value === 'unread',
    })
    notifications.value = result.items
    total.value = result.total
  } catch (error) {
    console.error('Failed to load notifications:', error)
  } finally {
    loading.value = false
  }
}

function switchTab(tab: 'all' | 'unread') {
  activeTab.value = tab
  page.value = 1
  loadNotifications()
}

async function handleMarkAllRead() {
  try {
    await markAllAsRead()
    ElMessage.success('全部已读')
    await loadNotifications()
  } catch {
    ElMessage.error('操作失败')
  }
}

async function handleMarkRead(n: Notification) {
  if (n.isRead) return
  try {
    await markAsRead(n.id)
    n.isRead = true
  } catch {
    // ignore
  }
}

async function openPreferences() {
  try {
    preferences.value = await fetchNotificationPreferences()
    showPrefDialog.value = true
  } catch {
    ElMessage.error('获取通知偏好失败')
  }
}

async function savePreferences() {
  try {
    await updateNotificationPreferences(preferences.value)
    ElMessage.success('通知偏好已更新')
    showPrefDialog.value = false
  } catch {
    ElMessage.error('保存失败')
  }
}

function togglePref(type: string, field: 'inAppEnabled' | 'emailEnabled') {
  const pref = preferences.value.find((p) => p.type === type)
  if (pref) pref[field] = !pref[field]
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<template>
  <PageTransition>
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ t('notification.title') }}</h1>
        </div>
        <div class="header-actions">
          <el-button size="small" @click="openPreferences">
            {{ t('notification.preferences') }}
          </el-button>
          <el-button size="small" @click="handleMarkAllRead">
            <CheckCheck :size="16" />
            {{ t('notification.markAllRead') }}
          </el-button>
        </div>
      </div>

      <div class="tabs">
        <button :class="{ active: activeTab === 'all' }" @click="switchTab('all')">{{ t('notification.all') }}</button>
        <button :class="{ active: activeTab === 'unread' }" @click="switchTab('unread')">{{ t('notification.unread') }}</button>
      </div>

      <div class="notification-list" v-loading="loading">
        <div
          v-for="n in notifications"
          :key="n.id"
          class="notification-item"
          :class="{ unread: !n.isRead }"
          @click="handleMarkRead(n)"
        >
          <div class="notif-dot" v-if="!n.isRead" />
          <div class="notif-body">
            <div class="notif-header">
              <el-tag size="small" round>{{ typeLabels[n.type] || n.type }}</el-tag>
              <span class="notif-time">{{ formatTime(n.createdAt) }}</span>
            </div>
            <div class="notif-title">{{ n.title }}</div>
            <div class="notif-content" v-if="n.content">{{ n.content }}</div>
          </div>
        </div>
        <el-empty v-if="!loading && notifications.length === 0" :description="t('common.noData')" />
      </div>

      <div class="pagination" v-if="total > 20">
        <el-pagination
          v-model:current-page="page"
          :total="total"
          :page-size="20"
          layout="prev, pager, next"
          @current-change="loadNotifications"
        />
      </div>

      <!-- Preferences Dialog -->
      <el-dialog v-model="showPrefDialog" :title="t('notification.preferences')" width="500px">
        <div v-for="pref in preferences" :key="pref.type" class="pref-item">
          <span class="pref-label">{{ typeLabels[pref.type] || pref.type }}</span>
          <div class="pref-toggles">
            <label>
              <el-switch v-model="pref.inAppEnabled" size="small" />
              {{ t('notification.inApp') }}
            </label>
            <label>
              <el-switch v-model="pref.emailEnabled" size="small" />
              {{ t('notification.email') }}
            </label>
          </div>
        </div>
        <template #footer>
          <el-button @click="showPrefDialog = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" @click="savePreferences">{{ t('common.save') }}</el-button>
        </template>
      </el-dialog>
    </div>
  </PageTransition>
</template>

<style scoped>
.page { padding: 0; }
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-title { font-size: 24px; font-weight: 700; margin: 0; }
.header-actions { display: flex; gap: 8px; }
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  background: var(--bg-secondary, #f3f4f6);
  border-radius: 10px;
  padding: 4px;
  width: fit-content;
}
.tabs button {
  padding: 6px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary, #6b7280);
}
.tabs button.active {
  background: white;
  color: var(--text-primary, #111);
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.notification-list { display: flex; flex-direction: column; gap: 4px; }
.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}
.notification-item:hover { background: var(--hover-bg, rgba(0,0,0,0.02)); }
.notification-item.unread { background: rgba(0,122,255,0.04); }
.notif-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--apple-blue, #007aff);
  flex-shrink: 0;
  margin-top: 6px;
}
.notif-body { flex: 1; }
.notif-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.notif-time { font-size: 11px; color: var(--text-tertiary, #9ca3af); }
.notif-title { font-size: 14px; font-weight: 500; color: var(--text-primary, #111); margin-bottom: 2px; }
.notif-content { font-size: 13px; color: var(--text-secondary, #6b7280); }
.pagination { display: flex; justify-content: center; margin-top: 20px; }
.pref-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
}
.pref-label { font-size: 14px; font-weight: 500; }
.pref-toggles { display: flex; gap: 16px; }
.pref-toggles label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); }
</style>
