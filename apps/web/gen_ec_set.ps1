$ErrorActionPreference = 'Stop'
$key = [Environment]::GetEnvironmentVariable('TOAPIS_API_KEY','User')
$h = @{ Authorization = "Bearer $key" }
$base = 'https://toapis.cn'

# 6 张：电商美妆套图系（主图/细节/场景/对比/规格/包装），换商品：口红/粉底/精华
# 全部 2k 起步按用户要求 1k/2k；套图用 1:1 与 16:9 穿插
$jobs = @(
  @{ file='ec-set-lipstick-hero-1x1.png';   size='1:1';  res='2k'; prompt='Professional e-commerce hero shot, matte red lipstick bullet with gold case standing centered on warm beige seamless studio background, soft diffused key light from upper left plus gentle fill, soft contact shadow, macro detail on lipstick texture, empty copy space on right 20 percent, shot on full-frame camera 85mm f/8, tack sharp, true-to-life color, subtle grain. No floating object, no distorted proportions, no watermark, no text.' },
  @{ file='ec-set-lipstick-detail-1x1.png'; size='1:1';  res='2k'; prompt='Extreme close-up product photography, red lipstick bullet tip angled 45 degrees, micro surface variation in wax texture, gold case reflections with highlight rolloff, neutral daylight with grazing light to reveal depth, macro lens f/8, tack sharp, true-to-life color, subtle film grain. No repeating pattern, no plastic look, no watermark, no text.' },
  @{ file='ec-set-serum-scene-16x9.png';    size='16:9'; res='2k'; prompt='Ultra-photorealistic lifestyle scene, glass serum dropper bottle with amber liquid on marble bathroom vanity beside white orchid and folded linen towel, morning daylight from side window, global illumination, soft contact shadows, water droplets on glass, lived-in realistic details, shot on Sony A7IV 35mm f/4 eye-level, natural white balance. No CGI look, no staged studio polish, no watermark, no text.' },
  @{ file='ec-set-foundation-compare-16x9.png'; size='16:9'; res='2k'; prompt='Professional e-commerce comparison layout photograph, two glass foundation bottles side by side on light-grey seamless background, left bottle full with pump dispensing beige swatch smear, right bottle empty showing fill line, even studio lighting, centered composition with divider gap, macro detail on liquid texture, shot on full-frame 85mm f/8, tack sharp, true-to-life color. No hands, no watermark, no text.' },
  @{ file='ec-set-cream-spec-3x4.png';      size='3:4';  res='1k'; prompt='Clean studio specification photograph, open cosmetic cream jar with swirl texture on top, lid placed beside jar showing inner seal, soft top-down diffused light, light-grey seamless background, ruler-like minimal staging, macro detail on cream swirls, shot on full-frame 50mm f/8, tack sharp, true-to-life color. No hands, no watermark, no text.' },
  @{ file='ec-set-perfume-pack-1x1.png';    size='1:1';  res='2k'; prompt='Premium packaging photograph, rectangular perfume bottle with gold cap inside open kraft gift box with tissue paper, beige ribbon beside box, warm studio side light, soft shadows, light-grey seamless background, macro detail on glass reflections and cardboard texture, shot on full-frame 50mm f/5.6, tack sharp, true-to-life color. No hands, no watermark, no text.' }
)

New-Item -ItemType Directory -Force -Path 'public/images/ec' | Out-Null
foreach ($j in $jobs) {
  Write-Host ("SUBMIT " + $j.file)
  $body = @{ model='gpt-image-2'; prompt=$j.prompt; size=$j.size; resolution=$j.res; n=1 } | ConvertTo-Json
  $task = Invoke-RestMethod -Uri "$base/v1/images/generations" -Method Post -Headers $h -Body $body -ContentType 'application/json'
  $id = $task.id
  Write-Host ("TASK $id")
  $url = $null
  for ($i=0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 5
    $r = Invoke-RestMethod -Uri "$base/v1/images/generations/$id" -Headers $h
    if ($r.status -eq 'completed') { $url = $r.result.data[0].url; break }
    if ($r.status -eq 'failed') { throw ("GENERATE FAILED " + $j.file) }
  }
  if (-not $url) { throw ("TIMEOUT " + $j.file) }
  Write-Host ("DONE " + $url)
  curl.exe -s -o ("public/images/ec/" + $j.file) $url
  Get-Item ("public/images/ec/" + $j.file) | Select-Object Name, Length
}
Write-Host 'ALL_EC_DONE'
