import apiClient from './client'

export interface AiConfig {
  model: string
  deepseekApiKey: string
  minimaxApiKey: string
  qwenApiKey: string
}

export async function fetchAiConfig(): Promise<AiConfig> {
  const response = await apiClient.get('/ai-config')
  return response.data
}

export async function updateAiConfig(data: Partial<AiConfig>): Promise<AiConfig> {
  const response = await apiClient.put('/ai-config', data)
  return response.data
}
