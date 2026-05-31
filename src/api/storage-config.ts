import apiClient from './client'

export interface StorageConfig {
  contractPath: string
  insurancePath: string
  namingRule: string
}

export async function fetchStorageConfig(): Promise<StorageConfig> {
  const response = await apiClient.get('/storage-config')
  return response.data
}

export async function updateStorageConfig(data: Partial<StorageConfig>): Promise<StorageConfig> {
  const response = await apiClient.put('/storage-config', data)
  return response.data
}
