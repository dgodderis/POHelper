@echo off
setlocal

set "APP_DIR=%~dp0.."
pushd "%APP_DIR%"
call ".\.venv\Scripts\python.exe" "desktop.py"
popd

endlocal
