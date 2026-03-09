@echo off
REM Playwright Python环境安装脚本
REM 解决Windows UNC路径问题

echo ========================================
echo Playwright Python环境安装
echo ========================================
echo.

REM 切换到项目目录
pushd "%~dp0.."
if errorlevel 1 (
    echo [错误] 无法切换到项目目录
    exit /b 1
)

echo [1/5] 检查Python版本...
python --version
if errorlevel 1 (
    echo [错误] Python未安装或不在PATH中
    echo 请先安装Python 3.8+
    popd
    exit /b 1
)

echo.
echo [2/5] 创建Python虚拟环境...
if exist venv (
    echo 虚拟环境已存在，跳过创建
) else (
    python -m venv venv
    if errorlevel 1 (
        echo [错误] 创建虚拟环境失败
        popd
        exit /b 1
    )
    echo 虚拟环境创建成功
)

echo.
echo [3/5] 激活虚拟环境并安装playwright...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [错误] 激活虚拟环境失败
    popd
    exit /b 1
)

pip install --upgrade pip
pip install playwright pytest-playwright
if errorlevel 1 (
    echo [错误] 安装playwright失败
    popd
    exit /b 1
)

echo.
echo [4/5] 安装playwright浏览器...
python -m playwright install chromium
if errorlevel 1 (
    echo [错误] 安装浏览器失败
    popd
    exit /b 1
)

echo.
echo [5/5] 验证安装...
python -m playwright --version
if errorlevel 1 (
    echo [错误] playwright未正确安装
    popd
    exit /b 1
)

echo.
echo ========================================
echo 安装完成！
echo ========================================
echo.
echo 使用方法:
echo   1. 激活虚拟环境: venv\Scripts\activate
echo   2. 运行Python playwright脚本
echo.
echo 注意: Node.js playwright (@playwright/test) 已单独配置
echo       使用 npm run test:e2e 运行Node.js版本的测试
echo.

popd
pause
