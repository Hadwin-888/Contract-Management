import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import contractRoutes from './routes/contracts.js';
import dashboardRoutes from './routes/dashboard.js';
import auditRoutes from './routes/audit.js';
import uploadRoutes from './routes/upload.js';
import userRoutes from './routes/users.js';
import templateRoutes from './routes/templates.js';
import aiConfigRoutes from './routes/ai-config.js';
import departmentRoutes from './routes/departments.js';
import storageConfigRoutes from './routes/storage-config.js';
import customRoleRoutes from './routes/custom-roles.js';
import permissionRoutes from './routes/permissions.js';
import approvalFlowRoutes from './routes/approval-flows.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://localhost:5175')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Uploaded files are served via the authenticated /api/upload/file/* route

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/ai-config', aiConfigRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/storage-config', storageConfigRoutes);
app.use('/api/settings/roles', customRoleRoutes);
app.use('/api/settings/permissions', permissionRoutes);
app.use('/api/approvals/flows', approvalFlowRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`🚀 Contract Management API running at http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
});

export default app;
