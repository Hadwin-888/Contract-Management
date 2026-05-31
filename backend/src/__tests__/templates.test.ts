import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import cors from 'cors'
import authRoutes from '../routes/auth.js'
import templateRoutes from '../routes/templates.js'
import { getDb, closeDb, resetDb } from '../db.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/templates', templateRoutes)

let token: string
let superToken: string

beforeAll(async () => {
  resetDb()
  getDb()

  // Login as admin (super_admin)
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' })
  superToken = adminRes.body.token

  // Register a regular clerk user
  const clerkRes = await request(app)
    .post('/api/auth/register')
    .send({ username: 'clerkuser', password: 'test123', name: '文员用户' })
  token = clerkRes.body.token
})

afterAll(() => {
  closeDb()
})

describe('Templates API', () => {
  it('GET /api/templates - should list templates for super_admin', async () => {
    const res = await request(app)
      .get('/api/templates')
      .set('Authorization', `Bearer ${superToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toHaveProperty('contract_type')
    expect(res.body[0]).toHaveProperty('content')
  })

  it('GET /api/templates - should reject for clerk role', async () => {
    const res = await request(app)
      .get('/api/templates')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
  })

  it('GET /api/templates/:contractType - should get specific template', async () => {
    const res = await request(app)
      .get('/api/templates/采购')
      .set('Authorization', `Bearer ${superToken}`)

    expect(res.status).toBe(200)
    expect(res.body.contract_type).toBe('采购')
    expect(res.body).toHaveProperty('content')
    expect(res.body).toHaveProperty('updated_by_name')
  })

  it('GET /api/templates/:contractType - should return 404 for non-existent type', async () => {
    const res = await request(app)
      .get('/api/templates/不存在的类型')
      .set('Authorization', `Bearer ${superToken}`)

    expect(res.status).toBe(404)
  })

  it('POST /api/templates - should create a new template', async () => {
    const res = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        contractType: '工程',
        name: '工程合同审核规则',
        content: '# 工程合同审核规则\n\n## 1. 工程范围\n- 确认工程范围',
      })

    expect(res.status).toBe(201)
    expect(res.body.contract_type).toBe('工程')
    expect(res.body.version).toBe(1)
  })

  it('POST /api/templates - should reject duplicate contract type', async () => {
    const res = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        contractType: '采购',
        name: '重复的采购模板',
        content: '# 重复内容',
      })

    expect(res.status).toBe(409)
  })

  it('POST /api/templates - should reject empty fields', async () => {
    const res = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ contractType: '', name: '', content: '' })

    expect(res.status).toBe(400)
  })

  it('PUT /api/templates/:contractType - should update template and bump version', async () => {
    const res = await request(app)
      .put('/api/templates/采购')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        name: '采购合同审核规则（更新版）',
        content: '# 更新后的采购合同审核规则',
      })

    expect(res.status).toBe(200)
    expect(res.body.version).toBe(2)
    expect(res.body.name).toBe('采购合同审核规则（更新版）')
  })

  it('PUT /api/templates/:contractType - should return 404 for non-existent type', async () => {
    const res = await request(app)
      .put('/api/templates/不存在的类型')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ name: '测试', content: '测试内容' })

    expect(res.status).toBe(404)
  })

  it('DELETE /api/templates/:contractType - should delete template (super_admin only)', async () => {
    const res = await request(app)
      .delete('/api/templates/工程')
      .set('Authorization', `Bearer ${superToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')

    // Verify deleted
    const getRes = await request(app)
      .get('/api/templates/工程')
      .set('Authorization', `Bearer ${superToken}`)
    expect(getRes.status).toBe(404)
  })

  it('DELETE /api/templates/:contractType - should reject for non-super_admin', async () => {
    // Register an admin user for testing
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({ username: 'adminuser2', password: 'test123', name: '管理员2' })
    const adminToken = adminRes.body.token

    const res = await request(app)
      .delete('/api/templates/采购')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(403)
  })

  it('DELETE /api/templates/:contractType - should return 404 for non-existent type', async () => {
    const res = await request(app)
      .delete('/api/templates/不存在的类型')
      .set('Authorization', `Bearer ${superToken}`)

    expect(res.status).toBe(404)
  })

  it('GET /api/templates - should reject without auth', async () => {
    const res = await request(app)
      .get('/api/templates')

    expect(res.status).toBe(401)
  })
})
