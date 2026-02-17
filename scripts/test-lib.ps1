# Vue Lite Layer 库测试脚本 (Windows PowerShell)
# 自动构建、更新、清理缓存、重启服务

Write-Host "🚀 开始测试流程..." -ForegroundColor Cyan

# 1. 停止旧的开发服务器
Write-Host "⏹️  停止旧的开发服务器..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*test-projects*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 2. 构建库
Write-Host "📦 构建库..." -ForegroundColor Yellow
npm run lib:build

# 3. 复制到测试项目
Write-Host "📋 复制文件到测试项目..." -ForegroundColor Yellow
Copy-Item -Path "dist\*" -Destination "test-projects\vue-test\node_modules\vue-lite-layer\dist\" -Recurse -Force
Copy-Item -Path "lib\*" -Destination "test-projects\vue-test\node_modules\vue-lite-layer\lib\" -Recurse -Force

# 4. 清理 Vite 缓存
Write-Host "🧹 清理 Vite 缓存..." -ForegroundColor Yellow
Remove-Item -Path "test-projects\vue-test\node_modules\.vite" -Recurse -Force -ErrorAction SilentlyContinue

# 5. 重启开发服务器
Write-Host "🔄 重启开发服务器..." -ForegroundColor Yellow
Set-Location -Path "test-projects\vue-test"
Start-Job -ScriptBlock { Set-Location "test-projects\vue-test"; pnpm dev --force --port 5173 } | Out-Null

# 6. 等待服务器启动
Write-Host "⏳ 等待服务器启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ 测试环境已就绪！" -ForegroundColor Green
Write-Host "📍 访问: http://localhost:5173/" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 提示: 请在浏览器中按 Ctrl+Shift+R 强制刷新" -ForegroundColor Yellow
