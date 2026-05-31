import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import cors from 'cors'
import authRoutes from '../routes/auth.js'
import contractRoutes from '../routes/contracts.js'
import { getDb, closeDb } from '../db.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/contracts', contractRoutes)

let token: string

beforeAll(async () => {
  getDb()
  // Login to get token
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' })
  token = res.body.token
})

afterAll(() => {
  closeDb()
})

describe('Contracts API', () => {
  let contractId: string

  it('POST /api/contracts - should create a contract', async () => {
    const res = await request(app)
      .post('/api/contracts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '测试合同',
        partyA: '甲方公司',
        partyB: '乙方公司',
        type: '服务',
        status: 'active',
        amount: 500000,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        riskLevel: 'low',
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.name).toBe('测试合同')
    contractId = res.body.id
  })

  it('GET /api/contracts - should list contracts', async () => {
    const res = await request(app)
      .get('/api/contracts')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
    expect(res.body).toHaveProperty('total')
    expect(res.body.items.length).toBeGreaterThan(0)
  })

  it('GET /api/contracts/:id - should get contract detail', async () => {
    const res = await request(app)
      .get(`/api/contracts/${contractId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('测试合同')
  })

  it('PUT /api/contracts/:id - should update contract', async () => {
    const res = await request(app)
      .put(`/api/contracts/${contractId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '测试合同（已更新）',
        partyA: '甲方公司',
        partyB: '乙方公司',
        type: '服务',
        status: 'active',
        amount: 600000,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        riskLevel: 'medium',
      })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('测试合同（已更新）')
    expect(res.body.amount).toBe(600000)
  })

  it('DELETE /api/contracts/:id - should delete contract', async () => {
    const res = await request(app)
      .delete(`/api/contracts/${contractId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
  })

  it('GET /api/contracts - should reject without auth', async () => {
    const res = await request(app)
      .get('/api/contracts')

    expect(res.status).toBe(401)
  })
})
