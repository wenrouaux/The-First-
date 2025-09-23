@echo off
echo Starting Batch Process...
cd /d "e:\Anaconda\envs\wq\Lib\site-packages\cnhkmcp\untracked\APP"
set PYTHONIOENCODING=UTF-8
"e:\Anaconda\envs\wq\python.exe" "e:\Anaconda\envs\wq\Lib\site-packages\cnhkmcp\untracked\APP\batch_runner.py" --username "wenrouaux6@gmail.com" --password "2361945066ak" --concurrent 5 --manifest "e:\Anaconda\envs\wq\Lib\site-packages\cnhkmcp\untracked\APP\temp_batch_files\manifest_7_ia9yqk.txt"
echo.
echo Batch process finished. You can close this window.
pause
