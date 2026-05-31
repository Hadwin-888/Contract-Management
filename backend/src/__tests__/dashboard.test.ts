import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import cors from 'cors'
import authRoutes from '../routes/auth.js'
import dashboardRoutes from '../routes/dashboard.js'
import contractRoutes from '../routes/contracts.js'
import { getDb, closeDb, resetDb } from '../db.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/contracts', contractRoutes)

let token: string

beforeAll(async () => {
  resetDb()
  getDb()
  // Login
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' })
  token = res.body.token

  // Create a test contract
  await request(app)
    .post('/api/contracts')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Dashboard测试合同',
      partyA: '甲方',
      partyB: '乙方',
      type: '采购',
      status: 'active',
      amount: 100000,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      riskLevel: 'low',
    })
})

afterAll(() => {
  closeDb()
})

describe('Dashboard API', () => {
  it('GET /api/dashboard/stats - should return dashboard stats', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('stats')
    expect(res.body).toHaveProperty('expiringContracts')
    expect(res.body).toHaveProperty('recentUploads')
    expect(res.body).toHaveProperty('auditStatus')

    expect(res.body.stats).toHaveProperty('totalContracts')
    expect(res.body.stats).toHaveProperty('activeContracts')
    expect(res.body.stats.totalContracts).toBeGreaterThan(0)
  })
})
