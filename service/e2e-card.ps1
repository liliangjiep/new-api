# 充值卡兑换闭环验证（独立脚本）
# 行内注释1：验证新补齐的链路 —— 后台制卡（带面额）→ 用户兑换入账 → 重复兑换被拒 → 账目平衡。
# 行内注释2：短信有 60 秒冷却 —— 管理员手机号被上一轮占用时要等，所以这里做重试。
$ErrorActionPreference = "Continue"
$BASE = "http://localhost:3001/api/v1"
$LOG  = "d:\code\xin-ai\.recon\e2e-card-out.txt"
if (Test-Path $LOG) { Remove-Item $LOG -Force }
function W($s) { Add-Content -Path $LOG -Value ([string]$s) -Encoding UTF8 }
function J($m,$u,$b,$h) {
  $p = @{ Uri = "$BASE$u"; Method = $m; TimeoutSec = 60 }
  if ($null -ne $b) { $p.ContentType = "application/json; charset=utf-8"; $p.Body = (ConvertTo-Json -InputObject $b -Depth 12 -Compress) }
  if ($h) { $p.Headers = $h }
  try { Invoke-RestMethod @p } catch {
    $msg = "HTTP-ERR $m $u -> $($_.Exception.Message)"
    if ($_.ErrorDetails) { $msg += " | " + $_.ErrorDetails.Message }
    W $msg; $null
  }
}
$pass = 0; $fail = 0
function Chk($tag, $r) {
  if ($null -eq $r) { $script:fail++; W ("FAIL  $tag -> null/错误"); return $null }
  $code = $r.code
  if ($code -eq 0 -or $code -eq $null) { $script:pass++; W ("OK    $tag") }
  else { $script:fail++; W ("FAIL  $tag  code=$code msg=$($r.message)") }
  return $r.data
}
function ChkDeny($tag, $r) {
  if ($null -eq $r) { $script:pass++; W ("OK    $tag -> 被拒"); return }
  $code = $r.code
  if ($code -ne 0 -and $code -ne $null) { $script:pass++; W ("OK    $tag  code=$code 被正确拒绝") }
  else { $script:fail++; W ("FAIL  $tag 竟然通过！") }
}

# ---------- 1. 登录两个用户 ----------
function Login($p) {
  for ($i = 0; $i -lt 4; $i++) {
    $s = J "POST" "/auth/sms/send" @{ phone = $p } $null
    if ($s -and $s.data.dev_code) {
      $v = J "POST" "/auth/sms/verify" @{ phone = $p; code = $s.data.dev_code } $null
      if ($v -and $v.data.access_token) { return $v.data }
    }
    W "  登录重试 $i（冷却/限流）"
    Start-Sleep -Seconds 20
  }
  return $null
}
$phone = "134" + (Get-Random -Minimum 10000000 -Maximum 99999999).ToString()
$u = Login $phone
if (-not $u) { W "!! 用户登录失败"; exit 1 }
$H = @{ Authorization = "Bearer $($u.access_token)" }

$admin = Login "13800000000"
if (-not $admin) { W "!! 管理员登录失败"; exit 1 }
$AH = @{ Authorization = "Bearer $($admin.access_token)" }

# ---------- 2. 初始余额 ----------
$b0 = Chk "初始余额" (J "GET" "/points/balance" $null $H)
W "  初始可用=$($b0.available)"

# ---------- 3. 后台制卡（面额 500 积分） ----------
$cards = Chk "后台制卡(500积分)" (J "POST" "/admin/invite-codes/generate" @{ count = 2; points = 500 } $AH)
if (-not $cards -or $cards.Count -lt 1) { W "!! 制卡失败"; exit 1 }
$code = $cards[0].code
W "  卡号=$code 面额=$($cards[0].points)"

$list = Chk "卡列表" (J "GET" "/admin/invite-codes" $null $AH)
$row = $list | Where-Object { $_.code -eq $code }
if ($row.points -eq 500) { $script:pass++; W "OK    卡列表面额=500" } else { $script:fail++; W "FAIL  卡列表面额异常：$($row.points)" }

# ---------- 4. 用户兑换 ----------
$before = (J "GET" "/points/balance" $null $H).data.available
$red = Chk "用户兑换充值卡" (J "POST" "/recharge-cards/redeem" @{ code = $code } $H)
$after = (J "GET" "/points/balance" $null $H).data.available
W "  兑换前=$before 兑换后=$after 到账=$($red.points)"
if ($after -eq $before + 500) { $script:pass++; W "OK    余额增加 500（账目平衡）" }
else { $script:fail++; W "FAIL  余额不对：$before -> $after" }

# ---------- 5. 重复兑换必须被拒（防造分） ----------
ChkDeny "重复兑换被拒" (J "POST" "/recharge-cards/redeem" @{ code = $code } $H)
$after2 = (J "GET" "/points/balance" $null $H).data.available
if ($after2 -eq $after) { $script:pass++; W "OK    重复兑换未加积分（无造分）" }
else { $script:fail++; W "FAIL  重复兑换后余额变了：$after -> $after2" }

# ---------- 6. 不存在的卡 / 空卡号 ----------
ChkDeny "不存在的卡被拒" (J "POST" "/recharge-cards/redeem" @{ code = "XIN-XXXX-YY" } $H)
ChkDeny "空卡号被拒" (J "POST" "/recharge-cards/redeem" @{ code = "  " } $H)

# ---------- 7. 大小写不敏感 ----------
$cards2 = Chk "再制卡" (J "POST" "/admin/invite-codes/generate" @{ count = 1; points = 100 } $AH)
$code2 = $cards2[0].code
Chk "小写卡号可兑换" (J "POST" "/recharge-cards/redeem" @{ code = $code2.ToLower() } $H)

# ---------- 8. 流水里能看到充值卡入账 ----------
# 行内注释8.1：不用中文 note 做断言 —— PowerShell 5.1 按 GBK 解码响应会乱码。
#             改用 order_no（卡号）匹配，这是不受编码影响的稳定字段。
$led = Chk "积分流水" (J "GET" "/points/ledger?page=1&pageSize=50" $null $H)
$rows = @($led.data)
$hit = $rows | Where-Object { $_.order_no -eq $code }
if ($hit) { $script:pass++; W "OK    流水中存在充值卡入账记录（order_no=$code 金额=$($hit.amount)）" }
else {
  $script:fail++
  W "FAIL  流水中没有充值卡入账记录（流水条数=$($rows.Count)）"
  foreach ($x in $rows) { W "    ledger: type=$($x.type) amount=$($x.amount) order_no=$($x.order_no)" }
}

# ---------- 9. 后台改价后公开表与建单同步 ----------
$null = Chk "后台改套餐价格" (J "POST" "/admin/packages" @{ code = "trial"; name = "体验包"; amount = 188; credits = 200; enabled = $true } $AH)
$pkgs2 = Chk "改价后公开套餐" (J "GET" "/recharge/packages" $null $null)
$trial = $pkgs2 | Where-Object { $_.code -eq "trial" }
if ($trial.amount -eq 188) { $script:pass++; W "OK    后台改价已同步到公开表（188）" }
else { $script:fail++; W "FAIL  公开表金额没同步：$($trial.amount)" }

$order = Chk "按新价建单" (J "POST" "/recharge/orders" @{ package_code = "trial"; pay_method = "wechat" } $H)
if ($order.amount -eq 188) { $script:pass++; W "OK    建单金额=188（与后台一致）" }
else { $script:fail++; W "FAIL  建单金额错：$($order.amount)" }

# ---------- 10. 停用套餐不可下单 ----------
$null = J "POST" "/admin/packages" @{ code = "trial"; name = "体验包"; amount = 99; credits = 100; enabled = $false } $AH
ChkDeny "已下架套餐建单被拒" (J "POST" "/recharge/orders" @{ package_code = "trial"; pay_method = "wechat" } $H)
$null = J "POST" "/admin/packages" @{ code = "trial"; name = "体验包"; amount = 99; credits = 100; enabled = $true } $AH

# ---------- 11. refresh_token 轮换 ----------
$rt = $u.refresh_token
if ($rt) {
  $nr = Chk "refresh 换新 token" (J "POST" "/auth/refresh" @{ refresh_token = $rt } $null)
  if ($nr.access_token -and $nr.refresh_token -and $nr.refresh_token -ne $rt) {
    $script:pass++; W "OK    refresh 轮换成功（新旧 refresh 不同）"
  } else { $script:fail++; W "FAIL  refresh 轮换异常" }
  ChkDeny "旧 refresh 再用被拒" (J "POST" "/auth/refresh" @{ refresh_token = $rt } $null)
} else {
  $script:fail++; W "FAIL  登录响应里没有 refresh_token"
}

W ""
W "通过=$pass 失败=$fail"
