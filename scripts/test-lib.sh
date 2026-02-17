#!/bin/bash
# Vue Lite Layer 库测试脚本
# 自动构建、更新、清理缓存、重启服务

set -e

echo "🚀 开始测试流程..."

# 1. 停止旧的开发服务器
echo "⏹️  停止旧的开发服务器..."
pkill -f "vite.*test-projects/vue-test" 2>/dev/null || true
sleep 1

# 2. 构建库
echo "📦 构建库..."
npm run lib:build

# 3. 复制到测试项目
echo "📋 复制文件到测试项目..."
cp -r dist/* test-projects/vue-test/node_modules/vue-lite-layer/dist/
cp -r lib/* test-projects/vue-test/node_modules/vue-lite-layer/lib/

# 4. 清理 Vite 缓存
echo "🧹 清理 Vite 缓存..."
rm -rf test-projects/vue-test/node_modules/.vite

# 5. 重启开发服务器
echo "🔄 重启开发服务器..."
cd test-projects/vue-test
pnpm dev --force --port 5173 &
DEV_PID=$!

# 6. 等待服务器启动
echo "⏳ 等待服务器启动..."
sleep 3

echo ""
echo "✅ 测试环境已就绪！"
echo "📍 访问: http://localhost:5173/"
echo "🔧 Dev Server PID: $DEV_PID"
echo ""
echo "💡 提示: 请在浏览器中按 Ctrl+Shift+R 强制刷新"
