@echo off
setlocal EnableDelayedExpansion

set "APP_DIR=%~dp0.."
set "DB_PATH=!APP_DIR:\=/!/po_helper.db"
set "POHELPER_DATABASE_URL=sqlite:///%DB_PATH%"

start "" /d "%APP_DIR%" "%APP_DIR%\.venv\Scripts\pythonw.exe" "%APP_DIR%\desktop.py"

endlocal
