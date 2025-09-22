#!/bin/bash

echo "==================================="
echo "使用清华大学镜像安装依赖"
echo "Installing dependencies using Tsinghua mirror"
echo "==================================="
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "Error: Python is not installed!"
    echo "错误：未安装Python！"
    echo "Please install Python from https://www.python.org/"
    exit 1
fi

# Use python3 if available, otherwise fall back to python
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
else
    PYTHON_CMD=python
fi

echo "Installing from Tsinghua University mirror..."
echo "正在从清华大学镜像源安装..."
echo

# Install using Tsinghua mirror
$PYTHON_CMD -m pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt

if [ $? -eq 0 ]; then
    echo
    echo "✓ Installation completed successfully!"
    echo "✓ 安装成功完成！"
    echo
    echo "You can now run the application using: ./run_app.sh"
    echo "现在可以使用 ./run_app.sh 运行应用程序"
else
    echo
    echo "Installation failed!"
    echo "安装失败！"
    exit 1
fi 