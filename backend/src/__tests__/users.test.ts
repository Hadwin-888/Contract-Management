import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import cors from 'cors'
import authRoutes from '../routes/auth.js'
import userRoutes from '../routes/users.js'
import { getDb, closeDb, resetDb } from '../db.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)

let superToken: string
let clerkToken: string
let userId: string

beforeAll(async () => {
  resetDb()
  getDb()

  // Login as admin (super_admin)
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' })
  superToken = adminRes.body.token

  // Register a clerk user
  const clerkRes = await request(app)
    .post('/api/auth/register')
    .send({ username: 'clerkuser3', password: 'test123', name: '文员用户' })
  clerkToken = clerkRes.body.token
})

afterAll(() => {
  closeDb()
})

describe('Users API', () => {
  it('GET /api/users - should list all users (super_admin only)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${superToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(2)
    // Should not expose password_hash
    expect(res.body[0]).not.toHaveProperty('password_hash')
  })

  it('GET /api/users - should reject for non-super_admin', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${clerkToken}`)

    expect(res.status).toBe(403)
  })

  it('GET /api/users/me - should return current user profile', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${clerkToken}`)

    expect(res.status).toBe(200)
    expect(res.body.username).toBe('clerkuser3')
    expect(res.body).not.toHaveProperty('password_hash')
  })

  it('PUT /api/users/me - should update own profile', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({ name: '更新的文员', email: 'clerk@example.com', department: '技术部', departmentCode: 'TECH' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('更新的文员')
    expect(res.body.email).toBe('clerk@example.com')
    expect(res.body.department).toBe('技术部')
    expect(res.body.department_code).toBe('TECH')
  })

  it('PUT /api/users/me/password - should change own password', async () => {
    const res = await request(app)
      .put('/api/users/me/password')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({ currentPassword: 'test123', newPassword: 'newpass123' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')

    // Verify can login with new password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'clerkuser3', password: 'newpass123' })
    expect(loginRes.status).toBe(200)
  })

  it('PUT /api/users/me/password - should reject wrong current password', async () => {
    const res = await request(app)
      .put('/api/users/me/password')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({ currentPassword: 'wrong', newPassword: 'newpass456' })

    expect(res.status).toBe(400)
  })

  it('PUT /api/users/me/password - should reject short password', async () => {
    const res = await request(app)
      .put('/api/users/me/password')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({ currentPassword: 'newpass123', newPassword: '123' })

    expect(res.status).toBe(400)
  })

  it('POST /api/users - should create a new user (super_admin only)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        username: 'newuser',
        password: 'pass123',
        name: '新用户',
        email: 'new@example.com',
        department: '财务部',
        departmentCode: 'FIN',
        role: 'head',
      })

    expect(res.status).toBe(201)
    expect(res.body.username).toBe('newuser')
    expect(res.body.role).toBe('head')
    expect(res.body.department).toBe('财务部')
    userId = res.body.id
  })

  it('POST /api/users - should reject duplicate username', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ username: 'admin', password: 'pass123' })

    expect(res.status).toBe(409)
  })

  it('POST /api/users - should reject empty username/password', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ username: '', password: '' })

    expect(res.status).toBe(400)
  })

  it('POST /api/users - should reject for non-super_admin', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${clerkToken}`)
      .send({ username: 'shouldfail', password: 'pass123' })

    expect(res.status).toBe(403)
  })

  it('GET /api/users/:id - should get user detail (super_admin only)', async () => {
    const res = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${superToken}`)

    expect(res.status).toBe(200)
    expect(res.body.username).toBe('newuser')
  })

  it('GET /api/users/:id - should reject for non-super_admin', async () => {
    const res = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${clerkToken}`)

    expect(res.status).toBe(403)
  })

  it('GET /api/users/:id - should return 404 for non-existent user', async () => {
    const res = await request(app)
      .get('/api/users/non-existent-id')
      .set('Authorization', `Bearer ${superToken}`)

    expect(res.status).toBe(404)
  })

  it('PUT /api/users/:id - should update user (super_admin only)', async () => {
    const res = await request(app)
      .put(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ name: '更新的新用户', role: 'admin' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('更新的新用户')
    expect(res.body.role).toBe('admin')
  })

  it('PUT /api/users/:id - should reject invalid role', async () => {
    const res = await request(app)
      .put(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ role: 'invalid_role' })

    expect(res.status).toBe(200)
    // Role should remain unchanged
    expect(res.body.role).toBe('admin')
  })

  it('PUT /api/users/:id - should return 404 for non-existent user', async () => {
    const res = await request(app)
      .put('/api/users/non-existent-id')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ name: '测试' })

    expect(res.status).toBe(404)
  })

  it('PUT /api/users/:id/password - should reset password (super_admin only)', async () => {
    const res = await request(app)
      .put(`/api/users/${userId}/password`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ newPassword: 'resetpass123' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')

    // Verify can login with new password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'newuser', password: 'resetpass123' })
    expect(loginRes.status).toBe(200)
  })

  it('PUT /api/users/:id/password - should reject short password', async () => {
    const res = await request(app)
      .put(`/api/users/${userId}/password`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ newPassword: '123' })

    expect(res.status).toBe(400)
  })

  it('DELETE /api/users/:id - should delete user (super_admin only)', async () => {
    const res = await request(app)
      .delete(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${superToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')

    // Verify deleted
    const getRes = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${superToken}`)
    expect(getRes.status).toBe(404)
  })

  it('DELETE /api/users/:id - should reject deleting own account', async () => {
    // Get admin user id
    const meRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${superToken}`)
    const adminId = meRes.body.id

    const res = await request(app)
      .delete(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${superToken}`)

    expect(res.status).toBe(400)
  })

  it('DELETE /api/users/:id - should reject for non-super_admin', async () => {
    const res = await request(app)
      .delete('/api/users/some-id')
      .set('Authorization', `Bearer ${clerkToken}`)

    expect(res.status).toBe(403)
  })

  it('GET /api/users/me - should reject without auth', async () => {
    const res = await request(app)
      .get('/api/users/me')

    expect(res.status).toBe(401)
  })
})
