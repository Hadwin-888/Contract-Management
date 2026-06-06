import apiClient from './client'

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  content: string
  module: string
  refId: string
  isRead: boolean
  createdAt: string
}

export interface NotificationPreference {
  type: string
  inAppEnabled: boolean
  emailEnabled: boolean
}

export async function fetchNotifications(params: {
  page?: number
  pageSize?: number
  type?: string
  unread?: boolean
} = {}): Promise<{ items: Notification[]; total: number; page: number; pageSize: number }> {
  const response = await apiClient.get('/notifications', { params })
  return response.data
}

export async function fetchUnreadCount(): Promise<{ count: number }> {
  const response = await apiClient.get('/notifications/unread-count')
  return response.data
}

export async function markAsRead(id: string): Promise<void> {
  await apiClient.put(`/notifications/${id}/read`)
}

export async function markAllAsRead(): Promise<void> {
  await apiClient.post('/notifications/read-all')
}

export async function fetchNotificationPreferences(): Promise<NotificationPreference[]> {
  const response = await apiClient.get('/notifications/preferences')
  return response.data
}

export async function updateNotificationPreferences(preferences: NotificationPreference[]): Promise<void> {
  await apiClient.put('/notifications/preferences', { preferences })
}
