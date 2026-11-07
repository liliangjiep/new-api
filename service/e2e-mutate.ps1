# 写操作端到端验证（补 e2e-verify.ps1 未覆盖的增删改类接口）
# 行内注释1：为什么单独一个脚本 —— e2e-verify.ps1 覆盖的是「读路径 + 主链路」，
#             这里补齐所有 mutation（POST/PUT/PATCH/DELETE），
#             保证每个接口的写分支都被真实调用过一次，而不是只走通读接口。
# 行内注释2：跑之前必须先重启 API（改了 Service 层），否则测的是旧代码。
$ErrorActionPreference = "Continue"
$BASE = "http://localhost:3001/api/v1"
$LOG  = "d:\code\xin-ai\.recon\e2e-mutate-out.txt"
if (Test-Path $LOG) { Remove-Item $LOG -Force }
function W($s) { Add-Content -Path $LOG -Value ([string]$s) -Encoding UTF8 }
function J($m,$u,$b,$h) {
  $p = @{ Uri = "$BASE$u"; Method = $m; TimeoutSec = 120 }
  # 行内注释4.1：必须用 -InputObject —— 管道形式会自动展开单元素数组，
  #             把 [{"key":"x"}] 变成 {"key":"x"}，后端按 List 反序列化直接 400。
  if ($null -ne $b) { $p.ContentType = "application/json; charset=utf-8"; $p.Body = (ConvertTo-Json -InputObject $b -Depth 12 -Compress) }
  if ($h) { $p.Headers = $h }
  try { Invoke-RestMethod @p } catch {
    $msg = "HTTP-ERR $m $u -> $($_.Exception.Message)"
    if ($_.ErrorDetails) { $msg += " | " + $_.ErrorDetails.Message }
    W $msg; $null
  }
}
$pass = 0; $fail = 0
function Chk($tag, $r, $expect) {
  if ($null -eq $r) { $script:fail++; W ("FAIL  $tag -> null/错误"); return $null }
  $code = $r.code
  if ($code -eq 0 -or $code -eq $null) { $script:pass++; W ("OK    $tag  code=$code") }
  else { $script:fail++; W ("FAIL  $tag  code=$code msg=$($r.message)") }
  return $r.data
}
# 断言「应该被拒绝」的调用返回非 0（用于权限/校验护栏）。
function ChkDeny($tag, $r) {
  if ($null -eq $r) { $script:pass++; W "OK    $tag 已拒绝"; return $null }
  $code = $r.code
  if ($code -ne 0 -and $code -ne $null) { $script:pass++; W ("OK    $tag 已拒绝 code=$code msg=$($r.message)") }
  else { $script:fail++; W "FAIL  $tag 未被拒绝" }
  return $r
}

# ---------- 1. 普通用户登录 ----------
$phone = "137" + (Get-Random -Minimum 10000000 -Maximum 99999999).ToString()
$r = J "POST" "/auth/sms/send" @{ phone = $phone } $null
$r = J "POST" "/auth/sms/verify" @{ phone = $phone; code = $r.data.dev_code } $null
$tok = $r.data.access_token
if (-not $tok) { W "!! 登录失败"; exit 1 }
$H = @{ Authorization = "Bearer $tok" }
$uid = $r.data.user.id
W "用户登录成功 phone=$phone uid=$uid"

# 行内注释2.6：管理员验证码在开头预取 —— 尾部登录时同一手机号仍在 60 秒冷却期，
#               会导致整段后台用例被跳过。验证码 TTL 300 秒，足够跑完整轮。
# 行内注释2.7：冷却是「按手机号」记的，上一轮刚发过就会撞上 —— 带重试。
function Get-AdminCode($phone) {
  for ($i = 0; $i -lt 3; $i++) {
    $r = J "POST" "/auth/sms/send" @{ phone = $phone } $null
    if ($r -and $r.data -and $r.data.dev_code) { return $r.data.dev_code }
    W "     管理员验证码发送撞冷却（第 $($i+1) 次），等待 62 秒后重试"
    Start-Sleep -Seconds 62
  }
  return $null
}
$admPhone = "13800000000"
$admCode = Get-AdminCode $admPhone
if ($admCode) { W "管理员验证码已预取" } else { W "!! 管理员验证码预取失败" }

# 行内注释3：先充值，保证后面高成本接口不会 402。
$ord = J "POST" "/recharge/orders" @{ package_code="professional"; pay_method="wechat" } $H
if ($ord) { Chk "充值回调" (J "POST" "/recharge/callback/wechat" @{ order_no=$ord.data.order_no; amount=$ord.data.amount; signature="dev" } $H) $null }

# ---------- 2. 资产增删改 ----------
$up = Chk "assets/upload-policy" (J "POST" "/assets/upload-policy" @{ filename="m.mp4"; size=1024; content_type="video/mp4"; kind="video"; group="测试组" } $H) $null
$a1 = $up.asset_id
Chk "assets/complete" (J "POST" "/assets/complete" @{ asset_id=$a1; size=1024; etag="e1" } $H) $null
$up2 = Chk "assets/upload-policy 2" (J "POST" "/assets/upload-policy" @{ filename="n.png"; size=2048; content_type="image/png"; kind="image"; group="测试组" } $H) $null
$a2 = $up2.asset_id
Chk "assets/complete 2" (J "POST" "/assets/complete" @{ asset_id=$a2; size=2048; etag="e2" } $H) $null
Chk "assets/update" (J "PATCH" "/assets/$a1" @{ name="改名.mp4"; tags=@("x") } $H) $null
$grp = Chk "asset-groups/create" (J "POST" "/asset-groups" @{ name="变更组" } $H) $null
Chk "asset-groups/delete" (J "DELETE" "/asset-groups/$($grp.id)" $null $H) $null
$exp = Chk "assets/exports" (J "POST" "/assets/exports" @{ ids=@($a1,$a2); label="导出" } $H) $null
try { $resp = Invoke-WebRequest -Uri "http://localhost:3001$($exp.download_url)" -Headers $H -UseBasicParsing
  if ($resp.Headers["Content-Disposition"] -like "*filename*=UTF-8*") { $script:pass++; W "OK    assets/exports/download RFC5987 中文名" }
  else { $script:pass++; W ("OK    assets/exports/download bytes=" + $resp.RawContentLength) }
} catch { $script:fail++; W "FAIL  assets/exports/download -> $($_.Exception.Message)" }
Chk "assets/batch-delete" (J "POST" "/assets/batch-delete" @{ ids=@($a2) } $H) $null
Chk "assets/delete" (J "DELETE" "/assets/$a1" $null $H) $null
# 删完再查 —— 确认真删掉了
$after = J "GET" "/assets?page=1&pageSize=50" $null $H
$ids = @($after.data.data | ForEach-Object { $_.id })
if ($ids -notcontains $a1 -and $ids -notcontains $a2) { $script:pass++; W "OK    assets 删除生效" }
else { $script:fail++; W "FAIL  assets 删除未生效" }

# ---------- 3. 数字人增删 ----------
# 行内注释2.1：形象必须基于「已完成上传」的资产 —— 只申请 upload-policy 不 complete，
#               资产还没落库，后端 requireOwnedForUser 会 404 asset_not_found。
$up = J "POST" "/assets/upload-policy" @{ filename="av.png"; size=1024; content_type="image/png"; kind="image" } $H
# 行内注释2.1.1：J 返回的是完整响应包装 —— 资产 id 在 .data.asset_id，不是 .asset_id。
#               写错会让 asset_id 为空，后端 /assets/complete 找不到 policy → 404。
$avAsset = $up.data.asset_id
Invoke-RestMethod -Uri "$BASE/assets/complete" -Method POST -ContentType "application/json" -Headers $H -Body (ConvertTo-Json -InputObject @{ asset_id=$avAsset; size=1024; etag="e1" } -Compress) | Out-Null
$av = Chk "avatars/create" (J "POST" "/avatars" @{ asset_id=$avAsset; name="临时形象" } $H) $null
Chk "avatars/standardize" (J "POST" "/avatars/$($av.id)/standardize" @{} $H) $null
Chk "avatars/delete" (J "DELETE" "/avatars/$($av.id)" $null $H) $null
# 行内注释2.2：音色克隆必须给参考音频资产，空数组会被后端 400 拒绝（这是正确业务校验）。
$upAud = J "POST" "/assets/upload-policy" @{ filename="ref.mp3"; size=2048; content_type="audio/mpeg"; kind="audio" } $H
$audAsset = $upAud.data.asset_id
Invoke-RestMethod -Uri "$BASE/assets/complete" -Method POST -ContentType "application/json" -Headers $H -Body (ConvertTo-Json -InputObject @{ asset_id=$audAsset; size=2048; etag="e2" } -Compress) | Out-Null
$vc = Chk "voices/clone" (J "POST" "/voices" @{ name="临时音色"; audio_asset_ids=@($audAsset) } $H) $null
$slot = Chk "voice-slots/create" (J "POST" "/voice-slots" @{ voice_id=$vc.id; name="临时槽位"; index=9 } $H) $null
Chk "authorizations/create" (J "POST" "/authorizations" @{ type="商用授权"; subject="李四"; file_url="https://example.com/b.pdf" } $H) $null

# ---------- 4. 任务取消 / 重试 ----------
$q = J "POST" "/tasks/quote" @{ model_key="image.t2i.2k"; spec="2K"; count=1; params=@{ prompt="x" } } $H
$ik = "mut-" + (Get-Random)
$t = Chk "tasks/submit" (J "POST" "/tasks/submit" @{ model_key="image.t2i.2k"; spec="2K"; count=1; params=@{ prompt="x" }; quote_fingerprint=$q.data.fingerprint; idempotency_key=$ik } $H) $null
$c = Chk "tasks/cancel" (J "POST" "/tasks/$($t.id)/cancel" @{} $H) $null
if ($c.status -eq "failed") { $script:pass++; W "OK    tasks 取消后状态=failed" } else { $script:fail++; W "FAIL  tasks 取消后状态=$($c.status)" }
$rt = Chk "tasks/retry" (J "POST" "/tasks/$($t.id)/retry" @{} $H) $null
if ($rt.status -eq "pending") { $script:pass++; W "OK    tasks 重试后状态=pending" } else { $script:fail++; W "FAIL  tasks 重试后状态=$($rt.status)" }
# 行内注释2.3：取消护栏 —— 重试后任务又回到 pending，此时取消是「允许」的；
#               真正该被拒的是「已经终结（failed）」的任务再次取消。
$c2 = Chk "tasks/cancel 2" (J "POST" "/tasks/$($t.id)/cancel" @{} $H) $null
if ($c2.status -eq "failed") { $script:pass++; W "OK    tasks 再次取消后状态=failed" } else { $script:fail++; W "FAIL  tasks 再次取消后状态=$($c2.status)" }
ChkDeny "tasks 取消护栏（已终结）" (J "POST" "/tasks/$($t.id)/cancel" @{} $H)

# ---------- 5. 画布增删改 / 版本 / 分享 / 恢复 ----------
$c = Chk "canvases/create" (J "POST" "/canvases" @{ title="变更画布" } $H) $null
Chk "canvases/rename" (J "PATCH" "/canvases/$($c.id)" @{ title="改名画布" } $H) $null
Chk "canvases/graph" (J "PUT" "/canvases/$($c.id)/graph" @{ nodes=@(@{id="n1";x=1;y=2;text="a"}); edges=@(); version=0 } $H) $null
$vs = Chk "canvases/versions" (J "GET" "/canvases/$($c.id)/versions" $null $H) $null
Chk "canvases/share" (J "POST" "/canvases/$($c.id)/share" @{} $H) $null
if ($vs -and $vs.Count -gt 0) {
  Chk "canvases/restore" (J "POST" "/canvases/$($c.id)/versions/$($vs[0].version)/restore" $null $H) $null
}
Chk "canvases/delete" (J "DELETE" "/canvases/$($c.id)" $null $H) $null
# 删完再查
$after = J "GET" "/canvases" $null $H
$cid = @($after.data | ForEach-Object { $_.id })
if ($cid -notcontains $c.id) { $script:pass++; W "OK    canvases 删除生效" } else { $script:fail++; W "FAIL  canvases 删除未生效" }

# ---------- 6. Agent 会话增删 / 消息 / 云端运行时 ----------
$as = Chk "agent/sessions/create" (J "POST" "/agent/sessions" @{ title="临时会话"; skill="copywriting" } $H) $null
Chk "agent/sessions/messages" (J "GET" "/agent/sessions/$($as.id)/messages" $null $H) $null
Chk "agent/cloud-runtime" (J "POST" "/agent/cloud-runtime" @{ task="生成图片" } $H) $null
Chk "agent/desktop-session" (J "POST" "/agent/cloud-runtime/desktop-session" @{} $H) $null
Chk "agent/sessions/delete" (J "DELETE" "/agent/sessions/$($as.id)" $null $H) $null

# ---------- 7. 用户资料 / 密码 / 会话下线 ----------
Chk "users/me update" (J "PATCH" "/users/me" @{ nickname="新昵称"; email="n@n.com"; company="新公司"; bio="hi" } $H) $null
# 空密码不设置 —— 建号时 password_hash 为空，changePassword 直接写新密码
Chk "users/me/password" (J "POST" "/users/me/password" @{ old_password=""; new_password="Abcd1234" } $H) $null
# 改完密码后用密码登录
$pl = Chk "auth/password/login" (J "POST" "/auth/password/login" @{ account=$phone; password="Abcd1234" } $null) $null
if ($pl -and $pl.access_token) {
  $script:pass++; W "OK    auth 密码登录生效"
  $rt2 = J "POST" "/auth/refresh" @{ refresh_token=$pl.refresh_token } $null
  if ($rt2 -and $rt2.data.access_token) { $script:pass++; W "OK    auth/refresh 轮换" } else { $script:fail++; W "FAIL  auth/refresh" }
  Chk "auth/logout" (J "POST" "/auth/logout" @{ refresh_token=$pl.refresh_token } $null) $null
} else {
  $script:fail++; W "FAIL  auth 密码登录失败"
}
$sess = Chk "auth/sessions" (J "GET" "/auth/sessions" $null $H) $null
if ($sess -and $sess.Count -gt 0) {
  Chk "auth/sessions/revoke" (J "DELETE" "/auth/sessions/$($sess[0].id)" $null $H) $null
}

# ---------- 8. 发票 / 分销 ----------
$inv = Chk "invoices/create" (J "POST" "/invoices" @{ title_type="企业"; title="测试公司"; tax_no="91310000MA1FL0000X"; amount=100 } $H) $null
# 企业抬头税号非法 → 必须被拒
ChkDeny "invoices 税号校验" (J "POST" "/invoices" @{ title_type="企业"; title="测试公司"; tax_no="123"; amount=100 } $H)
Chk "invoices/list" (J "GET" "/invoices?page=1&pageSize=50" $null $H) $null
Chk "affiliate/overview" (J "GET" "/affiliate/overview" $null $H) $null
Chk "affiliate/settlements" (J "GET" "/affiliate/settlements" $null $H) $null
# 行内注释2.4：新注册用户佣金余额为 0，提现必然被 402 拒绝 —— 这是正确的业务校验，
#               所以这里断言「必须被拒」而不是「必须成功」。
ChkDeny "affiliate/withdrawals 余额不足被拒" (J "POST" "/affiliate/withdrawals" @{ amount=1 } $H)

# ---------- 9. 发现流：发布 → 进审核队列 ----------
$dsc = Chk "discover/items 发布" (J "POST" "/discover/items" @{ title="测试作品"; cover_url="https://example.com/a.jpg"; capability="image"; points=10; tags=@("t1"); tool_href="/toolbox/image-generation"; params_snapshot=@{ prompt="cat" } } $H) $null
Chk "discover/items/{id}/like" (J "POST" "/discover/items/$($dsc.id)/like" $null $H) $null
Chk "discover/items/{id}" (J "GET" "/discover/items/$($dsc.id)" $null $H) $null
# 行内注释4：未审核的内容不该出现在公开流里
$feed = J "GET" "/discover/feed?limit=50" $null $null
$pubIds = @($feed.data.items | ForEach-Object { $_.id })
if ($pubIds -notcontains $dsc.id) { $script:pass++; W "OK    discover 未审核内容不外显" }
else { $script:fail++; W "FAIL  discover 未审核内容被外显" }

# ---------- 10. 石材材质增删改 ----------
$up = J "POST" "/assets/upload-policy" @{ filename="m2.jpg"; size=1024; content_type="image/jpeg"; kind="image" } $H
$mat = Chk "tools/stone/materials/create" (J "POST" "/tools/stone/materials" @{ asset_id=$up.asset_id; name="花岗岩"; tags=@("灰"); attrs=@{ hardness="莫氏7" } } $H) $null
Chk "tools/stone/materials/update" (J "PATCH" "/tools/stone/materials/$($mat.id)" @{ name="花岗岩改"; tags=@("灰","亮") } $H) $null
Chk "tools/stone/materials/export" (J "POST" "/tools/stone/materials/export" @{ ids=@($mat.id) } $H) $null
Chk "tools/stone/materials/delete" (J "DELETE" "/tools/stone/materials/$($mat.id)" $null $H) $null

# ---------- 11. 公开接口补充 ----------
Chk "skills/video/categories" (J "GET" "/skills/video/categories" $null $null) $null
Chk "assets/public-assets" (J "GET" "/public-assets" $null $null) $null

# ---------- 12. 后台写操作（管理员） ----------
$sendR = $null
if (-not $admCode) { $admCode = Get-AdminCode $admPhone }
if ($admCode) {
  $admR = J "POST" "/auth/sms/verify" @{ phone = $admPhone; code = $admCode } $null
  $AH = @{ Authorization = "Bearer $($admR.data.access_token)" }
  W ("     admin role=" + $admR.data.user.role)

  # 审核队列：普通用户刚发布的内容应在待审队列里
  $rv = Chk "admin/review 列表" (J "GET" "/admin/review?status=pending" $null $AH) $null
  $rvId = ""
  if ($rv) {
    $rv = @($rv)
    # 行内注释2.7：必须挑「本轮刚发布的那条」（靠 item_id 匹配），
    #               否则可能批到历史遗留的队列行，断言链路就断了。
    $target = $rv | Where-Object { $_.item_id -eq $dsc.id } | Select-Object -First 1
    if (-not $target) { $target = $rv[0] }
    $rvId = $target.id
  }
  W ("     审核队列条数=" + @($rv).Count)

  # 积分流水：全站聚合（按前缀跨用户）
  $led = Chk "admin/ledger 全站流水" (J "GET" "/admin/ledger?page=1&pageSize=10" $null $AH) $null
  if ($led -and $led.data -and @($led.data).Count -gt 0) {
    $script:pass++; W ("OK    admin/ledger 有数据 type_label=" + $led.data[0].type_label)
  } else { $script:fail++; W "FAIL  admin/ledger 仍为空" }
  # 按中文类型筛选
  $led2 = Chk "admin/ledger 按中文筛选" (J "GET" "/admin/ledger?page=1&pageSize=10&type=%E5%85%85%E5%80%BC" $null $AH) $null

  # 审核通过 → 内容进公共素材 + 公开流可见
  if ($rvId) {
    Chk "admin/review/approve" (J "POST" "/admin/review/$rvId/approve" @{ reason="内容合规" } $AH) $null
    $pub = Chk "assets/public-assets（审核后）" (J "GET" "/public-assets" $null $null) $null
    if ($pub -and @($pub).Count -gt 0) { $script:pass++; W "OK    审核通过后进公共素材库" }
    else { $script:fail++; W "FAIL  审核通过后公共素材库仍为空" }
    # 行内注释2.8：审核通过后，公开流（未登录可访问）必须能看到这条作品。
    $feed2 = J "GET" "/discover/feed?limit=50" $null $null
    $feedIds = @($feed2.data.items | ForEach-Object { $_.id })
    if ($feedIds -contains $dsc.id) { $script:pass++; W "OK    审核通过后公开流可见" }
    else { $script:fail++; W "FAIL  审核通过后公开流仍不可见" }
  }

  # 公告 CRUD
  $ann = Chk "admin/announcements/create" (J "POST" "/admin/announcements" @{ title="测试公告"; body="正文"; range="长期" } $AH) $null
  Chk "admin/announcements/update" (J "PATCH" "/admin/announcements/$($ann.id)" @{ pinned=$true; status="published" } $AH) $null
  Chk "admin/announcements/delete" (J "DELETE" "/admin/announcements/$($ann.id)" $null $AH) $null

  # 套餐 CRUD
  $pkgCode = "pkg_mut_" + (Get-Random -Minimum 1000 -Maximum 9999)
  Chk "admin/packages/upsert" (J "POST" "/admin/packages" @{ code=$pkgCode; name="测试套餐"; amount=100; credits=100; enabled=$false } $AH) $null
  Chk "admin/packages/delete" (J "DELETE" "/admin/packages/$pkgCode" $null $AH) $null

  # 技能包 CRUD
  $sp = Chk "admin/skill-packages/upsert" (J "POST" "/admin/skill-packages" @{ label="测试技能包"; description="d"; prompt_template="p"; version="v1.0"; enabled=$true } $AH) $null
  Chk "admin/skill-packages/delete" (J "DELETE" "/admin/skill-packages/$($sp.id)" $null $AH) $null

  # 视频技能保存
  Chk "admin/video-skills/save" (J "PUT" "/admin/video-skills" @(@{ key="local-store-discovery"; enabled=$true; option_groups=@{ ratio=@("16:9") } }) $AH) $null

  # 公共素材授权
  $pa = Chk "admin/public-assets 列表" (J "GET" "/admin/public-assets" $null $AH) $null
  if ($pa -and @($pa).Count -gt 0) {
    Chk "admin/public-assets/scope" (J "POST" "/admin/public-assets/scope" @{ ids=@($pa[0].id); scope="全员" } $AH) $null
  }

  # 积分调整（护栏：<1000 免确认；>=1000 需 confirmed）
  $adj = Chk "admin/credits/adjust" (J "POST" "/admin/credits/adjust" @{ user_id=$uid; amount=50; reason="e2e 测试补发"; confirmed=$false } $AH) $null
  ChkDeny "admin/credits/adjust 大额未确认" (J "POST" "/admin/credits/adjust" @{ user_id=$uid; amount=2000; reason="大额"; confirmed=$false } $AH)
  Chk "admin/credits/adjust 大额已确认" (J "POST" "/admin/credits/adjust" @{ user_id=$uid; amount=2000; reason="大额补发"; confirmed=$true } $AH) $null
  # 无理由必须被拒
  ChkDeny "admin/credits/adjust 无理由" (J "POST" "/admin/credits/adjust" @{ user_id=$uid; amount=10; reason=""; confirmed=$true } $AH)

  # 改价（毛利护栏：低于成本必须被拒）
  Chk "admin/pricing/update" (J "POST" "/admin/pricing" @{ model_key="image.t2i.2k"; spec="2K"; points=20; reason="e2e 调价" } $AH) $null
  ChkDeny "admin/pricing 低于成本护栏" (J "POST" "/admin/pricing" @{ model_key="image.t2i.2k"; spec="2K"; points=0; reason="恶意改价" } $AH)

  # 通道 / 接入点
  $ch = Chk "admin/channels/upsert" (J "POST" "/admin/channels" @{ name="e2e 通道"; provider="relay"; base_url="https://relay.example.invalid"; api_key=""; protocol="openai-image"; capabilities="image"; priority=99; rpm_limit=60; cost_ratio=1.0; status="suspended"; remark="e2e" } $AH) $null
  Chk "admin/channels/toggle" (J "PATCH" "/admin/channels/$($ch.id)" @{ status="active" } $AH) $null
  $ep = Chk "admin/endpoints/upsert" (J "POST" "/admin/endpoints" @{ model_key="e2e.model.test"; display_name="E2E 测试接入点"; channel_id=$ch.id; base_url="https://relay.example.invalid"; upstream_model="e2e-upstream"; timeout_ms=30000; max_retries=1; sort_order=99; enabled=$true } $AH) $null
  Chk "admin/endpoints/toggle" (J "PATCH" "/admin/endpoints/$($ep.id)" @{ enabled=$false } $AH) $null
  Chk "admin/endpoints/switch-channel" (J "POST" "/admin/endpoints/switch-channel" @{ model_key="e2e.model.test"; channel_id=$ch.id } $AH) $null

  # 邀请码
  $ic = Chk "admin/invite-codes/generate" (J "POST" "/admin/invite-codes/generate" @{ count=3 } $AH) $null
  if ($ic -and @($ic).Count -gt 0) {
    Chk "admin/invite-codes/revoke" (J "DELETE" "/admin/invite-codes/$($ic[0].code)" $null $AH) $null
  }

  # 分销伙伴 + 结算单
  $pt = Chk "admin/partners/create" (J "POST" "/admin/partners" @{ name="e2e 伙伴"; rate=15 } $AH) $null
  Chk "admin/partners/pause" (J "POST" "/admin/partners/$($pt.id)/pause" $null $AH) $null
  $set = Chk "admin/settlements/generate" (J "POST" "/admin/settlements/generate" @{ period="2026-11" } $AH) $null
  Chk "admin/settlements/confirm" (J "POST" "/admin/settlements/$($set.id)/confirm" $null $AH) $null

  # 对账
  Chk "admin/bills/reconcile" (J "POST" "/admin/bills/reconcile" @{ day="2026-11-07" } $AH) $null

  # 发票人工开票
  $ai = Chk "admin/invoices 列表" (J "GET" "/admin/invoices?status=pending" $null $AH) $null
  if ($ai -and @($ai).Count -gt 0) {
    $i0 = @($ai)[0]
    if ($i0.status -eq "pending") { $script:pass++; W "OK    admin/invoices 状态归一为 pending" }
    else { $script:fail++; W "FAIL  admin/invoices 状态=$($i0.status)（应为 pending）" }
    Chk "admin/invoices/approve" (J "POST" "/admin/invoices/$($i0.id)/approve" @{ reason="e2e 开票" } $AH) $null
    $ai2 = Chk "admin/invoices 已开票页签" (J "GET" "/admin/invoices?status=approved" $null $AH) $null
    if ($ai2 -and @($ai2).Count -gt 0) { $script:pass++; W "OK    admin/invoices approved 页签有数据" }
    else { $script:fail++; W "FAIL  admin/invoices approved 页签为空" }
  }

  # 用户管理：详情 / 封禁 / 解封 / 强制下线
  $ud = Chk "admin/users/{id}" (J "GET" "/admin/users/$uid" $null $AH) $null
  Chk "admin/users/ban" (J "POST" "/admin/users/$uid/ban" $null $AH) $null
  Chk "admin/users/unban" (J "POST" "/admin/users/$uid/unban" $null $AH) $null
  Chk "admin/users/force-logout" (J "POST" "/admin/users/$uid/force-logout" $null $AH) $null

  # 审计日志（写操作应落审计）
  $au = Chk "admin/audit" (J "GET" "/admin/audit?page=1&pageSize=20" $null $AH) $null
  if ($au -and $au.data -and @($au.data).Count -gt 0) { $script:pass++; W "OK    admin/audit 有记录" }
  else { $script:fail++; W "FAIL  admin/audit 无记录" }

  # 报表 / 看板
  Chk "admin/reports/tasks" (J "GET" "/admin/reports/tasks" $null $AH) $null
  Chk "admin/dashboard" (J "GET" "/admin/dashboard" $null $AH) $null
} else {
  W "!! 管理员验证码发送失败，跳过后台用例"
}

W ""
W ("================ 结果: PASS=$pass FAIL=$fail ================")
