@echo off
echo ===================================
echo 使用清华大学镜像安装依赖
echo Installing dependencies using Tsinghua mirror
echo ===================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH!
    echo 错误：未安装Python或Python不在PATH中！
    echo Please install Python from https://www.python.org/
    pause
    exit /b 1
)

echo Installing from Tsinghua University mirror...
echo 正在从清华大学镜像源安装...
echo.

REM Install using Tsinghua mirror
python -m pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt

if errorlevel 1 (
    echo.
    echo Installation failed!
    echo 安装失败！
    pause
    exit /b 1
)

echo.
echo ✓ Installation completed successfully!
echo ✓ 安装成功完成！
echo.
echo You can now run the application using: run_app.bat
echo 现在可以使用 run_app.bat 运行应用程序
pause 