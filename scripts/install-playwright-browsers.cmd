@echo off
REM Node.js Playwright浏览器安装脚本
REM 解决Windows UNC路径问题

echo ========================================
echo Playwright浏览器安装 (Node.js)
echo ========================================
echo.

REM 切换到项目目录
pushd "%~dp0.."
if errorlevel 1 (
    echo [错误] 无法切换到项目目录
    exit /b 1
)

echo [1/3] 检查Node.js和npm...
node --version
if errorlevel 1 (
    echo [错误] Node.js未安装
    popd
    exit /b 1
)

npm --version
if errorlevel 1 (
    echo [错误] npm未安装
    popd
    exit /b 1
)

echo.
echo [2/3] 检查@playwright/test是否已安装...
call npm list @playwright/test
if errorlevel 1 (
    echo [警告] @playwright/test未安装，正在安装...
    call npm install --save-dev @playwright/test --legacy-peer-deps
    if errorlevel 1 (
        echo [错误] 安装@playwright/test失败
        popd
        exit /b 1
    )
)

echo.
echo [3/3] 安装Playwright浏览器 (Chromium)...
call npx playwright install chromium
if errorlevel 1 (
    echo [错误] 安装浏览器失败
    echo.
    echo 可能的原因:
    echo   1. 网络连接问题
    echo   2. 磁盘空间不足
    echo   3. 权限问题
    echo.
    echo 解决方案:
    echo   1. 检查网络连接
    echo   2. 使用代理: set HTTPS_PROXY=http://proxy:port
    echo   3. 手动下载: npx playwright install chromium --with-deps
    popd
    exit /b 1
)

echo.
echo ========================================
echo 安装完成！
echo ========================================
echo.
echo 运行测试:
echo   npm run test:e2e          - 运行所有E2E测试
echo   npm run test:e2e:ui       - 使用UI模式运行测试
echo   npx playwright test       - 直接运行playwright
echo   npx playwright show-report - 查看测试报告
echo.

popd
pause
