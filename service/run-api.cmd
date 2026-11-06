@echo off
rem Start API server (MySQL + local Redis)
setlocal EnableDelayedExpansion
set CP=api\target\classes;common\target\classes;domain\target\classes;model-adapters\target\classes
for /f "delims=" %%i in ('type run-cp.txt') do set CP=!CP!;%%i
if "%MYSQL_USER%"=="" set MYSQL_USER=root
if "%MYSQL_PASSWORD%"=="" set MYSQL_PASSWORD=root
if "%XIN_STORE_TYPE%"=="" set XIN_STORE_TYPE=mysql
if "%TOAPIS_API_KEY%"=="" set TOAPIS_API_KEY=sk-B6XFXOnJ5lLrtgdz9x3Ya9Mu6ktrGwYPWstEXO2btAeAW59J
java -cp "%CP%" com.xin.ai.api.ApiApplication %*
endlocal
