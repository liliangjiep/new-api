# 启动后端 API（MySQL + 本地 Redis）
# 行内注释1：classpath 由 run-cp.txt 提供（mvn dependency:build-classpath 生成）。
# 行内注释2：环境变量默认值可用外部覆盖 —— 密钥不入仓库。
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$modules = @("api", "common", "domain", "model-adapters")
$cpParts = $modules | ForEach-Object { "$PSScriptRoot\$_\target\classes" }
$deps = (Get-Content "$PSScriptRoot\run-cp.txt" -Raw).Trim()
$cp = ($cpParts -join ";") + ";" + $deps

$env:MYSQL_USER = if ($env:MYSQL_USER) { $env:MYSQL_USER } else { "root" }
$env:MYSQL_PASSWORD = if ($env:MYSQL_PASSWORD) { $env:MYSQL_PASSWORD } else { "root" }
$env:XIN_STORE_TYPE = if ($env:XIN_STORE_TYPE) { $env:XIN_STORE_TYPE } else { "mysql" }
$env:TOAPIS_API_KEY = if ($env:TOAPIS_API_KEY) { $env:TOAPIS_API_KEY } else { "sk-B6XFXOnJ5lLrtgdz9x3Ya9Mu6ktrGwYPWstEXO2btAeAW59J" }

java -cp $cp com.xin.ai.api.ApiApplication
