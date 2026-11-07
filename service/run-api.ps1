# 启动后端 API（MySQL + 本地 Redis）
# 行内注释1：classpath 由 run-cp.txt 提供（mvn dependency:build-classpath 生成）。
# 行内注释2：环境变量默认值可用外部覆盖 —— 密钥不入仓库。
# 行内注释3：本文件必须存成 UTF-8 with BOM。
#             PowerShell 5.1 读无 BOM 的 .ps1 会按系统 ANSI（GBK）解码，
#             中文注释的 UTF-8 字节序列可能把后面的换行吃掉 ——
#             表现为「中文注释和下一行代码粘在一起」，那行代码就被当成注释的一部分，
#             变量赋值静默失效（本地踩过一次：$env:XIN_ADMIN_PHONES 没设上，后台接口全 403）。
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
$env:XIN_ADMIN_PHONES = if ($env:XIN_ADMIN_PHONES) { $env:XIN_ADMIN_PHONES } else { "13800000000" }

java -cp $cp com.xin.ai.api.ApiApplication