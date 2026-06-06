import apiClient from './client'

export interface ProcurementRequest {
  id: string
  title: string
  description: string
  category: string
  amount: number
  quantity: number
  unit: string
  requesterId: string
  requester?: { id: string; name: string }
  department: string
  status: string
  urgency: string
  reason: string
  supplierId: string
  supplier?: { id: string; name: string; contact?: string; phone?: string }
  approvals?: any[]
  createdAt: string
}

export interface Supplier {
  id: string
  name: string
  code: string
  contact: string
  phone: string
  email: string
  address: string
  category: string
  status: string
  remark: string
  createdAt: string
}

export interface PurchaseOrder {
  id: string
  orderNo: string
  supplierId: string
  supplier?: { id: string; name: string }
  totalAmount: number
  status: string
  remark: string
  procurementRequests?: { id: string; title: string }[]
  createdAt: string
}

export async function fetchProcurementRequests(params: { page?: number; pageSize?: number; status?: string } = {}): Promise<{ items: ProcurementRequest[]; total: number; page: number; pageSize: number }> {
  const response = await apiClient.get('/procurement/requests', { params })
  return response.data
}

export async function fetchProcurementRequest(id: string): Promise<ProcurementRequest> {
  const response = await apiClient.get(`/procurement/requests/${id}`)
  return response.data
}

export async function createProcurementRequest(data: Partial<ProcurementRequest>): Promise<ProcurementRequest> {
  const response = await apiClient.post('/procurement/requests', data)
  return response.data
}

export async function updateProcurementRequest(id: string, data: Partial<ProcurementRequest>): Promise<ProcurementRequest> {
  const response = await apiClient.put(`/procurement/requests/${id}`, data)
  return response.data
}

export async function deleteProcurementRequest(id: string): Promise<void> {
  await apiClient.delete(`/procurement/requests/${id}`)
}

export async function submitProcurementRequest(id: string): Promise<void> {
  await apiClient.post(`/procurement/requests/${id}/submit`)
}

export async function fetchSuppliers(params: { page?: number; pageSize?: number } = {}): Promise<{ items: Supplier[]; total: number; page: number; pageSize: number }> {
  const response = await apiClient.get('/procurement/suppliers', { params })
  return response.data
}

export async function createSupplier(data: Partial<Supplier>): Promise<Supplier> {
  const response = await apiClient.post('/procurement/suppliers', data)
  return response.data
}

export async function updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
  const response = await apiClient.put(`/procurement/suppliers/${id}`, data)
  return response.data
}

export async function deleteSupplier(id: string): Promise<void> {
  await apiClient.delete(`/procurement/suppliers/${id}`)
}

export async function fetchPurchaseOrders(params: { page?: number; pageSize?: number } = {}): Promise<{ items: PurchaseOrder[]; total: number; page: number; pageSize: number }> {
  const response = await apiClient.get('/procurement/purchase-orders', { params })
  return response.data
}

export async function createPurchaseOrder(data: { supplierId: string; totalAmount?: number; remark?: string; requestIds?: string[] }): Promise<PurchaseOrder> {
  const response = await apiClient.post('/procurement/purchase-orders', data)
  return response.data
}

export async function updatePurchaseOrder(id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
  const response = await apiClient.put(`/procurement/purchase-orders/${id}`, data)
  return response.data
}
