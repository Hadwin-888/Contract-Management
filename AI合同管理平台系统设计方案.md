# UI_DESIGN_REQUIREMENTS
# MacOS 风格 AI合同管理平台 UI设计规范

---

# UI_DESIGN_TARGET

系统整体UI风格必须采用：

```text
MacOS Modern Style
```

要求：

- 极简
- 高级感
- 毛玻璃效果
- 柔和阴影
- 圆角设计
- 流畅动画
- 干净留白
- 类似 Apple / Linear / Notion 风格

---

# FRONTEND_TECH_REQUIREMENTS

前端必须使用：

| 技术 | 要求 |
|------|------|
| Vue3 | Composition API |
| Vite | 必须 |
| TypeScript | 推荐 |
| Element Plus | 基础组件 |
| TailwindCSS | 页面布局 |
| Pinia | 状态管理 |
| Vue Router | 路由 |
| Framer Motion Vue / Motion | 页面动画 |
| Axios | API请求 |

---

# UI_STYLE_GUIDE

---

# COLOR_STYLE

整体色调：

```text
浅灰 + 白色 + 毛玻璃 + Apple蓝
```

推荐颜色：

| 类型 | 颜色 |
|------|------|
| 主背景 | #f5f5f7 |
| 卡片背景 | rgba(255,255,255,0.72) |
| 主按钮 | #007AFF |
| 边框 | rgba(255,255,255,0.3) |
| 阴影 | rgba(0,0,0,0.08) |
| 字体 | #1d1d1f |

---

# GLASS_EFFECT

必须实现：

```css
backdrop-filter: blur(20px);
```

所有卡片：

- 半透明
- 毛玻璃
- 圆角
- 柔和阴影

---

# BORDER_RADIUS

统一：

```css
border-radius: 20px;
```

按钮：

```css
border-radius: 14px;
```

输入框：

```css
border-radius: 12px;
```

---

# SHADOW_STYLE

统一阴影：

```css
box-shadow:
0 4px 20px rgba(0,0,0,0.08);
```

禁止：

- 过重阴影
- 花哨渐变
- 高饱和颜色

---

# TYPOGRAPHY

字体风格：

```text
Apple San Francisco Style
```

推荐：

```css
font-family:
-apple-system,
BlinkMacSystemFont,
"SF Pro Display",
sans-serif;
```

---

# PAGE_LAYOUT

整体布局：

```text
左侧导航栏
右侧内容区域
```

类似：

- MacOS 设置
- Notion
- Linear

---

# SIDEBAR_STYLE

左侧菜单：

- 半透明毛玻璃
- 图标 + 文字
- hover动画
- 当前菜单高亮
- 宽度 240px

菜单：

```text
首页
合同管理
AI审核
合同提醒
统计分析
系统设置
```

---

# CONTENT_AREA

右侧内容区域：

- 卡片式布局
- 大量留白
- 柔和动画
- 数据卡片风格

---

# TABLE_STYLE

合同列表：

必须：

- 极简表格
- hover高亮
- 圆角表格
- 柔和边框
- MacOS风格分页

禁止：

- 老旧后台风格
- 深色边框
- 密集排版

---

# BUTTON_STYLE

按钮必须：

- 圆角
- 柔和阴影
- hover放大
- 点击缩小动画

动画：

```css
transition: all 0.2s ease;
```

---

# PAGE_ANIMATION

页面切换：

- 淡入
- 上滑
- 缩放

禁止：

- 生硬切换

---

# LOGIN_PAGE_DESIGN

登录页面必须重点设计。

---

# LOGIN_BACKGROUND

背景：

```text
MacOS 风格动态渐变背景
```

推荐：

- 白色
- 浅蓝
- 浅紫
- 毛玻璃

必须：

- 高级感
- 柔和
- 极简

---

# LOGIN_CARD

登录卡片：

```text
Glassmorphism
```

效果：

- 毛玻璃
- 半透明
- 圆角
- 中央居中
- 动态浮动

宽度：

```text
420px
```

---

# LOGIN_CARTOON_CHARACTER

登录页面必须有：

```text
可爱卡通助手
```

风格：

- Apple风
- 卡通
- 可爱
- 动态
- 类似小机器人

推荐：

```text
白色机器人
或者
卡通小狐狸
或者
AI助手形象
```

---

# PASSWORD_INTERACTION

核心动画：

当用户输入密码时：

```text
卡通角色偷偷看密码
```

交互逻辑：

---

## 正常状态

角色：

- 正常看前方
- 眨眼
- 呼吸动画

---

## 用户点击密码框

角色：

- 慢慢转头
- 偷看输入框
- 表情变坏笑

---

## 用户输入密码

角色：

- 用手扒开眼睛偷看
- 眼睛移动
- 表情搞笑

---

## 用户关闭密码输入

角色：

- 恢复正常
- 装作没看到

---

# CHARACTER_ANIMATION

动画必须：

- 流畅
- 60FPS
- CSS动画
- 不允许卡顿

推荐：

```text
Lottie
GSAP
CSS Keyframes
```

---

# LOGIN_PAGE_LAYOUT

```text
┌────────────────────────────┐
│                            │
│       卡通角色              │
│                            │
│      欢迎使用AI合同平台     │
│                            │
│    用户名输入框             │
│    密码输入框               │
│                            │
│       登录按钮              │
│                            │
└────────────────────────────┘
```

---

# LOGIN_EXPERIENCE

必须实现：

- Enter快捷登录
- 登录Loading动画
- 登录失败提示
- 按钮微交互
- 输入框聚焦动画

---

# DASHBOARD_DESIGN

首页Dashboard：

必须：

- 数据统计卡片
- AI风险统计
- 即将到期合同
- 最近上传合同
- AI审核状态

卡片风格：

```text
MacOS Widget Style
```

---

# ICON_STYLE

统一使用：

```text
Lucide Icons
```

禁止：

- 老式后台图标
- 复杂彩色图标

---

# CODE_STYLE_REQUIREMENTS

代码必须：

---

## REQUIREMENT_1

代码必须：

```text
简洁
模块化
高性能
易维护
```

---

## REQUIREMENT_2

禁止：

- 冗余代码
- 重复逻辑
- 大型单文件
- 低效循环

---

## REQUIREMENT_3

必须：

- Composition API
- Hooks风格
- TypeScript类型
- 组件化

---

## REQUIREMENT_4

所有页面：

```text
必须响应式
```

支持：

- PC
- MacBook
- iPad

---

# PERFORMANCE_REQUIREMENTS

系统必须：

- 页面秒开
- 动画流畅
- 内存占用低
- API响应快

---

# FILE_UPLOAD_UI

上传界面：

```text
MacOS Finder 风格
```

支持：

- 拖拽上传
- 文件预览
- 上传动画

---

# FUTURE_UI_EXPANSION

未来支持：

- Dark Mode
- MacOS Dock效果
- AI聊天助手
- 全局搜索
- 多窗口布局

---

# FINAL_UI_GOAL

最终UI目标：

```text
像 Apple 官方系统一样高级
像 Linear 一样简洁
像 Notion 一样舒服
像 MacOS 一样流畅
```

并且：

```text
让用户感觉：
这不是传统后台系统，
而是一个真正现代化的AI产品。
```