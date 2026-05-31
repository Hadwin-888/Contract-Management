import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import authRoutes from '../routes/auth.js'
import uploadRoutes from '../routes/upload.js'
import { getDb, closeDb, resetDb } from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '..', '..', 'uploads')

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/upload', uploadRoutes)

let token: string

beforeAll(async () => {
  resetDb()
  getDb()

  // Ensure upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' })
  token = res.body.token
})

afterAll(() => {
  closeDb()
})

describe('Upload API', () => {
  it('POST /api/upload - should upload a txt file', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('测试合同内容'), 'test-contract.txt')

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('url')
    expect(res.body.original_name).toBe('test-contract.txt')
  })

  it('POST /api/upload - should reject without file', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(400)
  })

  it('POST /api/upload - should reject unsupported file type', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake image'), 'test.gif')

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('POST /api/upload - should reject without auth', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('test'), 'test.txt')

    expect(res.status).toBe(401)
  })
})
