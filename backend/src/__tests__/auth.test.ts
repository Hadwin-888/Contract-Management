import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import cors from 'cors'
import authRoutes from '../routes/auth.js'
import { getDb, closeDb, resetDb } from '../db.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/auth', authRoutes)

beforeAll(() => {
  resetDb()
  getDb()
})

afterAll(() => {
  closeDb()
})

describe('Auth API', () => {
  it('POST /api/auth/login - should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body).toHaveProperty('user')
    expect(res.body.user.username).toBe('admin')
  })

  it('POST /api/auth/login - should reject invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('POST /api/auth/login - should reject missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin' })

    expect(res.status).toBe(400)
  })

  it('POST /api/auth/register - should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser2', password: 'test123', name: '测试用户' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user.username).toBe('testuser2')
  })

  it('POST /api/auth/register - should reject duplicate username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'admin', password: 'test123' })

    expect(res.status).toBe(409)
  })
})
