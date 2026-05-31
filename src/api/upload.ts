import apiClient from './client'

export interface UploadResponse {
  id: string
  contract_id: string | null
  filename: string
  original_name: string
  size: number
  mime_type: string
  url: string
  uploaded_at: string
}

export async function uploadFile(file: File, contractId?: string, field?: string): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  if (contractId) {
    formData.append('contractId', contractId)
  }
  if (field) {
    formData.append('field', field)
  }

  const response = await apiClient.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  return response.data
}
