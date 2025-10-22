@echo off
echo Starting Batch Process...
cd /d "e:\Anaconda\envs\wq\Lib\site-packages\cnhkmcp\untracked\APP"
set PYTHONIOENCODING=UTF-8
"E:\Anaconda\python.exe" "e:\Anaconda\envs\wq\Lib\site-packages\cnhkmcp\untracked\APP\batch_runner.py" --username "wenrouaux6@gmail.com" --password "2361945066ak" --batch_name "Batch_2025-10-20_11-22-41" --concurrent 8 --manifest "e:\Anaconda\envs\wq\Lib\site-packages\cnhkmcp\untracked\APP\temp_batch_files\manifest_gyoigise.txt"
echo.
echo Batch process finished. You can close this window.
pause
