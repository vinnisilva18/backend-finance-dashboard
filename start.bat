@echo off
echo Starting Finance Dashboard Backend...
echo.

echo Stopping any running Node processes...
taskkill /F /IM node.exe 2>nul

echo.
echo Installing dependencies...
call npm install

echo.
echo Starting server...
npm run dev

pause