# 全接口端到端验证（非 A 类）
# 行内注释1：覆盖登录 → 资产 → 数字人 → 工具链 → 任务链 → 计费 → 画布 → 公开 → 后台。
$ErrorActionPreference = "Continue"
$BASE = "http://localhost:3001/api/v1"
$LOG  = "d:\code\xin-ai\.recon\e2e-out.txt"
if (Test-Path $LOG) { Remove-Item $LOG -Force }
function W($s) { Add-Content -Path $LOG -Value ([string]$s) -Encoding UTF8 }
function J($m,$u,$b,$h) {
  $p = @{ Uri = "$BASE$u"; Method = $m; TimeoutSec = 120 }
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
  if ($null -eq $r) { $script:fail++; W ("FAIL  $tag -> null/错误") ; return $null }
  $code = $r.code
  if ($code -eq 0 -or $code -eq $null) { $script:pass++; W ("OK    $tag  code=$code") }
  else { $script:fail++; W ("FAIL  $tag  code=$code msg=$($r.message)") }
  return $r.data
}

# ---------- 1. 登录 ----------
$phone = "139" + (Get-Random -Minimum 10000000 -Maximum 99999999).ToString()
$r = J "POST" "/auth/sms/send" @{ phone = $phone } $null
$r = J "POST" "/auth/sms/verify" @{ phone = $phone; code = $r.data.dev_code } $null
$tok = $r.data.access_token
if (-not $tok) { W "!! 登录失败"; exit 1 }
$H = @{ Authorization = "Bearer $tok" }
W "登录成功 phone=$phone"

# 行内注释1.2：管理员验证码必须「开头就取」—— 短信发送有 60 秒冷却，
#              放到脚本尾部时同一手机号还在冷却期内，发不出去会导致整段后台用例被跳过。
#              这里开头先拿一份 dev_code 备用（验证码 TTL 300 秒，足够跑完整轮）。
# 行内注释1.3：冷却是「按手机号」记的，上一轮脚本刚发过就会撞上。
#              所以这里带重试 —— 撞冷却就等冷却结束再发，最多等一轮。
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
if ($admCode) { W "管理员验证码已预取（尾部登录复用）" } else { W "!! 管理员验证码预取失败" }

# ---------- 1.1 充值（先充再干活） ----------
# 行内注释1：为什么把充值提到最前面 —— 新号只有 100 积分，
#             factory-video(320) / ecommerce-set / image-speak(160) 这类会直接 402 credit.insufficient。
#             先走一次本地支付回调把积分打上，后面的高成本接口才能真正被测到（而不是测到 402）。
$ord = J "POST" "/recharge/orders" @{ package_code="professional"; pay_method="wechat" } $H
if ($ord) {
  Chk "recharge/callback/wechat" (J "POST" "/recharge/callback/wechat" @{ order_no=$ord.data.order_no; amount=$ord.data.amount; signature="dev" } $H) $null
  $bal = J "GET" "/points/balance" $null $H
  W ("     余额充值后 available=" + $bal.data.available)
} else {
  W "!! 建单失败，跳过充值"
}

# ---------- 2. 资产（两段式直传） ----------
$up = Chk "assets/upload-policy" (J "POST" "/assets/upload-policy" @{ filename="v.mp4"; size=1024; content_type="video/mp4"; kind="video"; group="成片归档" } $H) $null
$assetId = $up.asset_id
Chk "assets/complete" (J "POST" "/assets/complete" @{ asset_id=$assetId; size=1024; etag="e1" } $H) $null
Chk "assets/list" (J "GET" "/assets?page=1&pageSize=10" $null $H) $null
Chk "assets/groups" (J "GET" "/asset-groups" $null $H) $null
$grp = Chk "asset-groups/create" (J "POST" "/asset-groups" @{ name="测试组" } $H) $null
Chk "assets/update" (J "PATCH" "/assets/$assetId" @{ name="改名.mp4"; tags=@("a","b") } $H) $null
$exp = Chk "assets/exports" (J "POST" "/assets/exports" @{ ids=@($assetId); label="测试导出" } $H) $null
W ("     export download_url=" + $exp.download_url)
try { $r = Invoke-WebRequest -Uri "http://localhost:3001$($exp.download_url)" -Headers $H -UseBasicParsing; W ("OK    assets/exports/download bytes=" + $r.RawContentLength) } catch { $script:fail++; W "FAIL  assets/exports/download -> $($_.Exception.Message)" }

# ---------- 3. 数字人 ----------
$av = Chk "avatars/create" (J "POST" "/avatars" @{ asset_id=$assetId; name="主播A" } $H) $null
$avatarId = $av.id
Chk "avatars/standardize" (J "POST" "/avatars/$avatarId/standardize" @{} $H) $null
Chk "avatars/list" (J "GET" "/avatars" $null $H) $null
$vc = Chk "voices/clone" (J "POST" "/voices" @{ name="克隆音色"; audio_asset_ids=@($assetId) } $H) $null
Chk "voices/list" (J "GET" "/voices" $null $H) $null
Chk "voice-slots/create" (J "POST" "/voice-slots" @{ voice_id=$vc.id; name="槽位1"; index=1 } $H) $null
Chk "voice-slots/list" (J "GET" "/voice-slots" $null $H) $null
Chk "authorizations/create" (J "POST" "/authorizations" @{ type="商用授权"; subject="张三"; file_url="https://example.com/a.pdf" } $H) $null

# ---------- 4. 任务链（核心） ----------
$q = Chk "tasks/quote" (J "POST" "/tasks/quote" @{ model_key="image.t2i.2k"; spec="2K"; count=1; params=@{ prompt="一只橘猫" } } $H) $null
$fp = $q.fingerprint
W ("     quote credits=" + $q.estimated_credits + " fp=" + $fp.Substring(0,12))
$ik = "e2e-" + (Get-Random)
$t = Chk "tasks/submit" (J "POST" "/tasks/submit" @{ model_key="image.t2i.2k"; spec="2K"; count=1; params=@{ prompt="一只橘猫" }; quote_fingerprint=$fp; idempotency_key=$ik } $H) $null
$taskId = $t.id
W ("     task id=" + $taskId + " status=" + $t.status)
$t2 = J "POST" "/tasks/submit" @{ model_key="image.t2i.2k"; spec="2K"; count=1; params=@{ prompt="一只橘猫" }; quote_fingerprint=$fp; idempotency_key=$ik } $H
if ($t2.data.id -eq $taskId) { $script:pass++; W "OK    tasks/submit 幂等" } else { $script:fail++; W "FAIL  幂等 id 不一致" }
Chk "tasks/detail" (J "GET" "/tasks/$taskId" $null $H) $null
Chk "tasks/list" (J "GET" "/tasks?page=1&pageSize=10" $null $H) $null
$ex = J "POST" "/tasks/$taskId/execute" @{} $H
if ($ex) { W ("     execute status=" + $ex.data.status + " err=" + $ex.data.error_code + " reason=" + $ex.data.fail_reason) }

# 工具链（全部走 /tools 前缀，验证前端路径可用）
$tools = @(
  @{ n="depth-clone";      u="/tools/depth-clone/jobs";        b=@{ mode="depth"; ref_video_asset_id=$assetId; ref_image_asset_ids=@(); prompt="替换成石头" } },
  @{ n="video-remix";      u="/tools/video-remix/jobs";        b=@{ source_video_asset_id=$assetId; strategy="卡点" } },
  @{ n="video-remix-viral";u="/tools/video-remix-viral/jobs";  b=@{ source_video_asset_id=$assetId; strategy="爆款" } },
  @{ n="video-enhance";    u="/tools/video-quality-enhance/jobs"; b=@{ video_asset_id=$assetId; target="720P" } },
  @{ n="subtitle-erase";   u="/tools/video-subtitle-erase/jobs"; b=@{ video_asset_id=$assetId; regions=@(@{x=10;y=80;w=50;h=10}) } },
  @{ n="watermark-remove"; u="/tools/video-watermark-remove/jobs"; b=@{ video_asset_id=$assetId } },
  @{ n="video-creator";    u="/tools/video-creator/jobs";      b=@{ skill_pack="local-store-discovery"; ref_image_ids=@(); ref_video_ids=@($assetId); ref_audio_ids=@(); prompt="做一条视频" } },
  @{ n="stone-effect";     u="/tools/stone/effect-jobs";       b=@{ material_asset_id=$assetId; main_color="米白"; texture_desc="细纹"; scene_key="living-room"; lighting="自然光"; resolution="2K"; views=@("正面") } },
  @{ n="factory-video";    u="/tools/stone/factory-video-jobs"; b=@{ avatar_id=$avatarId; site_asset_ids=@($assetId); template_id="tpl_factory_std"; variables=@{ script="欢迎来到我们的石材展厅" } } }
)
foreach ($tt in $tools) {
  Chk ("tools/" + $tt.n) (J "POST" $tt.u $tt.b $H) $null
}
# 旧前缀也要能用
Chk "tools 旧前缀 /stone/scene-templates" (J "GET" "/stone/scene-templates" $null $H) $null
Chk "tools 旧前缀 /stone/script-templates" (J "GET" "/stone/script-templates" $null $H) $null
Chk "tools/stone/materials/create" (J "POST" "/tools/stone/materials" @{ asset_id=$assetId; name="大理石"; tags=@("白色") } $H) $null
Chk "tools/stone/materials/list" (J "GET" "/tools/stone/materials?page=1&pageSize=10" $null $H) $null
$mat = Chk "tools/stone/materials/export" (J "POST" "/tools/stone/materials/export" @{ ids=@() } $H) $null
Chk "tools/stone/refine-queue" (J "POST" "/tools/stone/refine-queue" @{ job_id=$taskId; note="色差" } $H) $null

# ---------- 5. 商详套图（批次） ----------
$ecs = Chk "tools/ecommerce-set" (J "POST" "/tools/ecommerce-set/jobs" @{ product_asset_ids=@($assetId); lang="zh"; ratio="1:1"; model="LC Image 2.5 Pro"; resolution="2K"; format="png"; count=2 } $H) $null
W ("     batch id=" + $ecs.id + " items=" + $ecs.item_count)
if ($ecs.task_ids.Count -gt 0) {
  Chk "tools/ecommerce-set/regenerate" (J "POST" "/tools/ecommerce-set/items/$($ecs.task_ids[0])/regenerate?batchId=$($ecs.id)" $null $H) $null
}
Chk "batches/list" (J "GET" "/batches?page=1&pageSize=10" $null $H) $null
Chk "batches/detail" (J "GET" "/batches/$($ecs.id)" $null $H) $null

# ---------- 6. 数字人任务 ----------
Chk "tts/jobs" (J "POST" "/tts/jobs" @{ text="你好世界"; voice_id=$vc.id } $H) $null
Chk "digital-human/jobs 口播" (J "POST" "/digital-human/jobs" @{ avatar_id=$avatarId; audio_asset_id=$assetId; tts_text="欢迎光临"; script="欢迎光临"; mode="口播" } $H) $null
Chk "digital-human/jobs 改口型" (J "POST" "/digital-human/jobs" @{ avatar_id=$avatarId; audio_asset_id=$assetId; mode="改口型" } $H) $null

# ---------- 7. 计费 ----------
Chk "points/balance" (J "GET" "/points/balance" $null $H) $null
Chk "points/ledger" (J "GET" "/points/ledger?page=1&pageSize=10" $null $H) $null
Chk "recharge/orders" (J "POST" "/recharge/orders" @{ package_code="standard"; pay_method="wechat" } $H) $null
$ordPage = Chk "recharge/orders/list" (J "GET" "/recharge/orders?page=1&pageSize=10" $null $H) $null
# 行内注释1：订单契约断言 —— order_no 必须有值，status 必须是原始码（不能是中文）。
#             列表接口返回的是分页体 {data:[...], pagination:{...}}，要先取 .data。
$ordList = if ($ordPage -and $ordPage.data) { $ordPage.data } else { $ordList }
if ($ordList -and $ordList.Count -gt 0) {
  $o0 = $ordList[0]
  if ($o0.order_no -and ($o0.status -in @("pending","paid","closed","refunded"))) {
    $script:pass++; W ("OK    recharge 订单契约 order_no=" + $o0.order_no + " status=" + $o0.status)
  } else {
    $script:fail++; W ("FAIL  recharge 订单契约 order_no=" + $o0.order_no + " status=" + $o0.status)
  }
} else {
  $script:fail++; W "FAIL  recharge 订单列表为空"
}

# ---------- 8. 用户 / 画布 / Agent ----------
Chk "users/me" (J "GET" "/users/me" $null $H) $null
Chk "users/me update" (J "PATCH" "/users/me" @{ nickname="测试昵称"; email="t@t.com"; company="测试公司"; bio="hi" } $H) $null
Chk "auth/sessions" (J "GET" "/auth/sessions" $null $H) $null
$c = Chk "canvases/create" (J "POST" "/canvases" @{ title="测试画布" } $H) $null
Chk "canvases/list" (J "GET" "/canvases" $null $H) $null
Chk "canvases/detail" (J "GET" "/canvases/$($c.id)" $null $H) $null
Chk "canvases/graph" (J "PUT" "/canvases/$($c.id)/graph" @{ nodes=@(@{id="n1";x=1;y=2;text="hi"}); edges=@(); version=0 } $H) $null
Chk "canvases/versions" (J "GET" "/canvases/$($c.id)/versions" $null $H) $null
Chk "canvases/share" (J "POST" "/canvases/$($c.id)/share" @{} $H) $null
Chk "canvases/templates" (J "GET" "/canvases/templates" $null $H) $null
Chk "agent/sessions" (J "POST" "/agent/sessions" @{ title="测试会话"; skill="copywriting" } $H) $null
Chk "agent/skills" (J "GET" "/agent/skills" $null $H) $null
Chk "speech-input/transcribe" (J "POST" "/speech-input/transcribe" @{ audio_asset_id=$assetId } $H) $null

# ---------- 9. 公开接口 ----------
Chk "capabilities/public" (J "GET" "/capabilities/public" $null $null) $null
Chk "pricing/table" (J "GET" "/pricing/table" $null $null) $null
Chk "model-routes/public" (J "GET" "/model-routes/public" $null $null) $null
Chk "skills/image" (J "GET" "/skills/image" $null $null) $null
Chk "skills/video" (J "GET" "/skills/video" $null $null) $null
Chk "recharge/packages" (J "GET" "/recharge/packages" $null $null) $null

# ---------- 10. 发现 / 发票 ----------
Chk "discover/feed" (J "GET" "/discover/feed?page=1&pageSize=10" $null $H) $null
Chk "invoices" (J "POST" "/invoices" @{ title="测试公司"; tax_no="91310000MA1FL0000X"; amount=100 } $H) $null

# ---------- 10.1 充值幂等复测（回调重复到达应返回同一单、不重复到账） ----------
if ($ord) {
  Chk "recharge/callback/wechat 幂等" (J "POST" "/recharge/callback/wechat" @{ order_no=$ord.data.order_no; amount=$ord.data.amount; signature="dev" } $H) $null
}

# ---------- 11. 后台（需管理员角色） ----------
# 行内注释1：用种子管理员手机号 13800000000 登录 —— run-api.ps1 里 XIN_ADMIN_PHONES 默认含它，
#             登录时 AuthService 会自动把该手机号的账号提权为 ADMIN。
$admPhone = "13800000000"
$sendR = J "POST" "/auth/sms/send" @{ phone = $admPhone } $null
$admCode = if ($sendR -and $sendR.data -and $sendR.data.dev_code) { $sendR.data.dev_code } else { $admCode }
if (-not $admCode) { $admCode = Get-AdminCode $admPhone }
if ($admCode) {
  $admR = J "POST" "/auth/sms/verify" @{ phone = $admPhone; code = $admCode } $null
  if ($admR -and $admR.data.access_token) {
    $AH = @{ Authorization = "Bearer $($admR.data.access_token)" }
    W ("     admin role=" + $admR.data.user.role)
    Chk "admin/channels" (J "GET" "/admin/channels" $null $AH) $null
    Chk "admin/endpoints" (J "GET" "/admin/endpoints" $null $AH) $null
    Chk "admin/pricing" (J "GET" "/admin/pricing" $null $AH) $null
    Chk "admin/dashboard" (J "GET" "/admin/dashboard" $null $AH) $null
    Chk "admin/users" (J "GET" "/admin/users?page=1&pageSize=5" $null $AH) $null
    Chk "admin/packages" (J "GET" "/admin/packages" $null $AH) $null
    Chk "admin/review" (J "GET" "/admin/review?status=pending" $null $AH) $null
    Chk "admin/announcements" (J "GET" "/admin/announcements" $null $AH) $null
    Chk "admin/audit" (J "GET" "/admin/audit?page=1&pageSize=5" $null $AH) $null
    Chk "admin/invite-codes" (J "GET" "/admin/invite-codes" $null $AH) $null
    Chk "admin/reports/tasks" (J "GET" "/admin/reports/tasks" $null $AH) $null
    Chk "admin/ledger" (J "GET" "/admin/ledger?page=1&pageSize=5" $null $AH) $null
    Chk "admin/channels/balances" (J "GET" "/admin/channels/balances" $null $AH) $null
    Chk "admin/bills" (J "GET" "/admin/bills" $null $AH) $null
    Chk "admin/partners" (J "GET" "/admin/partners" $null $AH) $null
    Chk "admin/settlements" (J "GET" "/admin/settlements" $null $AH) $null
    Chk "admin/pricing/changes" (J "GET" "/admin/pricing/changes" $null $AH) $null
    Chk "admin/endpoint-changes" (J "GET" "/admin/endpoint-changes" $null $AH) $null
    Chk "admin/skill-packages" (J "GET" "/admin/skill-packages" $null $AH) $null
    Chk "admin/video-skills" (J "GET" "/admin/video-skills" $null $AH) $null
    Chk "admin/public-assets" (J "GET" "/admin/public-assets" $null $AH) $null
    Chk "admin/invoices" (J "GET" "/admin/invoices" $null $AH) $null

    # 行内注释1.1：普通用户访问后台必须 403 —— 这是后台角色门禁的核心断言。
    $deny = J "GET" "/admin/users?page=1&pageSize=1" $null $H
    if ($null -eq $deny) { $script:pass++; W "OK    admin 普通用户被拒（403）" }
    else { $script:fail++; W "FAIL  admin 普通用户未被拒绝 code=$($deny.code)" }
  } else {
    W "!! 管理员登录失败，跳过后台用例"
  }
} else {
  W "!! 管理员验证码发送失败（可能处于 60 秒冷却），跳过后台用例"
}

W ""
W ("================ 结果: PASS=$pass FAIL=$fail ================")
