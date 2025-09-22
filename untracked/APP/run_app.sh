#!/bin/bash

echo "==================================="
echo "BRAIN Expression Template Decoder"
echo "==================================="
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "Error: Python is not installed!"
    echo "Please install Python from https://www.python.org/"
    exit 1
fi

# Use python3 if available, otherwise fall back to python
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
else
    PYTHON_CMD=python
fi

echo "Starting the application..."
echo "The app will automatically install any missing dependencies."
echo

# Run the Flask application
$PYTHON_CMD app.py

# Check if the app exited with an error
if [ $? -ne 0 ]; then
    echo
    echo "Application exited with an error."
    read -p "Press Enter to continue..."
fi 