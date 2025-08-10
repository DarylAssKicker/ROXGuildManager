# ROX公会管理器

一个基于React和Node.js的公会管理Web应用，支持截图识别和公会成员管理。

## 功能特性

### 🎯 核心功能
- **公会成员管理**: 添加、编辑、删除公会成员信息
- **截图识别**: 使用Tesseract OCR识别游戏截图中的公会成员信息
- **智能数据处理**: 自动解析识别结果并转换为结构化数据
- **数据导出**: 支持JSON格式导出识别结果

### 🔍 截图识别功能
- **多模式识别**: 
  - 普通模式：显示完整的OCR识别结果
  - 公会成员模式：自动处理为公会成员数据结构
- **智能解析**: 自动识别姓名、等级、角色、贡献度等信息
- **表格识别**: 支持识别表格格式的公会成员列表
- **实时状态**: 显示OCR服务状态和识别进度

### 🎨 用户界面
- **现代化设计**: 基于Ant Design的响应式界面
- **直观操作**: 拖拽上传、一键识别、实时预览
- **多标签展示**: 识别结果、原始文本、JSON输出分标签显示
- **状态指示**: 实时显示OCR服务状态和识别结果

## 技术栈

### 前端 (Client)
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全
- **Ant Design** - UI组件库
- **Vite** - 构建工具
- **Axios** - HTTP客户端

### 后端 (Server)
- **Node.js** - 运行环境
- **Express.js** - Web框架
- **TypeScript** - 类型安全
- **Tesseract.js** - OCR文字识别
- **Sharp** - 图像处理
- **Multer** - 文件上传处理

## 快速开始

### 环境要求
- Node.js 16+
- npm 或 yarn

### 安装依赖
```bash
# 安装根目录依赖
npm install

# 安装客户端依赖
cd client && npm install

# 安装服务器依赖
cd server && npm install
```

### 启动应用

#### 方法1: 使用简化启动脚本 (推荐)
```bash
# Windows
.\start-simple.bat

# Linux/Mac
./start.sh
```

#### 方法2: 分别启动
```bash
# 启动服务器 (端口3001)
cd server && npm run dev

# 启动客户端 (端口3000)
cd client && npm run dev
```

### 访问应用
- 客户端: http://localhost:3000
- 服务器API: http://localhost:3001

### 部署应用
```bash
docker-build-start.sh
```

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目！