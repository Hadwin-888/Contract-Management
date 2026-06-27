import apiClient from './client'

export interface AssetSetting {
  id: string
  category: string
  code: string
  name: string
  description?: string | null
  status: string
  sortOrder: number
  remark?: string | null
}

export interface AssetItem {
  id: string
  itemNo: string
  itemName: string
  itemDec?: string | null
  itemBrand?: string | null
  itemUnit?: string | null
  bsstype?: string | null
  assettype?: string | null
  status: string
  remark?: string | null
  updatedAt: string
  approvalStatus?: string
  approvalStatusLabel?: string
  pendingApprovers?: string[]
  approvalAction?: string | null
  approvalRequestId?: string | null
  approvalSubmitNote?: string | null
  isPendingCreate?: boolean
}

export interface AssetSupplier {
  id: string
  suppliersId: string
  suppliersNameCn: string
  suppliersNameEn?: string | null
  suppliersCity?: string | null
  contactPerson?: string | null
  contactTitle?: string | null
  contactNumber?: string | null
  email?: string | null
  invoiceName?: string | null
  taxId?: string | null
  invoiceAdd?: string | null
  bank?: string | null
  bankAccountNo?: string | null
  status: string
  remark?: string | null
  updatedAt: string
}

export interface AssetPurchaseRequest {
  id: string
  requestNo: string
  title: string
  department?: string | null
  costCenter?: string | null
  status: string
  reason?: string | null
  totalAmount: number
  requester?: { id: string; name: string }
  items: Array<{ id: string; itemId: string; item: AssetItem; supplier?: AssetSupplier | null; quantity: number; unit?: string; unitPrice: number; amount: number }>
  createdAt: string
}

export interface AssetPurchaseOrder {
  id: string
  orderNo: string
  status: string
  totalAmount: number
  supplier: AssetSupplier
  request?: AssetPurchaseRequest | null
  items: Array<{ id: string; item: AssetItem; quantity: number; receivedQty: number; unit?: string; unitPrice: number; amount: number }>
  createdAt: string
}

export interface AssetReceivingRecord {
  id: string
  receiptNo: string
  orderId?: string | null
  warehouse?: string | null
  status: string
  order?: AssetPurchaseOrder | null
  items: Array<{ id: string; item: AssetItem; quantity: number; unit?: string; unitPrice: number; amount: number }>
  createdAt: string
}

export interface InventoryBalance {
  id: string
  warehouse: string
  quantity: number
  item: AssetItem
  updatedAt: string
}

export interface InventoryTransaction {
  id: string
  warehouse: string
  operationType: string
  quantity: number
  unit?: string | null
  item: AssetItem
  createdAt: string
}

function downloadBlob(data: BlobPart, filename: string) {
  const url = URL.createObjectURL(new Blob([data]))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function fetchAssetSettings(category?: string): Promise<AssetSetting[]> {
  const response = await apiClient.get('/assets/settings', { params: { category } })
  return response.data
}

export async function createAssetSetting(data: Partial<AssetSetting>): Promise<AssetSetting> {
  const response = await apiClient.post('/assets/settings', data)
  return response.data
}

export async function updateAssetSetting(id: string, data: Partial<AssetSetting>): Promise<AssetSetting> {
  const response = await apiClient.put(`/assets/settings/${id}`, data)
  return response.data
}

export async function deleteAssetSetting(id: string): Promise<void> {
  await apiClient.delete(`/assets/settings/${id}`)
}

export async function importAssetSettingsCsv(file: File): Promise<{ message: string; count: number }> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post('/assets/settings/import-csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  return response.data
}

export interface AssetItemFilters {
  q?: string
  itemUnit?: string
  bsstype?: string
  assettype?: string
  status?: string
  approvalStatus?: string
}

export async function fetchAssetItems(filters: string | AssetItemFilters = ''): Promise<{ items: AssetItem[]; total: number }> {
  const params = typeof filters === 'string' ? { q: filters } : filters
  const response = await apiClient.get('/assets/items', { params })
  return response.data
}

export async function submitAssetItemChange(data: Partial<AssetItem> & { id?: string; submitNote?: string }): Promise<any> {
  const response = await apiClient.post('/assets/items/change-request', data)
  return response.data
}

export async function setAssetItemStatus(id: string, status: string): Promise<AssetItem> {
  const response = await apiClient.put(`/assets/items/${id}/status`, { status })
  return response.data
}

export async function deleteAssetItem(id: string): Promise<void> {
  await apiClient.delete(`/assets/items/${id}`)
}

export async function importAssetItems(file: File): Promise<{ message: string; count: number }> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post('/assets/items/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  return response.data
}

export async function downloadAssetItemImportTemplate(): Promise<void> {
  const response = await apiClient.get('/assets/items/import-template', { responseType: 'blob' })
  downloadBlob(response.data, '物资新增模板.xlsx')
}

export async function importAssetItemChangeRequests(file: File): Promise<{ message: string; count: number }> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post('/assets/items/import-change-requests', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  return response.data
}

export async function exportAssetItems(filters: AssetItemFilters = {}): Promise<void> {
  const response = await apiClient.get('/assets/items/export', { params: filters, responseType: 'blob' })
  downloadBlob(response.data, '物资品项.xlsx')
}

export async function fetchAssetSuppliers(q = ''): Promise<{ items: AssetSupplier[]; total: number }> {
  const response = await apiClient.get('/assets/suppliers', { params: { q } })
  return response.data
}

export async function submitAssetSupplierChange(data: Partial<AssetSupplier> & { id?: string; submitNote?: string }): Promise<any> {
  const response = await apiClient.post('/assets/suppliers/change-request', data)
  return response.data
}

export async function setAssetSupplierStatus(id: string, status: string): Promise<AssetSupplier> {
  const response = await apiClient.put(`/assets/suppliers/${id}/status`, { status })
  return response.data
}

export async function deleteAssetSupplier(id: string): Promise<void> {
  await apiClient.delete(`/assets/suppliers/${id}`)
}

export async function importAssetSuppliers(file: File): Promise<{ message: string; count: number }> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post('/assets/suppliers/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  return response.data
}

export async function exportAssetSuppliers(): Promise<void> {
  const response = await apiClient.get('/assets/suppliers/export', { responseType: 'blob' })
  downloadBlob(response.data, '供应商资料.xlsx')
}

export async function fetchAssetPurchaseRequests(): Promise<{ items: AssetPurchaseRequest[]; total: number }> {
  const response = await apiClient.get('/assets/purchase-requests')
  return response.data
}

export async function createAssetPurchaseRequest(data: any): Promise<AssetPurchaseRequest> {
  const response = await apiClient.post('/assets/purchase-requests', data)
  return response.data
}

export async function submitAssetPurchaseRequest(id: string, submitNote?: string): Promise<any> {
  const response = await apiClient.post(`/assets/purchase-requests/${id}/submit`, { submitNote })
  return response.data
}

export async function generateAssetPurchaseOrder(id: string, supplierId?: string): Promise<AssetPurchaseOrder> {
  const response = await apiClient.post(`/assets/purchase-requests/${id}/generate-order`, { supplierId })
  return response.data
}

export async function exportAssetPurchaseRequests(): Promise<void> {
  const response = await apiClient.get('/assets/purchase-requests/export', { responseType: 'blob' })
  downloadBlob(response.data, '资产采购申请.xlsx')
}

export async function fetchAssetPurchaseOrders(): Promise<{ items: AssetPurchaseOrder[]; total: number }> {
  const response = await apiClient.get('/assets/purchase-orders')
  return response.data
}

export async function fetchAssetReceivingRecords(): Promise<{ items: AssetReceivingRecord[]; total: number }> {
  const response = await apiClient.get('/assets/receiving')
  return response.data
}

export async function createAssetReceiving(data: any): Promise<AssetReceivingRecord> {
  const response = await apiClient.post('/assets/receiving', data)
  return response.data
}

export async function submitAssetReceiving(id: string, submitNote?: string): Promise<any> {
  const response = await apiClient.post(`/assets/receiving/${id}/submit`, { submitNote })
  return response.data
}

export async function fetchInventoryBalances(): Promise<{ items: InventoryBalance[]; total: number }> {
  const response = await apiClient.get('/assets/inventory/balances')
  return response.data
}

export async function fetchInventoryTransactions(): Promise<{ items: InventoryTransaction[]; total: number }> {
  const response = await apiClient.get('/assets/inventory/transactions')
  return response.data
}
