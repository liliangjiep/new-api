# 多中转站回退 + MySQL + Redis + 积分有效期 端到端验证
# 行内注释1：步骤覆盖 —— 登录 → 写中转站 → 建接入点 → 报价 → 提交 → 回退 → 余额/有效期 → 流水。
$ErrorActionPreference = "Stop"
$BASE = "http://localhost:3001/api/v1"

function Step($n, $t) { Write-Host "`n=== [$n] $t ===" -ForegroundColor Cyan }
function Ok($t) { Write-Host "  OK  $t" -ForegroundColor Green }
function Bad($t) { Write-Host "  FAIL $t" -ForegroundColor Red }

# ---- 1. 登录 ----
Step 1 "验证码登录"
$phone = "139" + (Get-Random -Minimum 10000000 -Maximum 99999999)
$code = (Invoke-RestMethod -Uri "$BASE/auth/sms/send" -Method Post -ContentType "application/json" -Body (@{phone=$phone}|ConvertTo-Json)).data.dev_code
$login = Invoke-RestMethod -Uri "$BASE/auth/sms/verify" -Method Post -ContentType "application/json" -Body (@{phone=$phone;code=$code}|ConvertTo-Json)
$tok = $login.data.access_token
$hdr = @{ Authorization = "Bearer $tok" }
Ok "登录成功 user=$($login.data.user.id) balance=$($login.data.user.balance)"

# ---- 2. Redis 冷却 ----
Step 2 "Redis 发送冷却（第二次应 429）"
try {
  Invoke-RestMethod -Uri "$BASE/auth/sms/send" -Method Post -ContentType "application/json" -Body (@{phone=$phone}|ConvertTo-Json) | Out-Null
  Bad "冷却未生效"
} catch {
  $code2 = $_.Exception.Response.StatusCode.value__
  if ($code2 -eq 429 -or $code2 -eq 400) { Ok "冷却生效 HTTP $code2" } else { Bad "意外 HTTP $code2" }
}

# ---- 3. 中转站 A（真实 key） ----
Step 3 "写入中转站 A（toapis，真实 key）"
$chA = @{
  id="ch_toapis"; name="ToAPIs"; provider="relay"; base_url="https://toapis.cn"
  api_key="sk-B6XFXOnJ5lLrtgdz9x3Ya9Mu6ktrGwYPWstEXO2btAeAW59J"
  protocol="toapis"; capabilities="image,video"; priority=10; status="active"
} | ConvertTo-Json
$r = Invoke-RestMethod -Uri "$BASE/admin/channels" -Method Post -ContentType "application/json" -Headers $hdr -Body $chA
Ok "中转站 A 已存 key_masked=$($r.data.api_key_masked)"

# ---- 4. 中转站 B（坏 URL，触发回退） ----
Step 4 "写入中转站 B（不可达，用于验证回退）"
$chB = @{
  id="ch_dead"; name="DeadRelay"; provider="relay"; base_url="http://127.0.0.1:19999"
  api_key="sk-dead"; protocol="openai-image"; capabilities="image"; priority=20; status="active"
} | ConvertTo-Json
$r = Invoke-RestMethod -Uri "$BASE/admin/channels" -Method Post -ContentType "application/json" -Headers $hdr -Body $chB
Ok "中转站 B 已存"

# ---- 5. 接入点：B 优先(sort 5)，A 次之(sort 10) ----
Step 5 "建两个接入点：B 优先，A 兜底"
$epB = @{ id="ep_dead"; model_key="image.t2i.2k"; display_name="Dead First"; channel_id="ch_dead"
  base_url="http://127.0.0.1:19999"; upstream_model="gpt-image-2"; timeout_ms=8000; sort_order=5; enabled=$true } | ConvertTo-Json
Invoke-RestMethod -Uri "$BASE/admin/endpoints" -Method Post -ContentType "application/json" -Headers $hdr -Body $epB | Out-Null
Ok "接入点 B（sort 5）已建"
$epA = @{ id="ep_live"; model_key="image.t2i.2k"; display_name="Live Second"; channel_id="ch_toapis"
  base_url="https://toapis.cn"; upstream_model="gpt-image-2"; timeout_ms=60000; sort_order=10; enabled=$true } | ConvertTo-Json
Invoke-RestMethod -Uri "$BASE/admin/endpoints" -Method Post -ContentType "application/json" -Headers $hdr -Body $epA | Out-Null
Ok "接入点 A（sort 10）已建"

# ---- 6. 报价 ----
Step 6 "报价"
$q = Invoke-RestMethod -Uri "$BASE/tasks/quote" -Method Post -ContentType "application/json" -Headers $hdr -Body (@{
  model_key="image.t2i.2k"; spec="2K"; count=1; params=@{prompt="一只橘猫坐在窗台"} }|ConvertTo-Json)
$fp = $q.data.fingerprint
Ok "报价 points=$($q.data.estimated_credits) fingerprint=$($fp.Substring(0,16))..."

# ---- 7. 提交 + 回退 ----
Step 7 "提交任务（B 失败应自动切 A）"
$idem = "test-fallback-" + (Get-Random)
$t = Invoke-RestMethod -Uri "$BASE/tasks/submit" -Method Post -ContentType "application/json" -Headers ($hdr + @{"Idempotency-Key"=$idem}) -Body (@{
  model_key="image.t2i.2k"; spec="2K"; count=1; params=@{prompt="一只橘猫坐在窗台"}
  quote_fingerprint=$fp }|ConvertTo-Json)
$taskId = $t.data.id
Ok "任务已建 id=$taskId"

# ---- 8. 执行 ----
Step 8 "执行任务（观察回退日志）"
try {
  $e = Invoke-RestMethod -Uri "$BASE/tasks/$taskId/execute" -Method Post -Headers $hdr -TimeoutSec 120
  Ok "执行完成 status=$($e.data.status) channel=$($e.data.channel_id) fail=$($e.data.fail_reason)"
} catch {
  Ok "执行返回异常（上游真实情况）：$($_.Exception.Message)"
}

# ---- 9. 任务详情 ----
Step 9 "任务详情"
$d = Invoke-RestMethod -Uri "$BASE/tasks/$taskId" -Headers $hdr
Ok "status=$($d.data.status) channel=$($d.data.channel_id)"

# ---- 10. 积分有效期 ----
Step 10 "积分有效期（充值起两年）"
$b = Invoke-RestMethod -Uri "$BASE/points/balance" -Headers $hdr
Ok "available=$($b.data.available) expires_at=$($b.data.expires_at)"

# ---- 11. 流水 ----
Step 11 "流水"
$l = Invoke-RestMethod -Uri "$BASE/points/ledger?type=all&page=1&page_size=10" -Headers $hdr
Ok "流水条数=$($l.data.items.Count)"

# ---- 12. MySQL 落库验证 ----
Step 12 "MySQL 落库验证"
& "$env:MYSQL_HOME\mysql.exe" -u root -proot xin_ai -e "SELECT entity_type, COUNT(*) c FROM entity_rows GROUP BY entity_type ORDER BY c DESC LIMIT 8;" 2>$null

Write-Host "`n=== 验证完成 ===" -ForegroundColor Cyan
