import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import cors from 'cors'
import authRoutes from '../routes/auth.js'
import contractRoutes from '../routes/contracts.js'
import auditRoutes from '../routes/audit.js'
import { getDb, closeDb, resetDb } from '../db.js'

// Mock AI service
vi.mock('../services/ai.js', () => ({
  runBasicContractChecks: vi.fn().mockReturnValue([
    {
      title: '合同编号缺失',
      severity: 'low',
      source: 'rule',
      evidence: '',
      reason: '未识别到合同编号',
      suggestion: '建议补充合同编号',
      confidence: 1,
      needHumanReview: false,
    },
  ]),
  calculateRiskScore: vi.fn((issues: any[]) => ({
    riskScore: Math.max(0, 100 - issues.length * 3),
    status: 'pass',
    metrics: {
      totalIssues: issues.length,
      highIssues: 0,
      mediumIssues: 1,
      lowIssues: Math.max(0, issues.length - 1),
      needHumanReviewCount: 0,
    },
  })),
  analyzeContract: vi.fn().mockResolvedValue({
    riskScore: 75,
    issuesCount: 2,
    status: 'pass',
    analysis: '测试分析结果',
    suggestions: ['建议1', '建议2'],
    issues: [
      {
        title: '付款条款不明确',
        severity: 'medium',
        source: 'ai',
        evidence: '付款条款原文',
        reason: '付款节点不明确',
        suggestion: '补充付款节点',
        confidence: 0.9,
        needHumanReview: false,
      },
    ],
    metrics: {
      totalIssues: 1,
      highIssues: 0,
      mediumIssues: 1,
      lowIssues: 0,
      needHumanReviewCount: 0,
    },
    needHumanReviewCount: 0,
  }),
  generateSummary: vi.fn().mockResolvedValue('测试合同概况'),
  extractContractInfo: vi.fn().mockResolvedValue({
    name: '测试合同',
    partyA: '甲方',
    partyB: '乙方',
    amount: 100000,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
  }),
}))

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/contracts', contractRoutes)
app.use('/api/audit', auditRoutes)

let token: string
let contractId: string

beforeAll(async () => {
  resetDb()
  getDb()

  // Login
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' })
  token = loginRes.body.token

  // Create a test contract
  const contractRes = await request(app)
    .post('/api/contracts')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: '审核测试合同',
      partyA: '甲方公司',
      partyB: '乙方公司',
      type: '采购',
      status: 'active',
      amount: 300000,
      startDate: '2024-06-01',
      endDate: '2024-12-31',
      riskLevel: 'low',
    })
  contractId = contractRes.body.id
})

afterAll(() => {
  closeDb()
})

describe('Audit API', () => {
  let auditId: string

  it('POST /api/audit/analyze - should trigger AI analysis', async () => {
    const res = await request(app)
      .post('/api/audit/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({ contractId })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('risk_score')
    expect(res.body).toHaveProperty('status')
    expect(res.body).toHaveProperty('analysis')
    expect(res.body).toHaveProperty('suggestions')
    expect(res.body).toHaveProperty('template_content_snapshot')
    expect(res.body).toHaveProperty('extracted_fields')
    expect(res.body).toHaveProperty('rule_issues')
    expect(res.body).toHaveProperty('ai_issues')
    expect(res.body).toHaveProperty('reviewed_issues')
    expect(Array.isArray(res.body.suggestions)).toBe(true)
    expect(Array.isArray(res.body.ai_issues)).toBe(true)
    auditId = res.body.id
  })

  it('POST /api/audit/analyze - should reject without contractId', async () => {
    const res = await request(app)
      .post('/api/audit/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('POST /api/audit/analyze - should reject non-existent contract', async () => {
    const res = await request(app)
      .post('/api/audit/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({ contractId: 'non-existent-id' })

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('GET /api/audit - should list audit records', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
    expect(res.body).toHaveProperty('total')
    expect(res.body.items.length).toBeGreaterThan(0)
    expect(res.body.items[0]).toHaveProperty('contract_name')
  })

  it('GET /api/audit/:id - should get audit detail', async () => {
    const res = await request(app)
      .get(`/api/audit/${auditId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('contract_name')
    expect(res.body).toHaveProperty('analysis')
    expect(res.body).toHaveProperty('reviewed_issues')
    expect(Array.isArray(res.body.reviewed_issues)).toBe(true)
  })

  it('GET /api/audit/:id - should return 404 for non-existent record', async () => {
    const res = await request(app)
      .get('/api/audit/non-existent-id')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })

  it('GET /api/audit - should reject without auth', async () => {
    const res = await request(app)
      .get('/api/audit')

    expect(res.status).toBe(401)
  })

  it('POST /api/audit/analyze - should reject without auth', async () => {
    const res = await request(app)
      .post('/api/audit/analyze')
      .send({ contractId })

    expect(res.status).toBe(401)
  })
})
