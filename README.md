# AI 合同管理平台

基于 Vue 3 + TypeScript + Vite 的 MacOS 风格 AI 合同管理平台，配备 Node.js + Express + SQLite 后端。

## 技术栈

### 前端
- **Vue 3** (Composition API + `<script setup>`)
- **TypeScript**
- **Vite 8**
- **Element Plus** (UI 组件)
- **TailwindCSS 4** (布局)
- **Pinia** (状态管理)
- **Vue Router** (路由)
- **Lucide Vue** (图标)
- **Axios** (HTTP 请求)

### 后端
- **Node.js** + **Express**
- **SQLite** (better-sqlite3)
- **JWT** 认证
- **Multer** 文件上传
- **Anthropic Claude API** (AI 审核)

## 快速开始

### 1. 启动后端

```bash
cd backend
cp .env.example .env    # 编辑 .env 配置 JWT_SECRET 和 ANTHROPIC_API_KEY
npm install
npm run dev             # 启动在 http://localhost:3001
```

默认管理员账号：`admin` / `admin123`

### 2. 启动前端

```bash
# 在项目根目录
npm install
npm run dev             # 启动在 http://localhost:5173
```

### 3. 访问

浏览器打开 http://localhost:5173

## 运行测试

```bash
# 前端测试
npm test

# 后端测试
cd backend && npm test
```

## Docker 部署

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

部署后访问 http://localhost

## 项目结构

```
├── src/                          # 前端源码
│   ├── api/                      # API 服务层
│   │   ├── client.ts             # Axios 实例
│   │   ├── auth.ts               # 认证 API
│   │   ├── contracts.ts          # 合同 API
│   │   ├── dashboard.ts          # 仪表盘 API
│   │   ├── audit.ts              # 审核 API
│   │   └── upload.ts             # 文件上传 API
│   ├── components/
│   │   ├── common/               # 通用组件
│   │   ├── dashboard/            # 仪表盘组件
│   │   ├── layout/               # 布局组件
│   │   └── login/                # 登录组件
│   ├── stores/                   # Pinia 状态管理
│   ├── types/                    # TypeScript 类型定义
│   └── views/                    # 页面
├── backend/                      # 后端源码
│   └── src/
│       ├── routes/               # API 路由
│       │   ├── auth.ts           # 认证路由
│       │   ├── contracts.ts      # 合同 CRUD
│       │   ├── dashboard.ts      # 仪表盘统计
│       │   ├── audit.ts          # AI 审核
│       │   └── upload.ts         # 文件上传
│       ├── middleware/           # 中间件
│       ├── services/             # 业务服务
│       │   └── ai.ts             # Claude API 集成
│       ├── db.ts                 # SQLite 数据库
│       └── index.ts              # Express 入口
├── docker-compose.yml            # Docker 编排
├── Dockerfile                    # 前端 Docker 构建
└── nginx.conf                    # Nginx 配置
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 登录 |
| POST | /api/auth/register | 注册 |
| GET | /api/contracts | 合同列表（分页） |
| GET | /api/contracts/:id | 合同详情 |
| POST | /api/contracts | 创建合同 |
| PUT | /api/contracts/:id | 更新合同 |
| DELETE | /api/contracts/:id | 删除合同 |
| GET | /api/dashboard/stats | 仪表盘统计 |
| GET | /api/audit | 审核记录 |
| GET | /api/audit/:id | 审核详情 |
| POST | /api/audit/analyze | AI 审核分析 |
| POST | /api/upload | 文件上传 |

## 环境变量

### 前端 (.env)
```
VITE_API_BASE_URL=http://localhost:3001/api
```

### 后端 (backend/.env)
```
PORT=3001
JWT_SECRET=your-jwt-secret
DEEPSEEK_API_KEY=your-deepseek-api-key
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:4173
```

**注意**：
- AI 模型配置在系统设置中管理（支持 DeepSeek / Minimax / 通义千问）
- `DEEPSEEK_API_KEY` 等环境变量作为 fallback，优先使用数据库 `ai_config` 表中的配置
- 生产环境必须设置强 `JWT_SECRET`
