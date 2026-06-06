<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Bell } from 'lucide-vue-next'
import { fetchUnreadCount, markAsRead, fetchNotifications } from '@/api/notifications'
import type { Notification } from '@/api/notifications'

const router = useRouter()
const unreadCount = ref(0)
const showDropdown = ref(false)
const recentNotifications = ref<Notification[]>([])
let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  loadUnreadCount()
  // Poll every 30 seconds
  pollTimer = setInterval(loadUnreadCount, 30000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

async function loadUnreadCount() {
  try {
    const result = await fetchUnreadCount()
    unreadCount.value = result.count
  } catch {
    // ignore
  }
}

async function openDropdown() {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    try {
      const result = await fetchNotifications({ pageSize: 5 })
      recentNotifications.value = result.items
    } catch {
      recentNotifications.value = []
    }
  }
}

function handleClickOutside() {
  showDropdown.value = false
}

async function handleNotificationClick(n: Notification) {
  if (!n.isRead) {
    await markAsRead(n.id)
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }
  showDropdown.value = false

  // Navigate based on module
  if (n.module === 'project' && n.refId) {
    router.push(`/projects/${n.refId}`)
  } else if (n.module === 'procurement') {
    router.push('/procurement')
  } else if (n.module === 'approval') {
    router.push('/approvals')
  } else {
    router.push('/notifications')
  }
}

function goToNotifications() {
  showDropdown.value = false
  router.push('/notifications')
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}
</script>

<template>
  <div class="notification-bell" @click.stop="openDropdown" v-click-outside="handleClickOutside">
    <button class="bell-btn">
      <Bell :size="18" />
      <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>

    <Transition name="dropdown">
      <div v-if="showDropdown" class="notification-dropdown">
        <div class="dropdown-header">
          <span class="dropdown-title">通知</span>
          <button class="view-all-btn" @click.stop="goToNotifications">查看全部</button>
        </div>

        <div class="notification-list">
          <div
            v-for="n in recentNotifications"
            :key="n.id"
            class="notification-item"
            :class="{ unread: !n.isRead }"
            @click.stop="handleNotificationClick(n)"
          >
            <div class="notif-content">
              <span class="notif-title">{{ n.title }}</span>
              <span class="notif-time">{{ formatTime(n.createdAt) }}</span>
            </div>
          </div>
          <div v-if="recentNotifications.length === 0" class="empty-notif">
            暂无通知
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.notification-bell {
  position: relative;
}
.bell-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  transition: all 0.2s;
}
.bell-btn:hover {
  background: var(--hover-bg, rgba(0,0,0,0.05));
  color: var(--text-primary, #111827);
}
.badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #ff3b30;
  color: white;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.notification-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 320px;
  max-height: 400px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
  z-index: 1000;
  overflow: hidden;
}
.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
}
.dropdown-title { font-size: 14px; font-weight: 600; }
.view-all-btn {
  font-size: 12px;
  color: var(--apple-blue, #007aff);
  background: none;
  border: none;
  cursor: pointer;
}
.notification-list { max-height: 340px; overflow-y: auto; }
.notification-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #f9fafb;
}
.notification-item:hover { background: #f9fafb; }
.notification-item.unread { background: rgba(0,122,255,0.04); }
.notif-content { display: flex; flex-direction: column; gap: 2px; }
.notif-title { font-size: 13px; color: var(--text-primary, #111); line-height: 1.4; }
.notif-time { font-size: 11px; color: var(--text-tertiary, #9ca3af); }
.empty-notif { padding: 32px 16px; text-align: center; color: var(--text-tertiary, #9ca3af); font-size: 13px; }
.dropdown-enter-active, .dropdown-leave-active { transition: all 0.2s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
